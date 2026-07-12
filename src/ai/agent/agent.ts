import type { AgentDefinition } from '../types/agent-definition';
import { ToolRunner } from '../tools/tools-runner';
import { getAgentQueryString } from './utils';
import {
  fetchResponsesAPI,
  getResponsesFuntionCallOutput,
  getResponsesToolCalls,
  extractResponsesText,
  type AgentConversationItem,
  type HarmlessFunctionCallOutputItem,
  type HarmlessResponseResult,
} from '../../client/responses-client';
import { toInputMessage } from '../../client';
import { AgentEventEmitter } from '../../lifecycle/events/agent-event-emitter';
import { EventTypes } from '../../lifecycle/events/event-types';
import { spawnAgent } from './agent-spawner';
import SkillsRegistry from '../skills/skills-registry';

const MAX_DEPTH = 3;

export class Agent {
  private definition: AgentDefinition;
  private toolRunner: ToolRunner;
  private subagentId?: string;

  constructor(definition: AgentDefinition, subagentId?: string) {
    this.definition = definition;
    this.toolRunner = new ToolRunner(definition.tools);
    this.subagentId = subagentId;
  }

  private prepareSystemPrompt = (): string => {
    let systemPrompt = this.definition.systemPrompt;
    const skills = SkillsRegistry.getAgentSkills(this.definition.name);

    systemPrompt += '<skills>';
    skills.forEach((skill) => {
      systemPrompt += '<skill>';
      systemPrompt += '    <name>' + skill.name + '</name>';
      systemPrompt += '    <description>' + skill.description + '</description>';
      systemPrompt += '</skill>';
    });
    systemPrompt += '</skills>';

    return systemPrompt;
  };

  public run = async (
    query: string,
    conversationHistory: AgentConversationItem[] = [],
    sessionId: number,
    depth = 0
  ): Promise<{
    response: string;
    conversationHistory: AgentConversationItem[];
  }> => {
    let currentConversation: AgentConversationItem[] = [];
    try {
      if (depth > MAX_DEPTH) {
        throw new Error('Max agent depth exceeded');
      }

      currentConversation = [toInputMessage('system', this.prepareSystemPrompt()), ...conversationHistory, toInputMessage('user', query)];
      AgentEventEmitter.emit(EventTypes.AGENT_STARTED, { agentName: this.definition.name, sessionId, query, depth, subagentId: this.subagentId });

      for (let step = 1; step <= this.definition.stepLimit; step++) {
        AgentEventEmitter.emit(EventTypes.MODEL_REQUEST, {
          agentName: this.definition.name,
          step: step.toString(),
          msgCount: currentConversation.length,
          sessionId,
          query: getAgentQueryString(currentConversation),
        });

        const response: HarmlessResponseResult = await fetchResponsesAPI({
          conversation: currentConversation,
          model: this.definition.defaultModel,
          tools: this.toolRunner.getTools(),
          schema: this.definition.schema,
          plugins: [],
          reasoning: this.definition.reasoning,
          maxOutputTokens: 8192,
        });

        AgentEventEmitter.emit(EventTypes.MODEL_RESPONSE, { sessionId, responseResult: response });

        // Append the full assistant output turn first
        const VALID_OUTPUT_TYPES = new Set(['message', 'function_call', 'function_call_output']);
        const outputItems = (response.output as unknown as AgentConversationItem[]).filter((item) => VALID_OUTPUT_TYPES.has((item as { type?: string }).type ?? ''));

        const baseSequence = currentConversation.length;
        currentConversation.push(...outputItems);

        for (let i = 0; i < outputItems.length; i++) {
          AgentEventEmitter.emit(EventTypes.MESSAGE_ADDED, { sessionId, item: outputItems[i]!, sequence: baseSequence + i });
        }

        const toolCalls = getResponsesToolCalls(response);

        if (toolCalls.length === 0) {
          let text = response.output_text ?? extractResponsesText(response) ?? 'No response';
          try {
            const parsed = JSON.parse(text);
            if (typeof parsed?.text === 'string') text = parsed.text;
          } catch {
            /* output_text is plain text, use as-is */
          }

          AgentEventEmitter.emit(EventTypes.AGENT_COMPLETED, {
            agentName: this.definition.name,
            sessionId,
            response: text,
            itemCount: currentConversation.length,
            errored: false,
            responseResult: response,
            subagentId: this.subagentId,
          });

          return { response: text, conversationHistory: currentConversation };
        }

        // Run all tools concurrently (limiting delegate concurrency to Max 10)
        const delegateLimit = 10;
        let activeDelegates = 0;
        const delegateQueue: (() => void)[] = [];

        const acquireSlot = () => {
          if (activeDelegates < delegateLimit) {
            activeDelegates++;
            return Promise.resolve();
          }
          return new Promise<void>((resolve) => {
            delegateQueue.push(resolve);
          });
        };

        const releaseSlot = () => {
          activeDelegates--;
          const next = delegateQueue.shift();
          if (next) {
            activeDelegates++;
            next();
          }
        };

        const toolResults: HarmlessFunctionCallOutputItem[] = await Promise.all(
          toolCalls.map(async (toolCall) => {
            const toolName = toolCall.name;
            let args: Record<string, unknown> = {};
            try {
              const raw = toolCall.arguments;
              args = typeof raw === 'string' && raw.trim() ? (JSON.parse(raw) as Record<string, unknown>) : {};
            } catch {
              args = {};
            }

            let output: string;

            if (toolName === 'delegate') {
              if (Array.isArray(args.tasks) && args.tasks.length > 0) {
                const results = await Promise.all(
                  args.tasks.map(async (t: any, index: number) => {
                    await acquireSlot();
                    try {
                      const res = await spawnAgent(sessionId, depth, t as Record<string, unknown>);
                      return `Task ${index + 1} (${t.agent}):\n${res}`;
                    } finally {
                      releaseSlot();
                    }
                  })
                );
                output = results.join('\n\n---\n\n');
              } else {
                output = 'Error: tasks array is required and must not be empty';
              }
            } else if (toolName === 'use_skill') {
              const skillName = args.skillName as string;
              const skill = SkillsRegistry.getAgentSkills(this.definition.name).find((s) => s.name === skillName);
              if (skill) {
                AgentEventEmitter.emit(EventTypes.SKILL_ON_LOAD, { agentName: this.definition.name, skillName });
                output = skill.instructions;
              } else {
                output = `Error: skill "${skillName}" not found`;
              }
            } else {
              const toolResult = await this.toolRunner.runTool(toolCall, sessionId);
              output = toolResult.output as string;
            }

            return getResponsesFuntionCallOutput(toolCall.call_id, output);
          })
        );

        currentConversation.push(...toolResults);
      }

      const responseText = `[${this.definition.name}] completed with max steps reached`;
      AgentEventEmitter.emit(EventTypes.AGENT_COMPLETED, {
        agentName: this.definition.name,
        sessionId,
        response: responseText,
        itemCount: currentConversation.length,
        errored: false,
        subagentId: this.subagentId,
      });

      return { response: responseText, conversationHistory: currentConversation };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[${this.definition.name}] Error:`, msg);

      AgentEventEmitter.emit(EventTypes.AGENT_COMPLETED, {
        agentName: this.definition.name,
        sessionId,
        response: msg,
        itemCount: currentConversation.length,
        errored: true,
        subagentId: this.subagentId,
      });

      throw `Agent error: ${msg}`;
    }
  };
}

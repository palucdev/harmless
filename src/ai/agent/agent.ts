import type { AgentDefinition } from '../types/agent-definition';
import { ToolRunner } from '../tools/tools-runner';
import { getAgentQueryString } from './utils';
import {
  fetchResponsesAPI,
  getResponsesFuntionCallOutput,
  getResponsesToolCalls,
  type AgentConversationItem,
  type HarmlessFunctionCallOutputItem,
  type HarmlessResponseResult,
} from '../../client/responses-client';
import { toInputMessage } from '../../client';
import { AgentEventEmitter } from '../../memory/events/agent-event-emitter';
import { EventTypes } from '../../memory/events/event-types';
import { spawnAgent } from './agent-spawner';

const MAX_DEPTH = 3;

export class Agent {
  private definition: AgentDefinition;
  private toolRunner: ToolRunner;

  constructor(definition: AgentDefinition) {
    this.definition = definition;
    this.toolRunner = new ToolRunner(definition.tools);
  }

  public run = async (
    query: string,
    conversationHistory: AgentConversationItem[] = [],
    sessionId: number,
    depth = 0
  ): Promise<{
    response: string;
    conversationHistory: AgentConversationItem[];
  }> => {
    try {
      if (depth > MAX_DEPTH) {
        throw new Error('Max agent depth exceeded');
      }

      const currentConversation: AgentConversationItem[] = [toInputMessage('system', this.definition.systemPrompt), ...conversationHistory, toInputMessage('user', query)];
      AgentEventEmitter.emit(EventTypes.AGENT_STARTED, { agentName: this.definition.name, sessionId, query, depth });

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
          const text = response.output_text ?? 'No response';

          AgentEventEmitter.emit(EventTypes.AGENT_COMPLETED, { agentName: this.definition.name, sessionId, response: text, itemCount: currentConversation.length, errored: false });

          return { response: text, conversationHistory: currentConversation };
        }

        // Run all tools concurrently
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
              output = await spawnAgent(sessionId, depth, args);
            } else {
              const toolResult = await this.toolRunner.runTool(toolCall, sessionId);
              output = toolResult.output as string;
            }

            return getResponsesFuntionCallOutput(toolCall.call_id, output);
          })
        );

        currentConversation.push(...toolResults);
      }

      return { response: `[${this.definition.name}] completed with max steps reached`, conversationHistory: currentConversation };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[${this.definition.name}] Error:`, msg);
      throw `Agent error: ${msg}`;
    }
  };
}

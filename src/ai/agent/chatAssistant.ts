import type { FunctionTool, InputMessageItem, OpenAIResponsesUsage, OpenResponsesResult, OutputItemFunctionCall } from '../../../generated';
import { getToolCalls, toMessage } from '../../client';
import { askOpenRouter } from '../../client/chatClient';
import { recordUsage } from '../../client/tokenStats';
import type { AgentConversationItem } from '../../client/types';
import log from '../../repl/interface/logger';

const assistantTools: FunctionTool[] = [];
const assistantToolHandlers: Record<string, (args: unknown) => Promise<unknown>> = {};

const MAX_STEPS = 100;

const runTool = async (toolCall: OutputItemFunctionCall) => {
  const args = JSON.parse(toolCall.arguments);
  log.tool(toolCall.name, args);

  try {
    const handler = assistantToolHandlers[toolCall.name];
    if (!handler) throw new Error(`Unknown tool: ${toolCall.name}`);
    const result = await handler(args);

    const output = JSON.stringify(result);
    log.toolResult(toolCall.name, true, output);
    return { type: 'function_call_output', call_id: toolCall.call_id, output };
  } catch (err) {
    const error = err as Error;
    const output = JSON.stringify({ error: error.message });
    log.toolResult(toolCall.name, false, error.message);
    return { type: 'function_call_output', call_id: toolCall.call_id, output };
  }
};

export const run = async (query: string, conversationHistory: AgentConversationItem[], model: string): Promise<{ response: string; conversationHistory: AgentConversationItem[] }> => {
  let currentConversation = [...conversationHistory, toMessage('user', query)] as unknown as InputMessageItem[];

  log.query(query);

  for (let step = 1; step <= MAX_STEPS; step++) {
    log.api(`Step ${step}`, currentConversation.length);
    const response = await askOpenRouter(currentConversation, model, assistantTools);
    log.apiDone(response.usage as OpenAIResponsesUsage);
    recordUsage(response.usage);

    const toolCalls = getToolCalls(response);

    if (toolCalls.length === 0) {
      const text = getFinalText(response) ?? 'No response';

      return { response: text, conversationHistory };
    }

    currentConversation = await buildNextConversation(currentConversation, toolCalls);
  }

  throw new Error(`Max steps (${MAX_STEPS}) reached`);
};

export const buildNextConversation = async (conversation: any, toolCalls: any[]) => {
  const toolResults = await Promise.all(toolCalls.map((call) => runTool(call)));

  return [...conversation, ...toolCalls, ...toolResults];
};

export const getFinalText = (response: OpenResponsesResult): string | undefined => {
  return response.output_text ?? response.output.find((item) => item.type === 'message')?.content?.[0]?.text ?? 'No response';
};

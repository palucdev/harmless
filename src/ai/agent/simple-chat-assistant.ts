import { ResponseOutputText } from '../../../generated/models/ResponseOutputText';
import type { FunctionTool } from '../../../generated/models/FunctionTool';
import type { OpenAIResponsesUsage } from '../../../generated/models/OpenAIResponsesUsage';
import type { OpenResponsesResult } from '../../../generated/models/OpenResponsesResult';
import type { OutputItemFunctionCall } from '../../../generated/models/OutputItemFunctionCall';
import { getToolCalls, toInputMessage, toOutputMessage } from '../../client';
import { askOpenRouter } from '../../client/chatClient';
import { recordUsage } from '../../client/token-stats';
import log from '../../repl/interface/logger';
import type { AgentConversationItem } from '../../client/responses-client';

const assistantTools: FunctionTool[] = [];
const assistantToolHandlers: Record<string, (args: unknown) => Promise<unknown>> = {};

const MAX_STEPS = 100;

const runTool = async (toolCall: OutputItemFunctionCall) => {
  try {
    const args = JSON.parse(toolCall.arguments);
    log.tool(toolCall.name, args);
    const handler = assistantToolHandlers[toolCall.name];
    if (!handler) throw new Error(`Unknown tool: ${toolCall.name}`);
    const result = await handler(args);

    const output = JSON.stringify(result);
    log.toolResult(toolCall.name, true, output);
    return { type: 'function_call_output', call_id: toolCall.call_id, output };
  } catch (err) {
    const error = err as Error;
    const isJsonParseError = error instanceof SyntaxError && error.message.includes('JSON');
    const errorMessage = isJsonParseError ? `Invalid JSON arguments generated: ${error.message}` : error.message;
    const output = JSON.stringify({ error: errorMessage });
    log.toolResult(toolCall.name, false, errorMessage);
    return { type: 'function_call_output', call_id: toolCall.call_id, output };
  }
};

export const run = async (query: string, conversationHistory: AgentConversationItem[], model: string): Promise<AgentConversationItem[]> => {
  let currentConversation = [...conversationHistory, toInputMessage('user', query)] as unknown as AgentConversationItem[];

  log.query(query);

  for (let step = 1; step <= MAX_STEPS; step++) {
    log.api(`Step ${step}`, currentConversation.length);
    const response = await askOpenRouter(currentConversation, model, assistantTools);
    log.apiDone(response.usage as OpenAIResponsesUsage);
    recordUsage(response.usage);

    const toolCalls = getToolCalls(response);

    if (toolCalls.length === 0) {
      const text = getFinalText(response) ?? 'No response';

      return [...currentConversation, toOutputMessage(text, response.id)] as unknown as AgentConversationItem[];
    }

    currentConversation = await buildNextConversation(currentConversation, toolCalls);
  }

  throw new Error(`Max steps (${MAX_STEPS}) reached`);
};

export const buildNextConversation = async (conversation: AgentConversationItem[], toolCalls: OutputItemFunctionCall[]) => {
  const toolResults = await Promise.all(toolCalls.map((call) => runTool(call)));

  return [...conversation, ...toolCalls, ...toolResults] as AgentConversationItem[];
};

export const getFinalText = (response: OpenResponsesResult): string | undefined => {
  return response.output_text ?? (response.output.find((item) => item.type === 'message')?.content?.[0] as ResponseOutputText)?.text ?? 'No response';
};

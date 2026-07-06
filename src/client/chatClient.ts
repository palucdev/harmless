import { extractResponseText, OPENROUTER_EXTRA_HEADERS, OPENROUTER_RESPONSE_ENDPOINT, resolveAIModel, toMessage } from '.';
import type { FunctionTool, InputMessageItem, Inputs, OpenAIResponsesUsage, OpenResponsesResult, OpenRouterWebSearchServerTool, ResponsesRequest } from '../../generated';
import { fetchWithRetry } from './fetch';
import type { AgentConversationItem } from './types';

export const askOpenRouter = async (conversation: AgentConversationItem[], model: string, tools?: (FunctionTool | OpenRouterWebSearchServerTool)[]): Promise<OpenResponsesResult> => {
  const requestBody: ResponsesRequest = {
    model: resolveAIModel(model),
    input: conversation as unknown as Inputs,
    tools,
  };

  const data: OpenResponsesResult = (await fetchWithRetry(OPENROUTER_RESPONSE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      ...OPENROUTER_EXTRA_HEADERS,
    },
    body: JSON.stringify(requestBody),
  })) as OpenResponsesResult;

  const text = extractResponseText(data);

  if (!text) {
    throw new Error('Missing text output in API response');
  }

  return data;
};

import { InputMessageItem } from '../../generated/models/InputMessageItem';
import { InputText } from '../../generated/models/InputText';
import { OutputItemFunctionCall } from '../../generated/models/OutputItemFunctionCall';
import { ResponseOutputText } from '../../generated/models/ResponseOutputText';
import type { OpenResponsesResult } from '../../generated/models/OpenResponsesResult';
import { OutputMessage } from '../../generated/models/OutputMessage';

export const OPENROUTER_EMBEDDING_ENDPOINT = 'https://openrouter.ai/api/v1/embeddings';
export const OPENROUTER_RESPONSE_ENDPOINT = 'https://openrouter.ai/api/v1/responses';
export const OPENROUTER_EXTRA_HEADERS = {
  ...(process.env.OPENROUTER_HTTP_REFERER ? { 'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER } : {}),
  ...(process.env.OPENROUTER_APP_NAME ? { 'X-Title': process.env.OPENROUTER_APP_NAME } : {}),
};

export const resolveAIModel = (model: string) => {
  if (!model.trim()) {
    throw new Error('Model must be a non-empty string');
  }

  if (model.includes('/')) {
    return model;
  }

  return model.startsWith('gpt-') ? `openai/${model}` : model;
};

/**
 * Create a conversation message in OpenRouter format
 */
export const toInputMessage = (role: 'user' | 'system' | 'developer', content: string): InputMessageItem => ({
  type: InputMessageItem.type.MESSAGE,
  role,
  content: [
    {
      type: InputText.type.INPUT_TEXT,
      text: content,
    },
  ],
});

export const toOutputMessage = (content: string, id: string): OutputMessage => ({
  id,
  type: OutputMessage.type.MESSAGE,
  role: OutputMessage.role.ASSISTANT,
  content: [
    {
      type: ResponseOutputText.type.OUTPUT_TEXT,
      text: content,
    },
  ],
});

/**
 * Export response from OpenRouter response result object
 *
 * @param data - OpenRouter response result object
 * @returns
 */
export const extractResponseText = (data: OpenResponsesResult) => {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text;
  }

  const messages = Array.isArray(data?.output) ? data.output.filter((item) => item?.type === 'message') : [];

  const textPart = messages.flatMap((message) => (Array.isArray(message?.content) ? message.content : [])).find((part) => part?.type === 'output_text' && typeof part?.text === 'string');

  return (textPart as ResponseOutputText)?.text ?? '';
};

export const getToolCalls = (response: OpenResponsesResult): OutputItemFunctionCall[] => response.output.filter((item) => item.type === OutputItemFunctionCall.type.FUNCTION_CALL);

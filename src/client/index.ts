import { InputMessageItem, InputText, ResponseOutputText, type OpenResponsesResult } from '../../generated';

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
export const toMessage = (role: 'user' | 'system' | 'developer' | 'assistant', content: string): InputMessageItem => ({
  type: InputMessageItem.type.MESSAGE,
  role: role as any,
  content: [
    {
      type: InputText.type.INPUT_TEXT,
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

export const getToolCalls = (response: OpenResponsesResult) => response.output.filter((item) => item.type === 'function_call');

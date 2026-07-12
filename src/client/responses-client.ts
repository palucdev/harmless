import { OPENROUTER_EXTRA_HEADERS, OPENROUTER_RESPONSE_ENDPOINT, resolveAIModel, toInputMessage } from '.';
import type { FormatJsonSchemaConfig } from '../../generated/models/FormatJsonSchemaConfig';
import type { FunctionTool } from '../../generated/models/FunctionTool';
import type { InputMessageItem } from '../../generated/models/InputMessageItem';
import type { Inputs } from '../../generated/models/Inputs';
import { OpenAIResponseFunctionToolCallOutput } from '../../generated/models/OpenAIResponseFunctionToolCallOutput';
import type { OpenAIResponsesToolChoice } from '../../generated/models/OpenAIResponsesToolChoice';
import type { OpenResponsesResult } from '../../generated/models/OpenResponsesResult';
import type { OutputItemFunctionCall } from '../../generated/models/OutputItemFunctionCall';
import type { OutputItems } from '../../generated/models/OutputItems';
import type { ReasoningConfig } from '../../generated/models/ReasoningConfig';
import type { FunctionCallOutputItem } from '../../generated/models/FunctionCallOutputItem';
import { ReasoningEffort } from '../../generated/models/ReasoningEffort';
import { ReasoningSummaryVerbosity } from '../../generated/models/ReasoningSummaryVerbosity';
import type { ResponsesRequest } from '../../generated/models/ResponsesRequest';

import { fetchWithRetry } from './fetch';
import type { Usage } from '../../generated/models/Usage';
import type { OpenRouterWebSearchServerTool } from '../../generated/models/OpenRouterWebSearchServerTool';

export type HarmlessFunctionCallOutputItem = FunctionCallOutputItem;

export type AgentConversationItem = InputMessageItem | OutputItems | OpenAIResponseFunctionToolCallOutput;

export type HarmlessResponseResultUsage = Usage;

export type HarmlessResponseResult = OpenResponsesResult & {
  usage: HarmlessResponseResultUsage;
};

export type HarmlessOutputItemFunctionCall = OutputItemFunctionCall;

export type HarmlessFunctionToolCallOutput = OpenAIResponseFunctionToolCallOutput;

export interface HarmlessResponsesParams {
  conversation: AgentConversationItem[];
  model: string;
  tools: FunctionTool[];
  schema: FormatJsonSchemaConfig | undefined;
  plugins: any[];
  instructions?: string;
  maxOutputTokens?: number;
  toolChoice?: OpenAIResponsesToolChoice;
  reasoning?: ReasoningConfig;
}

export type HarmlessWebSearchResponsesParams = {
  query: string;
  model: string;
  tools: (FunctionTool | OpenRouterWebSearchServerTool)[];
  maxOutputTokens?: number;
};

export type HarmlessResponsesRequest = ResponsesRequest;

export const getResponsesFuntionCallOutput = (callId: string, output: string): HarmlessFunctionCallOutputItem =>
  ({
    type: OpenAIResponseFunctionToolCallOutput.type.FUNCTION_CALL_OUTPUT,
    call_id: callId,
    output,
  }) satisfies OpenAIResponseFunctionToolCallOutput;

export const getResponsesToolCalls = (response: HarmlessResponseResult): HarmlessOutputItemFunctionCall[] => response.output.filter((item) => item.type === 'function_call');

export const extractResponsesReasoning = (response: HarmlessResponseResult) =>
  response.output
    .filter((item) => item.type === 'reasoning')
    .flatMap((item) => item.summary ?? [])
    .map((s) => s.text)
    .filter(Boolean);

export const extractResponsesReasoningContent = (response: HarmlessResponseResult): string[] =>
  response.output
    .filter((item) => item.type === 'reasoning')
    .flatMap((item: any) => item.content ?? [])
    .filter((part: any) => part?.type === 'reasoning_text' && typeof part?.text === 'string')
    .map((part: any) => part.text as string);

export const extractResponsesText = (response: HarmlessResponseResult) => {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) {
    return response.output_text;
  }

  const messages = Array.isArray(response?.output) ? response.output.filter((item) => item?.type === 'message') : [];

  const textPart = messages
    .flatMap((message) => (Array.isArray(message?.content) ? message.content : []))
    .find((part) => part?.type === 'output_text' && 'text' in part && typeof part?.text === 'string');

  return textPart && 'text' in textPart ? textPart.text : null;
};

export const fetchResponsesAPI = async ({
  conversation,
  model,
  tools,
  schema,
  plugins,
  instructions,
  maxOutputTokens,
  toolChoice,
  reasoning,
}: HarmlessResponsesParams): Promise<HarmlessResponseResult> => {
  const request: ResponsesRequest = {
    model: resolveAIModel(model),
    input: conversation as unknown as Inputs,
    text: { format: schema },
    tool_choice: toolChoice,
    instructions: instructions,
    max_output_tokens: maxOutputTokens,
    reasoning: reasoning ?? { effort: ReasoningEffort.MEDIUM, summary: ReasoningSummaryVerbosity.AUTO, enabled: true },
  };

  if (tools.length > 0) {
    request.tools = tools;
  }

  if (plugins.length > 0) {
    request.plugins = plugins;
  }

  const data = (await fetchWithRetry(OPENROUTER_RESPONSE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      ...OPENROUTER_EXTRA_HEADERS,
    },
    body: JSON.stringify(request),
  })) as HarmlessResponseResult;

  return data;
};

export const fetchWebSearchResponsesAPI = async ({ model, tools, query, maxOutputTokens }: HarmlessWebSearchResponsesParams): Promise<HarmlessResponseResult> => {
  const request: ResponsesRequest = {
    model: resolveAIModel(model),
    input: [toInputMessage('user', query)] as unknown as Inputs,
    tools,
    max_output_tokens: maxOutputTokens,
  };

  if (tools.length > 0) {
    request.tools = tools;
  }

  const data = (await fetchWithRetry(OPENROUTER_RESPONSE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      ...OPENROUTER_EXTRA_HEADERS,
    },
    body: JSON.stringify(request),
  })) as HarmlessResponseResult;

  return data;
};

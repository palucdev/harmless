/**
 * Token usage statistics tracker.
 */

import { log as clackLog } from '@clack/prompts';
import type { OpenAIResponsesUsage } from '../../generated/models/OpenAIResponsesUsage';

let totalTokens = { input: 0, output: 0, requests: 0 };

export const recordUsage = (usage?: OpenAIResponsesUsage) => {
  if (!usage) return;
  totalTokens.input += usage.input_tokens || 0;
  totalTokens.output += usage.output_tokens || 0;
  totalTokens.requests += 1;
};

export const getStats = () => ({ ...totalTokens });

export const logStats = () => {
  const { input, output, requests } = totalTokens;
  clackLog.info(`${requests} requests | ${input} in | ${output} out | ${input + output} total tokens`);
};

export const resetStats = () => {
  totalTokens = { input: 0, output: 0, requests: 0 };
};

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedTokens: number;
}

export const emptyUsage = (): TokenUsage => ({
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  cachedTokens: 0,
});

export const addUsage = (a: TokenUsage, b: TokenUsage): TokenUsage => ({
  inputTokens: a.inputTokens + b.inputTokens,
  outputTokens: a.outputTokens + b.outputTokens,
  totalTokens: a.totalTokens + b.totalTokens,
  cachedTokens: a.cachedTokens + b.cachedTokens,
});

import type { InputMessageItem, OpenAIResponseFunctionToolCallOutput, OutputItems } from '../../generated';

export type AgentConversationItem = InputMessageItem | OutputItems | OpenAIResponseFunctionToolCallOutput;

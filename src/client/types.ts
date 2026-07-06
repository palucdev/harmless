import type { InputMessageItem } from '../../generated/models/InputMessageItem';
import type { OpenAIResponseFunctionToolCallOutput } from '../../generated/models/OpenAIResponseFunctionToolCallOutput';
import type { OutputItems } from '../../generated/models/OutputItems';

export type AgentConversationItem = InputMessageItem | OutputItems | OpenAIResponseFunctionToolCallOutput;

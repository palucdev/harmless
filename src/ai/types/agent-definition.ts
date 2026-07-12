import type { FormatJsonSchemaConfig } from '../../../generated/models/FormatJsonSchemaConfig';
import type { ReasoningConfig } from '../../../generated/models/ReasoningConfig';
import type { ToolDefinition } from './tool-definition';

export interface AgentDefinition {
  name: string;
  description: string;
  defaultModel: string;
  tools: ToolDefinition[];
  subAgents: string[];
  systemPrompt: string;
  stepLimit: number;
  schema?: FormatJsonSchemaConfig;
  reasoning?: ReasoningConfig;
  skills?: string[];
}

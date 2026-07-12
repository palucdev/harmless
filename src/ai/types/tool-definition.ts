import type { FunctionTool } from '../../../generated/models/FunctionTool';

export interface ToolDefinition {
  tool: FunctionTool;
  handler: (args: unknown) => Promise<unknown>;
}

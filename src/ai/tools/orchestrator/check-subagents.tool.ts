import { FunctionTool } from '../../../../generated/models/FunctionTool';
import type { ToolDefinition } from '../../types/tool-definition';
import { getRunningSubagentsCount } from '../../agent/agent-spawner';

const checkSubagentsTool: FunctionTool = {
  type: FunctionTool.type.FUNCTION,
  name: 'check-subagents',
  description: 'Check how many subagents are currently running.',
  strict: true,
  parameters: {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  },
};

export const checkSubagentsToolDefinition: ToolDefinition = {
  tool: checkSubagentsTool,
  handler: async () => {
    return { runningSubagentsCount: getRunningSubagentsCount() };
  },
};

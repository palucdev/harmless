import { FunctionTool } from '../../../../generated/models/FunctionTool';
import type { ToolDefinition } from '../../types/tool-definition';

const delegateTool: FunctionTool = {
  type: FunctionTool.type.FUNCTION,
  name: 'delegate',
  description: 'Delegate one or more tasks to subagents. To run multiple subagents in parallel, provide them in the `tasks` array. This is highly recommended for independent tasks.',
  parameters: {
    type: 'object',
    properties: {
      tasks: {
        type: 'array',
        description: 'Array of tasks to delegate. Provide multiple tasks to run them concurrently.',
        items: {
          type: 'object',
          properties: {
            agent: { type: 'string', description: 'Name of the agent to delegate to' },
            task: { type: 'string', description: 'Task description to delegate' },
          },
          required: ['agent', 'task'],
        },
      },
    },
    required: ['tasks'],
  },
};

export const delegateToolDefinition: ToolDefinition = {
  tool: delegateTool,
  handler: async (args: any) => {
    return { status: 'delegated', ...args };
  },
};


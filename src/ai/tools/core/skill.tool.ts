import { FunctionTool } from '../../../../generated/models/FunctionTool';
import type { ToolDefinition } from '../../types/tool-definition';

export const useSkillTool: FunctionTool = {
  type: FunctionTool.type.FUNCTION,
  name: 'use_skill',
  description: `Fetches the detailed instructions for a specific skill and appends them to your system context.
    Call this tool when you need to know how to perform a specialized task.
    After the tool returns, read the newly loaded instructions and execute the task yourself.
    Note: This tool does not perform the action for you; it only provides the instructions.`,
  parameters: {
    type: 'object',
    properties: {
      skillName: {
        type: 'string',
        description: 'The exact name of the skill to load',
      },
    },
    required: ['skillName'],
  },
  strict: false,
};

export const useSkillToolDefinition: ToolDefinition = {
  tool: useSkillTool,
  handler: async (args: any) => {
    return { status: 'skill loaded', skillName: args.skillName };
  },
};

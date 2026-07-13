import { FunctionTool } from '../../../../generated/models/FunctionTool.js';
import type { ToolDefinition } from '../../types/tool-definition.js';

const dateTimeTool: FunctionTool = {
  type: FunctionTool.type.FUNCTION,
  name: 'get_current_date_time',
  description: "Get the current date and time from the local machine. Use this to determine the current time, day, or date for any tasks requiring time awareness.",
  parameters: {
    type: 'object',
    properties: {},
  },
};

const dateTimeHandler = async () => {
  const now = new Date();
  return {
    kind: 'date_time_response',
    iso: now.toISOString(),
    local: now.toString(),
    timestamp: now.getTime(),
    timezoneOffset: now.getTimezoneOffset(),
  };
};

export const dateTimeToolDefinition: ToolDefinition = {
  tool: dateTimeTool,
  handler: async () => dateTimeHandler(),
};

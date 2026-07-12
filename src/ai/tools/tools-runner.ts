import type { FunctionCallOutputItem } from '../../../generated/models/FunctionCallOutputItem';
import type { FunctionTool } from '../../../generated/models/FunctionTool';
import { OpenAIResponseFunctionToolCallOutput } from '../../../generated/models/OpenAIResponseFunctionToolCallOutput';
import type { OutputItemFunctionCall } from '../../../generated/models/OutputItemFunctionCall';
import { AgentEventEmitter } from '../../memory/events/agent-event-emitter';
import { EventTypes } from '../../memory/events/event-types';
import type { ToolDefinition } from '../types/tool-definition';

export class ToolRunner {
  private readonly tools: ToolDefinition[];

  constructor(tools: ToolDefinition[]) {
    this.tools = tools;
  }

  public getTools = (): FunctionTool[] => {
    const tools = this.tools.map((toolDefinition) => toolDefinition.tool);
    return tools;
  };

  private getHandler = (toolName: string) => {
    const tool = this.tools.find((value: ToolDefinition) => value.tool.name == toolName);
    if (tool) {
      return tool.handler;
    }
  };

  public runTool = async (toolCall: OutputItemFunctionCall, sessionId: number): Promise<FunctionCallOutputItem> => {
    try {
      const args = JSON.parse(toolCall.arguments);

      AgentEventEmitter.emit(EventTypes.TOOL_PRE_USE, { sessionId, toolName: toolCall.name, callId: toolCall.call_id, args });

      const handler = this.getHandler(toolCall.name);
      if (!handler) throw new Error(`Unknown tool: ${toolCall.name}`);
      const result = await handler(args);

      const output = JSON.stringify(result);
      AgentEventEmitter.emit(EventTypes.TOOL_POST_USE, { sessionId, toolName: toolCall.name, callId: toolCall.call_id, output, status: 'success' });

      return { type: OpenAIResponseFunctionToolCallOutput.type.FUNCTION_CALL_OUTPUT, call_id: toolCall.call_id, output };
    } catch (err) {
      const error = err as Error;
      const output = JSON.stringify({ error: error.message });
      AgentEventEmitter.emit(EventTypes.TOOL_POST_USE, { sessionId, toolName: toolCall.name, callId: toolCall.call_id, output, status: 'error' });

      return { type: OpenAIResponseFunctionToolCallOutput.type.FUNCTION_CALL_OUTPUT, call_id: toolCall.call_id, output };
    }
  };
}

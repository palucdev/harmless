import { extractResponsesReasoning, extractResponsesReasoningContent } from '../../client/responses-client';
import { recordUsage } from '../../client/token-stats';
import log from '../../repl/interface/logger';
import { truncate } from '../../repl/interface/utils';
import { AgentEventEmitter } from './agent-event-emitter';
import { EventTypes } from './event-types';
import type { AgentEvent, ToolPreCallPayload, ToolPostCallPayload, AgentStartedPayload, AgentCompletedPayload, ModelRequestPayload, ModelResponsePayload } from './types';

export const createLogsWriter = (): (() => void) => {
  const handler = (event: AgentEvent) => {
    switch (event.type) {
      case EventTypes.TOOL_PRE_USE:
        const toolCallData = event.data as ToolPreCallPayload;
        log.tool(toolCallData.toolName, toolCallData.args);
        break;
      case EventTypes.TOOL_POST_USE:
        const toolResultData = event.data as ToolPostCallPayload;
        let output = toolResultData.output;
        if (toolResultData.toolName.startsWith('fs_') && typeof output === 'string') {
          output = truncate(output, 200);
        }
        log.toolResult(toolResultData.toolName, toolResultData.status === 'success', output);
        break;
      case EventTypes.AGENT_STARTED:
        const agentStartedData = event.data as AgentStartedPayload;
        const startIdSuffix = agentStartedData.subagentId ? ` #${agentStartedData.subagentId}` : '';
        log.info(`[${agentStartedData.agentName}${startIdSuffix}] Starting (depth: ${agentStartedData.depth})`);
        break;
      case EventTypes.AGENT_COMPLETED:
        const agentCompletedData = event.data as AgentCompletedPayload;
        const compIdSuffix = agentCompletedData.subagentId ? ` #${agentCompletedData.subagentId}` : '';

        if (agentCompletedData.errored) {
          log.info(`[${agentCompletedData.agentName}${compIdSuffix}] Errored`);
          log.error('Error', agentCompletedData.response);
        } else {
          log.info(`[${agentCompletedData.agentName}${compIdSuffix}] Completed`);
        }
        break;
      case EventTypes.MODEL_REQUEST:
        const modelRequestData = event.data as ModelRequestPayload;
        log.api(modelRequestData.step, modelRequestData.msgCount);
        break;
      case EventTypes.MODEL_RESPONSE:
        const modelResponseData = event.data as ModelResponsePayload;
        log.apiDone(modelResponseData.responseResult.usage);
        recordUsage(modelResponseData.responseResult.usage);
        log.reasoning(extractResponsesReasoningContent(modelResponseData.responseResult));
        log.reasoning(extractResponsesReasoning(modelResponseData.responseResult));
        break;
    }
  };

  return AgentEventEmitter.subscribe(handler);
};

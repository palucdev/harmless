import { AgentEventEmitter } from '../events/agent-event-emitter';
import { EventTypes } from '../events/event-types';
import type { AgentCompletedPayload, AgentEvent, AgentStartedPayload, ModelRequestPayload, ModelResponsePayload, SkillOnLoadPayload, ToolPostCallPayload, ToolPreCallPayload } from '../events/types';
import { HookRegistry } from './hook-registry';

export const createHookRunner = (): (() => void) => {
  const handler = (event: AgentEvent) => {
    switch (event.type) {
      case EventTypes.TOOL_PRE_USE:
        const toolCallData = event.data as ToolPreCallPayload;
        HookRegistry.executeHooks(EventTypes.TOOL_PRE_USE, toolCallData);
        break;

      case EventTypes.TOOL_POST_USE:
        const toolResultData = event.data as ToolPostCallPayload;
        HookRegistry.executeHooks(EventTypes.TOOL_POST_USE, toolResultData);
        break;

      case EventTypes.AGENT_STARTED:
        const agentStartedData = event.data as AgentStartedPayload;
        HookRegistry.executeHooks(EventTypes.AGENT_STARTED, agentStartedData);
        break;

      case EventTypes.AGENT_COMPLETED:
        const agentCompletedData = event.data as AgentCompletedPayload;
        HookRegistry.executeHooks(EventTypes.AGENT_COMPLETED, agentCompletedData);
        break;

      case EventTypes.MODEL_REQUEST:
        const modelRequestData = event.data as ModelRequestPayload;
        HookRegistry.executeHooks(EventTypes.MODEL_REQUEST, modelRequestData);
        break;

      case EventTypes.MODEL_RESPONSE:
        const modelResponseData = event.data as ModelResponsePayload;
        HookRegistry.executeHooks(EventTypes.MODEL_RESPONSE, modelResponseData);
        break;

      case EventTypes.SKILL_ON_LOAD:
        const skillOnLoadData = event.data as SkillOnLoadPayload;
        HookRegistry.executeHooks(EventTypes.SKILL_ON_LOAD, skillOnLoadData);
        break;
    }
  };

  return AgentEventEmitter.subscribe(handler);
};

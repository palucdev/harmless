import type { AgentConversationItem } from '@/client/responses-client';
import { EventTypes } from '../events/event-types';
import type { AgentEvent, MessageAddedPayload, TokensRecordedPayload, ToolPostCallPayload, TurnCompletedPayload } from '../events/types';
import type { SessionRepository } from './session-repository';
import { AgentEventEmitter } from '../events/agent-event-emitter';

export const createSessionWriter = (db: SessionRepository): (() => void) => {
  const handler = (event: AgentEvent): void => {
    switch (event.type) {
      case EventTypes.MESSAGE_ADDED: {
        const { sessionId, item } = event.data as MessageAddedPayload;
        const session = db.getSession(sessionId);
        if (!session) break;
        db.saveConversationItem(sessionId, item, db.getNextSequence(sessionId));
        break;
      }

      case EventTypes.TOOL_POST_USE: {
        const { sessionId, callId, output, status } = event.data as ToolPostCallPayload;
        const session = db.getSession(sessionId);
        if (!session) break;
        const item = {
          type: 'function_call_output',
          call_id: callId,
          output,
          status: status === 'success' ? 'completed' : 'incomplete',
        } as AgentConversationItem;
        db.saveConversationItem(sessionId, item, db.getNextSequence(sessionId));
        break;
      }

      case EventTypes.AGENT_COMPLETED: {
        const { sessionId } = event.data as TurnCompletedPayload;
        const session = db.getSession(sessionId);
        if (session) {
          db.updateSession(sessionId, { turn_count: session.turn_count + 1 });
        }
        break;
      }

      case EventTypes.TOKENS_RECORDED: {
        const { sessionId, inputTokens, outputTokens } = event.data as unknown as TokensRecordedPayload;
        const session = db.getSession(sessionId);
        if (!session) break;
        db.updateTokenUsage(sessionId, inputTokens, outputTokens);
        break;
      }
    }
  };

  return AgentEventEmitter.subscribe(handler);
};

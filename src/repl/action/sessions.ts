import type { AgentDefinition } from '@/ai/types/agent-definition';
import type { SessionRepository } from '@/lifecycle/session/session-repository';
import * as p from '@clack/prompts';
import { printConversationHistory, showSessionTable } from '../interface/ui';
import { AgentEventEmitter } from '@/lifecycle/events/agent-event-emitter';
import { EventTypes } from '@/lifecycle/events/event-types';
import { newSession } from './new-session';

export const handleSessions = async (currentSessionId: number, sessionRepository: SessionRepository, currentAgentDefinition: AgentDefinition, model: string) => {
  const sessions = sessionRepository.listSessions(20);
  if (sessions.length === 0) {
    p.log.info('No sessions found.');
    return;
  }
  showSessionTable(sessions);

  const sessionAction = await p.select({
    message: 'Session action:',
    options: [
      { value: 'load', label: 'Load session' },
      { value: 'delete', label: 'Delete session' },
      { value: 'delete_all', label: 'Delete all (except current)' },
      { value: 'back', label: 'Back' },
    ],
  });

  if (p.isCancel(sessionAction) || sessionAction === 'back') return;

  if (sessionAction === 'load') {
    const idInput = await p.text({ message: 'Session ID to load:' });
    if (p.isCancel(idInput)) return;
    const id = parseInt(idInput as string);
    if (isNaN(id)) {
      p.log.warn('Invalid session ID');
      return;
    }
    const session = sessionRepository.getSession(id);
    if (!session) {
      p.log.warn(`Session ${id} not found`);
      return;
    }
    const conversation = sessionRepository.compactSession(id);
    printConversationHistory(conversation);
    sessionRepository.updateSession(id, { status: 'active' });
    const previousSessionId = currentSessionId;
    currentSessionId = id;
    AgentEventEmitter.emit(EventTypes.SESSION_SWITCHED, { fromSessionId: previousSessionId, toSessionId: id });

    p.log.success(`Loaded session ${id}: ${session.title}`);

    await newSession(currentAgentDefinition, currentSessionId, conversation);
  }

  if (sessionAction === 'delete') {
    const idInput = await p.text({ message: 'Session ID to delete:' });
    if (p.isCancel(idInput)) return;
    const id = parseInt(idInput as string);
    if (isNaN(id)) {
      p.log.warn('Invalid session ID');
      return;
    }
    if (id === currentSessionId) {
      p.log.warn('Cannot delete the current active session');
      return;
    }
    const deleted = sessionRepository.deleteSession(id);
    if (deleted) {
      p.log.success(`Deleted session ${id}`);
    } else {
      p.log.warn(`Session ${id} not found`);
    }
  }

  if (sessionAction === 'delete_all') {
    const confirmed = await p.confirm({ message: 'Delete all sessions except current?' });
    if (p.isCancel(confirmed) || !confirmed) return;
    const deleted = sessionRepository.deleteAllSessions(currentSessionId);
    p.log.success(`Deleted ${deleted} session${deleted !== 1 ? 's' : ''}`);
  }
};

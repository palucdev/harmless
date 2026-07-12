// ---------------------------------------------------------------------------
// Typed event payloads
// ---------------------------------------------------------------------------

import type { AgentConversationItem, HarmlessResponseResult } from '../../client/responses-client';
import type { EventTypes } from './event-types';

export interface SessionCreatedPayload {
  sessionId: number;
  title: string;
  agentName: string;
  model: string;
}

export interface SessionSwitchedPayload {
  fromSessionId: number;
  toSessionId: number;
}

export interface SessionCompletedPayload {
  sessionId: number;
}

export interface MessageAddedPayload {
  sessionId: number;
  item: AgentConversationItem;
  sequence: number;
}

export interface AgentStartedPayload {
  agentName: string;
  sessionId: number;
  query: string;
  depth: number;
}

export interface AgentCompletedPayload {
  agentName: string;
  sessionId: number;
  response: string;
  itemCount: number;
  errored: boolean;
}

export interface ModelRequestPayload {
  agentName: string;
  step: string;
  msgCount: number;
  sessionId: number;
  query: string;
}

export interface ModelResponsePayload {
  sessionId: number;
  responseResult: HarmlessResponseResult;
}

export interface ToolPreCallPayload {
  sessionId: number;
  toolName: string;
  callId: string;
  args: Record<string, unknown>;
}

export interface ToolPostCallPayload {
  sessionId: number;
  toolName: string;
  callId: string;
  output: string;
  status: 'success' | 'error';
}

export interface TokensRecordedPayload {
  sessionId: number;
  inputTokens: number;
  outputTokens: number;
}

export type EventPayload = MessageAddedPayload | ModelRequestPayload | ModelResponsePayload | AgentStartedPayload | AgentCompletedPayload | ToolPreCallPayload | ToolPostCallPayload;

export interface AgentEvent {
  seq: number;
  type: EventTypes; // SessionEventType | (string & {})
  time: string;
  data: EventPayload;
}

export type AgentEventListener = (event: AgentEvent) => void | Promise<void>;

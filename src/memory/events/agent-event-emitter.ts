import type { EventTypes } from './event-types';
import type { AgentEvent, AgentEventListener, EventPayload } from './types';

export class AgentEventEmitter {
  static instance: AgentEventEmitter;

  private _seq = 0;
  private listeners = new Set<AgentEventListener>();
  private buffer: AgentEvent[] = [];
  private MAX_BUFFER = 500;

  private constructor() {}

  public static initialize = (): AgentEventEmitter => {
    if (!AgentEventEmitter.instance) {
      AgentEventEmitter.instance = new AgentEventEmitter();
    }

    return AgentEventEmitter.instance;
  };

  public static emit = (type: EventTypes, data: EventPayload): void => {
    const emitter: AgentEventEmitter = AgentEventEmitter.instance;

    const event: AgentEvent = {
      seq: ++emitter._seq,
      type,
      time: new Date().toISOString(),
      data: data as EventPayload,
    };

    emitter.buffer.push(event);
    if (emitter.buffer.length > emitter.MAX_BUFFER) {
      emitter.buffer.shift();
    }

    for (const listener of emitter.listeners) {
      try {
        const result = listener(event);
        if (result instanceof Promise) {
          result.catch((err) => console.error('[events] async listener error:', err));
        }
      } catch (err) {
        console.error('[events] listener error:', err);
      }
    }
  };

  /**
   * Subscribe to events
   *
   * @param listener - event listener
   * @returns unsubscribe hook method
   */
  public static subscribe = (listener: AgentEventListener): (() => void) => {
    const emitter: AgentEventEmitter = AgentEventEmitter.instance;

    emitter.listeners.add(listener);
    return () => {
      emitter.listeners.delete(listener);
    };
  };

  public static replay = (): readonly AgentEvent[] => AgentEventEmitter.instance.buffer;
}

// ─────────────────────────────────────────────────────────────
// Agent Registry - Central storage for loaded agent definitions
// ─────────────────────────────────────────────────────────────

import type { AgentDefinition } from '../types/agent-definition';
import { loadAgentDefinitions } from './agent-loader';

export const AGENT_DEFINITIONS = new Map<string, AgentDefinition>();
let initialized = false;

/**
 * Initialize agent definitions by loading from .md files.
 * Must be called before using getAgentDefinition().
 * @throws Error if initialization fails
 */
export const initAgentDefinitions = async (): Promise<void> => {
  const loadedAgents = await loadAgentDefinitions();

  // Clear and repopulate the Map instead of reassigning
  AGENT_DEFINITIONS.clear();
  for (const [name, definition] of loadedAgents) {
    AGENT_DEFINITIONS.set(name, definition);
  }

  initialized = true;
};

/**
 * Get an agent definition by name.
 * @param name - Agent name (e.g., 'assistant', 'route-planner')
 * @returns AgentDefinition if found, undefined otherwise
 * @throws Error if called before initAgentDefinitions()
 */
export const getAgentDefinition = (name: string): AgentDefinition | undefined => {
  if (!initialized) {
    throw new Error('Agent definitions not initialized. Call initAgentDefinitions() first.');
  }

  return AGENT_DEFINITIONS.get(name);
};

export const getAgentDefinitions = (): AgentDefinition[] => {
  if (!initialized) {
    throw new Error('Agent definitions not initialized. Call initAgentDefinitions() first.');
  }

  return Array.from(AGENT_DEFINITIONS.values());
};

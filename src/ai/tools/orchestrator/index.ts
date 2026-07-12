import type { ToolDefinition } from '../../types/tool-definition';
import { delegateToolDefinition } from './delegate.tool';
import { checkSubagentsToolDefinition } from './check-subagents.tool';
import { ToolsRegistry } from '../tools-registry';

export const orchestrateToolDefinitions: ToolDefinition[] = [
  delegateToolDefinition,
  checkSubagentsToolDefinition,
];

/**
 * Register all filesystem tool groups with the registry.
 * Should be called during application startup.
 */
export const registerOrchestratorTools = async (): Promise<void> => {
  ToolsRegistry.registerToolGroup('orchestrator', orchestrateToolDefinitions);
};

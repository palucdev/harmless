import { ToolsRegistry } from '../tools-registry';
import { requestUserToolDefinition } from './user.tool';
import { webSearchToolDefinition } from './web-search.tool';

/**
 * Register all core tool groups with the registry.
 * Should be called during application startup.
 */
export const registerCoreTools = async (): Promise<void> => {
  ToolsRegistry.registerToolGroup('core', [webSearchToolDefinition, requestUserToolDefinition]);
};

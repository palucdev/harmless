import { ToolsRegistry } from '../tools-registry';

/**
 * Register all core tool groups with the registry.
 * Should be called during application startup.
 */
export const registerCoreTools = (): void => {
  ToolsRegistry.registerToolGroup('core', []);
};

import { ToolsRegistry } from '../tools-registry';
import { dateTimeToolDefinition } from './date-time.tool';
import { useSkillToolDefinition } from './skill.tool';
import { requestUserToolDefinition } from './user.tool';
import { webSearchToolDefinition } from './web-search.tool';

/**
 * Register all core tool groups with the registry.
 * Should be called during application startup.
 */
export const registerCoreTools = async (): Promise<void> => {
  ToolsRegistry.registerToolGroup('core', [webSearchToolDefinition, requestUserToolDefinition, useSkillToolDefinition, dateTimeToolDefinition]);
};

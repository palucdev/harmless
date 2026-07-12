// ─────────────────────────────────────────────────────────────
// Tool Registry - Central mapping from string keys to tool definitions
// ─────────────────────────────────────────────────────────────

import type { ToolDefinition } from '../types/tool-definition';

export class ToolsRegistry {
  static instance: ToolsRegistry;
  private toolGroups = new Map<string, ToolDefinition[]>();

  private constructor() {}

  public static initialize = (): ToolsRegistry => {
    if (!ToolsRegistry.instance) {
      ToolsRegistry.instance = new ToolsRegistry();
    }

    return ToolsRegistry.instance;
  };

  /**
   * Register a tool group with the registry.
   * @param name - Unique identifier for the tool group
   * @param tools - Array of tool definitions to register
   * @throws Error if the tool group is already registered
   */
  public static registerToolGroup = (name: string, tools: ToolDefinition[]): void => {
    const toolGroups = ToolsRegistry.instance.toolGroups;
    if (toolGroups.has(name)) {
      throw new Error(`Tool group "${name}" is already registered`);
    }

    toolGroups.set(name, tools);
  };

  /**
   * Resolve tool groups by their keys, returning all tool definitions.
   * @param keys - Array of tool group names to resolve
   * @returns Flattened array of all tool definitions from the specified groups
   * @throws Error if any tool group is not found in the registry
   */
  public static resolveTools = (keys: string[]): ToolDefinition[] => {
    const resolved: ToolDefinition[] = [];
    const toolGroups = ToolsRegistry.instance.toolGroups;

    for (const key of keys) {
      const toolsGroup = toolGroups.get(key);

      if (toolsGroup) {
        resolved.push(...toolsGroup);
      } else {
        // Try to find individual tool by name across all groups
        let foundTool: ToolDefinition | undefined;
        for (const group of toolGroups.values()) {
          const match = group.find((t) => t.tool.name === key);
          if (match) {
            foundTool = match;
            break;
          }
        }

        if (foundTool) {
          resolved.push(foundTool);
        } else {
          const availableGroups = Array.from(toolGroups.keys()).join(', ');
          throw new Error(`Unknown tool group or individual tool "${key}". Available groups: ${availableGroups}`);
        }
      }
    }

    return resolved;
  };

  /**
   * Get all registered tool group names.
   * @returns Array of registered tool group names
   */
  public static getRegisteredGroups = (): string[] => {
    return Array.from(ToolsRegistry.instance.toolGroups.keys());
  };

  /**
   * Clear all registered tool groups (mainly for testing).
   */
  public static clearRegistry = (): void => {
    ToolsRegistry.instance.toolGroups.clear();
  };
}

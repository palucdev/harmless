import fs from 'fs/promises';
import path from 'path';
import { EventTypes } from '../events/event-types';
import { HookRegistry } from './hook-registry';

export interface HookAction {
  bash?: string;
  js?: string;
}

export type HooksConfig = Partial<Record<EventTypes | string, HookAction>>;

/**
 * Loads and parses the hook configuration file.
 * @param hooksFilePath The path to the hooks configuration file (default: 'hooks.json' in cwd)
 * @returns The parsed HooksConfig object
 */
export async function loadHooks(hooksFilePath: string = 'hooks.json'): Promise<HooksConfig> {
  try {
    const fullPath = path.resolve(process.cwd(), hooksFilePath);
    const content = await fs.readFile(fullPath, 'utf8');
    const parsed: HooksConfig = JSON.parse(content);

    // Register each hook with the HookRegistry
    for (const [eventName, hookConfig] of Object.entries(parsed)) {
      HookRegistry.registerHook(eventName, hookConfig as HookAction);
    }

    return parsed;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {};
    }
    console.error(`[Hooks] Error loading hooks configuration from ${hooksFilePath}:`, error.message);
    return {};
  }
}

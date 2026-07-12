import { execFile } from 'child_process';
import { promisify } from 'util';
import type { HookAction } from './hook-loader';
import type { EventPayload } from '../events/types';

const execFileAsync = promisify(execFile);

export class HookRegistry {
  static instance: HookRegistry;
  private hooks = new Map<string, HookAction[]>();

  private constructor() {}

  public static initialize = (): HookRegistry => {
    if (!HookRegistry.instance) {
      HookRegistry.instance = new HookRegistry();
    }

    return HookRegistry.instance;
  };

  /**
   * Register a hook action for a given event name.
   * @param eventName - The name of the event to hook into
   * @param action - The HookAction containing bash or js scripts to execute
   */
  public static registerHook = (eventName: string, action: HookAction): void => {
    const hooks = HookRegistry.instance.hooks;
    if (!hooks.has(eventName)) {
      hooks.set(eventName, []);
    }
    hooks.get(eventName)!.push(action);
  };

  /**
   * Get all registered actions for a specific event name.
   * @param eventName - The name of the event
   * @returns Array of HookActions
   */
  public static getHooks = (eventName: string): HookAction[] => {
    return HookRegistry.instance.hooks.get(eventName) || [];
  };

  /**
   * Execute hooks for a given event.
   * @param eventName - The name of the event
   * @param env - Optional environment variables to pass to the scripts
   */
  public static executeHooks = async (eventName: string, payload: EventPayload): Promise<void> => {
    const actions = HookRegistry.getHooks(eventName);

    for (const action of actions) {
      if (action.bash) {
        await HookRegistry.executeBash(eventName, action.bash, payload);
      }

      if (action.js) {
        await HookRegistry.executeJs(eventName, action.js, payload);
      }
    }
  };

  /**
   * Execute a bash script.
   */
  private static executeBash = async (eventName: string, script: string, payload: EventPayload): Promise<void> => {
    try {
      const sessionId = (payload as any).sessionId || '';
      const payloadStr = JSON.stringify(payload);
      
      const { stdout, stderr } = await execFileAsync('bash', [
        '-c',
        `${script} "$1" "$2" "$3"`,
        '--',
        eventName,
        String(sessionId),
        payloadStr
      ]);
      
      if (stdout) console.log(`[Hook: ${eventName} (bash)]\n${stdout.trim()}`);
      if (stderr) console.error(`[Hook: ${eventName} (bash) stderr]\n${stderr.trim()}`);
    } catch (error: any) {
      console.error(`[Hook: ${eventName} (bash)] Error executing script:`, error.message);
    }
  };

  /**
   * Execute a JS script using node.
   */
  private static executeJs = async (eventName: string, scriptPath: string, payload: EventPayload): Promise<void> => {
    try {
      const sessionId = (payload as any).sessionId || '';
      const payloadStr = JSON.stringify(payload);
      
      const { stdout, stderr } = await execFileAsync('node', [
        scriptPath,
        eventName,
        String(sessionId),
        payloadStr
      ]);

      if (stdout) console.log(`[Hook: ${eventName} (js)]\n${stdout.trim()}`);
      if (stderr) console.error(`[Hook: ${eventName} (js) stderr]\n${stderr.trim()}`);
    } catch (error: any) {
      console.error(`[Hook: ${eventName} (js)] Error executing script:`, error.message);
    }
  };

  /**
   * Get all registered event names.
   * @returns Array of registered event names
   */
  public static getRegisteredEvents = (): string[] => {
    return Array.from(HookRegistry.instance.hooks.keys());
  };

  /**
   * Clear all registered hooks (mainly for testing).
   */
  public static clearRegistry = (): void => {
    HookRegistry.instance.hooks.clear();
  };
}

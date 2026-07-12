import { AgentEventEmitter } from '../../memory/events/agent-event-emitter';
import { EventTypes } from '../../memory/events/event-types';
import { Agent } from './agent';
import { getAgentDefinition } from './agent-registry';

let nextSubagentId = 1;
let runningSubagentsCount = 0;

export const getRunningSubagentsCount = () => runningSubagentsCount;

export const spawnAgent = async (sessionId: number, depth: number, args: Record<string, unknown>) => {
  const agent = typeof args.agent === 'string' ? args.agent : '';
  const delegatedTask = typeof args.task === 'string' ? args.task : '';
  let output: string;
  let errored: boolean = false;

  const subagentId = String(nextSubagentId++);

  const subAgentDefinition = getAgentDefinition(agent);
  if (!subAgentDefinition) {
    output = JSON.stringify({ error: `Can't find agent definition for name ${agent}` });
    errored = true;
  } else {
    runningSubagentsCount++;
    try {
      const subResult = await new Agent(subAgentDefinition, subagentId).run(delegatedTask, [], sessionId, depth + 1);
      output = subResult.response;
    } catch (err) {
      output = err instanceof Error ? err.message : String(err);
      errored = true;
    } finally {
      runningSubagentsCount--;
    }
  }

  return output;
};

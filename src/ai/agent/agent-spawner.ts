import { AgentEventEmitter } from '../../memory/events/agent-event-emitter';
import { EventTypes } from '../../memory/events/event-types';
import { Agent } from './agent';
import { getAgentDefinition } from './agent-registry';

export const spawnAgent = async (sessionId: number, depth: number, args: Record<string, unknown>) => {
  const agent = typeof args.agent === 'string' ? args.agent : '';
  const delegatedTask = typeof args.task === 'string' ? args.task : '';
  let output: string;
  let errored: boolean = false;

  AgentEventEmitter.emit(EventTypes.AGENT_STARTED, { agentName: agent, sessionId, query: delegatedTask, depth });

  const subAgentDefinition = getAgentDefinition(agent);
  if (!subAgentDefinition) {
    output = JSON.stringify({ error: `Can't find agent definition for name ${agent}` });
    errored = true;
  } else {
    const subResult = await new Agent(subAgentDefinition).run(delegatedTask, [], sessionId, depth + 1);
    output = subResult.response;
  }

  AgentEventEmitter.emit(EventTypes.AGENT_COMPLETED, { agentName: agent, sessionId, response: output, itemCount: 0, errored });

  return output;
};

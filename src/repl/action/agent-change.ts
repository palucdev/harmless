import { log, select } from '@clack/prompts';
import { getAgentDefinition, getAgentDefinitions } from '../../ai/agent/agent-registry';
import type { AgentDefinition } from '../../ai/types/agent-definition';

export const handleAgentChange = async (): Promise<AgentDefinition | undefined> => {
  const agents = getAgentDefinitions();

  if (agents.length === 0) {
    log.info('No agents found');
    return;
  }

  log.info('Available agents:');
  agents.forEach((agent) => {
    log.info(agent.name);
  });

  const selectedAgentName = await select({
    message: 'Select agent',
    options: agents.map((agent) => ({
      value: agent.name,
      label: agent.name,
      hint: agent.description,
    })),
  });

  if (typeof selectedAgentName === 'string') {
    log.success(`Selected agent: ${selectedAgentName}`);
    return getAgentDefinition(selectedAgentName);
  }

  log.info('Agent selection cancelled');
  return undefined;
};

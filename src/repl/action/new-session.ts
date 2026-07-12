import * as p from '@clack/prompts';
import type { AgentConversationItem } from '../../client/responses-client';
import { Agent } from '../../ai/agent/agent';
import { showStats } from '../interface/ui';
import type { AgentDefinition } from '../../ai/types/agent-definition';

export const newSession = async (agentDefinition: AgentDefinition, currentSessionId: number): Promise<void> => {
  let conversation: AgentConversationItem[] = [];
  const agent: Agent = new Agent(agentDefinition);

  while (true) {
    const input = await p.text({
      message: 'Your message:',
      placeholder: 'Ask anything...',
      validate: (val) => {
        if (!val?.trim()) return 'Message cannot be empty';
      },
    });

    if (p.isCancel(input)) break;
    const userMessage = input as string;

    try {
      const s = p.spinner();
      s.start('🧠 Thinking...');

      const result = await agent.run(userMessage, conversation, currentSessionId);
      conversation = result.conversationHistory;

      s.stop('Done');

      showStats();
    } catch (err) {
      const error = err as Error;
      p.log.error(error.message);
    }
  }
};

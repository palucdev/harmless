import * as p from '@clack/prompts';
import type { AgentConversationItem } from '../../client/responses-client';
import { Agent } from '../../ai/agent/agent';
import { showStats } from '../interface/ui';
import log from '../interface/logger';
import type { AgentDefinition } from '../../ai/types/agent-definition';

export const newSession = async (agentDefinition: AgentDefinition, currentSessionId: number, history?: AgentConversationItem[]): Promise<void> => {
  let conversation: AgentConversationItem[] = history ?? [];
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

    const s = p.spinner();
    try {
      s.start('🧠 Thinking...');

      const result = await agent.run(userMessage, conversation, currentSessionId);
      conversation = result.conversationHistory;

      s.stop('Done');

      log.response(result.response);
      showStats();
    } catch (err) {
      s.stop('Error');
      const error = err as Error;
      p.log.error(error.message);
    }
  }
};

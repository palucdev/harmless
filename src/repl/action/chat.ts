import * as p from '@clack/prompts';
import type { AgentConversationItem } from '../../client/types';
import { showStats } from '../interface/ui';
import { run } from '../../ai/agent/chatAssistant';

export const basicChat = async (conversation: AgentConversationItem[], model: string, currentSessionId: number) => {
  const input = await p.text({
    message: 'Your message:',
    placeholder: 'Ask anything...',
    validate: (val) => {
      if (!val?.trim()) return 'Message cannot be empty';
    },
  });

  if (p.isCancel(input)) return;
  const userMessage = input as string;

  try {
    const s = p.spinner();
    s.start('Thinking...');

    const result = await run(userMessage, conversation, model);
    conversation = result.conversationHistory;

    s.stop('Response received');

    // Display response using stream API for professional look
    await p.stream.success(
      (function* () {
        yield result.response;
      })()
    );

    showStats();
  } catch (err) {
    const error = err as Error;
    p.log.error(error.message);
  }
};

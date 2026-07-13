import * as p from '@clack/prompts';
import { showStats } from '../interface/ui';
import { run } from '../../ai/agent/simple-chat-assistant';
import type { AgentConversationItem } from '../../client/responses-client';
import log from '../interface/logger';

export const simpleChat = async (model: string): Promise<void> => {
  let conversation: AgentConversationItem[] = [];

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
    s.start('🧠 Thinking...');

    const updatedConversation = await run(userMessage, conversation, model);
    conversation = updatedConversation;

    s.stop('Done');

    const lastMessage = updatedConversation[updatedConversation.length - 1]! as any;
    const responseText = lastMessage?.content?.find((c: any) => c.type === 'output_text')?.text ?? '';
    log.response(responseText);

    showStats();
  } catch (err) {
    const error = err as Error;
    p.log.error(error.message);
  }
};

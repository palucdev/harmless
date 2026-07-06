import * as p from '@clack/prompts';
import type { AgentConversationItem } from '../../client/types';
import { showStats } from '../interface/ui';
import { run } from '../../ai/agent/chatAssistant';
import type { OutputMessage } from '../../../generated/models/OutputMessage';

export const basicChat = async (conversation: AgentConversationItem[], model: string): Promise<AgentConversationItem[]> => {
  const input = await p.text({
    message: 'Your message:',
    placeholder: 'Ask anything...',
    validate: (val) => {
      if (!val?.trim()) return 'Message cannot be empty';
    },
  });

  if (p.isCancel(input)) {
    return conversation;
  }
  const userMessage = input as string;

  try {
    const s = p.spinner();
    s.start('Thinking...');

    const updatedConversation = await run(userMessage, conversation, model);
    conversation = updatedConversation;

    s.stop('Response received');

    // Display response using stream API for professional look
    await p.stream.success(
      (function* () {
        const responseMessage = updatedConversation[updatedConversation.length - 1]! as OutputMessage;
        const textPart = responseMessage.content.find((part) => part.type === 'output_text');
        if (textPart?.type === 'output_text') {
          yield textPart.text;
        }
      })()
    );

    showStats();
  } catch (err) {
    const error = err as Error;
    p.log.error(error.message);
  }

  return conversation;
};

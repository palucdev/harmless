import * as p from '@clack/prompts';
import { showHeader, showStats } from './interface/ui';
import type { AgentConversationItem } from '../client/types';
import { basicChat } from './action/chat';

const cleanup = async (markCompleted = true) => {
  // TOOD: implement cleanup after repl exit / session ending
};

export const runReplLoop = async (): Promise<void> => {
  let conversation: AgentConversationItem[] = [];
  const agentName = 'assistant';
  const model = process.env.DEFAULT_MODEL ?? 'openrouter/free';

  p.intro('Starting agent session...');
  showHeader(agentName, model, 1);

  while (true) {
    const action = await p.select({
      message: 'What would you like to do?',
      options: [
        { value: 'chat', label: 'Simple Chat', hint: 'basic conversation with LLM model' },
        { value: 'agent', label: 'Agent', hint: 'switch agent definition' },
        { value: 'skills', label: 'Skills', hint: 'enable / disable skils' },
        { value: 'sessions', label: 'Sessions', hint: 'list & manage' },
        { value: 'clear', label: 'Clear', hint: 'reset conversation' },
        { value: 'exit', label: 'Exit' },
      ],
    });

    if (p.isCancel(action)) {
      showStats();
      p.outro('Session preserved. Goodbye!');
      await cleanup(false);
      return;
    }

    if (action === 'exit') {
      showStats();
      p.outro('Goodbye!');
      await cleanup();
      return;
    }

    if (action === 'chat') {
      await basicChat(conversation, model, 1);
      continue;
    }
  }
};

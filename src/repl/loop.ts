import * as p from '@clack/prompts';
import { showHeader, showStats } from './interface/ui';
import { simpleChat } from './action/simple-chat';
import { newSession } from './action/new-session';
import { createLogsWriter } from '../memory/events/logs-writer';
import { getAgentDefinition, initAgentDefinitions } from '../ai/agent/agent-registry';
import { handleAgentChange } from './action/agent-change';
import { AgentEventEmitter } from '../memory/events/agent-event-emitter';
import { registerCoreTools } from '../ai/tools/core';
import { registerFilesystemTools } from '../ai/tools/fs';
import { ToolsRegistry } from '../ai/tools/tools-registry';

const initializeApplication = async () => {
  // Initialize singletons
  AgentEventEmitter.initialize();
  ToolsRegistry.initialize();

  // Load data
  await registerCoreTools();
  await registerFilesystemTools();
  await initAgentDefinitions();
};

export const runReplLoop = async (): Promise<void> => {
  await initializeApplication();

  const model = process.env.DEFAULT_MODEL ?? 'openrouter/free';

  let currentAgentDefinition = getAgentDefinition('assistant')!;
  let currentSessionId = 1;

  const unsubscribeLogsWriter = createLogsWriter();

  const cleanup = async () => {
    // TOOD: implement cleanup after repl exit / session ending
    unsubscribeLogsWriter();
  };

  p.intro('Starting agent session...');
  showHeader(currentAgentDefinition.name, model, currentSessionId);

  while (true) {
    const action = await p.select({
      message: 'What would you like to do?',
      options: [
        { value: 'simpleChat', label: 'Simple Chat', hint: 'basic conversation with LLM model' },
        { value: 'newSession', label: 'New session', hint: 'start new session with full features' },
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
      await cleanup();
      return;
    }

    if (action === 'clear') {
      showStats();
      await cleanup();
      continue;
    }

    if (action === 'exit') {
      showStats();
      p.outro('Goodbye!');
      await cleanup();
      return;
    }

    if (action === 'agent') {
      const selectedAgent = await handleAgentChange();

      if (selectedAgent) {
        currentAgentDefinition = selectedAgent;
      }

      showHeader(currentAgentDefinition.name, model, 1);
    }

    if (action === 'simpleChat') {
      await simpleChat(model);
      continue;
    }

    if (action === 'newSession') {
      await newSession(currentAgentDefinition, currentSessionId);
      continue;
    }
  }
};

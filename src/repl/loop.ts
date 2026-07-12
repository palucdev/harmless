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
import { registerOrchestratorTools } from '../ai/tools/orchestrator';
import { ReplActions } from './action/actions';
import { handleSkills } from './action/skills';
import { loadSkillDefinitions } from '../ai/skills/skills-loader';
import SkillsRegistry from '../ai/skills/skills-registry';

const initializeApplication = async () => {
  // Initialize singletons
  AgentEventEmitter.initialize();
  ToolsRegistry.initialize();
  SkillsRegistry.initialize();

  // Load data
  await registerCoreTools();
  await registerFilesystemTools();
  await registerOrchestratorTools();

  // Load agents and skills
  await loadSkillDefinitions();
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
        { value: ReplActions.NEW_SESSION, label: 'New session', hint: 'start new session with full features' },
        { value: ReplActions.SIMPLE_CHAT, label: 'Simple Chat', hint: 'basic conversation with LLM model' },
        { value: ReplActions.AGENT, label: 'Agent', hint: 'switch agent definition' },
        { value: ReplActions.SKILLS, label: 'Skills', hint: 'enable / disable skils' },
        { value: ReplActions.SESSIONS, label: 'Sessions', hint: 'list & manage' },
        { value: ReplActions.CLEAR, label: 'Clear', hint: 'reset conversation' },
        { value: ReplActions.EXIT, label: 'Exit' },
      ],
    });

    if (p.isCancel(action)) {
      showStats();
      p.outro('Session preserved. Goodbye!');
      await cleanup();
      return;
    }

    if (action === ReplActions.CLEAR) {
      showStats();
      await cleanup();
      continue;
    }

    if (action === ReplActions.EXIT) {
      showStats();
      p.outro('Goodbye!');
      await cleanup();
      return;
    }

    if (action === ReplActions.AGENT) {
      const selectedAgent = await handleAgentChange();

      if (selectedAgent) {
        currentAgentDefinition = selectedAgent;
      }

      showHeader(currentAgentDefinition.name, model, 1);
    }

    if (action === ReplActions.SKILLS) {
      await handleSkills(currentAgentDefinition);
      continue;
    }

    if (action === ReplActions.SIMPLE_CHAT) {
      await simpleChat(model);
      continue;
    }

    if (action === ReplActions.NEW_SESSION) {
      await newSession(currentAgentDefinition, currentSessionId);
      continue;
    }
  }
};

import boxen from 'boxen';
import * as p from '@clack/prompts';
import { getStats } from '../../client/token-stats';
import type { AgentConversationItem } from '@/client/responses-client';

export const showHeader = (agentName: string, model: string, sessionId: number) => {
  console.log(
    boxen(`${agentName}  |  ${model}  |  session #${sessionId}`, {
      borderStyle: 'round',
      borderColor: 'cyan',
      padding: { top: 0, bottom: 0, left: 2, right: 2 },
      title: 'Harmless',
      titleAlignment: 'center',
    })
  );
};

export const showStats = () => {
  const { input, output, requests } = getStats();
  if (requests === 0) return;
  p.log.info(`${requests} requests | ${input} in | ${output} out | ${input + output} total tokens`);
};

export const showSessionTable = (sessions: any[]) => {
  const lines = sessions.map((s) => {
    const title = s.title.substring(0, 28).padEnd(28);
    const id = String(s.id).padStart(3);
    const turns = String(s.turn_count).padStart(3);
    const status = s.status === 'active' ? '\x1b[32m●\x1b[0m' : '\x1b[2m○\x1b[0m';
    return `${status} ${id}  ${title}  ${s.model.padEnd(11)}  ${turns} turns`;
  });
  console.log(boxen(lines.join('\n'), { borderStyle: 'round', borderColor: 'gray', padding: { top: 0, bottom: 0, left: 1, right: 1 }, title: 'Sessions', titleAlignment: 'left' }));
};

export const printConversationHistory = (conversation: AgentConversationItem[]) => {
  if (conversation.length === 0) return;

  const dim = '\x1b[2m';
  const reset = '\x1b[0m';
  const blue = '\x1b[34m';
  const green = '\x1b[32m';
  const yellow = '\x1b[33m';
  const cyan = '\x1b[36m';
  const gray = '\x1b[90m';

  const truncate = (text: string, max = 200): string => {
    const oneLine = text.replace(/\n/g, ' ').trim();
    return oneLine.length > max ? oneLine.substring(0, max) + '…' : oneLine;
  };

  p.log.step(`Session History ${dim}(${conversation.length} items)${reset}`);

  for (const item of conversation) {
    const type = (item as { type?: string }).type;

    if (type === 'message') {
      const role = (item as { role?: string }).role;

      if (role === 'user' || role === 'system' || role === 'developer') {
        // InputMessageItem
        const content = (item as { content?: { text?: string; type?: string }[] }).content;
        const text =
          content
            ?.filter((c) => c.type === 'input_text' && c.text)
            .map((c) => c.text)
            .join(' ') ?? '';
        const label = role === 'user' ? `${blue}▶ you${reset}` : `${cyan}▶ ${role}${reset}`;
        p.log.message(`${label}  ${dim}${truncate(text)}${reset}`);
      } else if (role === 'assistant') {
        // OutputMessage — DB loader converts output_text → input_text
        const content = (item as { content?: { text?: string; type?: string }[] }).content;
        const text =
          content
            ?.filter((c) => (c.type === 'output_text' || c.type === 'input_text') && c.text)
            .map((c) => c.text)
            .join(' ') ?? '';
        p.log.message(`${green}◀ assistant${reset}  ${dim}${truncate(text)}${reset}`);
      }
    } else if (type === 'function_call') {
      const name = (item as { name?: string }).name ?? 'unknown';
      p.log.message(`${yellow}⚡ tool${reset}  ${name} ${dim}(function_call)${reset}`);
    } else if (type === 'function_call_output') {
      const output = (item as { output?: string }).output ?? '';
      p.log.message(`${gray}↩ result${reset}  ${dim}${truncate(output, 120)}${reset}`);
    } else if (type === 'compaction') {
      p.log.message(`${cyan}⊘ compaction${reset}  ${dim}(context compressed)${reset}`);
    } else if (type === 'reasoning') {
      const summary = (item as { summary?: { text?: string }[] }).summary;
      const text = summary?.map((s) => s.text).filter(Boolean).join(' ') ?? '';
      if (text) {
        p.log.message(`${gray}🧠 reasoning${reset}  ${dim}${truncate(text)}${reset}`);
      }
    }
  }

  p.log.step('End of History');
};

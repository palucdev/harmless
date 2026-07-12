/**
 * Structured logger using @clack/prompts for beautiful TUI output.
 * Maintains the same API surface for backwards compatibility.
 */

import { log as clackLog } from '@clack/prompts';
import boxen from 'boxen';
import type { OpenAIResponsesUsage } from '../../../generated/models/OpenAIResponsesUsage';

// ── ANSI codes for styled inline fragments ──

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bgBlue: '\x1b[44m',
};

/** Get the usable width for text wrapping (terminal width minus clack's UI chrome). */
const getWidth = () => (process.stdout.columns || 100) - 6;

/** Strip ANSI escape codes to get the visible character length. */
const stripAnsi = (str: string): string => str.replace(/\x1b\[[0-9;]*m/g, '');

/** Word-wrap a string to fit the terminal, preserving existing newlines. */
const wrap = (text: string, width = getWidth()): string =>
  text
    .split('\n')
    .flatMap((line) => {
      const visible = stripAnsi(line);
      if (visible.length <= width) return [line];

      // Word-wrap long lines
      const words = line.split(' ');
      const wrapped: string[] = [];
      let current = '';
      let currentVisible = 0;

      for (const word of words) {
        const wordVisible = stripAnsi(word).length;
        if (currentVisible + (current ? 1 : 0) + wordVisible > width && current) {
          wrapped.push(current);
          current = word;
          currentVisible = wordVisible;
        } else {
          current = current ? `${current} ${word}` : word;
          currentVisible += (current.length > wordVisible ? 1 : 0) + wordVisible;
        }
      }
      if (current) wrapped.push(current);
      return wrapped;
    })
    .join('\n');

const timestamp = () => new Date().toLocaleTimeString('en-US', { hour12: false });
const ts = () => `${colors.dim}[${timestamp()}]${colors.reset}`;

const log = {
  info: (msg: string) => {
    clackLog.info(wrap(`${ts()} ${msg}`));
  },

  success: (msg: string) => clackLog.success(wrap(msg)),

  error: (title: string, msg: string) => clackLog.error(wrap(`${title} ${msg || ''}`)),

  warn: (msg: string) => clackLog.warn(wrap(msg)),

  start: (msg: string) => clackLog.step(wrap(msg)),

  box: (text: string) => {
    clackLog.message(
      boxen(wrap(text), {
        borderStyle: 'round',
        borderColor: 'cyan',
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
      })
    );
  },

  query: (q: string) => clackLog.message(wrap(q), { symbol: `${colors.bgBlue}${colors.white} Q ${colors.reset}` }),

  response: (r: string) => {
    clackLog.success(wrap(`${ts()} ${r}`));
  },

  api: (step: string, msgCount: number) => {
    clackLog.step(wrap(`${ts()} ${colors.magenta}◆${colors.reset} Step ${step} ${colors.dim}· ${msgCount} messages in context${colors.reset}`));
  },

  apiDone: (usage: OpenAIResponsesUsage) => {
    if (usage) {
      clackLog.info(`${colors.dim}📊 tokens: ${colors.cyan}${usage.input_tokens}${colors.dim} in / ${colors.cyan}${usage.output_tokens}${colors.dim} out${colors.reset}`);
    }
  },

  tool: (name: string, args: unknown) => {
    const argStr = JSON.stringify(args);
    clackLog.warn(wrap(`${ts()} ${colors.yellow}⚡${colors.reset} ${name} ${colors.dim}${argStr}${colors.reset}`));
  },

  toolResult: (name: string, success: boolean, output: string) => {
    const icon = success ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    clackLog.info(wrap(`${icon} ${colors.dim}[RESULT] ${output}${colors.reset}`));
  },

  vision: (path: string, question: string) => {
    clackLog.info(
      boxen(wrap(`${colors.blue}👁${colors.reset}  ${path}\n${colors.dim}Q: ${question}${colors.reset}`), {
        borderStyle: 'round',
        borderColor: 'blue',
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
        title: `Vision ${ts()}`,
        titleAlignment: 'left',
      })
    );
  },

  visionResult: (answer: string) => {
    clackLog.success(wrap(`${colors.dim}A: ${answer}${colors.reset}`));
  },

  reasoning: (summaries: string[]) => {
    if (!summaries?.length) return;
    const body = summaries
      .map((s) =>
        wrap(s)
          .split('\n')
          .map((line) => `${colors.gray}${colors.italic}${line}${colors.reset}`)
          .join('\n')
      )
      .join(`\n${colors.dim}───${colors.reset}\n`);
    clackLog.info(
      boxen(body, {
        borderStyle: 'round',
        borderColor: 'gray',
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
        title: `${colors.cyan}🧠 reasoning${colors.reset}`,
        titleAlignment: 'left',
        dimBorder: true,
      })
    );
  },

  // ── Search-specific logs ───────────────────────────────────

  searchHeader: (keywords: string, semantic: string) => {
    clackLog.info(
      boxen(wrap(`${colors.cyan}fts:${colors.reset}${colors.dim}      "${keywords}"${colors.reset}\n${colors.cyan}semantic:${colors.reset}${colors.dim} "${semantic}"${colors.reset}`), {
        borderStyle: 'round',
        borderColor: 'cyan',
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
        title: 'search',
        titleAlignment: 'left',
        dimBorder: true,
      })
    );
  },

  skillLoaded: (agentName: string, skillName: string) => {
    clackLog.info(wrap(`${ts()} ${colors.cyan}❖${colors.reset} [${agentName}] ${colors.dim}[SkillDefinition Loaded]${colors.reset} ${colors.white}${skillName}${colors.reset}`));
  },
};

export default log;

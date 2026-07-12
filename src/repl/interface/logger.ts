/**
 * Structured logger using @clack/prompts for beautiful TUI output.
 * Maintains the same API surface for backwards compatibility.
 */

import { log as clackLog } from '@clack/prompts';
import boxen from 'boxen';
import type { OpenAIResponsesUsage } from '../../../generated/models/OpenAIResponsesUsage';
import { truncate } from './utils';

// ── ANSI codes for internal/debug output that doesn't fit clack's model ──

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
};

const timestamp = () => new Date().toLocaleTimeString('en-US', { hour12: false });

const log = {
  info: (msg: string) => clackLog.info(msg),
  success: (msg: string) => clackLog.success(msg),
  error: (title: string, msg: string) => clackLog.error(`${title} ${msg || ''}`),
  warn: (msg: string) => clackLog.warn(msg),
  start: (msg: string) => clackLog.step(msg),

  box: (text: string) => {
    console.log(
      boxen(text, {
        borderStyle: 'round',
        borderColor: 'cyan',
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
      })
    );
  },

  query: (q: string) => clackLog.message(q, { symbol: `${colors.bgBlue}${colors.white} Q ${colors.reset}` }),
  response: (r: string) => {
    clackLog.message(truncate(r, 200), { symbol: `${colors.green} A ${colors.reset}` });
  },

  api: (step: string, msgCount: number) => {
    console.log(`${colors.dim}[${timestamp()}]${colors.reset} ${colors.magenta}◆${colors.reset} [INFO] ${step} (${msgCount} messages)`);
  },

  apiDone: (usage: OpenAIResponsesUsage) => {
    if (usage) {
      console.log(`${colors.dim}         tokens: ${usage.input_tokens} in / ${usage.output_tokens} out${colors.reset}`);
    }
  },

  tool: (name: string, args: unknown) => {
    const argStr = JSON.stringify(args);
    console.log(`${colors.dim}[${timestamp()}]${colors.reset} ${colors.yellow}⚡${colors.reset} [INFO] ${name} ${colors.dim}${truncate(argStr, 100)}${colors.reset}`);
  },

  toolResult: (name: string, success: boolean, output: string) => {
    const icon = success ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    console.log(`${colors.dim}         ${icon} [RESULT] ${truncate(output, 150)}${colors.reset}`);
  },

  vision: (path: string, question: string) => {
    console.log(`${colors.dim}[${timestamp()}]${colors.reset} ${colors.blue}👁${colors.reset} Vision: ${path}`);
    console.log(`${colors.dim}         Q: ${question}${colors.reset}`);
  },

  visionResult: (answer: string) => {
    console.log(`${colors.dim}         A: ${truncate(answer, 200)}${colors.reset}`);
  },

  reasoning: (summaries: string[]) => {
    if (!summaries?.length) return;
    console.log(`${colors.dim}         ${colors.cyan}reasoning:${colors.reset}`);
    for (const summary of summaries) {
      const lines = summary.split('\n');
      for (const line of lines) {
        console.log(`${colors.dim}           ${line}${colors.reset}`);
      }
    }
  },

  // ── Search-specific logs ───────────────────────────────────

  searchHeader: (keywords: string, semantic: string) => {
    console.log(`${colors.dim}         ${colors.cyan}fts:${colors.reset}${colors.dim}      "${keywords}"${colors.reset}`);
    console.log(`${colors.dim}         ${colors.cyan}semantic:${colors.reset}${colors.dim} "${semantic}"${colors.reset}`);
  },
};

export default log;

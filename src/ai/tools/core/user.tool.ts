import { randomUUID } from 'node:crypto';
import * as p from '@clack/prompts';
import { FunctionTool } from '../../../../generated/models/FunctionTool.js';
import type { ToolDefinition } from '../../types/tool-definition.js';

const requestUserTool: FunctionTool = {
  type: FunctionTool.type.FUNCTION,
  name: 'request_user',
  description:
    "Ask the user a question and wait for their response. Use this when you need clarification, confirmation, or a decision from the user before proceeding. Returns the user's typed answer.",
  parameters: {
    type: 'object',
    properties: {
      question: {
        type: 'string',
        description: 'The question to present to the user. Be specific and include options or context when relevant.',
      },
      wait_id: {
        type: 'string',
        description: 'An optional identifier for this interaction. Auto-generated if omitted.',
      },
    },
    required: ['question'],
  },
};

const requestUserHandler = async ({ question, wait_id }: { question: string; wait_id?: string }) => {
  if (!question) {
    return { kind: 'error', content: 'Error: question is required' };
  }

  question = question.trim();
  const waitId = wait_id ? wait_id.trim() : `wait-${randomUUID().slice(0, 8)}`;

  const answer = await p.text({
    message: `🧑 User input requested:\n${question}`,
    placeholder: 'Type your answer...',
  });

  if (p.isCancel(answer)) {
    return {
      kind: 'user_response',
      waitId,
      question,
      answer: '[User cancelled the request]',
      cancelled: true,
    };
  }

  return {
    kind: 'user_response',
    waitId,
    question,
    answer: (answer as string).trim(),
    cancelled: false,
  };
};

export const requestUserToolDefinition: ToolDefinition = {
  tool: requestUserTool,
  handler: (args) => requestUserHandler(args as { question: string; wait_id: string }),
};

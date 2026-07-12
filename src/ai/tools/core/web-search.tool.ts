import { FunctionTool } from '../../../../generated/models/FunctionTool';
import { OpenRouterWebSearchServerTool } from '../../../../generated/models/OpenRouterWebSearchServerTool';
import { resolveAIModel } from '../../../client';
import { extractResponsesText, fetchWebSearchResponsesAPI } from '../../../client/responses-client';
import type { ToolDefinition } from '../../types/tool-definition';

const webSearchTool: FunctionTool = {
  type: FunctionTool.type.FUNCTION,
  name: 'web_search',
  description: 'Search the web and return concise findings with sources.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query' },
    },
    required: ['query'],
  },
};

const webSearchHandler = async ({ query }: { query: string }) => {
  if (!query?.trim()) {
    return { kind: 'text', content: 'Error: query is required' };
  }
  query = query.trim();

  if (!process.env.WEB_SEARCH_MODEL) {
    return {
      kind: 'text',
      content: 'Error: WEB_SEARCH_MODEL environment variable is not set. Set it to a model that supports web search (e.g., gpt-4o, claude-3-5-sonnet-20241022)',
    };
  }

  const model = resolveAIModel(process.env.WEB_SEARCH_MODEL);

  try {
    const response = await fetchWebSearchResponsesAPI({
      query,
      model,
      tools: [{ type: OpenRouterWebSearchServerTool.type.OPENROUTER_WEB_SEARCH }],
      maxOutputTokens: 2048,
    });

    const text = extractResponsesText(response);
    if (text) return { kind: 'text', content: text };
    return { kind: 'text', content: 'Search completed but returned no text output.' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { kind: 'text', content: `Error: web search failed (${message})` };
  }
};

export const webSearchToolDefinition: ToolDefinition = {
  tool: webSearchTool,
  handler: (args) => webSearchHandler(args as { query: string }),
};

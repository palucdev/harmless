import { FunctionTool } from '../../../../generated/models/FunctionTool.js';
import type { ToolDefinition } from '../../types/tool-definition.js';
import { fsManageTool } from './fs-manage.tool.js';
import { fsReadTool } from './fs-read.tool.js';
import { fsSearchTool } from './fs-search.tool.js';
import { fsWriteTool } from './fs-write.tool.js';
import { ToolsRegistry } from '../tools-registry.js';

// ─────────────────────────────────────────────────────────────
// OpenResponses function tool definitions
// ─────────────────────────────────────────────────────────────

const fsReadFunctionTool: FunctionTool = {
  type: FunctionTool.type.FUNCTION,
  name: fsReadTool.name,
  description: fsReadTool.description,
  strict: false,
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Relative path to file or directory. Examples: "." (current dir), "docs/", "src/index.ts".',
      },
      mode: {
        type: 'string',
        enum: ['auto', 'tree', 'list', 'content'],
        description: 'Exploration mode: "auto" detects file vs directory, "tree" returns directories only with child counts, "list" returns files + directories, "content" reads file content.',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 2000,
        description: 'Max entries to return for directory listings (default 100).',
      },
      offset: {
        type: 'integer',
        minimum: 0,
        description: 'Skip the first N matching entries for directory listings (default 0).',
      },
      lines: {
        type: 'string',
        description: 'Limit file reading to specific lines. Format: "10" (single line), "10-50" (range).',
      },
      depth: {
        type: 'integer',
        minimum: 1,
        maximum: 20,
        description: 'Directory listing depth (default 1).',
      },
      details: {
        type: 'boolean',
        description: 'Include file details (size, modified time) in directory listings. Default false.',
      },
      types: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter directory listing by file type. Examples: ["ts", "js"], ["md"].',
      },
      glob: {
        type: 'string',
        description: 'Glob pattern filter for directory listings. Example: "**/*.ts".',
      },
      exclude: {
        type: 'array',
        items: { type: 'string' },
        description: 'Patterns to exclude. Example: ["**/test/**", "**/*.spec.ts"].',
      },
      respectIgnore: {
        type: 'boolean',
        description: 'Respect .gitignore and .ignore files. Default true.',
      },
    },
    required: ['path'],
    additionalProperties: false,
  },
};

const fsWriteFunctionTool: FunctionTool = {
  type: FunctionTool.type.FUNCTION,
  name: fsWriteTool.name,
  description: fsWriteTool.description,
  strict: false,
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Relative path to the file. For create: where to create. For update: file to modify.',
      },
      operation: {
        type: 'string',
        enum: ['create', 'update'],
        description: '"create" = make new file (fails if exists), "update" = modify existing file.',
      },
      lines: {
        type: 'string',
        description: 'REQUIRED for update. Target specific lines. Format: "10" (line 10), "10-15" (lines 10-15 inclusive).',
      },
      action: {
        type: 'string',
        enum: ['replace', 'insert_before', 'insert_after', 'delete_lines'],
        description: 'REQUIRED when operation="update". What to do: replace, insert_before, insert_after, or delete_lines.',
      },
      content: {
        type: 'string',
        description: 'The content to write. Required for create, replace, insert_before, insert_after.',
      },
      checksum: {
        type: 'string',
        description: 'Expected checksum of the current file (from previous fs_read). STRONGLY RECOMMENDED for updates.',
      },
      dryRun: {
        type: 'boolean',
        description: 'If true, returns a unified diff of what WOULD change without applying it.',
      },
      createDirs: {
        type: 'boolean',
        description: 'For create: whether to create parent directories if missing. Default true.',
      },
    },
    required: ['path', 'operation'],
    additionalProperties: false,
  },
};

const fsSearchFunctionTool: FunctionTool = {
  type: FunctionTool.type.FUNCTION,
  name: fsSearchTool.name,
  description: fsSearchTool.description,
  strict: false,
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Starting directory. Use "." for all mounts, or "vault/" for a specific mount.',
      },
      query: {
        type: 'string',
        description: 'Search term for filename matching and content search.',
      },
      target: {
        type: 'string',
        enum: ['all', 'filename', 'content'],
        description: 'What to search: "all" (default), "filename", or "content".',
      },
      patternMode: {
        type: 'string',
        enum: ['literal', 'regex', 'fuzzy'],
        description: 'How to interpret query: "literal" (default), "regex", or "fuzzy".',
      },
      caseInsensitive: {
        type: 'boolean',
        description: 'Ignore case in content search. Default false.',
      },
      wholeWord: {
        type: 'boolean',
        description: 'Match whole words only. Default false.',
      },
      multiline: {
        type: 'boolean',
        description: 'Allow matches to span multiple lines. Default false.',
      },
      types: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by file type. Examples: ["ts", "md"].',
      },
      glob: {
        type: 'string',
        description: 'Glob pattern filter. Example: "**/*.ts".',
      },
      exclude: {
        type: 'array',
        items: { type: 'string' },
        description: 'Patterns to exclude. Example: ["**/test/**"].',
      },
      depth: {
        type: 'integer',
        minimum: 1,
        maximum: 20,
        description: 'Max directory traversal depth. Default 5.',
      },
      maxResults: {
        type: 'integer',
        minimum: 1,
        maximum: 1000,
        description: 'Max results to return. Default 100.',
      },
      respectIgnore: {
        type: 'boolean',
        description: 'Respect .gitignore and .ignore files. Default true.',
      },
    },
    required: ['path', 'query'],
    additionalProperties: false,
  },
};

const fsManageFunctionTool: FunctionTool = {
  type: FunctionTool.type.FUNCTION,
  name: fsManageTool.name,
  description: fsManageTool.description,
  strict: false,
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['delete', 'rename', 'move', 'copy', 'mkdir', 'stat'],
        description: 'Operation: delete, rename (same mount), move (cross mounts), copy, mkdir, or stat.',
      },
      path: {
        type: 'string',
        description: 'Source file or directory path. Example: "vault/notes/old.md".',
      },
      target: {
        type: 'string',
        description: 'Destination path for rename/move/copy. Example: "vault/archive/old.md".',
      },
      recursive: {
        type: 'boolean',
        description: 'For mkdir: create parent directories. For copy/move: include subdirectories. Default false.',
      },
      force: {
        type: 'boolean',
        description: 'Overwrite if target exists. Default false.',
      },
    },
    required: ['operation', 'path'],
    additionalProperties: false,
  },
};

// ─────────────────────────────────────────────────────────────
// Tool array — drop into askOpenRouterWithParams as the tools argument
// ─────────────────────────────────────────────────────────────

export const fsTools: FunctionTool[] = [fsReadFunctionTool, fsWriteFunctionTool, fsSearchFunctionTool, fsManageFunctionTool];

// ─────────────────────────────────────────────────────────────
// Handlers map — keyed by tool name, used in buildNextConversation
// ─────────────────────────────────────────────────────────────

export const fsHandlers: Record<string, (args: unknown) => Promise<unknown>> = {
  [fsReadTool.name]: (args) => fsReadTool.handler(args),
  [fsWriteTool.name]: (args) => fsWriteTool.handler(args),
  [fsSearchTool.name]: (args) => fsSearchTool.handler(args),
  [fsManageTool.name]: (args) => fsManageTool.handler(args),
};

// ─────────────────────────────────────────────────────────────
// Named tool exports (for testing / direct use)
// ─────────────────────────────────────────────────────────────

export const tools = {
  fsRead: fsReadTool,
  fsSearch: fsSearchTool,
  fsWrite: fsWriteTool,
  fsManage: fsManageTool,
};

export const fsToolDefinitions: ToolDefinition[] = [
  { tool: fsReadFunctionTool, handler: (args) => fsReadTool.handler(args) },
  { tool: fsWriteFunctionTool, handler: (args) => fsWriteTool.handler(args) },
  { tool: fsSearchFunctionTool, handler: (args) => fsSearchTool.handler(args) },
  { tool: fsManageFunctionTool, handler: (args) => fsManageTool.handler(args) },
];

/**
 * Register all filesystem tool groups with the registry.
 * Should be called during application startup.
 */
export const registerFilesystemTools = async (): Promise<void> => {
  ToolsRegistry.registerToolGroup('fs', fsToolDefinitions);
};

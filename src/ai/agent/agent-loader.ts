import matter from 'gray-matter';
import { Glob } from 'bun';
import * as path from 'node:path';
import type { ToolDefinition } from '../types/tool-definition.js';
import type { AgentDefinition } from '../types/agent-definition.js';
import { ToolsRegistry } from '../tools/tools-registry.js';

// ─────────────────────────────────────────────────────────────
// Agent Loader - Parse .md files into AgentDefinition objects
// ─────────────────────────────────────────────────────────────

interface AgentFrontmatter {
  name: string;
  description: string;
  model?: string;
  tools: string[];
  stepLimit: number;
  subAgents?: string[];
  reasoning?: {
    effort?: string;
    summaryVerbosity?: string;
  };
  schema?: unknown;
  skills?: string[];
}

/**
 * Validate frontmatter data has all required fields.
 * @param data - Parsed frontmatter data
 * @param filename - Filename for error messages
 * @throws Error if validation fails
 */
const validateFrontmatter = (data: unknown, filename: string): void => {
  if (!data || typeof data !== 'object') {
    throw new Error(`Invalid frontmatter in ${filename}: must be an object`);
  }

  const fm = data as Record<string, unknown>;

  if (fm.model !== undefined && typeof fm.model !== 'string') {
    throw new Error(`Invalid frontmatter in ${filename}: "model" must be a string`);
  }

  if (!Array.isArray(fm.tools)) {
    throw new Error(`Invalid frontmatter in ${filename}: "tools" must be an array`);
  }

  if (typeof fm.stepLimit !== 'number' || fm.stepLimit <= 0) {
    throw new Error(`Invalid frontmatter in ${filename}: "stepLimit" must be a positive number`);
  }

  if (fm.skills !== undefined) {
    if (!Array.isArray(fm.skills)) {
      throw new Error(`Invalid frontmatter in ${filename}: "skills" must be an array of strings`);
    }
    if (fm.skills.some((s) => typeof s !== 'string')) {
      throw new Error(`Invalid frontmatter in ${filename}: "skills" must be an array of strings`);
    }
  }
};

/**
 * Load agent definitions from .md files in a directory.
 * @param definitionsPath - Path to directory containing agent definition files (defaults to ./src/ai/agent/definitions)
 * @returns Map of agent name to AgentDefinition
 */
export const loadAgentDefinitions = async (definitionsPath?: string): Promise<Map<string, AgentDefinition>> => {
  const agents = new Map<string, AgentDefinition>();
  const agentsDir = definitionsPath ?? path.join(process.cwd(), 'src', 'ai', 'agent', 'definitions');

  // 1. File discovery
  const glob = new Glob('**/*.md');
  const files: string[] = [];

  for await (const file of glob.scan({ cwd: agentsDir, absolute: true })) {
    files.push(file);
  }

  // 2. Process each file
  for (const filePath of files) {
    try {
      // 3. Read file content
      const fileContent = await Bun.file(filePath).text();

      // 4. Parse frontmatter
      let parsed;
      try {
        parsed = matter(fileContent);
      } catch (err) {
        throw new Error(`Failed to parse frontmatter in ${filePath}: ${(err as Error).message}`, { cause: err });
      }

      // Check if frontmatter exists
      if (!parsed.data || Object.keys(parsed.data).length === 0) {
        throw new Error(`Missing frontmatter delimiters in ${filePath}`);
      }

      // 5. Validate frontmatter
      validateFrontmatter(parsed.data, filePath);
      const frontmatter = parsed.data as AgentFrontmatter;

      // 6. Agent name derivation
      const agentName = frontmatter.name;

      // 7. Environment variable defaulting
      let model = frontmatter.model;
      if (!model) {
        model = process.env.DEFAULT_MODEL ?? 'openai/gpt-4o-mini';
        // log.info(`Agent "${agentName}" has no model defined. Defaulting to default model: ${model}`);
      }

      // 8. Tool resolution (lazy for unknown tools)
      let tools: ToolDefinition[] = [];
      try {
        tools = ToolsRegistry.resolveTools(frontmatter.tools);
      } catch (err) {
        // If tools can't be resolved, it might be exercise-specific tools
        // Store empty array for now - exercise solver can register tools on-demand
        console.warn(`Warning: Could not resolve tools for ${frontmatter.name}: ${(err as Error).message}`);
      }

      // 9. Construct AgentDefinition
      const systemPrompt = parsed.content.trim();

      const agentDef: AgentDefinition = {
        name: frontmatter.name,
        description: frontmatter.description,
        defaultModel: model,
        tools,
        subAgents: frontmatter.subAgents ?? [],
        systemPrompt,
        stepLimit: frontmatter.stepLimit,
        schema: frontmatter.schema as AgentDefinition['schema'],
        reasoning: frontmatter.reasoning as AgentDefinition['reasoning'],
        skills: frontmatter.skills,
      };

      // 10. Add to map
      agents.set(agentName, agentDef);
    } catch (err) {
      // Re-throw with file context
      throw new Error(`Failed to load agent from ${filePath}: ${(err as Error).message}`, { cause: err });
    }
  }

  return agents;
};

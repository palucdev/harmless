import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import matter from 'gray-matter';
import type { SkillDefinition } from '../types/skill-definition';
import log from '../../repl/interface/logger';
import SkillsRegistry from './skills-registry';

/**
 * Validate skill frontmatter and compact parameters.
 * Regex validation rule: every parameter value must match:
 * /^(string|number|boolean|array|object)(\s*\/\/\s*.+)?$/
 */
const validateSkillDefinition = (filePath: string, data: any): boolean => {
  const filename = path.basename(filePath);

  if (!data || typeof data !== 'object') {
    log.warn(`Warning: Invalid skill frontmatter in ${filename}: must be an object.`);
    return false;
  }

  if (typeof data.name !== 'string' || !data.name.trim()) {
    log.warn(`Warning: Invalid skill frontmatter in ${filename}: missing or empty 'name'.`);
    return false;
  }

  if (typeof data.description !== 'string' || !data.description.trim()) {
    log.warn(`Warning: Invalid skill frontmatter in ${filename}: missing or empty 'description'.`);
    return false;
  }

  if (data.params !== undefined && data.params !== null) {
    if (typeof data.params !== 'object' || Array.isArray(data.params)) {
      log.warn(`Warning: Invalid skill frontmatter in ${filename}: 'params' must be an object.`);
      return false;
    }

    const PARAM_REGEX = /^(string|number|boolean|array|object)(\s*\/\/\s*.+)?$/;
    for (const [key, val] of Object.entries(data.params)) {
      if (typeof val !== 'string' || !PARAM_REGEX.test(val)) {
        log.warn(`Warning: Invalid skill frontmatter in ${filename}: parameter '${key}' fails validation against regex.`);
        return false;
      }
    }
  }

  return true;
};

/**
 * Load skills dynamically from flat markdown files inside the skills directory.
 * @param customPath Optional custom path to load skills from (mainly for tests)
 */
export const loadSkillDefinitions = async (customPath?: string): Promise<void> => {
  const skillsDir = customPath ?? path.join(process.cwd(), 'src', 'ai', 'skills', 'definition');
  const skills: SkillDefinition[] = [];

  try {
    const files = await fs.readdir(skillsDir);
    for (const file of files) {
      if (!file.endsWith('.md')) {
        continue;
      }

      const filePath = path.join(skillsDir, file);
      try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        const parsed = matter(fileContent);

        if (!validateSkillDefinition(filePath, parsed.data)) {
          continue;
        }

        const skill: SkillDefinition = {
          name: parsed.data.name,
          description: parsed.data.description,
          params: parsed.data.params ?? {},
          instructions: parsed.content,
        };

        skills.push(skill);
        log.info(`[SkillDefinition Loaded] ${skill.name}`);
      } catch (err) {
        log.warn(`Warning: Failed to load skill from ${file}: ${(err as Error).message}`);
      }
    }
  } catch (err) {
    log.warn(`Warning: Failed to read skills directory ${skillsDir}: ${(err as Error).message}`);
  }

  // Atomically update global registry
  SkillsRegistry.clearRegistry();
  for (const skill of skills) {
    SkillsRegistry.registerSkill(skill);
  }
};

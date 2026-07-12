import type { SkillDefinition } from '../types/skill-definition';

/**
 * Match a user query against a skill.
 * Returns true if the query contains the explicit mention `@<skillName>` (case-insensitive).
 */
export const matchSkillDefinition = (query: string, skill: SkillDefinition): boolean => {
  const queryClean = query.trim().toLowerCase();
  if (!queryClean) {
    return false;
  }

  const targetMention = `@${skill.name.toLowerCase()}`;
  const tokens = queryClean.split(/\s+/);

  return tokens.some((token) => {
    // Strip trailing common punctuation to handle cases like "@git-commit!" or "@git-commit."
    const cleanToken = token.replace(/[.,!?;:]+$/, '');
    return cleanToken === targetMention;
  });
};

/**
 * Filter skills matching the query and sort them alphabetically by name.
 */
export const matchAndSortSkillDefinitions = (query: string, skills: SkillDefinition[]): SkillDefinition[] => {
  return skills.filter((skill) => matchSkillDefinition(query, skill)).sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Transiently append matched skills to the system prompt.
 */
export const extendSystemPrompt = (systemPrompt: string, skills: SkillDefinition[]): string => {
  let extended = systemPrompt.trim();
  extended += `\n\n## [Currently Loaded SkillDefinitions]`;
  if (skills.length === 0) {
    extended += `\nNone`;
  } else {
    for (const skill of skills) {
      extended += `\n\n### Activated SkillDefinition: ${skill.name}\n\n${skill.instructions}`;
    }
  }
  return extended;
};

import { log, multiselect } from '@clack/prompts';
import SkillsRegistry from '../../ai/skills/skills-registry';
import type { AgentDefinition } from '../../ai/types/agent-definition';

export const handleSkills = async (agent: AgentDefinition): Promise<void> => {
  const allSkills = SkillsRegistry.getAllSkills();

  if (allSkills.length === 0) {
    log.info('No skills found in the registry');
    return;
  }

  const selectedSkills = await multiselect({
    message: 'Select skills for the current agent',
    options: allSkills.map((skill) => ({
      value: skill.name,
      label: skill.name,
      hint: skill.description,
    })),
    initialValues: SkillsRegistry.getActiveSkills().map(s => s.name),
    required: false,
  });

  if (Array.isArray(selectedSkills)) {
    const activeSkillNames = new Set(selectedSkills as string[]);
    
    allSkills.forEach(skill => {
      if (activeSkillNames.has(skill.name)) {
        SkillsRegistry.activateSkill(skill.name);
      } else {
        SkillsRegistry.deactivateSkill(skill.name);
      }
    });

    agent.skills = selectedSkills as string[];
    log.success(`Updated skills: ${agent.skills.join(', ') || 'None'}`);
  } else {
    log.info('Skill selection cancelled');
  }
};

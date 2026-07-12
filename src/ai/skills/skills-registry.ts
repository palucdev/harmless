import type { SkillDefinition } from '../types/skill-definition';
import { getAgentDefinition } from '../agent/agent-registry';

export default class SkillsRegistry {
  static instance: SkillsRegistry;
  private skills = new Map<string, SkillDefinition>();
  private activeSkills = new Map<string, SkillDefinition>();

  private constructor() {}

  public static initialize = (): SkillsRegistry => {
    if (!SkillsRegistry.instance) {
      SkillsRegistry.instance = new SkillsRegistry();
    }

    return SkillsRegistry.instance;
  };

  public static registerSkill = (skill: SkillDefinition) => {
    SkillsRegistry.instance.skills.set(skill.name, skill);
    SkillsRegistry.instance.activeSkills.set(skill.name, skill);
  };

  public static clearRegistry = () => {
    SkillsRegistry.instance.skills.clear();
    SkillsRegistry.instance.activeSkills.clear();
  };

  public static getSkill = (name: string): SkillDefinition | undefined => {
    return SkillsRegistry.instance.skills.get(name);
  };

  public static getAllSkills = (): SkillDefinition[] => {
    return Array.from(SkillsRegistry.instance.skills.values());
  };

  public static activateSkill = (name: string) => {
    const skill = SkillsRegistry.instance.skills.get(name);
    if (skill) {
      SkillsRegistry.instance.activeSkills.set(name, skill);
    }
  };

  public static deactivateSkill = (name: string) => {
    SkillsRegistry.instance.activeSkills.delete(name);
  };

  public static isSkillActive = (name: string): boolean => {
    return SkillsRegistry.instance.activeSkills.has(name);
  };

  public static getActiveSkills = (): SkillDefinition[] => {
    return Array.from(SkillsRegistry.instance.activeSkills.values());
  };

  public static getAgentSkills = (agentName: string): SkillDefinition[] => {
    const agentDef = getAgentDefinition(agentName);
    
    if (!agentDef || !agentDef.skills || agentDef.skills.length === 0) {
      return SkillsRegistry.getActiveSkills();
    }

    return agentDef.skills
      .map(skillName => SkillsRegistry.getSkill(skillName))
      .filter((skill): skill is SkillDefinition => skill !== undefined);
  };
}

export interface SkillDefinition {
  name: string;
  description: string;
  params: Record<string, string>;
  instructions: string;
}

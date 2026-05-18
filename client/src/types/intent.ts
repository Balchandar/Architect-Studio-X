export type AIModel = 'auto' | 'gpt' | 'claude' | 'gemini' | 'ollama';

export interface IntentState {
  businessGoal: string;
  constraints: string[];
  compliance: string[];
  preferredStack: string[];
  avoid: string[];
  budget: string;
  scaleUsers: string;
  scalePeakRps: string;
  teamStrong: string;
  teamMedium: string;
  deploymentTargets: string[];
  model: AIModel;
}

/** Intent Compiler Types */

export type Severity = "low" | "medium" | "high" | "critical";

export interface EdgeCase {
  description: string;
  severity: Severity;
  handling: string;
}

export interface Misunderstanding {
  area: string;
  youMean: string;
  aiDoes: string;
  risk: string;
  severity: Severity;
}

export interface Clarification {
  question: string;
  whyItMatters: string;
  options: string[];
  answer?: string;
}

export interface PermissionRequirement {
  service: string;
  scopes: string[];
  reason: string;
  destructive: boolean;
  connection: string; // Auth0 connection name
}

export interface IntentSpec {
  id: string;
  originalPrompt: string;
  objective: string;
  functionalRequirements: string[];
  nonFunctionalRequirements: string[];
  edgeCases: EdgeCase[];
  misunderstandings: Misunderstanding[];
  clarifications: Clarification[];
  permissions: PermissionRequirement[];
  acceptanceCriteria: string[];
  techConstraints: string[];
  completenessScore: number;
}

export interface AgentAction {
  id: string;
  tool: string;
  service: string;
  description: string;
  scopes: string[];
  destructive: boolean;
  status: "pending" | "approved" | "executing" | "completed" | "denied";
  result?: string;
}

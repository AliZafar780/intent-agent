import { query, execute } from "../db/database";

export interface IntentRecord {
  id: string;
  user_id: string;
  original_prompt: string;
  objective: string;
  functional_requirements: string;
  non_functional_requirements: string;
  permissions: string;
  misunderstandings: string;
  edge_cases: string;
  acceptance_criteria: string;
  tech_constraints: string;
  completeness_score: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export function saveIntent(intent: {
  id: string;
  userId: string;
  originalPrompt: string;
  objective: string;
  functionalRequirements: string[];
  nonFunctionalRequirements: string[];
  permissions: any[];
  misunderstandings: any[];
  edgeCases: any[];
  acceptanceCriteria: string[];
  techConstraints: string[];
  completenessScore: number;
}): void {
  execute(
    `INSERT OR REPLACE INTO intents (
      id, user_id, original_prompt, objective,
      functional_requirements, non_functional_requirements,
      permissions, misunderstandings, edge_cases,
      acceptance_criteria, tech_constraints,
      completeness_score, status, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'compiled', datetime('now'))`,
    [
      intent.id,
      intent.userId,
      intent.originalPrompt,
      intent.objective,
      JSON.stringify(intent.functionalRequirements),
      JSON.stringify(intent.nonFunctionalRequirements),
      JSON.stringify(intent.permissions),
      JSON.stringify(intent.misunderstandings),
      JSON.stringify(intent.edgeCases),
      JSON.stringify(intent.acceptanceCriteria),
      JSON.stringify(intent.techConstraints),
      intent.completenessScore,
    ]
  );
}

export function getIntent(userId: string, intentId: string): IntentRecord | undefined {
  const results = query<IntentRecord>(
    "SELECT * FROM intents WHERE id = ? AND user_id = ?",
    [intentId, userId]
  );
  return results[0];
}

export function getIntents(userId: string, limit = 50, offset = 0): IntentRecord[] {
  return query<IntentRecord>(
    "SELECT * FROM intents WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
    [userId, limit, offset]
  );
}

export function getIntentCount(userId: string): number {
  const results = query<{ count: number }>(
    "SELECT COUNT(*) as count FROM intents WHERE user_id = ?",
    [userId]
  );
  return results[0]?.count || 0;
}

export function updateIntentStatus(intentId: string, status: string): void {
  execute(
    "UPDATE intents SET status = ?, updated_at = datetime('now') WHERE id = ?",
    [status, intentId]
  );
}

export function getRecentIntents(userId: string, limit = 10): IntentRecord[] {
  return query<IntentRecord>(
    "SELECT * FROM intents WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
    [userId, limit]
  );
}

export function searchIntents(userId: string, term: string): IntentRecord[] {
  return query<IntentRecord>(
    `SELECT * FROM intents
     WHERE user_id = ? AND (
       original_prompt LIKE ? OR
       objective LIKE ?
     )
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId, `%${term}%`, `%${term}%`]
  );
}

export function getMostUsedServices(userId: string): { service: string; count: number }[] {
  return query(
    `SELECT json_extract(value, '$.service') as service, COUNT(*) as count
     FROM intents, json_each(permissions)
     WHERE user_id = ?
     GROUP BY service
     ORDER BY count DESC
     LIMIT 10`,
    [userId]
  );
}

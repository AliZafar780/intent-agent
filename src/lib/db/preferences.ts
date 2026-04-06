import { query, execute } from "../db/database";

export interface PreferenceRecord {
  id: string;
  user_id: string;
  preference_key: string;
  preference_value: string;
  confidence: number;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export function savePreference(userId: string, key: string, value: string, confidence = 0.5): void {
  execute(
    `INSERT INTO user_preferences (id, user_id, preference_key, preference_value, confidence, usage_count, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
     ON CONFLICT(user_id, preference_key)
     DO UPDATE SET
       preference_value = excluded.preference_value,
       confidence = MIN(excluded.confidence + user_preferences.confidence * 0.1, 1.0),
       usage_count = user_preferences.usage_count + 1,
       updated_at = datetime('now')`,
    [
      `pref_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      userId,
      key,
      value,
      confidence,
    ]
  );
}

export function getPreference(userId: string, key: string): PreferenceRecord | undefined {
  const results = query<PreferenceRecord>(
    "SELECT * FROM user_preferences WHERE user_id = ? AND preference_key = ?",
    [userId, key]
  );
  return results[0];
}

export function getPreferences(userId: string): PreferenceRecord[] {
  return query<PreferenceRecord>(
    "SELECT * FROM user_preferences WHERE user_id = ? ORDER BY confidence DESC, usage_count DESC",
    [userId]
  );
}

export function learnFromIntent(userId: string, intent: any): void {
  const perms = intent.permissions || [];
  for (const perm of perms) {
    const key = `preferred_scope_${perm.service}`;
    const existing = getPreference(userId, key);
    const newValue = existing
      ? JSON.stringify([...new Set([...JSON.parse(existing.preference_value), ...perm.scopes])])
      : JSON.stringify(perm.scopes);
    savePreference(userId, key, newValue, 0.3);
  }

  if (intent.functionalRequirements?.length > 0) {
    const key = `common_requirements`;
    const existing = getPreference(userId, key);
    const current = existing ? JSON.parse(existing.preference_value) : [];
    const updated = [...new Set([...current, ...intent.functionalRequirements.slice(0, 3)])];
    savePreference(userId, key, JSON.stringify(updated.slice(0, 20)), 0.2);
  }
}

export function getPatterns(userId: string): {
  preferredServices: { service: string; frequency: number }[];
  commonActions: { action: string; count: number }[];
  destructiveRate: number;
  topScopes: { scope: string; count: number }[];
  avgCompleteness: number;
  totalIntents: number;
  learnedPreferences: PreferenceRecord[];
} {
  const services = query<{ service: string; frequency: number }>(
    `SELECT json_extract(value, '$.service') as service, COUNT(*) as frequency
     FROM intents, json_each(permissions)
     WHERE user_id = ?
     GROUP BY service
     ORDER BY frequency DESC`,
    [userId]
  );

  const actions = query<{ action: string; count: number }>(
    `SELECT action, COUNT(*) as count
     FROM audit_logs
     WHERE user_id = ?
     GROUP BY action
     ORDER BY count DESC
     LIMIT 10`,
    [userId]
  );

  const totalAudit = query<{ count: number }>(
    "SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ?",
    [userId]
  );

  const destructive = query<{ count: number }>(
    "SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ? AND destructive = 1",
    [userId]
  );

  const scopes = query<{ scope: string; count: number }>(
    `SELECT json_extract(value, '$') as scope, COUNT(*) as count
     FROM intents, json_each(json_extract(permissions, '$[0].scopes'))
     WHERE user_id = ?
     GROUP BY scope
     ORDER BY count DESC
     LIMIT 10`,
    [userId]
  );

  const avgScore = query<{ avg: number }>(
    "SELECT AVG(completeness_score) as avg FROM intents WHERE user_id = ?",
    [userId]
  );

  const totalIntents = query<{ count: number }>(
    "SELECT COUNT(*) as count FROM intents WHERE user_id = ?",
    [userId]
  );

  const prefs = getPreferences(userId);

  return {
    preferredServices: services,
    commonActions: actions,
    destructiveRate: totalAudit[0]?.count ? Math.round((destructive[0]?.count / totalAudit[0]?.count) * 100) : 0,
    topScopes: scopes,
    avgCompleteness: Math.round(avgScore[0]?.avg || 0),
    totalIntents: totalIntents[0]?.count || 0,
    learnedPreferences: prefs,
  };
}

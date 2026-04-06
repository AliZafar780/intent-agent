import { query, execute } from "../db/database";

export interface AuditRecord {
  id: string;
  user_id: string;
  action: string;
  service: string | null;
  scopes: string | null;
  destructive: number;
  intent_id: string | null;
  status: string;
  details: string | null;
  created_at: string;
}

export function saveAudit(entry: {
  id: string;
  userId: string;
  action: string;
  service?: string;
  scopes?: string[];
  destructive: boolean;
  intentId?: string;
  status: string;
  details?: string;
}): void {
  execute(
    `INSERT INTO audit_logs (
      id, user_id, action, service, scopes,
      destructive, intent_id, status, details
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.id,
      entry.userId,
      entry.action,
      entry.service || null,
      entry.scopes ? JSON.stringify(entry.scopes) : null,
      entry.destructive ? 1 : 0,
      entry.intentId || null,
      entry.status,
      entry.details || null,
    ]
  );
}

export function getAuditLogs(userId: string, limit = 100, offset = 0): AuditRecord[] {
  return query<AuditRecord>(
    "SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
    [userId, limit, offset]
  );
}

export function getAuditStats(userId: string): {
  totalActions: number;
  destructiveActions: number;
  deniedActions: number;
  approvedActions: number;
  servicesUsed: { service: string; count: number }[];
  actionsByDay: { day: string; count: number }[];
  avgCompletenessScore: number;
  totalIntents: number;
} {
  const total = query<{ count: number }>(
    "SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ?",
    [userId]
  );

  const destructive = query<{ count: number }>(
    "SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ? AND destructive = 1",
    [userId]
  );

  const denied = query<{ count: number }>(
    "SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ? AND status = 'denied'",
    [userId]
  );

  const approved = query<{ count: number }>(
    "SELECT COUNT(*) as count FROM audit_logs WHERE user_id = ? AND status = 'success'",
    [userId]
  );

  const services = query<{ service: string; count: number }>(
    `SELECT service, COUNT(*) as count
     FROM audit_logs
     WHERE user_id = ? AND service IS NOT NULL
     GROUP BY service
     ORDER BY count DESC
     LIMIT 10`,
    [userId]
  );

  const byDay = query<{ day: string; count: number }>(
    `SELECT date(created_at) as day, COUNT(*) as count
     FROM audit_logs
     WHERE user_id = ?
     GROUP BY date(created_at)
     ORDER BY day DESC
     LIMIT 30`,
    [userId]
  );

  const avgScore = query<{ avg: number }>(
    `SELECT AVG(completeness_score) as avg
     FROM intents
     WHERE user_id = ?`,
    [userId]
  );

  const totalIntents = query<{ count: number }>(
    "SELECT COUNT(*) as count FROM intents WHERE user_id = ?",
    [userId]
  );

  return {
    totalActions: total[0]?.count || 0,
    destructiveActions: destructive[0]?.count || 0,
    deniedActions: denied[0]?.count || 0,
    approvedActions: approved[0]?.count || 0,
    servicesUsed: services,
    actionsByDay: byDay,
    avgCompletenessScore: Math.round(avgScore[0]?.avg || 0),
    totalIntents: totalIntents[0]?.count || 0,
  };
}

export function exportAuditLogs(userId: string): AuditRecord[] {
  return query<AuditRecord>(
    "SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
}

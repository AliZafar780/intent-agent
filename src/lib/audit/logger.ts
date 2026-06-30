import { saveAudit as saveAuditDb, getAuditLogs as getAuditLogsDb, getAuditStats as getAuditStatsDb, exportAuditLogs as exportAuditLogsDb, AuditRecord } from "../db/audit";

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: AuditAction;
  service?: string;
  scopes?: string[];
  destructive: boolean;
  intentId?: string;
  status: "success" | "denied" | "error" | "pending";
  details?: string;
}

export type AuditAction =
  | "intent_compiled"
  | "token_exchanged"
  | "tool_executed"
  | "permission_approved"
  | "permission_denied"
  | "step_up_requested"
  | "step_up_approved"
  | "step_up_denied"
  | "connection_added"
  | "connection_removed";

const memoryLog: AuditEntry[] = [];

export function logAudit(entry: Omit<AuditEntry, "id" | "timestamp">): AuditEntry {
  const auditEntry: AuditEntry = {
    ...entry,
    id: `audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };

  memoryLog.push(auditEntry);
  if (memoryLog.length > 1000) {
    memoryLog.splice(0, memoryLog.length - 1000);
  }

  try {
    saveAuditDb({
      id: auditEntry.id,
      userId: auditEntry.userId,
      action: auditEntry.action,
      service: auditEntry.service,
      scopes: auditEntry.scopes,
      destructive: auditEntry.destructive,
      intentId: auditEntry.intentId,
      status: auditEntry.status,
      details: auditEntry.details,
    });
  } catch (e) {
    console.error("Failed to save audit to DB:", e);
  }

  console.log(
    `[AUDIT] ${auditEntry.action} | user=${auditEntry.userId} | service=${auditEntry.service || "n/a"} | destructive=${auditEntry.destructive} | status=${auditEntry.status}`
  );

  return auditEntry;
}

export function getAuditLog(userId?: string, limit = 50): AuditEntry[] {
  if (userId) {
    try {
      const dbLogs = getAuditLogsDb(userId, limit);
      return dbLogs.map((l: AuditRecord) => ({
        id: l.id,
        timestamp: l.created_at,
        userId: l.user_id,
        action: l.action as AuditAction,
        service: l.service || undefined,
        scopes: l.scopes ? JSON.parse(l.scopes) : undefined,
        destructive: Boolean(l.destructive),
        intentId: l.intent_id || undefined,
        status: l.status as AuditEntry["status"],
        details: l.details || undefined,
      }));
    } catch (error) {
      console.error('[intent-agent]', error);
    }
  }
  const filtered = userId ? memoryLog.filter((e) => e.userId === userId) : memoryLog;
  return filtered.slice(-limit).reverse();
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
  try {
    return getAuditStatsDb(userId);
  } catch {
    const userLogs = memoryLog.filter((e) => e.userId === userId);
    const services = new Map<string, number>();
    let destructive = 0;
    let denied = 0;
    let approved = 0;

    for (const entry of userLogs) {
      if (entry.service) services.set(entry.service, (services.get(entry.service) || 0) + 1);
      if (entry.destructive) destructive++;
      if (entry.status === "denied") denied++;
      if (entry.status === "success") approved++;
    }

    return {
      totalActions: userLogs.length,
      destructiveActions: destructive,
      deniedActions: denied,
      approvedActions: approved,
      servicesUsed: Array.from(services.entries()).map(([service, count]) => ({ service, count })),
      actionsByDay: [],
      avgCompletenessScore: 0,
      totalIntents: 0,
    };
  }
}

export function exportLogs(userId: string): AuditEntry[] {
  try {
    const dbLogs = exportAuditLogsDb(userId);
    return dbLogs.map((l: AuditRecord) => ({
      id: l.id,
      timestamp: l.created_at,
      userId: l.user_id,
      action: l.action as AuditAction,
      service: l.service || undefined,
      scopes: l.scopes ? JSON.parse(l.scopes) : undefined,
      destructive: Boolean(l.destructive),
      intentId: l.intent_id || undefined,
      status: l.status as AuditEntry["status"],
      details: l.details || undefined,
    }));
  } catch {
    return memoryLog.filter((e) => e.userId === userId);
  }
}

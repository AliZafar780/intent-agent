import { query, execute } from "./database";

export interface StepUpRequestRow {
  id: string;
  user_id: string;
  action: string;
  service: string;
  scopes: string;
  destructive: number;
  status: string;
  created_at: string;
  resolved_at: string | null;
}

export function createStepUpRequest(req: {
  id: string;
  userId: string;
  action: string;
  service: string;
  scopes: string[];
  destructive: boolean;
}): void {
  execute(
    `INSERT INTO step_up_requests (id, user_id, action, service, scopes, destructive, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [
      req.id,
      req.userId,
      req.action,
      req.service,
      JSON.stringify(req.scopes),
      req.destructive ? 1 : 0,
    ]
  );
}

export function getStepUpRequest(id: string): StepUpRequestRow | undefined {
  const rows = query<StepUpRequestRow>("SELECT * FROM step_up_requests WHERE id = ?", [id]);
  return rows[0];
}

export function updateStepUpStatus(id: string, status: "approved" | "denied"): void {
  execute(
    `UPDATE step_up_requests 
     SET status = ?, resolved_at = datetime('now') 
     WHERE id = ?`,
    [status, id]
  );
}

export function hasRecentApproval(userId: string, service: string, destructive: boolean): boolean {
  // Check for an approved request for this user and service within the last 15 minutes
  const rows = query<{count: number}>(
    `SELECT COUNT(*) as count 
     FROM step_up_requests 
     WHERE user_id = ? 
       AND LOWER(service) = LOWER(?) 
       AND destructive = ? 
       AND status = 'approved' 
       AND resolved_at >= datetime('now', '-15 minutes')`,
    [userId, service, destructive ? 1 : 0]
  );
  return rows[0]?.count > 0;
}

export function consumeApproval(userId: string, service: string, destructive: boolean): void {
  // Mark the most recent approval as consumed so it can't be reused for multiple destructive actions.
  // We can just set status to 'consumed'
  execute(
    `UPDATE step_up_requests 
     SET status = 'consumed' 
     WHERE id = (
       SELECT id FROM step_up_requests 
       WHERE user_id = ? 
         AND LOWER(service) = LOWER(?) 
         AND destructive = ? 
         AND status = 'approved' 
         AND resolved_at >= datetime('now', '-15 minutes')
       ORDER BY resolved_at DESC LIMIT 1
     )`,
    [userId, service, destructive ? 1 : 0]
  );
}

import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0/client";
import { getAuditLog, getAuditStats } from "@/lib/audit/logger";
import { withSecurityHeaders, checkOrigin, checkRateLimit } from "@/lib/security/validation";

const DEMO_MODE = process.env.DEMO_MODE === "true";

export async function GET(req: NextRequest) {
  const session = DEMO_MODE ? { user: { sub: "demo-user" } } : await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.sub as string;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  if (!checkOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "stats") {
    const stats = getAuditStats(userId);
    return withSecurityHeaders(NextResponse.json(stats));
  }

  const limit = parseInt(url.searchParams.get("limit") || "50");
  const logs = getAuditLog(userId, limit);
  return withSecurityHeaders(NextResponse.json({ logs, count: logs.length }));
}

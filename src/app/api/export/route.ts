import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0/client";
import { exportLogs } from "@/lib/audit/logger";
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
  const format = url.searchParams.get("format") || "json";

  const logs = exportLogs(userId);

  if (format === "csv") {
    const headers = ["id", "timestamp", "user_id", "action", "service", "scopes", "destructive", "intent_id", "status", "details"];
    const rows = logs.map((l) =>
      [l.id, l.timestamp, l.userId, l.action, l.service || "", JSON.stringify(l.scopes || []), String(l.destructive), l.intentId || "", l.status, l.details || ""].map((v) => `"${v.replace(/"/g, '""')}"`).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  return withSecurityHeaders(NextResponse.json({ logs, count: logs.length, exportedAt: new Date().toISOString() }));
}

import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0/client";
import { getConnectionStatus, getDemoConnectionStatus } from "@/lib/auth0/token-vault";
import { withSecurityHeaders, checkOrigin, checkRateLimit } from "@/lib/security/validation";
import { logAudit } from "@/lib/audit/logger";

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

  const connections = DEMO_MODE ? getDemoConnectionStatus() : await getConnectionStatus();

  return withSecurityHeaders(NextResponse.json({ connections }));
}

export async function POST(req: NextRequest) {
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

  try {
    const body = await req.json();
    const { connection } = body;

    if (!connection || typeof connection !== "string") {
      return NextResponse.json({ error: "Connection name required" }, { status: 400 });
    }

    const validConnections = ["google-oauth2", "github", "sign-in-with-slack", "windowslive"];
    if (!validConnections.includes(connection)) {
      return NextResponse.json({ error: `Invalid connection. Must be one of: ${validConnections.join(", ")}` }, { status: 400 });
    }

    if (DEMO_MODE) {
      logAudit({
        userId,
        action: "connection_added",
        service: connection,
        destructive: false,
        status: "success",
        details: `Demo: connected ${connection}`,
      });
      return withSecurityHeaders(NextResponse.json({
        success: true,
        connection,
        message: `Demo: ${connection} connected successfully`,
      }));
    }

    const connectUrl = `/auth/connect?connection=${encodeURIComponent(connection)}`;

    logAudit({
      userId,
      action: "connection_added",
      service: connection,
      destructive: false,
      status: "success",
      details: `Connection initiated: ${connection}`,
    });

    return withSecurityHeaders(NextResponse.json({
      success: true,
      connection,
      redirectUrl: connectUrl,
    }));
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to connect account", details: error?.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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

  try {
    const body = await req.json();
    const { connection } = body;

    if (!connection || typeof connection !== "string") {
      return NextResponse.json({ error: "Connection name required" }, { status: 400 });
    }

    if (DEMO_MODE) {
      logAudit({
        userId,
        action: "connection_removed",
        service: connection,
        destructive: false,
        status: "success",
        details: `Demo: disconnected ${connection}`,
      });
      return withSecurityHeaders(NextResponse.json({
        success: true,
        connection,
        message: `Demo: ${connection} disconnected`,
      }));
    }

    const disconnectUrl = `/auth/disconnect?connection=${encodeURIComponent(connection)}`;

    logAudit({
      userId,
      action: "connection_removed",
      service: connection,
      destructive: false,
      status: "success",
      details: `Disconnection initiated: ${connection}`,
    });

    return withSecurityHeaders(NextResponse.json({
      success: true,
      connection,
      redirectUrl: disconnectUrl,
    }));
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to disconnect account", details: error?.message }, { status: 500 });
  }
}

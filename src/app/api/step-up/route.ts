import crypto from 'crypto';
import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0/client";
import { withSecurityHeaders, checkOrigin, checkRateLimit } from "@/lib/security/validation";
import { logAudit } from "@/lib/audit/logger";
import { createStepUpRequest, getStepUpRequest, updateStepUpStatus, hasRecentApproval } from "@/lib/db/stepups";

export async function POST(req: NextRequest) {
  const isDemoMode = req.headers.get("x-demo-mode") === "true";
  const session = isDemoMode ? { user: { sub: "demo-user" } } : await auth0.getSession();
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
    const { action, service, scopes, destructive } = body;

    if (!action || !service) {
      return NextResponse.json({ error: "Action and service required" }, { status: 400 });
    }

    const requestId = `stepup_${Date.now().toString(36)}_${crypto.randomUUID().slice(0,8)}`;

    createStepUpRequest({
      id: requestId,
      userId,
      action,
      service,
      scopes: scopes || [],
      destructive: Boolean(destructive),
    });

    if (isDemoMode) {
      updateStepUpStatus(requestId, "approved");

      logAudit({
        userId,
        action: "step_up_approved",
        service,
        destructive: Boolean(destructive),
        status: "success",
        intentId: requestId,
        details: `Demo step-up approved: ${action}`,
      });

      return withSecurityHeaders(NextResponse.json({
        requestId,
        status: "approved",
        message: "Demo: step-up authorization auto-approved",
      }));
    }

    logAudit({
      userId,
      action: "step_up_requested",
      service,
      destructive: Boolean(destructive),
      status: "pending",
      intentId: requestId,
      details: `Step-up requested: ${action} on ${service}`,
    });

    return withSecurityHeaders(NextResponse.json({
      requestId,
      status: "pending",
      message: "Authorization request sent to your device. Approve via Auth0 CIBA flow.",
    }));
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to initiate step-up auth", details: error?.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const isDemoMode = req.headers.get("x-demo-mode") === "true";
  const session = isDemoMode ? { user: { sub: "demo-user" } } : await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const requestId = url.searchParams.get("id");

  if (!requestId) {
    return NextResponse.json({ error: "Request ID required" }, { status: 400 });
  }

  const request = getStepUpRequest(requestId);
  if (!request || request.user_id !== session.user.sub) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  return withSecurityHeaders(NextResponse.json({
    requestId: request.id,
    status: request.status,
    action: request.action,
    service: request.service,
  }));
}

export async function PATCH(req: NextRequest) {
  const isDemoMode = req.headers.get("x-demo-mode") === "true";
  const session = isDemoMode ? { user: { sub: "demo-user" } } : await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.sub as string;

  try {
    const body = await req.json();
    const { requestId, decision } = body;

    if (!requestId || !decision) {
      return NextResponse.json({ error: "Request ID and decision required" }, { status: 400 });
    }

    if (!["approved", "denied"].includes(decision)) {
      return NextResponse.json({ error: "Decision must be 'approved' or 'denied'" }, { status: 400 });
    }

    const request = getStepUpRequest(requestId);
    if (!request || request.user_id !== userId) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    updateStepUpStatus(requestId, decision as "approved" | "denied");

    logAudit({
      userId,
      action: decision === "approved" ? "step_up_approved" : "step_up_denied",
      service: request.service,
      destructive: request.destructive === 1,
      status: decision === "approved" ? "success" : "denied",
      intentId: requestId,
      details: `Step-up ${decision}: ${request.action}`,
    });

    return withSecurityHeaders(NextResponse.json({
      requestId,
      status: decision,
      message: `Step-up authorization ${decision}`,
    }));
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to process decision", details: error?.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0/client";
import { getConnectionStatus, getDemoConnectionStatus } from "@/lib/auth0/token-vault";
import { withSecurityHeaders, checkOrigin, checkRateLimit } from "@/lib/security/validation";

const DEMO_MODE = process.env.DEMO_MODE === "true";

export async function GET(req: NextRequest) {
  const session = DEMO_MODE ? { user: { sub: "demo-user" } } : await auth0.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  if (!checkOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const conns = DEMO_MODE ? getDemoConnectionStatus() : await getConnectionStatus();

    let groqStatus = "not_configured";
    if (process.env.GROQ_API_KEY) {
      try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: "hi" }], max_tokens: 10 }),
          signal: AbortSignal.timeout(10000),
        });
        groqStatus = groqRes.ok ? "ok" : `error_${groqRes.status}`;
      } catch {
        groqStatus = "error";
      }
    }

    const response = NextResponse.json({
      mode: DEMO_MODE ? "demo" : "production",
      services: {
        groq: groqStatus,
        google: conns.google,
        github: conns.github,
        slack: conns.slack,
        microsoft: conns.microsoft,
      },
      connections: conns,
      env: {
        auth0Domain: !!process.env.AUTH0_DOMAIN,
        groqApiKey: !!process.env.GROQ_API_KEY,
        openaiApiKey: !!process.env.OPENAI_API_KEY,
        customApiClient: !!(process.env.AUTH0_CUSTOM_API_CLIENT_ID && process.env.AUTH0_CUSTOM_API_CLIENT_SECRET),
      },
    });
    return withSecurityHeaders(response);
  } catch (error: any) {
    return NextResponse.json({ error: "Debug check failed", details: error?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

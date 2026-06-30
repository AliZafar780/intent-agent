import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0/client";
import { compileIntent } from "@/lib/intent/compiler";
import { saveIntent } from "@/lib/db/intents";
import { learnFromIntent as learnPrefs } from "@/lib/db/preferences";
import {
  validatePrompt,
  withSecurityHeaders,
  checkOrigin,
  checkRateLimit,
  detectPromptInjection,
} from "@/lib/security/validation";
import { logAudit } from "@/lib/audit/logger";


const DEMO_INTENT_SPEC = {
  id: `intent_${Date.now().toString(36)}`,
  originalPrompt: "",
  objective: "",
  functionalRequirements: ["Identify required data source", "Extract key details", "Produce concise actionable output"],
  nonFunctionalRequirements: ["Keep response concise", "Avoid destructive actions without approval"],
  permissions: [
    { service: "GitHub", scopes: ["public_repo"], reason: "Read repository metadata", destructive: false, connection: "github" },
    { service: "Slack", scopes: ["channels:read"], reason: "Read channel context", destructive: false, connection: "sign-in-with-slack" },
  ],
  misunderstandings: [
    { area: "Target source ambiguity", youMean: "Specific workspace/repo", aiDoes: "Uses default source", risk: "Incorrect result", severity: "high" as const },
  ],
  edgeCases: [
    { description: "No matching records", severity: "medium" as const, handling: "Return explicit no-result status and suggestion" },
  ],
  acceptanceCriteria: ["Output references the intended source", "Permissions shown before execution"],
  techConstraints: ["Use least privilege scopes", "No credentials exposed to model"],
  completenessScore: 82,
};

export async function POST(req: NextRequest) {
  const isDemoMode = req.headers.get("x-demo-mode") === "true";
  const realSession = auth0 ? await auth0.getSession().catch(() => null) : null;
  const providedKey = req.headers.get("x-groq-key");
  const apiKey = providedKey || (realSession ? process.env.GROQ_API_KEY : "") || process.env.GROQ_API_KEY || "";
  const session = isDemoMode ? { user: { sub: "demo-user" } } : realSession;
  
  if (!session) {
    console.error("Intent Compilation: Unauthorized. Missing Auth0 Session.");
    return NextResponse.json({ error: "Unauthorized. Ensure Auth0 variables are set for Real Mode." }, { status: 401 });
  }

  const userId = session.user.sub as string;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  if (!checkOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any = {};
  try {
    body = await req.json();

    let prompt: string;
    try {
      prompt = validatePrompt(body.prompt);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }

    const injection = detectPromptInjection(prompt);
    if (injection.detected) {
      logAudit({
        userId,
        action: "intent_compiled",
        destructive: false,
        status: "denied",
        details: `Prompt injection detected: ${injection.pattern}`,
      });
      return NextResponse.json({ error: "Request contains potentially harmful content" }, { status: 400 });
    }

    if (isDemoMode && !apiKey) {
      const demoSpec = {
        ...DEMO_INTENT_SPEC,
        id: `intent_${Date.now().toString(36)}`,
        originalPrompt: prompt,
        objective: prompt,
      };

      try {
        saveIntent({
          id: demoSpec.id,
          userId,
          originalPrompt: demoSpec.originalPrompt,
          objective: demoSpec.objective,
          functionalRequirements: demoSpec.functionalRequirements,
          nonFunctionalRequirements: demoSpec.nonFunctionalRequirements,
          permissions: demoSpec.permissions,
          misunderstandings: demoSpec.misunderstandings,
          edgeCases: demoSpec.edgeCases,
          acceptanceCriteria: demoSpec.acceptanceCriteria,
          techConstraints: demoSpec.techConstraints,
          completenessScore: demoSpec.completenessScore,
        });
        learnPrefs(userId, demoSpec);
      } catch (error) {
        console.error('[intent-agent]', error);
      }

      logAudit({
        userId,
        action: "intent_compiled",
        destructive: false,
        status: "success",
        details: `Demo intent compiled: ${prompt.slice(0, 80)}`,
      });
      return withSecurityHeaders(NextResponse.json(demoSpec));
    }

    const spec = await compileIntent(prompt, apiKey);

    try {
      saveIntent({
        id: spec.id,
        userId,
        originalPrompt: spec.originalPrompt,
        objective: spec.objective,
        functionalRequirements: spec.functionalRequirements,
        nonFunctionalRequirements: spec.nonFunctionalRequirements,
        permissions: spec.permissions,
        misunderstandings: spec.misunderstandings,
        edgeCases: spec.edgeCases,
        acceptanceCriteria: spec.acceptanceCriteria,
        techConstraints: spec.techConstraints,
        completenessScore: spec.completenessScore,
      });
      learnPrefs(userId, spec);
    } catch (error) {
      console.error('[intent-agent]', error);
    }

    logAudit({
      userId,
      action: "intent_compiled",
      destructive: spec.permissions.some((p) => p.destructive),
      status: "success",
      intentId: spec.id,
      details: `Intent compiled: ${spec.objective.slice(0, 100)}`,
    });

    return withSecurityHeaders(NextResponse.json(spec));
  } catch (error: any) {
    console.error("Intent compilation error:", error?.message);

    const fallbackSpec = {
      id: `intent_${Date.now().toString(36)}`,
      originalPrompt: body?.prompt || "",
      objective: body?.prompt || "",
      functionalRequirements: ["Analyze the request"],
      nonFunctionalRequirements: [],
      permissions: [],
      misunderstandings: [],
      edgeCases: [],
      acceptanceCriteria: ["Feature works as expected"],
      techConstraints: [],
      completenessScore: 30,
    };

    return withSecurityHeaders(NextResponse.json(fallbackSpec));
  }
}

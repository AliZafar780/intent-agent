import { IntentSpec } from "./types";

const INTENT_SYSTEM_PROMPT = `You are an Intent Compiler for an AI agent that uses Auth0 Token Vault to access external services.

Given a user's prompt, you must:
1. Analyze what the user wants to accomplish
2. Break it down into structured requirements
3. Identify which external services and OAuth scopes are needed
4. Detect where the AI will likely misunderstand the request
5. Identify edge cases the user hasn't considered

You MUST respond with valid JSON matching this exact schema:
{
  "objective": "Precise one-sentence objective",
  "functionalRequirements": ["req1", "req2"],
  "nonFunctionalRequirements": ["nfr1"],
  "edgeCases": [{"description": "what can go wrong", "severity": "low|medium|high|critical", "handling": "how to handle"}],
  "misunderstandings": [{"area": "ambiguous part", "youMean": "what user intends", "aiDoes": "what AI will do wrong", "risk": "consequence", "severity": "low|medium|high|critical"}],
  "clarifications": [{"question": "what needs deciding", "whyItMatters": "why it matters", "options": ["option1", "option2"]}],
  "permissions": [{"service": "service name", "scopes": ["scope1"], "reason": "why needed", "destructive": false, "connection": "auth0-connection-name"}],
  "acceptanceCriteria": ["testable criterion 1"],
  "techConstraints": ["constraint 1"]
}

Available Auth0 Token Vault connections:
- google-oauth2: Gmail (gmail.readonly, gmail.send, gmail.compose), Calendar (calendar.events, calendar.readonly), Drive (drive.readonly, drive.file)
- github: repos (repo, public_repo), issues (repo), gists (gist)
- slack: channels (channels:read, channels:history), messages (chat:write), users (users:read)
- microsoft: Outlook (Mail.Read, Mail.Send), Calendar (Calendars.Read)

For destructive actions (send email, create issue, post message), set destructive: true.
Be specific about scopes. If the prompt is ambiguous, add a clarification.`;

function buildUserPrompt(prompt: string, context?: string): string {
  let text = `USER PROMPT:\n${prompt}`;
  if (context) {
    text += `\n\nPROJECT CONTEXT:\n${context}`;
  }
  return text;
}

const LLM_TIMEOUT = 25_000;

export async function compileIntent(
  prompt: string,
  apiKey: string,
  context?: string
): Promise<IntentSpec> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT);

  try {
        const useOpenAI = !!process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY;

    const url = useOpenAI
      ? "https://api.openai.com/v1/chat/completions"
      : "https://api.groq.com/openai/v1/chat/completions";

    const model = useOpenAI
      ? (process.env.OPENAI_MODEL || "gpt-4o")
      : (process.env.GROQ_MODEL || "llama-3.3-70b-versatile");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: INTENT_SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(prompt, context) },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`LLM API error: ${response.status} ${errorBody.slice(0, 200)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from LLM");
    }

    let parsed: any;
    try {
      let jsonStr = content.trim();
      if (jsonStr.startsWith("```")) {
        const lines = jsonStr.split("\n");
        if (lines[0].startsWith("```")) lines.shift();
        if (lines[lines.length - 1].startsWith("```")) lines.pop();
        jsonStr = lines.join("\n");
      }
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new Error("Invalid JSON from LLM");
    }

    return {
      id: `intent_${Date.now().toString(36)}`,
      originalPrompt: prompt,
      objective: sanitizeString(parsed.objective) || prompt,
      functionalRequirements: sanitizeStringArray(parsed.functionalRequirements),
      nonFunctionalRequirements: sanitizeStringArray(parsed.nonFunctionalRequirements),
      edgeCases: (parsed.edgeCases || []).map((ec: any) => ({
        description: sanitizeString(ec.description) || "",
        severity: validateSeverity(ec.severity),
        handling: sanitizeString(ec.handling) || "",
      })),
      misunderstandings: (parsed.misunderstandings || []).map((m: any) => ({
        area: sanitizeString(m.area) || "",
        youMean: sanitizeString(m.youMean) || "",
        aiDoes: sanitizeString(m.aiDoes) || "",
        risk: sanitizeString(m.risk) || "",
        severity: validateSeverity(m.severity),
      })),
      clarifications: (parsed.clarifications || []).map((c: any) => ({
        question: sanitizeString(c.question) || "",
        whyItMatters: sanitizeString(c.whyItMatters) || "",
        options: sanitizeStringArray(c.options),
      })),
      permissions: (parsed.permissions || []).slice(0, 5).map((p: any) => ({
        service: sanitizeString(p.service) || "",
        scopes: sanitizeStringArray(p.scopes).slice(0, 5),
        reason: sanitizeString(p.reason) || "",
        destructive: Boolean(p.destructive),
        connection: sanitizeString(p.connection) || "",
      })),
      acceptanceCriteria: sanitizeStringArray(parsed.acceptanceCriteria),
      techConstraints: sanitizeStringArray(parsed.techConstraints),
      completenessScore: calculateCompleteness(parsed),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function sanitizeString(value: any): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .slice(0, 1000);
}

function sanitizeStringArray(value: any): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v: any) => typeof v === "string")
    .map((v: string) => sanitizeString(v))
    .slice(0, 20);
}

function validateSeverity(value: any): "low" | "medium" | "high" | "critical" {
  if (["low", "medium", "high", "critical"].includes(value)) return value;
  return "medium";
}

function calculateCompleteness(parsed: any): number {
  let score = 0;
  score += Math.min((parsed.functionalRequirements?.length || 0) * 5, 25);
  score += Math.min((parsed.acceptanceCriteria?.length || 0) * 5, 25);
  score += Math.min((parsed.edgeCases?.length || 0) * 5, 20);
  score += Math.min((parsed.permissions?.length || 0) * 10, 30);
  return Math.min(score, 100);
}

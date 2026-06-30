import { NextRequest, NextResponse } from "next/server";

const MAX_BODY_SIZE = 100_000;
const ALLOWED_ORIGINS = [
  process.env.APP_BASE_URL || "http://localhost:3000",
];

export function validatePrompt(prompt: unknown): string {
  if (typeof prompt !== "string") throw new Error("Prompt must be a string");
  const trimmed = prompt.trim();
  if (trimmed.length === 0) throw new Error("Prompt cannot be empty");
  if (trimmed.length > 4000) throw new Error("Prompt too long (max 4000 chars)");
  return trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

export function validateMessages(messages: unknown): any[] {
  if (!Array.isArray(messages)) throw new Error("Messages must be an array");
  if (messages.length > 50) throw new Error("Too many messages (max 50)");

  const ALLOWED_ROLES = ["user", "assistant", "system", "tool"];

  return messages.map((msg, i) => {
    if (!msg || typeof msg !== "object") throw new Error(`Message ${i} invalid`);
    if (!ALLOWED_ROLES.includes(msg.role)) {
      throw new Error(`Message ${i} has invalid role: ${msg.role}`);
    }
    if (!msg.content && !msg.parts) {
      throw new Error(`Message ${i} has no content`);
    }
    if (typeof msg.content === "string" && msg.content.length > 10_000) {
      throw new Error(`Message ${i} too long`);
    }
    return msg;
  });
}

export function validateContext(context: unknown): string | undefined {
  if (context === undefined || context === null) return undefined;
  if (typeof context !== "string") throw new Error("Context must be a string");
  if (context.length > 10_000) throw new Error("Context too long (max 10000 chars)");
  return context.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

export function validateEmail(email: string): string {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid email format");
  }
  if (/[\r\n]/.test(email)) {
    throw new Error("Email contains invalid characters");
  }
  return email;
}

const TRUSTED_PICTURE_DOMAINS = [
  "lh3.googleusercontent.com",
  "avatars.githubusercontent.com",
  "secure.gravatar.com",
  "cdn.auth0.com",
];

export function validatePictureUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (!TRUSTED_PICTURE_DOMAINS.includes(parsed.hostname)) {
      return undefined;
    }
    return url;
  } catch {
    return undefined;
  }
}

export function checkOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host");

  if (!origin && !referer) {
    return true;
  }

  const checkUrl = origin || referer;
  if (!checkUrl) return true;

  try {
    const url = new URL(checkUrl);

    if (host && url.host === host) {
      return true;
    }

    return ALLOWED_ORIGINS.some((allowed) => {
      try {
        return new URL(allowed).origin === url.origin;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

export function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self' https://api.groq.com https://api.openai.com; frame-ancestors 'none';"
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 30;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 60_000);

export function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export async function checkRequestSize(req: NextRequest): Promise<boolean> {
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) return false;
  return true;
}

const INJECTION_PATTERNS = [
  /\bignore\s+(all\s+)?(previous|prior|above)\s+(instructions|rules|prompts|constraints)\b/i,
  /\byou\s+are\s+now\s+(a|an|no longer)\b/i,
  /\bjailbreak\b/i,
  /\bDAN\s+mode\b/i,
  /\bdeveloper\s+mode\s*:\s*on\b/i,
  /\b<\|im_start\|>\s*system\b/i,
  /\[INST\]\s*<</i,
  /\bnew\s+system\s*:\s*\[/i,
  /\bprompt\s*:\s*ignore\s+all/i,
  /\bdisregard\s+(all\s+)?(previous|prior)\s+instructions\b/i,
];

export function detectPromptInjection(text: string): { detected: boolean; pattern?: string } {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return { detected: true, pattern: pattern.source };
    }
  }
  return { detected: false };
}

export function sanitizeToolResult(result: string): string {
  let sanitized = result;
  
  // 1. Strip all potential LLM special control tokens (e.g., <|...|>, [INST], [/INST], <<SYS>>)
  sanitized = sanitized.replace(/<\|.*?\|>/g, "[REDACTED TOKEN]");
  sanitized = sanitized.replace(/\[\/?INST\]/ig, "[REDACTED TOKEN]");
  sanitized = sanitized.replace(/<<SYS>>|<\/SYS>>/ig, "[REDACTED TOKEN]");
  
  // 2. Strip direct injection patterns (using global flag)
  for (const pattern of INJECTION_PATTERNS) {
    const globalPattern = new RegExp(pattern, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
    sanitized = sanitized.replace(globalPattern, "[REDACTED INJECTION ATTEMPT]");
  }
  
  // 3. Truncate very long external inputs to prevent context window overflow/stuffing
  if (sanitized.length > 5000) {
    sanitized = sanitized.slice(0, 5000) + "\n... (truncated for safety)";
  }
  
  return sanitized;
}

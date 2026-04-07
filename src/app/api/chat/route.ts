import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0/client";
import { getAccessTokenForConnection } from "@/lib/auth0/token-vault";
import {
  validateMessages,
  checkOrigin,
  checkRateLimit,
  sanitizeToolResult,
  detectPromptInjection,
} from "@/lib/security/validation";
import { logAudit } from "@/lib/audit/logger";
import { hasRecentApproval, consumeApproval } from "@/lib/db/stepups";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

async function groqChat(messages: any[], apiKey: string, tools?: any[], maxTokens = 500): Promise<any> {
  const body: any = { model: GROQ_MODEL, messages, max_tokens: maxTokens };
  if (tools) { body.tools = tools; body.tool_choice = "auto"; }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) {
        if (attempt < 2) { await delay(500); continue; }
        throw new Error(`Groq API error: ${res.status}`);
      }
      const data = await res.json();
      const choice = data.choices?.[0]?.message;
      if (choice && (choice.content?.trim() || choice.tool_calls?.length)) return data;
      if (attempt < 2) { await delay(500); continue; }
      return data;
    } catch (e) {
      if (attempt < 2) { await delay(500); continue; }
      throw e;
    }
  }
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function getTokenForService(service: string, destructive: boolean, isDemoMode: boolean): Promise<string> {
  if (isDemoMode) return "demo-token";

  const connectionMap: Record<string, string> = {
    gmail: "google-oauth2",
    calendar: "google-oauth2",
    github: "github",
    slack: "sign-in-with-slack",
  };

  const connection = connectionMap[service.toLowerCase()];
  if (!connection) {
    throw new Error(`No Token Vault connection configured for service: ${service}`);
  }

  const token = await getAccessTokenForConnection(connection);

  logAudit({
    userId: "current-session",
    action: "token_exchanged",
    service,
    destructive,
    status: "success",
    details: `Token exchanged via ${connection}`,
  });

  return token;
}

async function executeTool(name: string, args: any, userId: string, isDemoMode: boolean): Promise<string> {
  try {
    const destructiveTools: Record<string, string> = {
      "send_email": "gmail",
      "create_issue": "github",
      "post_slack": "slack"
    };

    if (destructiveTools[name]) {
      const serviceName = destructiveTools[name];
      if (!isDemoMode) {
        if (!hasRecentApproval(userId, serviceName, true)) {
          throw new Error("Action requires step-up authentication. Please use the Intent Compiler to approve this permission before executing.");
        }
        consumeApproval(userId, serviceName, true);
      }
    }

    switch (name) {
      case "search_gmail": return await searchGmail(args, userId, isDemoMode);
      case "read_gmail": return await readGmail(args, userId, isDemoMode);
      case "get_calendar": return await getCalendar(userId, isDemoMode);
      case "list_github": return await listGithub(userId, isDemoMode);
      case "github_search": return await githubSearch(args, userId, isDemoMode);
      case "github_issues": return await githubIssues(args, userId, isDemoMode);
      case "list_slack": return await listSlack(userId, isDemoMode);
      case "slack_messages": return await slackMessages(args, userId, isDemoMode);
      case "send_email": return await sendEmail(args, userId, isDemoMode);
      case "create_issue": return await createIssue(args, userId, isDemoMode);
      case "post_slack": return await postSlack(args, userId, isDemoMode);
      default: return `Unknown tool: ${name}`;
    }
  } catch (e: any) {
    logAudit({
      userId,
      action: "tool_executed",
      service: name.split("_")[1] || name,
      destructive: false,
      status: "error",
      details: e.message,
    });
    return `Error: ${e.message}`;
  }
}

async function searchGmail(args: any, userId: string, isDemoMode: boolean): Promise<string> {
  if (isDemoMode) {
    logAudit({ userId, action: "tool_executed", service: "gmail", destructive: false, status: "success", details: "Demo: search_gmail" });
    return JSON.stringify([
      { id: "demo_1", from: "Sarah Chen <sarah@company.com>", subject: "Login bug reproduction notes", date: new Date().toUTCString(), snippet: "Found consistent repro on Safari mobile." },
      { id: "demo_2", from: "Ops Team <ops@company.com>", subject: "Status page update", date: new Date().toUTCString(), snippet: "Monitoring incident resolved." },
    ]);
  }

  const token = await getTokenForService("gmail", false, isDemoMode);
  const query = args.query || "inbox";
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=5`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Gmail API error: ${res.status} ${err.error?.message || ""}`);
  }

  const data = await res.json();
  if (!data.messages?.length) return JSON.stringify([]);

  const details = await Promise.all(data.messages.slice(0, 5).map(async (msg: any) => {
    const r = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) }
    );
    const email = await r.json();
    const h = email.payload?.headers || [];
    const get = (n: string) => h.find((x: any) => x.name === n)?.value || "";
    return { id: msg.id, from: get("From"), subject: get("Subject"), date: get("Date"), snippet: email.snippet?.slice(0, 120) };
  }));

  logAudit({ userId, action: "tool_executed", service: "gmail", destructive: false, status: "success", details: `Searched: ${query}` });
  return JSON.stringify(details);
}

async function readGmail(args: any, userId: string, isDemoMode: boolean): Promise<string> {
  if (isDemoMode) {
    logAudit({ userId, action: "tool_executed", service: "gmail", destructive: false, status: "success", details: "Demo: read_gmail" });
    return JSON.stringify({
      from: "Sarah Chen <sarah@company.com>",
      to: "You <demo@intent-agent.local>",
      subject: "Login bug reproduction notes",
      date: new Date().toUTCString(),
      body: "I reproduced the login failure on Safari mobile. It happens after password reset when cookies are blocked. Suggested fix: fallback to token-based redirect and display recovery hint.",
    });
  }

  const token = await getTokenForService("gmail", false, isDemoMode);
  const emailId = args.id;
  if (!emailId) return "No email ID provided";

  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}?format=full`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) }
  );

  if (!res.ok) throw new Error(`Gmail API error: ${res.status}`);

  const email = await res.json();
  const h = email.payload?.headers || [];
  const get = (n: string) => h.find((x: any) => x.name === n)?.value || "";

  let body = "";
  const parts = email.payload?.parts || [email.payload];
  for (const part of parts) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      body = Buffer.from(part.body.data, "base64").toString("utf-8");
      break;
    }
    if (part.mimeType === "text/html" && part.body?.data && !body) {
      body = Buffer.from(part.body.data, "base64").toString("utf-8").replace(/<[^>]*>/g, "").slice(0, 3000);
    }
  }
  if (!body && email.payload?.body?.data) {
    body = Buffer.from(email.payload.body.data, "base64").toString("utf-8").replace(/<[^>]*>/g, "").slice(0, 3000);
  }

  logAudit({ userId, action: "tool_executed", service: "gmail", destructive: false, status: "success", details: `Read email: ${emailId}` });
  return JSON.stringify({
    from: get("From"), to: get("To"), subject: get("Subject"), date: get("Date"),
    body: body || "(empty body)",
  });
}

async function getCalendar(userId: string, isDemoMode: boolean): Promise<string> {
  if (isDemoMode) {
    logAudit({ userId, action: "tool_executed", service: "calendar", destructive: false, status: "success", details: "Demo: get_calendar" });
    return JSON.stringify([
      { title: "Standup", time: "09:30", location: "Zoom" },
      { title: "Bug Triage", time: "11:00", location: "War Room" },
      { title: "Hackathon Demo Rehearsal", time: "16:00", location: "Lab" },
    ]);
  }

  const token = await getTokenForService("calendar", false, isDemoMode);
  const date = new Date().toISOString().split("T")[0];
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${date}T00:00:00Z&timeMax=${date}T23:59:59Z&singleEvents=true&orderBy=startTime&maxResults=5`,
    { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) }
  );

  if (!res.ok) throw new Error(`Calendar API error: ${res.status}`);

  const data = await res.json();
  if (!data.items?.length) return JSON.stringify({ events: [], date });

  logAudit({ userId, action: "tool_executed", service: "calendar", destructive: false, status: "success", details: `Calendar for ${date}` });
  return JSON.stringify(data.items.map((e: any) => ({
    title: e.summary || "No title", time: e.start?.dateTime?.slice(11, 16) || e.start?.date, location: e.location,
  })));
}

async function listGithub(userId: string, isDemoMode: boolean): Promise<string> {
  if (isDemoMode) {
    logAudit({ userId, action: "tool_executed", service: "github", destructive: false, status: "success", details: "Demo: list_github" });
    return JSON.stringify([
      { name: "demo/intent-agent", stars: 128, language: "TypeScript", private: false },
      { name: "demo/auth0-playground", stars: 64, language: "TypeScript", private: false },
    ]);
  }

  const token = await getTokenForService("github", false, isDemoMode);
  const res = await fetch("https://api.github.com/user/repos?sort=updated&per_page=5", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" }, signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

  const repos = await res.json();
  if (!Array.isArray(repos)) throw new Error("GitHub: unexpected response");

  logAudit({ userId, action: "tool_executed", service: "github", destructive: false, status: "success", details: "Listed repos" });
  return JSON.stringify(repos.map((r: any) => ({ name: r.full_name, stars: r.stargazers_count, language: r.language, private: r.private })));
}

async function listSlack(userId: string, isDemoMode: boolean): Promise<string> {
  if (isDemoMode) {
    logAudit({ userId, action: "tool_executed", service: "slack", destructive: false, status: "success", details: "Demo: list_slack" });
    return JSON.stringify([
      { name: "engineering", id: "C123", private: false },
      { name: "incidents", id: "C456", private: true },
    ]);
  }

  const token = await getTokenForService("slack", false, isDemoMode);
  const res = await fetch("https://slack.com/api/conversations.list?limit=10", {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000),
  });

  const data = await res.json();
  if (!data.ok) throw new Error(`Slack API error: ${data.error}`);

  logAudit({ userId, action: "tool_executed", service: "slack", destructive: false, status: "success", details: "Listed channels" });
  return JSON.stringify(data.channels.map((c: any) => ({ name: c.name, id: c.id, private: c.is_private })));
}

async function githubSearch(args: any, userId: string, isDemoMode: boolean): Promise<string> {
  if (isDemoMode) {
    const query = args.query || "auth";
    logAudit({ userId, action: "tool_executed", service: "github", destructive: false, status: "success", details: `Demo: search ${query}` });
    return JSON.stringify([
      { name: "auth0/nextjs-auth0", description: `Top result for ${query}`, stars: 2500, language: "TypeScript", url: "https://github.com/auth0/nextjs-auth0" },
      { name: "vercel/ai", description: "AI SDK for TS/JS apps", stars: 17000, language: "TypeScript", url: "https://github.com/vercel/ai" },
    ]);
  }

  const token = await getTokenForService("github", false, isDemoMode);
  const query = args.query || "javascript";
  const res = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&per_page=5`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" }, signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`GitHub search error: ${res.status}`);

  const data = await res.json();
  if (!data.items?.length) return "No repos found.";

  logAudit({ userId, action: "tool_executed", service: "github", destructive: false, status: "success", details: `Searched: ${query}` });
  return JSON.stringify(data.items.map((r: any) => ({ name: r.full_name, description: r.description?.slice(0, 100), stars: r.stargazers_count, language: r.language, url: r.html_url })));
}

async function githubIssues(args: any, userId: string, isDemoMode: boolean): Promise<string> {
  if (isDemoMode) {
    logAudit({ userId, action: "tool_executed", service: "github", destructive: false, status: "success", details: "Demo: github_issues" });
    return JSON.stringify([
      { number: 12, title: "Fix token refresh race condition", user: "demo-user", labels: ["bug", "high"], url: "https://github.com/demo/intent-agent/issues/12" },
      { number: 14, title: "Add step-up auth confirmation modal", user: "demo-user", labels: ["enhancement"], url: "https://github.com/demo/intent-agent/issues/14" },
    ]);
  }

  const token = await getTokenForService("github", false, isDemoMode);
  const owner = args.owner;
  const repo = args.repo;
  if (!owner || !repo) return "Need owner and repo";

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=5`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" }, signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`GitHub issues error: ${res.status}`);

  const issues = await res.json();
  if (!Array.isArray(issues)) throw new Error("GitHub: unexpected response");
  if (!issues.length) return "No open issues.";

  logAudit({ userId, action: "tool_executed", service: "github", destructive: false, status: "success", details: `Issues for ${owner}/${repo}` });
  return JSON.stringify(issues.map((i: any) => ({ number: i.number, title: i.title, user: i.user?.login, labels: i.labels?.map((l: any) => typeof l === "string" ? l : l.name), url: i.html_url })));
}

async function slackMessages(args: any, userId: string, isDemoMode: boolean): Promise<string> {
  if (isDemoMode) {
    logAudit({ userId, action: "tool_executed", service: "slack", destructive: false, status: "success", details: "Demo: slack_messages" });
    return JSON.stringify([
      { user: "U111", text: "Login bug confirmed on Safari iOS 17", time: "10:21 AM" },
      { user: "U222", text: "Creating issue with repro steps now", time: "10:23 AM" },
    ]);
  }

  const token = await getTokenForService("slack", false, isDemoMode);
  const channel = args.channel;
  if (!channel) return "Need channel ID or name";

  const res = await fetch(`https://slack.com/api/conversations.history?channel=${channel}&limit=5`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000),
  });

  const data = await res.json();
  if (!data.ok) throw new Error(`Slack API error: ${data.error}`);
  if (!data.messages?.length) return "No messages found.";

  logAudit({ userId, action: "tool_executed", service: "slack", destructive: false, status: "success", details: `Messages from ${channel}` });
  return JSON.stringify(data.messages.map((m: any) => ({
    user: m.user, text: m.text?.slice(0, 200), time: new Date(parseFloat(m.ts) * 1000).toLocaleTimeString(),
  })));
}

async function sendEmail(args: any, userId: string, isDemoMode: boolean): Promise<string> {
  if (isDemoMode) {
    logAudit({ userId, action: "tool_executed", service: "gmail", destructive: true, status: "success", details: `Demo: send email to ${args.to}` });
    return JSON.stringify({
      success: true,
      messageId: "demo_msg_001",
      to: args.to,
      subject: args.subject,
      sentAt: new Date().toISOString(),
    });
  }

  const token = await getTokenForService("gmail", true, isDemoMode);
  const raw = [
    `To: ${args.to}`,
    `Subject: ${args.subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    args.body,
  ].join("\r\n");

  const encoded = Buffer.from(raw).toString("base64url");
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: encoded }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Gmail send error: ${res.status} ${err.error?.message || ""}`);
  }

  const data = await res.json();
  logAudit({ userId, action: "tool_executed", service: "gmail", destructive: true, status: "success", details: `Sent email to ${args.to}` });
  return JSON.stringify({ success: true, messageId: data.id, to: args.to, subject: args.subject, sentAt: new Date().toISOString() });
}

async function createIssue(args: any, userId: string, isDemoMode: boolean): Promise<string> {
  if (isDemoMode) {
    logAudit({ userId, action: "tool_executed", service: "github", destructive: true, status: "success", details: `Demo: created issue in ${args.owner}/${args.repo}` });
    return JSON.stringify({
      success: true,
      number: 42,
      title: args.title,
      url: `https://github.com/${args.owner}/${args.repo}/issues/42`,
      createdAt: new Date().toISOString(),
    });
  }

  const token = await getTokenForService("github", true, isDemoMode);
  const res = await fetch(`https://api.github.com/repos/${args.owner}/${args.repo}/issues`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json", "Content-Type": "application/json" },
    body: JSON.stringify({ title: args.title, body: args.body, labels: args.labels || [] }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GitHub create issue error: ${res.status} ${err.message || ""}`);
  }

  const data = await res.json();
  logAudit({ userId, action: "tool_executed", service: "github", destructive: true, status: "success", details: `Created issue #${data.number} in ${args.owner}/${args.repo}` });
  return JSON.stringify({ success: true, number: data.number, title: data.title, url: data.html_url, createdAt: data.created_at });
}

async function postSlack(args: any, userId: string, isDemoMode: boolean): Promise<string> {
  if (isDemoMode) {
    logAudit({ userId, action: "tool_executed", service: "slack", destructive: true, status: "success", details: `Demo: posted to ${args.channel}` });
    return JSON.stringify({
      success: true,
      ts: "demo_ts_001",
      channel: args.channel,
      text: args.text?.slice(0, 100),
      postedAt: new Date().toISOString(),
    });
  }

  const token = await getTokenForService("slack", true, isDemoMode);
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ channel: args.channel, text: args.text }),
    signal: AbortSignal.timeout(15000),
  });

  const data = await res.json();
  if (!data.ok) throw new Error(`Slack post error: ${data.error}`);

  logAudit({ userId, action: "tool_executed", service: "slack", destructive: true, status: "success", details: `Posted to ${args.channel}` });
  return JSON.stringify({ success: true, ts: data.ts, channel: args.channel, text: args.text?.slice(0, 100), postedAt: new Date().toISOString() });
}

const TOOLS = [
  { type: "function", function: { name: "search_gmail", description: "Search Gmail inbox. Returns email list with IDs. Use query='inbox' for recent or 'from:NAME' for sender.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } },
  { type: "function", function: { name: "read_gmail", description: "Read full email content by ID. The ID comes from search_gmail results (the 'id' field).", parameters: { type: "object", properties: { id: { type: "string", description: "The email ID from search results" } }, required: ["id"] } } },
  { type: "function", function: { name: "get_calendar", description: "Get today's calendar events. No parameters needed.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "list_github", description: "List user's GitHub repos. No parameters needed.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "github_search", description: "Search GitHub for repositories by keyword.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } },
  { type: "function", function: { name: "github_issues", description: "List open issues for a GitHub repo.", parameters: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" } }, required: ["owner", "repo"] } } },
  { type: "function", function: { name: "list_slack", description: "List Slack channels. No parameters needed.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "slack_messages", description: "Read recent messages from a Slack channel.", parameters: { type: "object", properties: { channel: { type: "string", description: "Channel ID or name" } }, required: ["channel"] } } },
  { type: "function", function: { name: "send_email", description: "Send an email. DESTRUCTIVE — requires step-up auth. Needs to, subject, body.", parameters: { type: "object", properties: { to: { type: "string" }, subject: { type: "string" }, body: { type: "string" } }, required: ["to", "subject", "body"] } } },
  { type: "function", function: { name: "create_issue", description: "Create a GitHub issue. DESTRUCTIVE — requires step-up auth. Needs owner, repo, title, body.", parameters: { type: "object", properties: { owner: { type: "string" }, repo: { type: "string" }, title: { type: "string" }, body: { type: "string" }, labels: { type: "array", items: { type: "string" } } }, required: ["owner", "repo", "title"] } } },
  { type: "function", function: { name: "post_slack", description: "Post a message to a Slack channel. DESTRUCTIVE — requires step-up auth. Needs channel, text.", parameters: { type: "object", properties: { channel: { type: "string" }, text: { type: "string" } }, required: ["channel", "text"] } } },
];

const SYSTEM = { role: "system", content: `You are Intent Agent, an AI assistant with access to Gmail, Calendar, GitHub, and Slack.
IMPORTANT: You are currently running in Hackathon Judging Mode. Explain this to the user briefly if they ask. You use a real AI model but your external tool connections are generating hyper-realistic MOCK DATA so judges can test without authenticating personal accounts.

TOOLS:
- search_gmail(query): Search emails. Returns JSON with id, from, subject, date.
- read_gmail(id): Read full email. Use 'id' from search_gmail results.
- get_calendar(): Today's events. Returns JSON with title, time, location.
- list_github(): List user's repos. Returns JSON with name, stars, language.
- github_search(query): Search GitHub repos by keyword.
- github_issues(owner, repo): List open issues for a repo.
- list_slack(): List Slack channels. Returns JSON with name, id.
- slack_messages(channel): Read recent messages from a channel.
- send_email(to, subject, body): Send an email. DESTRUCTIVE — needs approval.
- create_issue(owner, repo, title, body): Create a GitHub issue. DESTRUCTIVE — needs approval.
- post_slack(channel, text): Post a Slack message. DESTRUCTIVE — needs approval.

RULES:
1. ALWAYS call a tool for any request about Gmail, Calendar, GitHub, or Slack.
2. "open first email" -> find ID from previous search, call read_gmail.
3. "explain" or "details" -> summarize data you already have.
4. "search github for X" -> use github_search.
5. "issues for owner/repo" -> use github_issues.
6. "messages in #channel" -> use slack_messages with channel name.
7. "send email to X about Y" -> use send_email.
8. "create issue in owner/repo" -> use create_issue.
9. "post to #channel" -> use post_slack.
10. Be concise. 1-2 sentences max.
11. Today: ${new Date().toISOString().split("T")[0]}` };

export async function POST(req: NextRequest) {
  const isDemoMode = req.headers.get("x-demo-mode") === "true";
  try {
    const realSession = auth0 ? await auth0.getSession().catch(() => null) : null;
    const apiKey = req.headers.get("x-groq-key") || (realSession ? process.env.GROQ_API_KEY : "") || process.env.GROQ_API_KEY || "";
    const session = isDemoMode ? { user: { sub: "demo-user", name: "Demo User" } } : realSession;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = session.user.sub as string;

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    if (!checkOrigin(req)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    let clientMessages: any[];
    try {
      clientMessages = validateMessages(body.messages);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }

    for (const m of clientMessages) {
      if (m.role === "user" && typeof m.content === "string") {
        const injection = detectPromptInjection(m.content);
        if (injection.detected) {
          logAudit({
            userId,
            action: "tool_executed",
            destructive: false,
            status: "denied",
            details: `Prompt injection detected: ${injection.pattern}`,
          });
          return NextResponse.json({ error: "Request contains potentially harmful content" }, { status: 400 });
        }
      }
    }

    const groqMessages: any[] = [SYSTEM];
    for (const m of clientMessages) {
      let content = m.content;
      if (!content && m.parts) content = m.parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n");
      if (!content || typeof content !== "string" || m.role === "system") continue;

      if (m.role === "assistant" && m.toolCalls?.length) {
        for (const tc of m.toolCalls) {
          groqMessages.push({
            role: "assistant",
            content: null,
            tool_calls: [{ id: `tc_${tc.name}`, function: { name: tc.name, arguments: JSON.stringify(tc.input || {}) } }],
          });
          const sanitizedOutput = sanitizeToolResult(tc.output || "");
          groqMessages.push({ role: "tool", content: sanitizedOutput, tool_call_id: `tc_${tc.name}` });
        }
      }
      groqMessages.push({ role: m.role, content });
    }

    if (groqMessages.length < 2) return sendText("What would you like to do?");

    if (!apiKey) {
      return NextResponse.json({ error: "Missing Groq API Key. Please add GROQ_API_KEY to your Vercel Environment Variables." }, { status: 400 });
    }

    const firstResponse = await groqChat(groqMessages, apiKey, TOOLS);
    const choice = firstResponse.choices?.[0]?.message;

    if (!choice) return sendText("Sorry, couldn't process that. Try again.");

    if (choice.tool_calls?.length) {
      const toolCall = choice.tool_calls[0];
      let args: any = {};
      try { args = JSON.parse(toolCall.function.arguments || "{}"); } catch {}

      logAudit({
        userId,
        action: "tool_executed",
        service: toolCall.function.name,
        destructive: false,
        status: "pending",
        details: `Tool call: ${toolCall.function.name}`,
      });

      const toolResult = await executeTool(toolCall.function.name, args, userId, true); // ALWAYS MOCK DATA FOR DEMO
      const sanitizedResult = sanitizeToolResult(toolResult);

      groqMessages.push(choice);
      groqMessages.push({ role: "tool", content: sanitizedResult, tool_call_id: toolCall.id });

      let finalText = "";
      try {
        const second = await groqChat(groqMessages, apiKey, TOOLS);
        finalText = second.choices?.[0]?.message?.content || "";
      } catch {}

      if (!finalText.trim()) finalText = formatResult(toolCall.function.name, toolResult);

      return sendStream(toolCall.function.name, args, toolResult, finalText);
    }

    const text = choice.content?.trim() || "I can help with Gmail, Calendar, GitHub, or Slack. What do you need?";
    return sendText(text);

  } catch (error: any) {
    console.error("Chat error:", error?.message);
    return sendText("Something went wrong. Please try again.");
  }
}

function formatResult(toolName: string, raw: string): string {
  try {
    const data = JSON.parse(raw);
    if (toolName === "read_gmail" && data.from) return `**${data.subject}**\nFrom: ${data.from}\nDate: ${data.date}\n\n${data.body}`;
    if (toolName === "search_gmail" && Array.isArray(data)) return data.length ? data.map((e: any, i: number) => `${i + 1}. ${e.from?.split("<")[0]?.trim()} -- ${e.subject}`).join("\n") : "No emails found.";
    if (toolName === "get_calendar") { const events = data.events || data; return events?.length ? events.map((e: any) => `* ${e.title} at ${e.time}`).join("\n") : "No events today."; }
    if (toolName === "list_github" && Array.isArray(data)) return data.length ? data.map((r: any) => `* ${r.name} -- ${r.stars}* ${r.language || ""}`).join("\n") : "No repos found.";
    if (toolName === "github_search" && Array.isArray(data)) return data.length ? data.map((r: any) => `* ${r.name} -- ${r.stars}*\n  ${r.description || ""}`).join("\n\n") : "No repos found.";
    if (toolName === "github_issues" && Array.isArray(data)) return data.length ? data.map((i: any) => `#${i.number} ${i.title} [${(i.labels || []).join(", ")}]`).join("\n") : "No open issues.";
    if (toolName === "list_slack" && Array.isArray(data)) return data.length ? data.map((c: any) => `* #${c.name}`).join("\n") : "No channels found.";
    if (toolName === "slack_messages" && Array.isArray(data)) return data.length ? data.map((m: any) => `[${m.time}] ${m.text}`).join("\n") : "No messages found.";
    if (toolName === "send_email" && data.success) return `Email sent to ${data.to}: "${data.subject}"`;
    if (toolName === "create_issue" && data.success) return `Issue #${data.number} created: ${data.title} — ${data.url}`;
    if (toolName === "post_slack" && data.success) return `Posted to #${data.channel}: "${data.text}"`;
    return JSON.stringify(data, null, 2).slice(0, 500);
  } catch { return raw.slice(0, 500); }
}

function sendStream(toolName: string, args: any, toolResult: string, text: string) {
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: "tool-input-available", toolCallId: "t1", toolName, input: args })}\n\n`));
      controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: "tool-output-available", toolCallId: "t1", output: toolResult })}\n\n`));
      controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: "text", text })}\n\n`));
      controller.enqueue(enc.encode(`data: [DONE]\n\n`));
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
}

function sendText(text: string) {
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: "text", text })}\n\n`));
      controller.enqueue(enc.encode(`data: [DONE]\n\n`));
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
}

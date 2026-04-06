# BONUS BLOG POST: Intent-Driven Authorization — The Missing Layer in AI Agent Security

## The Problem Nobody's Solving

Every AI agent today has the same dangerous pattern: you describe what you want, the agent does it, and you have no idea what it accessed until after the fact.

The authorization layer is completely disconnected from the intent layer. The agent decides what permissions it needs. The user discovers what happened after it's done. This is backwards.

## What If Intent Drove Authorization?

What if, before your AI agent touched a single API, it showed you:

1. **Exactly what it's going to do** — in structured, human-readable form
2. **Exactly what permissions it needs** — with specific OAuth scopes for each service
3. **Where it might misunderstand you** — before it makes a mistake
4. **What edge cases could go wrong** — so you can approve with eyes open

This is what Intent Agent does. It compiles your vague prompt ("read Sarah's Slack message about the login bug and create a GitHub issue") into a structured specification, then maps that specification to the minimum required OAuth scopes through Auth0 Token Vault.

## How It Works

```
User: "Read Sarah's Slack message about the login bug and create a GitHub issue"

↓ Intent Compiler (Groq Llama 3.3 70B)

Objective: Create GitHub issue from Sarah's Slack message about login bug
Requirements:
  - Search Slack for message from Sarah (channels:history scope)
  - Read message content (channels:history scope)
  - Create GitHub issue (repo scope, WRITE — requires approval)

Misunderstanding Risks:
  ⚠️ Agent might search wrong Slack channel
  ⚠️ Agent might create issue in wrong repository

↓ Auth0 Token Vault

[User approves: Slack read access] → Token Vault provides scoped token
[User approves: GitHub write access] → Step-up auth via CIBA

↓ Agent executes with scoped tokens

Result: Issue #42 created — https://github.com/...
```

## Why This Matters

### 1. Least Privilege by Design

The intent compiler determines the MINIMUM set of permissions needed. Not "give the agent access to all of Gmail" — just "gmail.readonly for this specific search." If the intent changes, the required permissions change with it.

### 2. Misunderstanding Prevention

Before any code runs, the intent compiler identifies where the AI will likely misinterpret the request. "You probably mean Sarah in #engineering, not Sarah in #marketing." These misunderstandings would otherwise silently cause the agent to access the wrong resources.

### 3. Destructive Action Visibility

Write operations (sending emails, creating issues, posting Slack messages) are flagged separately with step-up authentication through Auth0's CIBA flow. The user gets a push notification: "Do you want to create an issue in repo X?" — before the action executes.

### 4. Audit Trail by Intent

Every action is traceable back to a structured intent specification. Not "the agent did something with GitHub" — "the agent executed Intent #abc123 with objective 'Create GitHub issue from Slack message' using scopes [repo] on 2026-04-05."

## The Auth0 Token Vault Makes This Possible

Auth0 Token Vault is the foundation. Without it, we'd be managing OAuth tokens ourselves — storing refresh tokens, handling rotation, dealing with per-provider quirks. Token Vault handles all of this:

- **30+ providers** supported out of the box
- **Token exchange** via RFC 8693 — we never see the provider's refresh token
- **Step-up auth** via CIBA — human approval for destructive actions
- **Scoped access** — each tool gets exactly the permissions it needs
- **Connected Accounts** — unified user profile linked to multiple external accounts

The combination of intent compilation + Token Vault creates something that doesn't exist anywhere else: **authorization that's driven by understanding, not by convenience**.

## Security Architecture

Intent Agent implements defense-in-depth:

- **Prompt Injection Detection**: Blocks common injection patterns before they reach the LLM
- **CSRF Protection**: Origin header validation on all API routes
- **Rate Limiting**: 30 requests per minute per IP with automatic cleanup
- **Input Validation**: Strict schema validation with size limits
- **Tool Result Sanitization**: Prevents injection through tool outputs
- **Security Headers**: CSP, HSTS, X-Frame-Options, Permissions-Policy
- **Audit Logging**: Every token exchange, tool call, and permission decision logged

## What We Learned

Building this project revealed a fundamental insight: **the authorization boundary of an AI agent should match its intent boundary**. When an agent's permissions are broader than its current intent, the excess permissions are an attack surface. When they're narrower, the agent can't do its job.

Intent Agent dynamically computes the authorization boundary for each request. No static API keys. No over-scoped tokens. No permissions the agent doesn't need right now.

This is what agent authorization should look like. Auth0 for AI Agents makes it possible.

---

*Built for the Authorized to Act Hackathon — Auth0 for AI Agents*
*Source code: github.com/[repo]*
*Live demo: intent-agent.vercel.app*

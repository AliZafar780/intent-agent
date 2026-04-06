# Intent Agent

> **The AI agent that compiles your intent, shows what permissions it needs, and executes securely through Auth0 Token Vault.**

## The Problem

AI agents today have a dangerous gap: you describe what you want, the agent does it, but you have no idea what it accessed, what permissions it used, or whether it understood your intent correctly.

## The Solution

**Intent Agent** bridges three layers that have never been connected before:

1. **Intent Compilation** — Your vague prompt becomes a structured spec with requirements, edge cases, and acceptance criteria
2. **Permission Mapping** — The spec shows EXACTLY which OAuth scopes and services the agent needs BEFORE it runs
3. **Secure Execution** — Auth0 Token Vault provides scoped, time-limited tokens. The agent never sees credentials.

## How It Works

```
You: "Read Sarah's Slack message about the login bug and create a GitHub issue"

Intent Agent:
┌─────────────────────────────────────────────────┐
│ INTENT COMPILED                                  │
│ Objective: Create GitHub issue from Slack msg    │
│ Requirements:                                    │
│  - Read Slack message (channels:history scope)   │
│  - Create GitHub issue (repo scope)              │
│                                                   │
│ Misunderstanding Risks:                          │
│  ⚠️ Agent might search wrong Slack channel       │
│  ⚠️ Agent might create issue in wrong repo       │
│                                                   │
│ [Approve Permissions] [Modify Scope] [Cancel]    │
└─────────────────────────────────────────────────┘

→ User approves via Auth0 Token Vault
→ Agent executes with scoped tokens
→ Step-up auth for destructive actions
```

## Features

- **Intent Compiler**: Vague prompts → structured specifications via LLM
- **Misunderstanding Detection**: Shows where AI will get it wrong before execution
- **Permission Visualization**: See exactly what the agent will access with OAuth scopes
- **Auth0 Token Vault**: Secure, scoped OAuth for 30+ services — agent never touches credentials
- **Audit Logging**: Every token exchange, tool call, and permission decision is logged
- **Prompt Injection Protection**: Detects and blocks prompt injection attempts
- **DEMO_MODE**: Full functionality without any API keys for testing and demos
- **Multi-LLM Support**: Groq (default) or OpenAI with automatic fallback

## Tech Stack

- **Next.js 15** — App Router, Server Components, API Routes
- **Auth0 for AI Agents** — User auth, Token Vault, CIBA (step-up auth)
- **Vercel AI SDK** — Tool calling, streaming responses
- **Groq Llama 3.3 70B** — Intent compilation + agent reasoning (or OpenAI GPT-4o)
- **TypeScript** — End-to-end type safety
- **Tailwind CSS** — Clean, minimal dark theme UI

## Getting Started

### 1. Clone and Install

```bash
cd intent-agent
npm install
```

### 2. Set up Auth0

1. Create an Auth0 account at https://auth0.com/signup
2. Create a **Regular Web Application**
3. Enable **Token Vault** grant type in your application settings
4. Configure social connections (Google, GitHub, Slack)
5. Create a **Machine-to-Machine Application** for Token Vault exchange
6. Set up the **My Account API**

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials. See `.env.example` for all required variables.

**Minimum for demo mode** (no API keys needed):
```
DEMO_MODE=true
```

**Full production setup**:
```
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_SECRET=a-long-random-secret
AUTH0_CUSTOM_API_CLIENT_ID=your-m2m-client-id
AUTH0_CUSTOM_API_CLIENT_SECRET=your-m2m-client-secret
AUTH0_AUDIENCE=https://your-tenant.auth0.com/api/v2/
GROQ_API_KEY=gsk_your-key
```

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
│  ChatWindow ── IntentPanel ── PermissionPanel                   │
├─────────────────────────────────────────────────────────────────┤
│                          API LAYER                               │
│  /api/intent    /api/chat    /api/debug    /api/audit            │
├─────────────────────────────────────────────────────────────────┤
│                       BUSINESS LOGIC                             │
│  Intent Compiler ── Tool Executor ── Auth0 AI Layer             │
│  Security Layer ── Audit Logger                                 │
├─────────────────────────────────────────────────────────────────┤
│                      AUTH0 TOKEN VAULT                           │
│  Token Exchange ── Connected Accounts ── CIBA Step-up Auth      │
├─────────────────────────────────────────────────────────────────┤
│                     EXTERNAL SERVICES                            │
│  [Gmail] [Calendar] [GitHub] [Slack] [Microsoft]                │
└─────────────────────────────────────────────────────────────────┘
```

## Security

- **Least Privilege**: Each tool uses minimum required OAuth scopes
- **Token Vault**: Agent never sees raw credentials or refresh tokens
- **Prompt Injection Detection**: Blocks common injection patterns
- **CSRF Protection**: Origin header validation on all API routes
- **Rate Limiting**: 30 requests per minute per IP
- **Input Validation**: Strict schema validation on all inputs
- **Audit Trail**: Every action logged with user, service, and status
- **Security Headers**: CSP, HSTS, X-Frame-Options, etc.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/intent` | POST | Compile a prompt into an intent specification |
| `/api/chat` | POST | Chat with the agent (tool-calling, SSE streaming) |
| `/api/debug` | GET | Check service health and connection status |
| `/api/audit` | GET | View audit log and statistics |
| `/auth/login` | GET | Auth0 login (production mode) |
| `/auth/logout` | GET | Auth0 logout (production mode) |

## What Makes This Different

| Feature | VaultBridge | Assistant0 | Intent Agent |
|---------|------------|------------|--------------|
| Token Vault | ✅ | ✅ | ✅ |
| Intent compilation | ❌ | ❌ | ✅ |
| Misunderstanding detection | ❌ | ❌ | ✅ |
| Permission pre-visualization | ❌ | ❌ | ✅ |
| Step-up auth | ✅ | ✅ | ✅ |
| Audit logging | ❌ | ❌ | ✅ |
| Prompt injection protection | ❌ | ❌ | ✅ |
| Standalone (not MCP-only) | ❌ | ✅ | ✅ |
| Demo mode (no API keys) | ❌ | ❌ | ✅ |

## Judging Criteria Alignment

- **Security Model**: Scoped OAuth per service, Token Vault, step-up auth for writes, prompt injection protection
- **User Control**: Intent spec shows EXACTLY what agent will access BEFORE execution with explicit approve/deny
- **Technical Execution**: Token Vault + Intent Compiler + Vercel AI SDK + Audit logging
- **Design**: Clean chat UI with permission visualization panels and tool call cards
- **Impact**: Every developer building AI agents needs intent→auth mapping
- **Insight Value**: Shows that agent authorization should be DRIVEN BY intent, not convenience

## License

MIT

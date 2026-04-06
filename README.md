# 🛡️ Intent Agent

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Auth0](https://img.shields.io/badge/Auth0-Secure-eb5424)

**Intent Agent** is a highly secure, Next.js-based AI assistant that acts as a broker for external SaaS applications (like Gmail, GitHub, and Slack). 

Traditionally, AI agents require raw, long-lived API keys to interact with third-party services—a massive security risk. Intent Agent solves this by utilizing the **Auth0 Token Vault** to manage scoped, time-limited tokens, and implements a rigorous **Step-Up Authentication** engine to explicitly gate destructive actions.

---

## ✨ Core Features

### 1. Secure API Execution (Auth0 Token Vault)
The agent *never* sees raw credentials or refresh tokens. Users connect their third-party accounts via Auth0. When a specific tool needs to be executed, the backend securely exchanges the user's Auth0 session for a temporary, scoped provider token using `@auth0/ai-vercel`.

### 2. Cryptographic Step-Up Authentication
Not all AI actions carry the same risk. Reading an email is safe; sending an email or deleting a repository is dangerous. 
*   **The Engine:** We built a custom interception engine in the backend API. 
*   **The Flow:** If the AI attempts a destructive action, execution is immediately paused. A cryptographic request is saved to a local SQLite database (`data/intent-agent.db`), and the frontend is notified.
*   **The UI:** The user is prompted with a **Step-Up Authentication Modal** to explicitly approve or deny the action before the backend consumes the database ticket and allows the tool to execute.

### 3. Intent Compilation & Pre-visualization
Before any action is taken, the user's vague prompt is compiled into a structured specification. The UI displays exactly which OAuth scopes and services the agent intends to use, allowing the user to catch misunderstandings *before* execution.

### 4. Advanced Security Hardening
*   **Indirect Prompt Injection Mitigation:** Aggressive sanitization of external API responses. LLM control tokens are stripped out to prevent malicious data (e.g., a malicious email) from hijacking the agent's instructions.
*   **Auth0 Bypass Protection:** API routes strictly validate the Auth0 session, preventing unauthorized users from abusing the server's LLM API keys.

### 5. Demo / Real Mode Toggle
A built-in toggle allowing developers and reviewers to safely test the UI, AI chat capabilities, and simulated tool calls without needing to configure complex Auth0 tenants or expose production API keys.

---

## 🏗️ Architecture & Tech Stack

* **Frontend:** React, Next.js (App Router), Tailwind CSS
* **Authentication:** `@auth0/nextjs-auth0`
* **AI Engine:** Vercel AI SDK (`ai`), `@ai-sdk/groq` (Llama 3)
* **Security Broker:** `@auth0/ai-vercel` (Token Vault)
* **Database (Step-Up tracking):** SQLite via `better-sqlite3`

---

## 🚀 Getting Started

Follow these steps to run the Intent Agent locally on your machine.

### 1. Clone the Repository

```bash
git clone https://github.com/AliZafar780/intent-agent.git
cd intent-agent
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Open `.env.local` and configure your keys. 

**For Demo Mode (Quickstart):**
You only need an LLM API key to test the UI and chat functionality.
```env
DEMO_MODE=true
GROQ_API_KEY=gsk_your_groq_api_key
```

**For Production Mode (Full Auth0 Setup):**
Set `DEMO_MODE=false` and configure your Auth0 application:
```env
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_SECRET=a-32-character-random-string
AUTH0_AUDIENCE=https://your-api-audience
AUTH0_CUSTOM_API_CLIENT_ID=your-m2m-client-id
AUTH0_CUSTOM_API_CLIENT_SECRET=your-m2m-client-secret
GROQ_API_KEY=gsk_your_groq_api_key
```

### 4. Run the Development Server

```bash
npm run dev
# or
yarn dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deployment (Vercel)

The easiest way to deploy this application is using [Vercel](https://vercel.com/):

1. Go to [Vercel.com](https://vercel.com/new) and log in.
2. Click **Add New... > Project**.
3. Import your `intent-agent` repository from GitHub.
4. Open the **Environment Variables** section and add all the required variables from your `.env.local` file.
5. Click **Deploy**.

*(Note: For production, ensure your Auth0 dashboard Callback URLs and Logout URLs are updated to point to your new Vercel domain).*

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/AliZafar780/intent-agent/issues).

## 📄 License
This project is licensed under the [MIT License](LICENSE).
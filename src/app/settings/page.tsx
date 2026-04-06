import { auth0 } from "@/lib/auth0/client";
import { redirect } from "next/navigation";
import Link from "next/link";

const DEMO_MODE = process.env.DEMO_MODE === "true";

const KEYBOARD_SHORTCUTS = [
  { key: "Enter", ctrl: true, description: "Send message" },
  { key: "K", ctrl: true, description: "Compile intent" },
  { key: "Escape", ctrl: false, description: "Close panels / clear input" },
  { key: "/", ctrl: true, description: "Focus chat input" },
  { key: "N", ctrl: true, description: "New conversation" },
  { key: "D", ctrl: true, description: "Go to dashboard" },
  { key: "H", ctrl: true, description: "Go to history" },
];

export default async function SettingsPage() {
  const session = DEMO_MODE
    ? { user: { sub: "demo-user", name: "Demo User", email: "demo@intent-agent.local" } }
    : await auth0.getSession();

  if (!session) redirect("/auth/login");

  return (
    <main className="min-h-screen bg-[#06141b]">
      <header className="border-b border-zinc-800/50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-sm font-semibold text-white">Settings</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-xs text-zinc-400 hover:text-white">Dashboard</Link>
          <Link href="/" className="text-xs text-zinc-400 hover:text-white">← Chat</Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Profile */}
        <div className="rounded-xl border border-zinc-800/50 bg-[#0b1d27] p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Profile</h2>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white">
              {(session.user.name || session.user.email || "U")[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm text-zinc-200">{session.user.name || "User"}</p>
              <p className="text-xs text-zinc-500">{session.user.email || ""}</p>
              <p className="text-[10px] text-zinc-600 font-mono mt-0.5">ID: {session.user.sub}</p>
            </div>
          </div>
        </div>

        {/* Environment */}
        <div className="rounded-xl border border-zinc-800/50 bg-[#0b1d27] p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Environment</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Mode</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${DEMO_MODE ? "bg-amber-500/10 text-amber-300 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"}`}>
                {DEMO_MODE ? "Demo" : "Production"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Auth0 Domain</span>
              <span className="text-xs text-zinc-300 font-mono">{process.env.AUTH0_DOMAIN ? "Configured" : "Not set"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">LLM Provider</span>
              <span className="text-xs text-zinc-300 font-mono">{process.env.GROQ_API_KEY ? "Groq" : process.env.OPENAI_API_KEY ? "OpenAI" : "None (demo)"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Database</span>
              <span className="text-xs text-zinc-300 font-mono">SQLite (persistent)</span>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="rounded-xl border border-zinc-800/50 bg-[#0b1d27] p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Keyboard Shortcuts</h2>
          <div className="space-y-2">
            {KEYBOARD_SHORTCUTS.map((s) => (
              <div key={s.key + s.description} className="flex items-center justify-between py-1.5">
                <span className="text-xs text-zinc-300">{s.description}</span>
                <div className="flex items-center gap-1">
                  {s.ctrl && <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono border border-zinc-700">Ctrl</kbd>}
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 font-mono border border-zinc-700">{s.key}</kbd>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="rounded-xl border border-zinc-800/50 bg-[#0b1d27] p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Security Features</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: "Prompt Injection Detection", status: "Active" },
              { name: "CSRF Protection", status: "Active" },
              { name: "Rate Limiting", status: "30 req/min" },
              { name: "Input Validation", status: "Active" },
              { name: "Security Headers", status: "7 headers" },
              { name: "Audit Logging", status: "Persistent" },
              { name: "Token Vault", status: "Scoped OAuth" },
              { name: "Step-up Auth (CIBA)", status: "Active" },
            ].map((f) => (
              <div key={f.name} className="flex items-center justify-between py-1.5">
                <span className="text-[10px] text-zinc-400">{f.name}</span>
                <span className="text-[10px] text-emerald-300 font-mono">{f.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Links */}
        <div className="rounded-xl border border-zinc-800/50 bg-[#0b1d27] p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Resources</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/", label: "Chat", desc: "Main interface" },
              { href: "/dashboard", label: "Dashboard", desc: "Analytics & stats" },
              { href: "/history", label: "History", desc: "Past intents" },
              { href: "/patterns", label: "Patterns", desc: "Learned preferences" },
              { href: "/api/debug", label: "Debug API", desc: "Health check" },
              { href: "/api/audit", label: "Audit API", desc: "Log export" },
            ].map((l) => (
              <Link key={l.href} href={l.href} className="block rounded-lg bg-zinc-800/50 p-3 hover:bg-zinc-800 transition-all">
                <p className="text-xs text-zinc-200 font-medium">{l.label}</p>
                <p className="text-[10px] text-zinc-500">{l.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

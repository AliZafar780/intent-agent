import { auth0 } from "@/lib/auth0/client";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuditStats } from "@/lib/audit/logger";
import { getPatterns } from "@/lib/db/preferences";
import { getIntentCount, getRecentIntents } from "@/lib/db/intents";

const DEMO_MODE = process.env.DEMO_MODE === "true";

export default async function DashboardPage() {
  const session = DEMO_MODE
    ? { user: { sub: "demo-user", name: "Demo User", email: "demo@intent-agent.local" } }
    : await auth0.getSession();

  if (!session) redirect("/auth/login");

  const userId = session.user.sub as string;

  let stats: any = { totalActions: 0, destructiveActions: 0, deniedActions: 0, approvedActions: 0, servicesUsed: [], actionsByDay: [], avgCompletenessScore: 0, totalIntents: 0 };
  let patterns: any = { preferredServices: [], commonActions: [], destructiveRate: 0, topScopes: [], avgCompleteness: 0, totalIntents: 0, learnedPreferences: [] };
  let recentIntents: any[] = [];
  let intentCount = 0;

  try {
    stats = getAuditStats(userId);
    patterns = getPatterns(userId);
    recentIntents = getRecentIntents(userId, 5);
    intentCount = getIntentCount(userId);
  } catch {
  }

  return (
    <main className="min-h-screen bg-[#06141b]">
      <header className="border-b border-zinc-800/50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813-2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <h1 className="text-sm font-semibold text-white">Intent Agent — Dashboard</h1>
        </div>
        <Link href="/" className="text-xs text-zinc-400 hover:text-white transition-colors">← Back to Chat</Link>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Actions", value: stats.totalActions, color: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30" },
            { label: "Intents Compiled", value: intentCount || stats.totalIntents, color: "from-violet-500/20 to-purple-500/20 border-violet-500/30" },
            { label: "Destructive Actions", value: stats.destructiveActions, color: "from-red-500/20 to-orange-500/20 border-red-500/30" },
            { label: "Denied Requests", value: stats.deniedActions, color: "from-amber-500/20 to-yellow-500/20 border-amber-500/30" },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-xl border bg-gradient-to-br ${stat.color} p-5`}>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wide">{stat.label}</p>
              <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Services & Patterns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-zinc-800/50 bg-[#0b1d27] p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Most Used Services</h2>
            {stats.servicesUsed?.length > 0 ? (
              <div className="space-y-2">
                {stats.servicesUsed.map((s: any) => (
                  <div key={s.service} className="flex items-center justify-between">
                    <span className="text-xs text-zinc-300">{s.service}</span>
                    <span className="text-xs text-cyan-300 font-mono">{s.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">No service usage yet. Start chatting to see stats.</p>
            )}
          </div>

          <div className="rounded-xl border border-zinc-800/50 bg-[#0b1d27] p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Learned Preferences</h2>
            {patterns.learnedPreferences?.length > 0 ? (
              <div className="space-y-2">
                {patterns.learnedPreferences.slice(0, 5).map((p: any) => (
                  <div key={p.preference_key} className="flex items-center justify-between">
                    <span className="text-xs text-zinc-300 font-mono">{p.preference_key}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-zinc-700 overflow-hidden">
                        <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${Math.round(p.confidence * 100)}%` }} />
                      </div>
                      <span className="text-[10px] text-zinc-400">{Math.round(p.confidence * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">No preferences learned yet. Compile more intents.</p>
            )}
          </div>
        </div>

        {/* Recent Intents */}
        <div className="rounded-xl border border-zinc-800/50 bg-[#0b1d27] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent Intents</h2>
            <Link href="/history" className="text-[10px] text-cyan-400 hover:text-cyan-300">View all →</Link>
          </div>
          {recentIntents.length > 0 ? (
            <div className="space-y-2">
              {recentIntents.map((intent: any) => (
                <div key={intent.id} className="flex items-center justify-between py-2 border-b border-zinc-800/30 last:border-0">
                  <div>
                    <p className="text-xs text-zinc-200">{intent.objective?.slice(0, 80) || intent.original_prompt?.slice(0, 80)}</p>
                    <p className="text-[10px] text-zinc-500">{intent.created_at}</p>
                  </div>
                  <span className="text-[10px] text-cyan-300 font-mono">{Math.round(intent.completeness_score)}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No intents compiled yet.</p>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/", label: "Chat", icon: "💬" },
            { href: "/history", label: "History", icon: "📋" },
            { href: "/patterns", label: "Patterns", icon: "🧠" },
            { href: "/api/audit", label: "Audit API", icon: "📊" },
          ].map((link) => (
            <Link key={link.href} href={link.href} className="flex items-center gap-2 px-4 py-3 rounded-xl border border-zinc-800/50 bg-[#0b1d27] hover:border-cyan-700/50 transition-all text-center">
              <span className="text-lg">{link.icon}</span>
              <span className="text-xs text-zinc-300">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

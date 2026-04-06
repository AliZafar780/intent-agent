import { auth0 } from "@/lib/auth0/client";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPatterns } from "@/lib/db/preferences";
import { getMostUsedServices } from "@/lib/db/intents";

const DEMO_MODE = process.env.DEMO_MODE === "true";

export default async function PatternsPage() {
  const session = DEMO_MODE
    ? { user: { sub: "demo-user", name: "Demo User" } }
    : await auth0.getSession();

  if (!session) redirect("/api/auth/login");

  const userId = session.user.sub as string;

  let patterns: any = {
    preferredServices: [],
    commonActions: [],
    destructiveRate: 0,
    topScopes: [],
    avgCompleteness: 0,
    totalIntents: 0,
    learnedPreferences: [],
  };

  let mostUsed: any[] = [];

  try {
    patterns = getPatterns(userId);
    mostUsed = getMostUsedServices(userId);
  } catch {
  }

  return (
    <main className="min-h-screen bg-[#06141b]">
      <header className="border-b border-zinc-800/50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h1 className="text-sm font-semibold text-white">Pattern Learning</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-xs text-zinc-400 hover:text-white">Dashboard</Link>
          <Link href="/" className="text-xs text-zinc-400 hover:text-white">← Chat</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Overview */}
        <div className="rounded-xl border border-zinc-800/50 bg-[#0b1d27] p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Learning Overview</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase">Total Intents</p>
              <p className="text-2xl font-bold text-white">{patterns.totalIntents}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase">Avg Completeness</p>
              <p className="text-2xl font-bold text-cyan-300">{patterns.avgCompleteness}%</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase">Destructive Rate</p>
              <p className="text-2xl font-bold text-amber-300">{patterns.destructiveRate}%</p>
            </div>
          </div>
        </div>

        {/* Preferred Services */}
        <div className="rounded-xl border border-zinc-800/50 bg-[#0b1d27] p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Preferred Services</h2>
          {patterns.preferredServices?.length > 0 ? (
            <div className="space-y-3">
              {patterns.preferredServices.map((s: any) => (
                <div key={s.service} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-300 w-24">{s.service}</span>
                  <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                      style={{ width: `${Math.min((s.frequency / Math.max(...patterns.preferredServices.map((x: any) => x.frequency))) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-400 font-mono w-8 text-right">{s.frequency}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No service patterns detected yet.</p>
          )}
        </div>

        {/* Common Actions */}
        <div className="rounded-xl border border-zinc-800/50 bg-[#0b1d27] p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Common Actions</h2>
          {patterns.commonActions?.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {patterns.commonActions.map((a: any) => (
                <div key={a.action} className="rounded-lg bg-zinc-800/50 p-3 text-center">
                  <p className="text-xs text-zinc-300">{a.action.replace(/_/g, " ")}</p>
                  <p className="text-lg font-bold text-cyan-300 mt-1">{a.count}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No action patterns detected yet.</p>
          )}
        </div>

        {/* Learned Preferences */}
        <div className="rounded-xl border border-zinc-800/50 bg-[#0b1d27] p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Learned Preferences</h2>
          {patterns.learnedPreferences?.length > 0 ? (
            <div className="space-y-3">
              {patterns.learnedPreferences.map((p: any) => (
                <div key={p.preference_key} className="flex items-center justify-between py-2 border-b border-zinc-800/30 last:border-0">
                  <div>
                    <p className="text-xs text-zinc-200 font-mono">{p.preference_key}</p>
                    <p className="text-[10px] text-zinc-500">Used {p.usage_count} times</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full bg-zinc-700 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                        style={{ width: `${Math.round(p.confidence * 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">{Math.round(p.confidence * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No preferences learned yet. Compile more intents to start pattern detection.</p>
          )}
        </div>

        {/* How It Works */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <h2 className="text-sm font-semibold text-emerald-200 mb-3">How Pattern Learning Works</h2>
          <div className="space-y-2 text-xs text-zinc-400 leading-relaxed">
            <p>1. <span className="text-emerald-300">Service Preferences:</span> Tracks which services you use most frequently and learns your preferred OAuth scopes.</p>
            <p>2. <span className="text-emerald-300">Action Patterns:</span> Identifies common actions you take (search, read, create, etc.) and their frequency.</p>
            <p>3. <span className="text-emerald-300">Requirement Learning:</span> Remembers common functional requirements from your compiled intents.</p>
            <p>4. <span className="text-emerald-300">Confidence Scoring:</span> Each preference has a confidence score that increases with repeated usage.</p>
            <p>5. <span className="text-emerald-300">Future Use:</span> Eventually, the system will pre-fill intent specs based on your learned patterns.</p>
          </div>
        </div>
      </div>
    </main>
  );
}

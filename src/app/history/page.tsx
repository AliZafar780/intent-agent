import { auth0 } from "@/lib/auth0/client";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getIntents, searchIntents } from "@/lib/db/intents";

const DEMO_MODE = process.env.DEMO_MODE === "true";

export default async function HistoryPage(props: { searchParams: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams;
  const query = searchParams.q || "";

  const session = DEMO_MODE
    ? { user: { sub: "demo-user", name: "Demo User" } }
    : await auth0.getSession();

  if (!session) redirect("/auth/login");

  const userId = session.user.sub as string;

  let intents: any[] = [];
  try {
    intents = query ? searchIntents(userId, query) : getIntents(userId, 50);
  } catch {
  }

  return (
    <main className="min-h-screen bg-[#06141b]">
      <header className="border-b border-zinc-800/50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-sm font-semibold text-white">Intent History</h1>
        </div>
        <div className="flex items-center gap-3">
          <form className="flex items-center gap-2">
            <input
              name="q"
              defaultValue={query}
              placeholder="Search intents..."
              className="bg-[#0f222d] border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 w-64"
            />
            <button type="submit" className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs border border-cyan-500/30 hover:bg-cyan-500/30">Search</button>
          </form>
          <Link href="/" className="text-xs text-zinc-400 hover:text-white">← Chat</Link>
          <Link href="/dashboard" className="text-xs text-zinc-400 hover:text-white">Dashboard</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6">
        <p className="text-xs text-zinc-500 mb-4">{intents.length} intent{intents.length !== 1 ? "s" : ""} found</p>

        {intents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-zinc-500">No intents found</p>
            <Link href="/" className="mt-3 text-xs text-cyan-400 hover:text-cyan-300">Compile your first intent →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {intents.map((intent: any) => {
              let perms: any[] = [];
              try { perms = typeof intent.permissions === "string" ? JSON.parse(intent.permissions) : intent.permissions || []; } catch {}
              const destructive = perms.some((p: any) => p.destructive);

              return (
                <div key={intent.id} className="rounded-xl border border-zinc-800/50 bg-[#0b1d27] p-4 hover:border-zinc-700/50 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-zinc-500">{intent.id}</span>
                        {destructive && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/20">WRITE</span>
                        )}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">{intent.status}</span>
                      </div>
                      <p className="text-sm text-zinc-200 truncate">{intent.objective || intent.original_prompt}</p>
                      <p className="text-[10px] text-zinc-500 mt-1">{intent.created_at}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-bold text-cyan-300">{Math.round(intent.completeness_score)}%</div>
                      <div className="text-[10px] text-zinc-500">{perms.length} perms</div>
                    </div>
                  </div>

                  {perms.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-zinc-800/30">
                      {perms.map((p: any, i: number) => (
                        <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${p.destructive ? "bg-red-500/10 text-red-300 border border-red-500/20" : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"}`}>
                          {p.service}: {p.scopes?.join(", ")}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

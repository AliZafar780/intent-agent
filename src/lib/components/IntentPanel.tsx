"use client";

import { IntentSpec, Severity } from "@/lib/intent/types";

const severityColors: Record<Severity, string> = {
  critical: "bg-red-500/20 text-red-300 border-red-500/30",
  high: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  medium: "bg-amber-500/20 text-amber-200 border-amber-500/30",
  low: "bg-emerald-500/20 text-emerald-200 border-emerald-500/30",
};

const severityIcons: Record<Severity, string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🟢",
};

export default function IntentPanel({ spec }: { spec: IntentSpec }) {
  return (
    <div className="p-4 space-y-5">
      <div className="rounded-lg border border-[color:var(--line)] bg-[#102530] p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] uppercase tracking-wide text-[color:var(--muted)]">Intent Confidence</span>
          <span className="text-xs font-medium text-cyan-200">{Math.round(spec.completenessScore)}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-[#1a3644] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[color:var(--brand)] to-[color:var(--brand-2)]"
            style={{ width: `${Math.max(0, Math.min(100, spec.completenessScore))}%` }}
          />
        </div>
      </div>

      <section className="space-y-2">
        <h3 className="text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-wide">Objective</h3>
        <p className="text-sm text-[color:var(--text)] leading-relaxed">{spec.objective}</p>
      </section>

      {spec.functionalRequirements.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-wide">Functional Requirements</h3>
          <ul className="space-y-1.5">
            {spec.functionalRequirements.map((req, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[color:var(--text)]/90">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {spec.permissions.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-wide">Permission Mapping</h3>
          <div className="space-y-2">
            {spec.permissions.map((perm, i) => (
              <div key={i} className="permission-card rounded-lg p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-[color:var(--text)]">{perm.service}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${perm.destructive ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-emerald-500/20 text-emerald-200 border-emerald-500/30"}`}>
                    {perm.destructive ? "WRITE" : "READ"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {perm.scopes.map((scope) => (
                    <span key={scope} className="text-[10px] px-1.5 py-0.5 rounded bg-[#1a3440] text-cyan-100/90 border border-[#2c5566] font-mono">
                      {scope}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-[color:var(--muted)]">{perm.reason}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {spec.misunderstandings.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-wide">Misunderstanding Risks</h3>
          <div className="space-y-2">
            {spec.misunderstandings.map((m, i) => (
              <div key={i} className="rounded-lg bg-[#102530] border border-[color:var(--line)] p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span>{severityIcons[m.severity]}</span>
                  <span className="text-xs font-medium text-[color:var(--text)]">{m.area}</span>
                </div>
                <div className="space-y-1 text-xs">
                  <p><span className="text-emerald-300">You mean:</span> <span className="text-[color:var(--muted)]">{m.youMean}</span></p>
                  <p><span className="text-red-300">AI may do:</span> <span className="text-[color:var(--muted)]">{m.aiDoes}</span></p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {spec.edgeCases.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-wide">Edge Cases</h3>
          <div className="space-y-2">
            {spec.edgeCases.map((ec, i) => (
              <div key={i} className="rounded-lg bg-[#102530] border border-[color:var(--line)] p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${severityColors[ec.severity]}`}>
                    {ec.severity.toUpperCase()}
                  </span>
                  <span className="text-xs text-[color:var(--text)]/90">{ec.description}</span>
                </div>
                <p className="text-xs text-[color:var(--muted)]">Handling: {ec.handling}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {spec.acceptanceCriteria.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-wide">Acceptance Criteria</h3>
          <ul className="space-y-1.5">
            {spec.acceptanceCriteria.map((ac, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[color:var(--text)]/90">
                <span className="text-cyan-400 mt-0.5">☐</span>
                <span>{ac}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";

interface Props {
  onComplete: () => void;
}

const STEPS = [
  {
    title: "Welcome to Intent Agent",
    description: "The AI agent that compiles your intent, shows what permissions it needs, and executes securely through Auth0 Token Vault.",
    icon: "🚀",
  },
  {
    title: "How It Works",
    description: "Type what you want to do. The AI compiles it into a structured intent, shows you exactly what permissions it needs, then executes with scoped tokens — never seeing your credentials.",
    icon: "🔍",
  },
  {
    title: "Permission Visibility",
    description: "Before any action, you see exactly which OAuth scopes are needed. Read actions are green. Write actions are red and require extra approval via step-up auth.",
    icon: "🔐",
  },
  {
    title: "Connected Accounts",
    description: "Link your Google, GitHub, Slack, or Microsoft accounts. Auth0 Token Vault stores your tokens securely — the agent only gets temporary, scoped access.",
    icon: "🔗",
  },
  {
    title: "Audit Trail",
    description: "Every action is logged: what was done, which service was accessed, what scopes were used, and whether it was approved or denied. Full transparency.",
    icon: "📋",
  },
  {
    title: "Ready to Start",
    description: "Try a quick action below or type your own task. You can always compile intent first to see what permissions are needed before executing.",
    icon: "✨",
  },
];

export default function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200] p-4" role="dialog" aria-modal="true" aria-label="Welcome to Intent Agent">
      <div className="bg-[#0b1d27] border border-zinc-800/50 rounded-2xl max-w-lg w-full overflow-hidden animate-scale-in">
        {/* Progress */}
        <div className="px-6 pt-6">
          <div className="flex items-center gap-1.5 mb-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all ${i <= step ? "bg-gradient-to-r from-cyan-500 to-teal-500" : "bg-zinc-800"}`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 text-center">
          <div className="text-5xl mb-4">{current.icon}</div>
          <h2 className="text-lg font-semibold text-white mb-2">{current.title}</h2>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">{current.description}</p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400 text-xs hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Back
          </button>

          <span className="text-[10px] text-zinc-600">{step + 1} / {STEPS.length}</span>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-[#052029] text-xs font-semibold hover:brightness-110 transition-all"
            >
              Next
            </button>
          ) : (
            <button
              onClick={onComplete}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-[#052029] text-xs font-semibold hover:brightness-110 transition-all"
            >
              Get Started
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

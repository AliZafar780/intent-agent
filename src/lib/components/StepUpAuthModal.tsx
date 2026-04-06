"use client";

import { useState } from "react";

interface StepUpRequest {
  id: string;
  action: string;
  service: string;
  scopes: string[];
  description: string;
  destructive: boolean;
}

interface Props {
  request: StepUpRequest | null;
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

const serviceIcons: Record<string, string> = {
  Gmail: "📧",
  GitHub: "🐙",
  Slack: "💬",
  "Google Calendar": "📅",
  Microsoft: "🪟",
};

export default function StepUpAuthModal({
  request,
  onApprove,
  onDeny,
  onCancel,
  isProcessing,
}: Props) {
  const [confirmText, setConfirmText] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  if (!request) return null;

  const icon = serviceIcons[request.service] || "🔑";

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Step-up authorization required"
      onClick={onCancel}
    >
      <div
        className="bg-[color:var(--surface)] border border-[color:var(--line)] rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-500/20 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-xl">
              {icon}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-200">
                Step-up Authorization Required
              </h3>
              <p className="text-[10px] text-[color:var(--muted)]">
                CIBA — Client-Initiated Backchannel Authentication
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-sm text-[color:var(--text)] leading-relaxed">
              {request.description}
            </p>
          </div>

          <div className="rounded-lg bg-[#0f222d] border border-[color:var(--line)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[color:var(--muted)] uppercase tracking-wide">
                Action
              </span>
              <span className="text-xs font-medium text-[color:var(--text)]">
                {request.action}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[color:var(--muted)] uppercase tracking-wide">
                Service
              </span>
              <span className="text-xs text-[color:var(--text)]">
                {request.service}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-[color:var(--muted)] uppercase tracking-wide">
                Scopes Requested
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {request.scopes.map((scope) => (
                  <span
                    key={scope}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-200 border border-red-500/20 font-mono"
                  >
                    {scope}
                  </span>
                ))}
              </div>
            </div>

            {request.destructive && (
              <div className="flex items-center gap-1.5 pt-1">
                <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[10px] text-red-300 font-medium">
                  Destructive action — requires explicit approval
                </span>
              </div>
            )}
          </div>

          {/* Confirmation for destructive actions */}
          {request.destructive && !showConfirm && (
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 px-4 py-3">
              <p className="text-xs text-amber-200/90">
                Type <code className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-100 font-mono text-[10px]">APPROVE</code> to confirm this action
              </p>
              <button
                onClick={() => setShowConfirm(true)}
                className="mt-2 text-[10px] text-[color:var(--muted)] hover:text-[color:var(--text)] underline"
              >
                I understand the risks
              </button>
            </div>
          )}

          {showConfirm && (
            <div>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type APPROVE to confirm"
                className="w-full bg-[#0f222d] border border-[color:var(--line)] rounded-lg px-3 py-2 text-xs text-[color:var(--text)] placeholder:text-[color:var(--muted)] focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && confirmText === "APPROVE") {
                    onApprove(request.id);
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[color:var(--line)] px-6 py-4 flex gap-2">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 rounded-lg border border-[color:var(--line)] text-[color:var(--muted)] hover:text-[color:var(--text)] text-xs disabled:opacity-40 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onDeny(request.id)}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-medium border border-red-500/30 disabled:opacity-40 transition-all"
          >
            Deny
          </button>
          <button
            onClick={() => {
              if (request.destructive && confirmText !== "APPROVE") return;
              onApprove(request.id);
            }}
            disabled={isProcessing || (request.destructive && confirmText !== "APPROVE")}
            className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 hover:from-emerald-500/30 hover:to-emerald-600/30 text-emerald-200 text-xs font-medium border border-emerald-500/30 disabled:opacity-40 transition-all"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-1.5">
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </span>
            ) : (
              "Approve"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

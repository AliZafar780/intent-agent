"use client";

import { PermissionRequirement } from "@/lib/intent/types";

interface Props {
  permissions: PermissionRequirement[];
  onApprove: (permission: PermissionRequirement) => void;
  onDeny: (permission: PermissionRequirement) => void;
}

const serviceIcons: Record<string, string> = {
  Gmail: "📧",
  "Google Calendar": "📅",
  GitHub: "🐙",
  Slack: "💬",
  Microsoft: "🪟",
};

export default function PermissionPanel({ permissions, onApprove, onDeny }: Props) {
  const readPermissions = permissions.filter((p) => !p.destructive);
  const writePermissions = permissions.filter((p) => p.destructive);

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-[11px] font-semibold text-[color:var(--muted)] uppercase tracking-wide">
        Token Vault Permissions
      </h3>

      {readPermissions.length > 0 && (
        <div>
          <p className="text-[10px] text-emerald-300/90 uppercase tracking-wider mb-2">Read Access</p>
          {readPermissions.map((perm, i) => (
            <div key={i} className="permission-card rounded-lg p-3 mb-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{serviceIcons[perm.service] || "🔑"}</span>
                <div>
                  <p className="text-sm font-medium text-[color:var(--text)]">{perm.service}</p>
                  <p className="text-xs text-[color:var(--muted)]">{perm.reason}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {perm.scopes.map((scope) => (
                  <span
                    key={scope}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-200 border border-emerald-500/20 font-mono"
                  >
                    {scope}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {writePermissions.length > 0 && (
        <div>
          <p className="text-[10px] text-red-300 uppercase tracking-wider mb-2">Write Access (Approval Required)</p>
          {writePermissions.map((perm, i) => (
            <div key={i} className="permission-card rounded-lg p-3 mb-2 border-red-500/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{serviceIcons[perm.service] || "🔑"}</span>
                <div>
                  <p className="text-sm font-medium text-[color:var(--text)]">{perm.service}</p>
                  <p className="text-xs text-[color:var(--muted)]">{perm.reason}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {perm.scopes.map((scope) => (
                  <span
                    key={scope}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-200 border border-red-500/20 font-mono"
                  >
                    {scope}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onApprove(perm)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 text-xs font-medium border border-emerald-500/30"
                >
                  Approve
                </button>
                <button
                  onClick={() => onDeny(perm)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-200 text-xs font-medium border border-red-500/30"
                >
                  Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {permissions.length === 0 && (
        <p className="text-xs text-[color:var(--muted)] text-center py-8">
          No permissions required yet. Compile an intent first.
        </p>
      )}
    </div>
  );
}

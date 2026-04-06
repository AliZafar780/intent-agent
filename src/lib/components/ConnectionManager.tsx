"use client";

import { useState } from "react";

interface ConnectionInfo {
  id: string;
  name: string;
  connection: string;
  icon: string;
  description: string;
  scopes: string[];
  connected: boolean;
  color: string;
}

interface Props {
  connections: ConnectionInfo[];
  onConnect: (connection: string) => void;
  onDisconnect: (connection: string) => void;
  connecting: string | null;
}

const DEMO_CONNECTIONS: ConnectionInfo[] = [
  {
    id: "google",
    name: "Google",
    connection: "google-oauth2",
    icon: "📧",
    description: "Access Gmail and Google Calendar",
    scopes: ["gmail.readonly", "gmail.send", "calendar.readonly"],
    connected: false,
    color: "from-red-500 to-yellow-500",
  },
  {
    id: "github",
    name: "GitHub",
    connection: "github",
    icon: "🐙",
    description: "Access repositories and issues",
    scopes: ["public_repo", "repo", "read:user"],
    connected: false,
    color: "from-gray-600 to-gray-800",
  },
  {
    id: "slack",
    name: "Slack",
    connection: "sign-in-with-slack",
    icon: "💬",
    description: "Access channels and messages",
    scopes: ["channels:read", "chat:write", "users:read"],
    connected: false,
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "microsoft",
    name: "Microsoft",
    connection: "windowslive",
    icon: "🪟",
    description: "Access Outlook and Calendar",
    scopes: ["Mail.Read", "Mail.Send", "Calendars.Read"],
    connected: false,
    color: "from-blue-500 to-cyan-500",
  },
];

export default function ConnectionManager({
  connections = DEMO_CONNECTIONS,
  onConnect,
  onDisconnect,
  connecting,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[color:var(--text)]">
          Connected Accounts
        </h3>
        <span className="text-[10px] text-[color:var(--muted)]">
          {connections.filter((c) => c.connected).length}/{connections.length} connected
        </span>
      </div>

      <p className="text-xs text-[color:var(--muted)] leading-relaxed">
        Connect your accounts to let Intent Agent access your data securely through Auth0 Token Vault. Each connection uses scoped OAuth tokens — the agent never sees your credentials.
      </p>

      <div className="space-y-2">
        {connections.map((conn) => {
          const isExpanded = expandedId === conn.id;
          const isConnecting = connecting === conn.connection;

          return (
            <div
              key={conn.id}
              className="rounded-xl border border-[color:var(--line)] bg-[#0f222d] overflow-hidden transition-all"
            >
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg bg-gradient-to-br ${conn.color} flex items-center justify-center text-base shadow-lg`}
                    aria-hidden="true"
                  >
                    {conn.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[color:var(--text)]">
                      {conn.name}
                    </p>
                    <p className="text-[10px] text-[color:var(--muted)]">
                      {conn.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {conn.connected ? (
                    <button
                      onClick={() => onDisconnect(conn.connection)}
                      disabled={isConnecting}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-medium border border-red-500/30 text-red-300 hover:bg-red-500/10 disabled:opacity-40 transition-all"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => onConnect(conn.connection)}
                      disabled={isConnecting}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-medium bg-gradient-to-r from-[color:var(--brand)] to-[color:var(--brand-2)] text-[#052029] hover:brightness-110 disabled:opacity-40 transition-all"
                    >
                      {isConnecting ? (
                        <span className="flex items-center gap-1.5">
                          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Connecting...
                        </span>
                      ) : (
                        "Connect"
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : conn.id)}
                    className="text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors"
                    aria-label={isExpanded ? "Hide scopes" : "Show scopes"}
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-3 border-t border-[color:var(--line)]/50 pt-3">
                  <p className="text-[10px] text-[color:var(--muted)] uppercase tracking-wide mb-2">
                    OAuth Scopes
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {conn.scopes.map((scope) => (
                      <span
                        key={scope}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-[#1a3440] text-cyan-100/90 border border-[#2c5566] font-mono"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${conn.connected ? "bg-emerald-400" : "bg-zinc-600"}`} />
                    <span className="text-[10px] text-[color:var(--muted)]">
                      {conn.connected ? "Connected via Auth0 Token Vault" : "Not connected"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <div>
            <p className="text-xs text-emerald-200 font-medium">How Token Vault Works</p>
            <p className="text-[10px] text-[color:var(--muted)] mt-1 leading-relaxed">
              When you connect an account, Auth0 stores your tokens securely. The agent exchanges your Auth0 token for a scoped, short-lived provider token — it never sees your credentials. Each tool gets only the minimum permissions it needs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

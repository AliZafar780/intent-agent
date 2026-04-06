"use client";

import { useEffect } from "react";

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      for (const s of shortcuts) {
        if (
          e.key.toLowerCase() === s.key.toLowerCase() &&
          Boolean(e.ctrlKey || e.metaKey) === Boolean(s.ctrl) &&
          Boolean(e.shiftKey) === Boolean(s.shift) &&
          Boolean(e.altKey) === Boolean(s.alt)
        ) {
          e.preventDefault();
          s.action();
          return;
        }
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcuts]);
}

export const SHORTCUTS: { key: string; ctrl: boolean; shift?: boolean; description: string }[] = [
  { key: "Enter", ctrl: true, description: "Send message" },
  { key: "K", ctrl: true, description: "Compile intent" },
  { key: "Escape", ctrl: false, description: "Close panels / clear input" },
  { key: "/", ctrl: true, description: "Focus chat input" },
  { key: "N", ctrl: true, description: "New conversation" },
  { key: "D", ctrl: true, description: "Go to dashboard" },
  { key: "H", ctrl: true, description: "Go to history" },
];

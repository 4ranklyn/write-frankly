"use client";

import React from "react";
import { Bell, BellOff } from "lucide-react";

interface NotificationToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function NotificationToggle({ enabled, onToggle }: NotificationToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!enabled)}
      className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full transition-all border ${
        enabled
          ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 border-transparent shadow-sm"
          : "bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800"
      }`}
      title={enabled ? "External summary dispatch enabled" : "External summary dispatch disabled"}
    >
      {enabled ? (
        <>
          <Bell className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
          <span>Sync to Channel</span>
        </>
      ) : (
        <>
          <BellOff className="w-3.5 h-3.5" />
          <span>Sync Off</span>
        </>
      )}
    </button>
  );
}

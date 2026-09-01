"use client";

import React from "react";
import { MapPin, Loader2 } from "lucide-react";

interface LocationTagProps {
  locality: string | null;
  loading: boolean;
  onAttach: () => void;
}

export function LocationTag({ locality, loading, onAttach }: LocationTagProps) {
  if (locality) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 backdrop-blur-md transition-all">
        <MapPin className="w-3.5 h-3.5 text-zinc-500" />
        <span>{locality}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onAttach}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-700 transition-colors"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <MapPin className="w-3.5 h-3.5" />
      )}
      <span>Attach Location</span>
    </button>
  );
}

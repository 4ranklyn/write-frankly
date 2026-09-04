"use client";

import React from "react";
import { MapPin, Loader2, X } from "lucide-react";
import { useLocation } from "@/hooks/useLocation";

interface LocationTagProps {
  value?: string | null;
  onChange: (location: string | null) => void;
  disabled?: boolean;
}

export function LocationTag({ value, onChange, disabled }: LocationTagProps) {
  const { loading, fetchCurrentLocation } = useLocation();

  const handleAttachLocation = async () => {
    if (disabled || loading) return;
    const detected = await fetchCurrentLocation();
    if (detected) {
      onChange(detected);
    }
  };

  const handleRemoveLocation = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  if (value && value.trim()) {
    return (
      <div
        id="editor-location-badge"
        className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-0.5 text-xs font-medium rounded-full bg-zinc-100 hover:bg-zinc-200/60 text-zinc-800 border border-zinc-200/80 backdrop-blur-md transition-all shadow-2xs shrink-0 max-w-[200px]"
        title={`Attached location: ${value}`}
      >
        <MapPin className="w-3 h-3 text-zinc-600 shrink-0" />
        <span className="truncate text-[11px] leading-tight select-none">{value}</span>
        <button
          id="editor-remove-location-btn"
          type="button"
          onClick={handleRemoveLocation}
          aria-label="Remove location tag"
          title="Remove location tag"
          className="p-0.5 ml-0.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/80 rounded-full transition-colors cursor-pointer shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      id="editor-attach-location-btn"
      type="button"
      onClick={handleAttachLocation}
      disabled={loading || disabled}
      title="Attach current location to reflection"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-zinc-50 hover:bg-zinc-100/90 active:bg-zinc-200/70 text-zinc-600 hover:text-zinc-900 border border-dashed border-zinc-300 hover:border-zinc-400 transition-all cursor-pointer group shrink-0 disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs"
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin text-zinc-600" />
      ) : (
        <MapPin className="w-3 h-3 text-zinc-400 group-hover:text-zinc-700 transition-colors" />
      )}
      <span className="text-[11px] select-none">
        {loading ? "Detecting..." : "Add Location"}
      </span>
    </button>
  );
}


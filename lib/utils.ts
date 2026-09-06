import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getCurrentTimestamp(): number {
  return Date.now()
}

export function generateUniqueId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}

export function formatDateTime(timestamp: number | string | Date): string {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatTimeOnly(timestamp: number | string | Date): string {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Extracts only the first iteration of the area from a full location string
 * (e.g. "Tangerang, Banten, Indonesia" -> "Tangerang", "San Francisco, CA" -> "San Francisco")
 */
export function formatDisplayLocation(location?: string | null): string {
  if (!location) return '';
  const trimmed = location.trim();
  const firstPart = trimmed.split(',')[0]?.trim();
  return firstPart || trimmed;
}

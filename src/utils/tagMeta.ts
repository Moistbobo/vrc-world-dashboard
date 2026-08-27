import type { TagCount } from '../types';

export const TAG_EMOJI_FALLBACK = '❓';
export const TAG_HEX_FALLBACK = '#94a3b8';
export const TAG_BADGE_FALLBACK_CLASS =
  'bg-slate-200/40 text-slate-700 border-slate-300 dark:bg-slate-700/40 dark:text-slate-300 dark:border-slate-600/30';

/**
 * Maps the API's semantic hex colors to full Tailwind badge classes.
 * Tailwind cannot build class strings at runtime, so the finite set of hexes
 * in the tags catalog maps to literal class strings here. One class per hex;
 * tags that share a hex share a class. A hex with no entry falls back to the
 * neutral slate badge.
 */
const HEX_TO_CLASS: Record<string, string> = {
  '#8b5cf6': 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30',
  '#a78bfa': 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30',
  '#06b6d4': 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30',
  '#d946ef': 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400 border-fuchsia-500/30',
  '#f59e0b': 'bg-amber-500/15 text-amber-700 dark:text-amber-500 border-amber-500/30',
  '#c084fc': 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
  '#a855f7': 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
  '#fb923c': 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
  '#f97316': 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30',
  '#f43f5e': 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
  '#fb7185': 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30',
  '#6366f1': 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30',
  '#facc15': 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
  '#14b8a6': 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30',
  '#ef4444': 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
  '#0ea5e9': 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
  '#38bdf8': 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
  '#3b82f6': 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
  '#84cc16': 'bg-lime-500/15 text-lime-700 dark:text-lime-400 border-lime-500/30',
  '#94a3b8': 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
  '#64748b': 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
  '#ec4899': 'bg-pink-500/15 text-pink-700 dark:text-pink-400 border-pink-500/30',
};

export function normalizeHex(hex: string): string {
  return hex.trim().toLowerCase();
}

/** Index tag metadata from the API response by tag name. */
export function getTagMetaMap(tags: TagCount[]): Map<string, TagCount> {
  return new Map(tags.map((t) => [t.tag, t]));
}

export function getTagEmoji(meta: Map<string, TagCount>, tag: string): string {
  return meta.get(tag)?.emoji ?? TAG_EMOJI_FALLBACK;
}

export function getTagColorHex(meta: Map<string, TagCount>, tag: string): string {
  return meta.get(tag)?.hexColor ?? TAG_HEX_FALLBACK;
}

export function getTagBadgeClass(meta: Map<string, TagCount>, tag: string): string {
  const hex = meta.get(tag)?.hexColor;
  return (hex && HEX_TO_CLASS[normalizeHex(hex)]) || TAG_BADGE_FALLBACK_CLASS;
}
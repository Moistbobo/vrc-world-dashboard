/**
 * Single source of truth for tag metadata: emoji, color, and badge styling.
 */
export interface TagMeta {
  emoji: string;
  hexColor: string;
  tailwindClass: string;
}

const tagRegistry: Record<string, TagMeta> = {
  // Dashboard main tags
  kino:       { emoji: '⛰️',  hexColor: '#8b5cf6', tailwindClass: 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30' },
  chill:      { emoji: '😎',  hexColor: '#06b6d4', tailwindClass: 'bg-cyan-600/15 text-cyan-700 dark:text-cyan-400 border-cyan-600/30' },
  comfy:      { emoji: '🛏️',  hexColor: '#d946ef', tailwindClass: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400 border-fuchsia-500/30' },
  adventure:  { emoji: '🗺️',  hexColor: '#f59e0b', tailwindClass: 'bg-amber-600/15 text-amber-700 dark:text-amber-500 border-amber-600/30' },
  horror:     { emoji: '👻',  hexColor: '#c084fc', tailwindClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30' },
  game:       { emoji: '🎮',  hexColor: '#fb923c', tailwindClass: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30' },
  gallery:    { emoji: '🖼️',  hexColor: '#6366f1', tailwindClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30' },
  meme:       { emoji: '😂',  hexColor: '#facc15', tailwindClass: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30' },
  puzzle:     { emoji: '🧩',  hexColor: '#14b8a6', tailwindClass: 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30' },
  driving:    { emoji: '🚗',  hexColor: '#ef4444', tailwindClass: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30' },
  flying:     { emoji: '✈️',  hexColor: '#0ea5e9', tailwindClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30' },
  tech:       { emoji: '💻',  hexColor: '#3b82f6', tailwindClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' },
  nature:     { emoji: '🌿',  hexColor: '#84cc16', tailwindClass: 'bg-lime-500/15 text-lime-700 dark:text-lime-400 border-lime-500/30' },
  gamerip:    { emoji: '🎬',  hexColor: '#a855f7', tailwindClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30' },
  portal:     { emoji: '🌀',  hexColor: '#06b6d4', tailwindClass: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30' },
  liminal:    { emoji: '🌫️',  hexColor: '#94a3b8', tailwindClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30' },

  // Existing app tags
  quest:      { emoji: '🥽',  hexColor: '#34d399', tailwindClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  pc:         { emoji: '💻',  hexColor: '#22d3ee', tailwindClass: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30' },
  good:       { emoji: '👍',  hexColor: '#4ade80', tailwindClass: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30' },
  bad:        { emoji: '👎',  hexColor: '#f87171', tailwindClass: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30' },
  nsfw:       { emoji: '🔞',  hexColor: '#fb7185', tailwindClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30' },
  relaxing:   { emoji: '🧘',  hexColor: '#38bdf8', tailwindClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30' },
  social:     { emoji: '💬',  hexColor: '#fbbf24', tailwindClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  music:      { emoji: '🎵',  hexColor: '#ec4899', tailwindClass: 'bg-pink-500/15 text-pink-700 dark:text-pink-400 border-pink-500/30' },
  avatar:     { emoji: '👤',  hexColor: '#2dd4bf', tailwindClass: 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30' },
};

/** Look up metadata for a tag (case-insensitive, supports substring match). */
export function getTagMeta(tag: string): TagMeta | undefined {
  const lower = tag.trim().toLowerCase();

  // Exact match
  if (tagRegistry[lower]) return tagRegistry[lower];

  // Special multi-word / variant tags
  if (lower === 'particle live' || lower.includes('vrmv')) {
    return {
      emoji: '🎭',
      hexColor: '#f43f5e',
      tailwindClass: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
    };
  }

  // Substring fallback for all other registered tags
  for (const [key, meta] of Object.entries(tagRegistry)) {
    if (lower.includes(key)) return meta;
  }

  return undefined;
}

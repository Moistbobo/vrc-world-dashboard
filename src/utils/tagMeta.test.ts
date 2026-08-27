import { describe, it, expect } from 'vitest';
import {
  getTagBadgeClass,
  getTagColorHex,
  getTagEmoji,
  getTagMetaMap,
  TAG_BADGE_FALLBACK_CLASS,
} from './tagMeta';
import type { TagCount } from '../types';

const CANONICAL_TAGS: TagCount[] = [
  { tag: 'kino', count: 0, emoji: '⛰️', hexColor: '#8b5cf6' },
  { tag: 'chill', count: 0, emoji: '😎', hexColor: '#06b6d4' },
  { tag: 'comfy', count: 0, emoji: '🛏️', hexColor: '#d946ef' },
  { tag: 'adventure', count: 0, emoji: '🗺️', hexColor: '#f59e0b' },
  { tag: 'horror', count: 0, emoji: '👻', hexColor: '#c084fc' },
  { tag: 'game', count: 0, emoji: '🎮', hexColor: '#fb923c' },
  { tag: 'particle live / vrmv', count: 0, emoji: '🎭', hexColor: '#f43f5e' },
  { tag: 'gallery', count: 0, emoji: '🖼️', hexColor: '#6366f1' },
  { tag: 'meme', count: 0, emoji: '😂', hexColor: '#facc15' },
  { tag: 'puzzle', count: 0, emoji: '🧩', hexColor: '#14b8a6' },
  { tag: 'driving', count: 0, emoji: '🚗', hexColor: '#ef4444' },
  { tag: 'flying', count: 0, emoji: '✈️', hexColor: '#0ea5e9' },
  { tag: 'tech', count: 0, emoji: '💻', hexColor: '#3b82f6' },
  { tag: 'nature', count: 0, emoji: '🌿', hexColor: '#84cc16' },
  { tag: 'gamerip', count: 0, emoji: '🎬', hexColor: '#a855f7' },
  { tag: 'portal', count: 0, emoji: '🌀', hexColor: '#06b6d4' },
  { tag: 'liminal', count: 0, emoji: '🌫️', hexColor: '#94a3b8' },
  { tag: 'moon', count: 0, emoji: '🌙', hexColor: '#a78bfa' },
  { tag: 'space', count: 0, emoji: '🚀', hexColor: '#6366f1' },
  { tag: 'day', count: 0, emoji: '☀️', hexColor: '#f59e0b' },
  { tag: 'night', count: 0, emoji: '🌌', hexColor: '#64748b' },
  { tag: 'dawn', count: 0, emoji: '🌅', hexColor: '#fb7185' },
  { tag: 'dusk', count: 0, emoji: '🌆', hexColor: '#f97316' },
  { tag: 'bar', count: 0, emoji: '🍸', hexColor: '#ec4899' },
  { tag: 'club', count: 0, emoji: '🪩', hexColor: '#a855f7' },
  { tag: 'beach', count: 0, emoji: '🏖️', hexColor: '#38bdf8' },
  { tag: 'urban', count: 0, emoji: '🏙️', hexColor: '#64748b' },
  { tag: 'aquatic', count: 0, emoji: '🐟', hexColor: '#06b6d4' },
];

describe('tagMeta', () => {
  const meta = getTagMetaMap(CANONICAL_TAGS);

  it('returns the API emoji for every canonical tag', () => {
    for (const t of CANONICAL_TAGS) {
      expect(getTagEmoji(meta, t.tag)).toBe(t.emoji);
    }
  });

  it('returns the API hex color for every canonical tag', () => {
    for (const t of CANONICAL_TAGS) {
      expect(getTagColorHex(meta, t.tag)).toBe(t.hexColor);
    }
  });

  it('resolves a real badge class for every seeded hex', () => {
    for (const t of CANONICAL_TAGS) {
      expect(getTagBadgeClass(meta, t.tag)).not.toBe(TAG_BADGE_FALLBACK_CLASS);
    }
  });

  it('falls back to neutral styling for unknown tags', () => {
    expect(getTagEmoji(meta, 'unknown-tag')).toBe('❓');
    expect(getTagColorHex(meta, 'unknown-tag')).toBe('#94a3b8');
    expect(getTagBadgeClass(meta, 'unknown-tag')).toBe(TAG_BADGE_FALLBACK_CLASS);
  });

  it('collapses tags that share a hex to one class', () => {
    const chill = getTagBadgeClass(meta, 'chill');
    const portal = getTagBadgeClass(meta, 'portal');
    const aquatic = getTagBadgeClass(meta, 'aquatic');
    expect(chill).toBe(portal);
    expect(chill).toBe(aquatic);
  });
});
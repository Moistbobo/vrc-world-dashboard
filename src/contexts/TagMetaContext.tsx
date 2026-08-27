import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { TagCount } from '../types';
import { useTags } from '../hooks/useApi';
import { getTagMetaMap } from '../utils/tagMeta';

const EMPTY_MAP = new Map<string, TagCount>();

const TagMetaContext = createContext<Map<string, TagCount>>(EMPTY_MAP);

/**
 * Provides the tag metadata (emoji, hex color) from the /api/tags response
 * to every TagBadge. The default is an empty map, so components render the
 * neutral fallback when rendered without a provider (e.g. in tests).
 */
export function TagMetaProvider({ children }: { children: ReactNode }) {
  const { data } = useTags({ suppressErrorToast: true });
  const meta = useMemo(() => getTagMetaMap(data?.tags ?? []), [data]);
  return <TagMetaContext.Provider value={meta}>{children}</TagMetaContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTagMeta(): Map<string, TagCount> {
  return useContext(TagMetaContext);
}
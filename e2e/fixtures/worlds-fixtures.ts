import type {
  FlagsResponse,
  MeResponse,
  MetaResponse,
  PaginatedWorlds,
  TagsResponse,
  World,
} from '../src/types';

export const worlds: World[] = [
  {
    worldId: 'wrld_chill_lounge',
    name: 'Chill Lounge',
    authorName: 'Tester',
    capacity: 20,
    platforms: ['standalonewindows', 'android'],
    tags: ['chill', 'social'],
    flags: ['furry', 'low quality'],
    imageUrl: '',
    vrchatUrl: '',
    quality: 'good',
    highPriority: true,
    createdAt: '2024-01-01',
    internalAddDate: new Date(Date.now() - 86_400_000).toISOString().slice(0, 10),
  },
  {
    worldId: 'wrld_dance_party',
    name: 'Dance Party',
    authorName: 'Raver',
    capacity: 50,
    platforms: ['standalonewindows'],
    tags: ['dance', 'social'],
    imageUrl: '',
    vrchatUrl: '',
    quality: 'good',
    highPriority: true,
    createdAt: '2024-01-15',
    internalAddDate: '2024-02-10',
  },
  {
    worldId: 'wrld_quiet_study',
    name: 'Quiet Study',
    authorName: 'Scholar',
    capacity: 10,
    platforms: ['android', 'ios'],
    tags: ['chill', 'study'],
    imageUrl: '',
    vrchatUrl: '',
    quality: 'bad',
    createdAt: '2024-02-01',
    internalAddDate: '2024-02-20',
  },
  {
    worldId: 'wrld_mobile_only',
    name: 'Mobile Hangout',
    authorName: 'Tester',
    capacity: 30,
    platforms: ['android'],
    tags: ['social'],
    flags: ['furry'],
    imageUrl: '',
    vrchatUrl: '',
    quality: null,
    createdAt: '2024-02-15',
    internalAddDate: '2024-02-25',
  },
  {
    worldId: 'wrld_priority_watch',
    name: 'Priority Watch',
    authorName: 'Curator',
    capacity: 15,
    platforms: ['standalonewindows', 'android'],
    tags: ['watchlist'],
    flags: ['AI slop', 'booth slop'],
    imageUrl: '',
    vrchatUrl: '',
    quality: null,
    highPriority: true,
    createdAt: '2024-03-01',
    internalAddDate: '2024-03-05',
  },
];

export const tagsResponse: TagsResponse = {
  tags: [
    { tag: 'chill', count: 2 },
    { tag: 'dance', count: 1 },
    { tag: 'social', count: 3 },
    { tag: 'study', count: 1 },
  ],
};

export const flagsResponse: FlagsResponse = {
  flags: [
    { flag: 'furry', count: 2 },
    { flag: 'low quality', count: 1 },
    { flag: 'AI slop', count: 1 },
    { flag: 'booth slop', count: 1 },
    { flag: 'poor performance', count: 0 },
    { flag: 'noisy', count: 0 },
    { flag: 'ugly', count: 0 },
  ],
};

export const metaResponse: MetaResponse = {
  qualityGood: 2,
  qualityBad: 1,
  platformDesktop: 3,
  platformAndroid: 2,
  platformiOS: 1,
  highPriorityCount: 3,
};

export const meResponse: MeResponse = {
  name: 'E2E Curator',
  role: 'curator',
  permissions: ['worlds:read', 'worlds:write'],
};

export function paginate(items: World[], limit: number, offset: number): PaginatedWorlds {
  return {
    total: items.length,
    limit,
    offset,
    worlds: items.slice(offset, offset + limit),
  };
}

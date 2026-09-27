export interface World {
  worldId: string;
  name: string;
  authorName: string;
  capacity: number;
  platforms: string[];
  tags: string[];
  flags?: string[];
  imageUrl: string;
  vrchatUrl: string;
  quality: 'good' | 'bad' | null;
  highPriority?: boolean;
  guildId?: string;
  createdAt: string;
  internalAddDate?: string;
}

export interface MeResponse {
  name: string;
  role: string;
  permissions: string[];
}

export interface PaginatedWorlds {
  total: number;
  limit: number;
  offset: number;
  worlds: World[];
}

export interface TagCount {
  tag: string;
  count: number;
  emoji: string;
  hexColor: string;
}

export interface TagsResponse {
  tags: TagCount[];
}

export interface FlagCount {
  flag: string;
  count: number;
}

export interface FlagsResponse {
  flags: FlagCount[];
}

export interface MetaResponse {
  qualityGood: number;
  qualityBad: number;
  platformDesktop: number;
  platformAndroid: number;
  platformiOS: number;
  highPriorityCount?: number;
}

export interface HealthResponse {
  status: 'ok';
  worldCount: number;
  dbVersion: number;
}

export interface Rating {
  id: string;
  world_id: string;
  user_id: string;
  value: 'good' | 'bad';
  created_at: string;
}

export interface RatingSummary {
  worldId: string;
  good: number;
  bad: number;
  userRating: 'good' | 'bad' | null;
}

export interface Comment {
  id: string;
  world_id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: string;
}

export interface RatingActivity {
  type: 'rating';
  id: string;
  worldId: string;
  value: 'good' | 'bad';
  createdAt: string;
}

export interface CommentActivity {
  type: 'comment';
  id: string;
  worldId: string;
  username: string;
  content: string;
  createdAt: string;
}

export type RecentActivityItem = RatingActivity | CommentActivity;

export type RecentActivityRow = RecentActivityItem & { worldName: string };

export type WorldsQueryField =
  | 'name'
  | 'author'
  | 'worldId'
  | 'source'
  | 'capacity'
  | 'addedAt'
  | 'createdAt'
  | 'updatedAt'
  | 'platform'
  | 'tag'
  | 'flag'
  | 'quality'
  | 'highPriority';

export type WorldsQueryOp =
  | 'eq'
  | 'ne'
  | 'in'
  | 'contains'
  | 'prefix'
  | 'not_contains'
  | 'script'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'before'
  | 'after'
  | 'has'
  | 'hasAny'
  | 'hasAll'
  | 'not_has'
  | 'isNull';

export interface WorldsQueryCondition {
  field: WorldsQueryField;
  op: WorldsQueryOp;
  value: string;
  value2: string;
  values: string[];
  negate: boolean;
}

export interface WorldsQueryGroup {
  connector: 'and' | 'or';
  conditions: WorldsQueryCondition[];
}

export interface WorldsQuery {
  groups: WorldsQueryGroup[];
}

export type WorldsSortField = 'none' | 'addedAt' | 'createdAt' | 'updatedAt' | 'capacity' | 'name';

export interface WorldsAgentHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface WorldsAgentRequest {
  query: string;
  history?: WorldsAgentHistoryMessage[];
}

export interface WorldsAgentResponse {
  interpretation: string;
  query: WorldsQuery;
  appliedFilters: string[];
  unmatchedTags: string[];
  worlds: World[];
  total: number;
}

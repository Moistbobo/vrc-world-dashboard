export interface World {
  worldId: string;
  name: string;
  authorName: string;
  capacity: number;
  platforms: string[];
  tags: string[];
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

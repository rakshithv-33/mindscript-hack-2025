export type PromptIndexItem = {
  id: string;
  title: string;
  version?: string;
  updatedAt?: string;
};

export type PromptBody = {
  id: string;
  body: string;
  version?: string;
  updatedAt?: string;
  etag?: string;
  lastUsedAt?: string;
  cachedAt?: string;
};

export type PromptsIndex = {
  items: PromptIndexItem[];
  etag?: string;
  lastSyncAt?: string;
};

export type CacheSchema = {
  index: PromptsIndex;
  bodies: Record<string, PromptBody>; // key: id (if versioned, body.version is used to detect staleness)
};

export type FetchIndexResult = {
  items?: PromptIndexItem[];
  etag?: string;
  notModified?: boolean;
};

export type FetchBodyResult = {
  content?: string;
  etag?: string;
  notModified?: boolean;
};



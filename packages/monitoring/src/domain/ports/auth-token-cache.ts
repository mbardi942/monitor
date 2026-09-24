export interface CachedToken {
  token: string;
  expiresAt: Date;
  headerName: string;
  headerPrefix: string;
}

export interface AuthTokenCache {
  get(profileId: string): Promise<CachedToken | null>;
  set(profileId: string, item: CachedToken): Promise<void>;
  invalidate(profileId: string): Promise<void>;
  clear(): Promise<void>;
}

import { AuthTokenCache, CachedToken } from "../../domain/ports/auth-token-cache.js";

export class InMemoryAuthTokenCache implements AuthTokenCache {
  private readonly store: Map<string, CachedToken> = new Map();

  public async get(profileId: string): Promise<CachedToken | null> {
    const item = this.store.get(profileId);
    if (!item) return null;

    if (item.expiresAt.getTime() <= Date.now()) {
      this.store.delete(profileId);
      return null;
    }

    return item;
  }

  public async set(profileId: string, item: CachedToken): Promise<void> {
    this.store.set(profileId, item);
  }

  public async invalidate(profileId: string): Promise<void> {
    this.store.delete(profileId);
  }

  public async clear(): Promise<void> {
    this.store.clear();
  }
}

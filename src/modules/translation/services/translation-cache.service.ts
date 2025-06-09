import { Injectable } from '@nestjs/common';

interface CacheItem {
  value: string;
  expiresAt: number;
}

@Injectable()
export class TranslationCacheService {
  private readonly cache = new Map<string, CacheItem>();
  private readonly defaultTTL = 3600 * 1000; // 1 hour in milliseconds

  get(key: string): string | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (item.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  set(key: string, value: string, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiresAt });
  }

  clear(): void {
    this.cache.clear();
  }

  remove(key: string): boolean {
    return this.cache.delete(key);
  }
}
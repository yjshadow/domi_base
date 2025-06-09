import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  /**
   * 生成缓存键
   * @param prefix 前缀
   * @param key 键
   * @returns 完整的缓存键
   */
  private generateKey(prefix: string, key: string | number): string {
    return `${prefix}:${key}`;
  }

  /**
   * 设置缓存
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（毫秒）
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存值
   */
  async get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  /**
   * 清除所有缓存
   */
  async reset(): Promise<void> {
    await this.cacheManager.reset();
  }

  /**
   * 获取或设置缓存
   * @param key 缓存键
   * @param getter 获取数据的函数
   * @param ttl 过期时间（毫秒）
   * @returns 缓存值或新获取的值
   */
  async getOrSet<T>(
    key: string,
    getter: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await getter();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * 缓存订阅源数据
   * @param subscriptionId 订阅ID
   * @param data 订阅数据
   * @param ttl 过期时间（毫秒）
   */
  async cacheSubscription<T>(
    subscriptionId: number,
    data: T,
    ttl: number = 30 * 60 * 1000, // 默认30分钟
  ): Promise<void> {
    const key = this.generateKey('subscription', subscriptionId);
    await this.set(key, data, ttl);
  }

  /**
   * 获取缓存的订阅源数据
   * @param subscriptionId 订阅ID
   * @returns 订阅数据
   */
  async getCachedSubscription<T>(subscriptionId: number): Promise<T | undefined> {
    const key = this.generateKey('subscription', subscriptionId);
    return this.get<T>(key);
  }

  /**
   * 删除订阅源缓存
   * @param subscriptionId 订阅ID
   */
  async invalidateSubscription(subscriptionId: number): Promise<void> {
    const key = this.generateKey('subscription', subscriptionId);
    await this.del(key);
  }

  /**
   * 缓存文章列表
   * @param subscriptionId 订阅ID
   * @param page 页码
   * @param data 文章列表数据
   * @param ttl 过期时间（毫秒）
   */
  async cacheArticles<T>(
    subscriptionId: number,
    page: number,
    data: T,
    ttl: number = 15 * 60 * 1000, // 默认15分钟
  ): Promise<void> {
    const key = this.generateKey('articles', `${subscriptionId}:${page}`);
    await this.set(key, data, ttl);
  }

  /**
   * 获取缓存的文章列表
   * @param subscriptionId 订阅ID
   * @param page 页码
   * @returns 文章列表数据
   */
  async getCachedArticles<T>(
    subscriptionId: number,
    page: number,
  ): Promise<T | undefined> {
    const key = this.generateKey('articles', `${subscriptionId}:${page}`);
    return this.get<T>(key);
  }

  /**
   * 删除文章列表缓存
   * @param subscriptionId 订阅ID
   */
  async invalidateArticles(subscriptionId: number): Promise<void> {
    // 由于文章列表可能有多个页面，我们需要一个模式匹配的删除方法
    // 但是cache-manager不直接支持模式匹配删除
    // 这里我们可以删除所有缓存，在生产环境中应该使用Redis等支持模式匹配的缓存系统
    await this.reset();
  }

  /**
   * 缓存搜索结果
   * @param query 搜索查询
   * @param data 搜索结果
   * @param ttl 过期时间（毫秒）
   */
  async cacheSearchResults<T>(
    query: string,
    data: T,
    ttl: number = 5 * 60 * 1000, // 默认5分钟
  ): Promise<void> {
    const key = this.generateKey('search', query);
    await this.set(key, data, ttl);
  }

  /**
   * 获取缓存的搜索结果
   * @param query 搜索查询
   * @returns 搜索结果
   */
  async getCachedSearchResults<T>(query: string): Promise<T | undefined> {
    const key = this.generateKey('search', query);
    return this.get<T>(key);
  }

  /**
   * 删除搜索结果缓存
   * @param query 搜索查询
   */
  async invalidateSearchResults(query: string): Promise<void> {
    const key = this.generateKey('search', query);
    await this.del(key);
  }
}
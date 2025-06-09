import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let cacheManager: any;

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    reset: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('set', () => {
    it('should call cacheManager.set with correct parameters', async () => {
      const key = 'test-key';
      const value = { data: 'test-data' };
      const ttl = 1000;

      await service.set(key, value, ttl);

      expect(cacheManager.set).toHaveBeenCalledWith(key, value, ttl);
    });
  });

  describe('get', () => {
    it('should call cacheManager.get with correct key', async () => {
      const key = 'test-key';
      const expectedValue = { data: 'cached-data' };

      cacheManager.get.mockResolvedValue(expectedValue);

      const result = await service.get(key);

      expect(cacheManager.get).toHaveBeenCalledWith(key);
      expect(result).toEqual(expectedValue);
    });

    it('should return undefined when cache miss', async () => {
      const key = 'non-existent-key';

      cacheManager.get.mockResolvedValue(undefined);

      const result = await service.get(key);

      expect(cacheManager.get).toHaveBeenCalledWith(key);
      expect(result).toBeUndefined();
    });
  });

  describe('del', () => {
    it('should call cacheManager.del with correct key', async () => {
      const key = 'test-key';

      await service.del(key);

      expect(cacheManager.del).toHaveBeenCalledWith(key);
    });
  });

  describe('reset', () => {
    it('should call cacheManager.reset', async () => {
      await service.reset();

      expect(cacheManager.reset).toHaveBeenCalled();
    });
  });

  describe('getOrSet', () => {
    it('should return cached value when available', async () => {
      const key = 'test-key';
      const cachedValue = { data: 'cached-data' };
      const getter = jest.fn().mockResolvedValue({ data: 'new-data' });

      cacheManager.get.mockResolvedValue(cachedValue);

      const result = await service.getOrSet(key, getter);

      expect(cacheManager.get).toHaveBeenCalledWith(key);
      expect(getter).not.toHaveBeenCalled();
      expect(result).toEqual(cachedValue);
    });

    it('should call getter and cache result when cache miss', async () => {
      const key = 'test-key';
      const newValue = { data: 'new-data' };
      const getter = jest.fn().mockResolvedValue(newValue);
      const ttl = 1000;

      cacheManager.get.mockResolvedValue(undefined);

      const result = await service.getOrSet(key, getter, ttl);

      expect(cacheManager.get).toHaveBeenCalledWith(key);
      expect(getter).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith(key, newValue, ttl);
      expect(result).toEqual(newValue);
    });
  });

  describe('subscription cache methods', () => {
    it('should cache subscription data with correct key', async () => {
      const subscriptionId = 123;
      const data = { title: 'Test Subscription' };
      const ttl = 1000;

      await service.cacheSubscription(subscriptionId, data, ttl);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'subscription:123',
        data,
        ttl,
      );
    });

    it('should get cached subscription data with correct key', async () => {
      const subscriptionId = 123;
      const cachedData = { title: 'Test Subscription' };

      cacheManager.get.mockResolvedValue(cachedData);

      const result = await service.getCachedSubscription(subscriptionId);

      expect(cacheManager.get).toHaveBeenCalledWith('subscription:123');
      expect(result).toEqual(cachedData);
    });

    it('should invalidate subscription cache with correct key', async () => {
      const subscriptionId = 123;

      await service.invalidateSubscription(subscriptionId);

      expect(cacheManager.del).toHaveBeenCalledWith('subscription:123');
    });
  });

  describe('articles cache methods', () => {
    it('should cache articles with correct key', async () => {
      const subscriptionId = 123;
      const page = 2;
      const data = [{ title: 'Article 1' }, { title: 'Article 2' }];
      const ttl = 1000;

      await service.cacheArticles(subscriptionId, page, data, ttl);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'articles:123:2',
        data,
        ttl,
      );
    });

    it('should get cached articles with correct key', async () => {
      const subscriptionId = 123;
      const page = 2;
      const cachedData = [{ title: 'Article 1' }, { title: 'Article 2' }];

      cacheManager.get.mockResolvedValue(cachedData);

      const result = await service.getCachedArticles(subscriptionId, page);

      expect(cacheManager.get).toHaveBeenCalledWith('articles:123:2');
      expect(result).toEqual(cachedData);
    });

    it('should invalidate articles cache by calling reset', async () => {
      const subscriptionId = 123;

      await service.invalidateArticles(subscriptionId);

      expect(cacheManager.reset).toHaveBeenCalled();
    });
  });

  describe('search results cache methods', () => {
    it('should cache search results with correct key', async () => {
      const query = 'test query';
      const data = [{ title: 'Result 1' }, { title: 'Result 2' }];
      const ttl = 1000;

      await service.cacheSearchResults(query, data, ttl);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'search:test query',
        data,
        ttl,
      );
    });

    it('should get cached search results with correct key', async () => {
      const query = 'test query';
      const cachedData = [{ title: 'Result 1' }, { title: 'Result 2' }];

      cacheManager.get.mockResolvedValue(cachedData);

      const result = await service.getCachedSearchResults(query);

      expect(cacheManager.get).toHaveBeenCalledWith('search:test query');
      expect(result).toEqual(cachedData);
    });

    it('should invalidate search results cache with correct key', async () => {
      const query = 'test query';

      await service.invalidateSearchResults(query);

      expect(cacheManager.del).toHaveBeenCalledWith('search:test query');
    });
  });
});
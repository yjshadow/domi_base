import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { SubscriptionService } from './subscription.service';
import { FeedParserService, ParsedFeed } from './feed-parser.service';
import { CacheService } from '../../../common/cache';
import { Subscription, FeedType, SubscriptionStatus } from '../models/subscription.entity';
import { Article } from '../models/article.entity';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let subscriptionRepository: MockRepository<Subscription>;
  let articleRepository: MockRepository<Article>;
  let feedParserService: Partial<FeedParserService>;
  let cacheService: Partial<CacheService>;

  const mockSubscription: Subscription = {
    id: 1,
    title: 'Test Feed',
    feedUrl: 'https://test.com/feed',
    siteUrl: 'https://test.com',
    description: 'Test Description',
    imageUrl: 'https://test.com/image.jpg',
    feedType: FeedType.RSS,
    status: SubscriptionStatus.ACTIVE,
    updateInterval: 60,
    autoTranslate: false,
    sourceLanguage: 'en',
    targetLanguage: 'zh-CN',
    error: null,
    errorCount: 0,
    lastErrorAt: null,
    lastUpdatedAt: new Date(),
    lastSuccessfulUpdateAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    articles: []
  };

  const mockArticle: Article = {
    id: 1,
    subscriptionId: 1,
    title: 'Test Article',
    description: 'Test Article Description',
    content: 'Test Article Content',
    link: 'https://test.com/article',
    guid: 'test-guid',
    author: 'Test Author',
    publishedAt: new Date(),
    categories: ['test'],
    imageUrl: 'https://test.com/article-image.jpg',
    isRead: false,
    isFavorite: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    translatedTitle: null,
    translatedDescription: null,
    translatedContent: null,
    subscription: null,
    translationRetries: 0
  };

  const mockParsedFeed: ParsedFeed = {
    title: 'Parsed Feed',
    description: 'Parsed Feed Description',
    link: 'https://parsed.com',
    imageUrl: 'https://parsed.com/image.jpg',
    items: [
      {
        title: 'Parsed Article',
        description: 'Parsed Article Description',
        content: 'Parsed Article Content',
        link: 'https://parsed.com/article',
        guid: 'parsed-guid',
        author: 'Parsed Author',
        publishedAt: new Date(),
        categories: ['parsed'],
        imageUrl: 'https://parsed.com/article-image.jpg',
      }
    ]
  };

  beforeEach(async () => {
    subscriptionRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    articleRepository = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    feedParserService = {
      detectFeedType: jest.fn(),
      parseFeed: jest.fn(),
    };

    cacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      getCachedSubscription: jest.fn(),
      cacheSubscription: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: getRepositoryToken(Subscription),
          useValue: subscriptionRepository,
        },
        {
          provide: getRepositoryToken(Article),
          useValue: articleRepository,
        },
        {
          provide: FeedParserService,
          useValue: feedParserService,
        },
        {
          provide: CacheService,
          useValue: cacheService,
        },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return cached result when available', async () => {
      const cachedResult = {
        items: [mockSubscription],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      
      (cacheService.get as jest.Mock).mockResolvedValue(cachedResult);

      const result = await service.findAll({ page: 1, limit: 10 });
      
      expect(result).toEqual(cachedResult);
      expect(cacheService.get).toHaveBeenCalledWith('subscriptions:list:1:10:all:none');
      expect(subscriptionRepository.findAndCount).not.toHaveBeenCalled();
    });

    it('should query database and cache result when cache miss', async () => {
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (subscriptionRepository.findAndCount as jest.Mock).mockResolvedValue([
        [mockSubscription],
        1,
      ]);

      const result = await service.findAll({ page: 1, limit: 10 });
      
      expect(result).toEqual({
        items: [mockSubscription],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      
      expect(cacheService.get).toHaveBeenCalledWith('subscriptions:list:1:10:all:none');
      expect(subscriptionRepository.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should apply status filter when provided', async () => {
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (subscriptionRepository.findAndCount as jest.Mock).mockResolvedValue([
        [mockSubscription],
        1,
      ]);

      await service.findAll({ 
        page: 1, 
        limit: 10, 
        status: SubscriptionStatus.ACTIVE 
      });
      
      expect(subscriptionRepository.findAndCount).toHaveBeenCalledWith({
        where: { status: SubscriptionStatus.ACTIVE },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
    });

    it('should apply search filter when provided', async () => {
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      (subscriptionRepository.findAndCount as jest.Mock).mockResolvedValue([
        [mockSubscription],
        1,
      ]);

      await service.findAll({ 
        page: 1, 
        limit: 10, 
        search: 'test' 
      });
      
      expect(subscriptionRepository.findAndCount).toHaveBeenCalledWith({
        where: { title: Like('%test%') },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
    });
  });

  describe('findOne', () => {
    it('should return cached subscription when available', async () => {
      (cacheService.getCachedSubscription as jest.Mock).mockResolvedValue(mockSubscription);

      const result = await service.findOne(1);
      
      expect(result).toEqual(mockSubscription);
      expect(cacheService.getCachedSubscription).toHaveBeenCalledWith(1);
      expect(subscriptionRepository.findOne).not.toHaveBeenCalled();
    });

    it('should query database and cache result when cache miss', async () => {
      (cacheService.getCachedSubscription as jest.Mock).mockResolvedValue(null);
      (subscriptionRepository.findOne as jest.Mock).mockResolvedValue(mockSubscription);

      const result = await service.findOne(1);
      
      expect(result).toEqual(mockSubscription);
      expect(cacheService.getCachedSubscription).toHaveBeenCalledWith(1);
      expect(subscriptionRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(cacheService.cacheSubscription).toHaveBeenCalledWith(1, mockSubscription);
    });

    it('should throw NotFoundException when subscription not found', async () => {
      (cacheService.getCachedSubscription as jest.Mock).mockResolvedValue(null);
      (subscriptionRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSubscriptionWithArticles', () => {
    it('should return cached result when available', async () => {
      const cachedResult = {
        ...mockSubscription,
        articles: [mockArticle],
        totalArticles: 1,
      };
      
      (cacheService.get as jest.Mock).mockResolvedValue(cachedResult);

      const result = await service.getSubscriptionWithArticles(1);
      
      expect(result).toEqual(cachedResult);
      expect(cacheService.get).toHaveBeenCalledWith('subscription:1:articles:1:20');
    });

    it('should query database and cache result when cache miss', async () => {
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      jest.spyOn(service, 'findOne').mockResolvedValue(mockSubscription);
      (articleRepository.findAndCount as jest.Mock).mockResolvedValue([
        [mockArticle],
        1,
      ]);

      const result = await service.getSubscriptionWithArticles(1);
      
      expect(result).toEqual({
        ...mockSubscription,
        articles: [mockArticle],
        totalArticles: 1,
      });
      
      expect(cacheService.get).toHaveBeenCalledWith('subscription:1:articles:1:20');
      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(articleRepository.findAndCount).toHaveBeenCalledWith({
        where: { subscriptionId: 1 },
        order: { publishedAt: 'DESC' },
        skip: 0,
        take: 20,
      });
      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create a new subscription and refresh feed', async () => {
      const createDto: CreateSubscriptionDto = {
        title: 'New Feed',
        feedUrl: 'https://new.com/feed',
        siteUrl: 'https://new.com',
        description: 'New Description',
        imageUrl: 'https://new.com/image.jpg',
        updateInterval: 60,
        autoTranslate: false,
        sourceLanguage: 'en',
        targetLanguage: 'zh-CN'
      };

      const newSubscription = { ...mockSubscription, ...createDto };
      
      (feedParserService.detectFeedType as jest.Mock).mockResolvedValue(FeedType.RSS);
      (subscriptionRepository.create as jest.Mock).mockReturnValue(newSubscription);
      (subscriptionRepository.save as jest.Mock).mockResolvedValue(newSubscription);
      jest.spyOn(service, 'refreshFeed').mockResolvedValue();

      const result = await service.create(createDto);
      
      expect(result).toEqual(newSubscription);
      expect(feedParserService.detectFeedType).toHaveBeenCalledWith(createDto.feedUrl);
      expect(subscriptionRepository.create).toHaveBeenCalledWith({
        ...createDto,
        feedType: FeedType.RSS,
        status: SubscriptionStatus.ACTIVE,
      });
      expect(subscriptionRepository.save).toHaveBeenCalledWith(newSubscription);
      expect(cacheService.del).toHaveBeenCalledWith('subscriptions:list:*');
      // refreshFeed is called asynchronously, so we can't easily test it directly
    });

    it('should throw BadRequestException when creation fails', async () => {
      const createDto: CreateSubscriptionDto = {
        title: 'New Feed',
        feedUrl: 'https://new.com/feed',
        siteUrl: 'https://new.com',
        description: 'New Description',
        imageUrl: 'https://new.com/image.jpg',
        updateInterval: 60,
        autoTranslate: false,
        sourceLanguage: 'en',
        targetLanguage: 'zh-CN'
      };

      const error = new Error('Creation failed');
      (feedParserService.detectFeedType as jest.Mock).mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should update an existing subscription', async () => {
      const updateDto: UpdateSubscriptionDto = {
        title: 'Updated Feed',
        updateInterval: 30
      };

      const updatedSubscription = { ...mockSubscription, ...updateDto };
      
      jest.spyOn(service, 'findOne').mockResolvedValue(mockSubscription);
      (subscriptionRepository.save as jest.Mock).mockResolvedValue(updatedSubscription);

      const result = await service.update(1, updateDto);
      
      expect(result).toEqual(updatedSubscription);
      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(subscriptionRepository.save).toHaveBeenCalledWith({
        ...mockSubscription,
        ...updateDto,
      });
      expect(cacheService.del).toHaveBeenCalledWith('subscription:1');
      expect(cacheService.del).toHaveBeenCalledWith('subscription:1:articles:*');
      expect(cacheService.del).toHaveBeenCalledWith('subscriptions:list:*');
    });

    it('should detect feed type when feedUrl is updated', async () => {
      const updateDto: UpdateSubscriptionDto = {
        feedUrl: 'https://updated.com/feed'
      };

      const updatedSubscription = { ...mockSubscription, ...updateDto };
      
      jest.spyOn(service, 'findOne').mockResolvedValue(mockSubscription);
      (feedParserService.detectFeedType as jest.Mock).mockResolvedValue(FeedType.ATOM);
      (subscriptionRepository.save as jest.Mock).mockResolvedValue({
        ...updatedSubscription,
        feedType: FeedType.ATOM
      });

      const result = await service.update(1, updateDto);
      
      expect(result).toEqual({
        ...updatedSubscription,
        feedType: FeedType.ATOM
      });
      expect(feedParserService.detectFeedType).toHaveBeenCalledWith(updateDto.feedUrl);
    });
  });

  describe('remove', () => {
    it('should remove a subscription and its articles', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockSubscription);

      const result = await service.remove(1);
      
      expect(result).toBe(true);
      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(articleRepository.delete).toHaveBeenCalledWith({ subscriptionId: 1 });
      expect(subscriptionRepository.remove).toHaveBeenCalledWith(mockSubscription);
      expect(cacheService.del).toHaveBeenCalledWith('subscription:1');
      expect(cacheService.del).toHaveBeenCalledWith('subscription:1:articles:*');
      expect(cacheService.del).toHaveBeenCalledWith('subscriptions:list:*');
    });
  });

  describe('updateStatus', () => {
    it('should update subscription status to ACTIVE', async () => {
      const subscription = { 
        ...mockSubscription, 
        status: SubscriptionStatus.ERROR,
        errorCount: 3,
        error: 'Previous error',
        lastErrorAt: new Date()
      };
      
      jest.spyOn(service, 'findOne').mockResolvedValue(subscription);

      await service.updateStatus(1, SubscriptionStatus.ACTIVE);
      
      expect(subscriptionRepository.save).toHaveBeenCalledWith({
        ...subscription,
        status: SubscriptionStatus.ACTIVE,
        errorCount: 0,
        error: null,
        lastErrorAt: null
      });
      expect(cacheService.del).toHaveBeenCalledWith('subscription:1');
      expect(cacheService.del).toHaveBeenCalledWith('subscriptions:list:*');
    });

    it('should update subscription status to ERROR', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockSubscription);

      await service.updateStatus(1, SubscriptionStatus.ERROR, 'Test error');
      
      expect(subscriptionRepository.save).toHaveBeenCalledWith({
        ...mockSubscription,
        status: SubscriptionStatus.ERROR,
        errorCount: 1,
        error: 'Test error',
        lastErrorAt: expect.any(Date)
      });
    });
  });

  describe('refreshFeed', () => {
    it('should successfully refresh a feed', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockSubscription);
      (feedParserService.parseFeed as jest.Mock).mockResolvedValue(mockParsedFeed);
      (articleRepository.findOne as jest.Mock).mockResolvedValue(null);
      (articleRepository.create as jest.Mock).mockReturnValue(mockArticle);

      await service.refreshFeed(1);
      
      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(subscriptionRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        id: 1,
        lastUpdatedAt: expect.any(Date)
      }));
      expect(feedParserService.parseFeed).toHaveBeenCalledWith(
        mockSubscription.feedUrl,
        mockSubscription.feedType
      );
      expect(subscriptionRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        id: 1,
        status: SubscriptionStatus.ACTIVE,
        lastSuccessfulUpdateAt: expect.any(Date),
        error: null,
        errorCount: 0,
        lastErrorAt: null
      }));
      expect(cacheService.del).toHaveBeenCalledWith('subscription:1');
    });

    it('should handle existing articles', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockSubscription);
      (feedParserService.parseFeed as jest.Mock).mockResolvedValue(mockParsedFeed);
      (articleRepository.findOne as jest.Mock).mockResolvedValue(mockArticle);

      await service.refreshFeed(1);
      
      expect(articleRepository.save).not.toHaveBeenCalled();
    });

    it('should update subscription with parsed feed data', async () => {
      const subscription = { 
        ...mockSubscription,
        title: 'Old Title',
        description: null,
        siteUrl: null,
        imageUrl: null
      };
      
      jest.spyOn(service, 'findOne').mockResolvedValue(subscription);
      (feedParserService.parseFeed as jest.Mock).mockResolvedValue(mockParsedFeed);
      (articleRepository.findOne as jest.Mock).mockResolvedValue(null);

      await service.refreshFeed(1);
      
      expect(subscriptionRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        id: 1,
        title: mockParsedFeed.title,
        description: mockParsedFeed.description,
        siteUrl: mockParsedFeed.link,
        imageUrl: mockParsedFeed.imageUrl
      }));
    });

    it('should handle refresh errors', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockSubscription);
      const error = new Error('Refresh failed');
      (feedParserService.parseFeed as jest.Mock).mockRejectedValue(error);
      jest.spyOn(service, 'updateStatus').mockResolvedValue();

      await expect(service.refreshFeed(1)).rejects.toThrow(BadRequestException);
      
      expect(service.updateStatus).toHaveBeenCalledWith(
        1,
        SubscriptionStatus.ERROR,
        'Failed to refresh feed: Refresh failed'
      );
    });
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { FeedCronService } from './feed-cron.service';
import { SubscriptionService } from './subscription.service';
import { Subscription, SubscriptionStatus } from '../models/subscription.entity';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('FeedCronService', () => {
  let service: FeedCronService;
  let subscriptionRepository: MockRepository<Subscription>;
  let subscriptionService: jest.Mocked<Partial<SubscriptionService>>;
  let schedulerRegistry: jest.Mocked<Partial<SchedulerRegistry>>;

  const mockSubscription: Subscription = {
    id: 1,
    title: 'Test Feed',
    feedUrl: 'https://test.com/feed',
    siteUrl: 'https://test.com',
    description: 'Test Description',
    imageUrl: 'https://test.com/image.jpg',
    feedType: 'RSS',
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
    updatedAt: new Date()
  };

  beforeEach(async () => {
    subscriptionRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    subscriptionService = {
      refreshFeed: jest.fn(),
    };

    schedulerRegistry = {
      addCronJob: jest.fn(),
      doesExist: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedCronService,
        {
          provide: getRepositoryToken(Subscription),
          useValue: subscriptionRepository,
        },
        {
          provide: SubscriptionService,
          useValue: subscriptionService,
        },
        {
          provide: SchedulerRegistry,
          useValue: schedulerRegistry,
        },
      ],
    }).compile();

    service = module.get<FeedCronService>(FeedCronService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startCronJobs', () => {
    it('should create and start check and cleanup cron jobs', async () => {
      await service.startCronJobs();

      expect(schedulerRegistry.addCronJob).toHaveBeenCalledTimes(2);
      expect(schedulerRegistry.addCronJob).toHaveBeenCalledWith(
        'check-subscriptions',
        expect.any(CronJob)
      );
      expect(schedulerRegistry.addCronJob).toHaveBeenCalledWith(
        'cleanup-articles',
        expect.any(CronJob)
      );
    });

    it('should handle errors in check job', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Check failed');
      
      await service.startCronJobs();
      
      // Get the check job callback
      const checkJob = (schedulerRegistry.addCronJob as jest.Mock).mock.calls[0][1];
      await checkJob.fireOnTick();
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle errors in cleanup job', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Cleanup failed');
      
      await service.startCronJobs();
      
      // Get the cleanup job callback
      const cleanupJob = (schedulerRegistry.addCronJob as jest.Mock).mock.calls[1][1];
      await cleanupJob.fireOnTick();
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('checkSubscriptionsForUpdate', () => {
    it('should skip check when max concurrent jobs reached', async () => {
      // Set runningJobs to max value
      (service as any).runningJobs = (service as any).MAX_CONCURRENT_JOBS;
      
      await (service as any).checkSubscriptionsForUpdate();
      
      expect(subscriptionRepository.find).not.toHaveBeenCalled();
    });

    it('should find subscriptions that need update', async () => {
      const now = new Date();
      (subscriptionRepository.find as jest.Mock).mockResolvedValue([mockSubscription]);

      await (service as any).checkSubscriptionsForUpdate();

      expect(subscriptionRepository.find).toHaveBeenCalledWith({
        where: expect.arrayContaining([
          {
            status: SubscriptionStatus.ACTIVE,
            lastUpdatedAt: null,
          },
          {
            status: SubscriptionStatus.ACTIVE,
            lastUpdatedAt: expect.any(Object),
          },
          {
            status: SubscriptionStatus.ERROR,
            errorCount: expect.any(Object),
            lastUpdatedAt: expect.any(Object),
          },
        ]),
        order: {
          lastUpdatedAt: 'ASC',
        },
        take: 10,
      });
    });

    it('should add subscriptions to job queue', async () => {
      (subscriptionRepository.find as jest.Mock).mockResolvedValue([mockSubscription]);
      (schedulerRegistry.doesExist as jest.Mock).mockReturnValue(false);

      await (service as any).checkSubscriptionsForUpdate();

      expect((service as any).jobQueue).toEqual([
        { id: mockSubscription.id, name: `refresh-feed-${mockSubscription.id}` },
      ]);
    });

    it('should skip subscriptions already in queue', async () => {
      (subscriptionRepository.find as jest.Mock).mockResolvedValue([mockSubscription]);
      (schedulerRegistry.doesExist as jest.Mock).mockReturnValue(true);

      await (service as any).checkSubscriptionsForUpdate();

      expect((service as any).jobQueue).toEqual([]);
    });

    it('should handle database errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Database error');
      (subscriptionRepository.find as jest.Mock).mockRejectedValue(error);

      await (service as any).checkSubscriptionsForUpdate();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('processJobQueue', () => {
    it('should skip processing when max concurrent jobs reached', async () => {
      (service as any).runningJobs = (service as any).MAX_CONCURRENT_JOBS;
      (service as any).jobQueue = [{ id: 1, name: 'refresh-feed-1' }];

      await (service as any).processJobQueue();

      expect(subscriptionService.refreshFeed).not.toHaveBeenCalled();
    });

    it('should skip processing when queue is empty', async () => {
      (service as any).jobQueue = [];

      await (service as any).processJobQueue();

      expect(subscriptionService.refreshFeed).not.toHaveBeenCalled();
    });

    it('should process job from queue', async () => {
      (service as any).jobQueue = [{ id: 1, name: 'refresh-feed-1' }];
      (subscriptionService.refreshFeed as jest.Mock).mockResolvedValue(undefined);

      await (service as any).processJobQueue();

      expect(subscriptionService.refreshFeed).toHaveBeenCalledWith(1);
      expect((service as any).jobQueue).toEqual([]);
    });

    it('should handle job errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Refresh failed');
      (service as any).jobQueue = [{ id: 1, name: 'refresh-feed-1' }];
      (subscriptionService.refreshFeed as jest.Mock).mockRejectedValue(error);

      await (service as any).processJobQueue();

      expect(consoleSpy).toHaveBeenCalled();
      expect((service as any).runningJobs).toBe(0);
      consoleSpy.mockRestore();
    });

    it('should process next job after completion', async () => {
      (service as any).jobQueue = [
        { id: 1, name: 'refresh-feed-1' },
        { id: 2, name: 'refresh-feed-2' },
      ];
      (subscriptionService.refreshFeed as jest.Mock).mockResolvedValue(undefined);

      await (service as any).processJobQueue();

      expect(subscriptionService.refreshFeed).toHaveBeenCalledTimes(2);
      expect(subscriptionService.refreshFeed).toHaveBeenNthCalledWith(1, 1);
      expect(subscriptionService.refreshFeed).toHaveBeenNthCalledWith(2, 2);
      expect((service as any).jobQueue).toEqual([]);
    });
  });

  describe('cleanupOldArticles', () => {
    // This method is currently a placeholder in the service
    // Add tests when implementation is added
    it('should handle cleanup errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await (service as any).cleanupOldArticles();
      
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('helper methods', () => {
    describe('getDateCondition', () => {
      it('should return correct date condition', () => {
        const now = new Date('2023-01-01T12:00:00Z');
        const result = (service as any).getDateCondition(now, 30);

        const expected = new Date('2023-01-01T11:30:00Z');
        expect(result).toEqual({ lessThan: expected });
      });

      it('should use default minutes when not provided', () => {
        const now = new Date('2023-01-01T12:00:00Z');
        const result = (service as any).getDateCondition(now);

        const expected = new Date('2023-01-01T12:00:00Z');
        expect(result).toEqual({ lessThan: expected });
      });
    });

    describe('getLessThanCondition', () => {
      it('should return correct less than condition', () => {
        const result = (service as any).getLessThanCondition(5);
        expect(result).toEqual({ lessThan: 5 });
      });
    });
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from '../services/subscription.service';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import { FeedType, Subscription, SubscriptionStatus } from '../models/subscription.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('SubscriptionController', () => {
  let controller: SubscriptionController;
  let service: SubscriptionService;

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

  const mockPaginatedResponse = {
    items: [mockSubscription],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionController],
      providers: [
        {
          provide: SubscriptionService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            refreshFeed: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SubscriptionController>(SubscriptionController);
    service = module.get<SubscriptionService>(SubscriptionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated subscriptions with default parameters', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll();

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        status: undefined,
        search: undefined,
      });
    });

    it('should return filtered subscriptions with custom parameters', async () => {
      jest.spyOn(service, 'findAll').mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(2, 20, SubscriptionStatus.ACTIVE, 'test');

      expect(result).toEqual(mockPaginatedResponse);
      expect(service.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 20,
        status: SubscriptionStatus.ACTIVE,
        search: 'test',
      });
    });

    it('should throw BadRequestException for invalid page number', async () => {
      await expect(controller.findAll(0)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid limit', async () => {
      await expect(controller.findAll(1, 0)).rejects.toThrow(BadRequestException);
      await expect(controller.findAll(1, 101)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return a subscription by id', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockSubscription);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockSubscription);
      expect(service.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when subscription not found', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(null);

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
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

    it('should create a new subscription', async () => {
      const newSubscription = { ...mockSubscription, ...createDto };
      jest.spyOn(service, 'create').mockResolvedValue(newSubscription);

      const result = await controller.create(createDto);

      expect(result).toEqual(newSubscription);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });

    it('should throw BadRequestException when feed URL already exists', async () => {
      jest.spyOn(service, 'create').mockRejectedValue({ code: '23505' });

      await expect(controller.create(createDto)).rejects.toThrow(BadRequestException);
    });

    it('should rethrow other errors', async () => {
      const error = new Error('Unknown error');
      jest.spyOn(service, 'create').mockRejectedValue(error);

      await expect(controller.create(createDto)).rejects.toThrow(error);
    });
  });

  describe('update', () => {
    const updateDto: UpdateSubscriptionDto = {
      title: 'Updated Feed',
      updateInterval: 30
    };

    it('should update an existing subscription', async () => {
      const updatedSubscription = { ...mockSubscription, ...updateDto };
      jest.spyOn(service, 'update').mockResolvedValue(updatedSubscription);

      const result = await controller.update(1, updateDto);

      expect(result).toEqual(updatedSubscription);
      expect(service.update).toHaveBeenCalledWith(1, updateDto);
    });

    it('should throw NotFoundException when subscription not found', async () => {
      jest.spyOn(service, 'update').mockResolvedValue(null);

      await expect(controller.update(999, updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when feed URL already exists', async () => {
      jest.spyOn(service, 'update').mockRejectedValue({ code: '23505' });

      await expect(controller.update(1, updateDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should remove a subscription', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue(true);

      await controller.remove(1);

      expect(service.remove).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when subscription not found', async () => {
      jest.spyOn(service, 'remove').mockResolvedValue(false);

      await expect(controller.remove(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('refresh', () => {
    it('should refresh a subscription feed', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockSubscription);
      jest.spyOn(service, 'refreshFeed').mockResolvedValue();

      await controller.refresh(1);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(service.refreshFeed).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when subscription not found', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(null);

      await expect(controller.refresh(999)).rejects.toThrow(NotFoundException);
    });

    it('should propagate refresh errors', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockSubscription);
      const error = new Error('Refresh failed');
      jest.spyOn(service, 'refreshFeed').mockRejectedValue(error);

      await expect(controller.refresh(1)).rejects.toThrow(error);
    });
  });
});
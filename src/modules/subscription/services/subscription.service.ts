import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Subscription, FeedType, SubscriptionStatus } from '../models/subscription.entity';
import { Article } from '../models/article.entity';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { UpdateSubscriptionDto } from '../dto/update-subscription.dto';
import { FeedParserService, ParsedFeed } from './feed-parser.service';
import { CacheService } from '../../../common/cache';
import { BaseTranslationService } from '../../translation/translation.service';

interface PaginationOptions {
  page: number;
  limit: number;
  status?: SubscriptionStatus;
  search?: string;
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    private readonly feedParserService: FeedParserService,
    private readonly cacheService: CacheService,
    @Inject('TranslationService')
    private readonly translationService: BaseTranslationService,
  ) {}

  async findAll(options: PaginationOptions): Promise<PaginatedResult<Subscription>> {
    const { page, limit, status, search } = options;
    const cacheKey = `subscriptions:list:${page}:${limit}:${status || 'all'}:${search || 'none'}`;

    // 尝试从缓存获取数据
    const cachedResult = await this.cacheService.get<PaginatedResult<Subscription>>(cacheKey);
    if (cachedResult) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return cachedResult;
    }

    this.logger.debug(`Cache miss for ${cacheKey}`);
    const skip = (page - 1) * limit;
    const where: FindOptionsWhere<Subscription> = {};
    
    if (status) {
      where.status = status;
    }
    
    if (search) {
      where.title = Like(`%${search}%`);
    }

    const [items, total] = await this.subscriptionRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    const result = {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    // 缓存结果，设置5分钟过期
    await this.cacheService.set(cacheKey, result, 5 * 60 * 1000);
    return result;
  }

  async findOne(id: number): Promise<Subscription> {
    // 尝试从缓存获取订阅信息
    const cachedSubscription = await this.cacheService.getCachedSubscription<Subscription>(id);
    if (cachedSubscription) {
      this.logger.debug(`Cache hit for subscription ${id}`);
      return cachedSubscription;
    }

    this.logger.debug(`Cache miss for subscription ${id}`);
    const subscription = await this.subscriptionRepository.findOne({ 
      where: { id },
    });
    
    if (!subscription) {
      throw new NotFoundException(`Subscription with ID ${id} not found`);
    }
    
    // 缓存订阅信息，设置30分钟过期
    await this.cacheService.cacheSubscription(id, subscription);
    return subscription;
  }

  async getSubscriptionWithArticles(id: number, page = 1, limit = 20): Promise<Subscription & { articles: Article[], totalArticles: number }> {
    const cacheKey = `subscription:${id}:articles:${page}:${limit}`;
    
    // 尝试从缓存获取数据
    const cachedData = await this.cacheService.get<Subscription & { articles: Article[], totalArticles: number }>(cacheKey);
    if (cachedData) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return cachedData;
    }

    this.logger.debug(`Cache miss for ${cacheKey}`);
    const subscription = await this.findOne(id);
    
    const [articles, totalArticles] = await this.articleRepository.findAndCount({
      where: { subscriptionId: id },
      order: { publishedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    
    const result = {
      ...subscription,
      articles,
      totalArticles,
    };

    // 缓存结果，设置10分钟过期
    await this.cacheService.set(cacheKey, result, 10 * 60 * 1000);
    return result;
  }

  async create(createSubscriptionDto: CreateSubscriptionDto): Promise<Subscription> {
    try {
      // 检测订阅源类型
      const feedType = await this.feedParserService.detectFeedType(createSubscriptionDto.feedUrl);
      
      const subscription = this.subscriptionRepository.create({
        ...createSubscriptionDto,
        feedType,
        status: SubscriptionStatus.ACTIVE,
      });
      
      const savedSubscription = await this.subscriptionRepository.save(subscription);
      
      // 清除订阅列表缓存
      await this.clearSubscriptionListCache();
      
      // 立即获取文章
      this.refreshFeed(savedSubscription.id).catch(error => {
        this.logger.error(`Failed to fetch initial articles for subscription ${savedSubscription.id}`, error.stack);
      });
      
      return savedSubscription;
    } catch (error) {
      this.logger.error(`Failed to create subscription: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to create subscription: ${error.message}`);
    }
  }

  async update(
    id: number,
    updateSubscriptionDto: UpdateSubscriptionDto,
  ): Promise<Subscription> {
    const subscription = await this.findOne(id);
    
    // 如果更新了 feedUrl，重新检测订阅源类型
    let feedType = subscription.feedType;
    if (updateSubscriptionDto.feedUrl && updateSubscriptionDto.feedUrl !== subscription.feedUrl) {
      feedType = await this.feedParserService.detectFeedType(updateSubscriptionDto.feedUrl);
    }
    
    const updatedSubscription = {
      ...subscription,
      ...updateSubscriptionDto,
      feedType,
    };
    
    const savedSubscription = await this.subscriptionRepository.save(updatedSubscription);
    
    // 清除相关缓存
    await this.clearSubscriptionCache(id);
    await this.clearSubscriptionListCache();
    
    return savedSubscription;
  }

  async remove(id: number): Promise<boolean> {
    const subscription = await this.findOne(id);
    
    // 首先删除关联的文章
    await this.articleRepository.delete({ subscriptionId: id });
    
    // 然后删除订阅
    await this.subscriptionRepository.remove(subscription);
    
    // 清除相关缓存
    await this.clearSubscriptionCache(id);
    await this.clearSubscriptionListCache();
    
    return true;
  }

  async updateStatus(id: number, status: SubscriptionStatus, error?: string): Promise<void> {
    const subscription = await this.findOne(id);
    
    subscription.status = status;
    subscription.error = error;
    
    if (status === SubscriptionStatus.ERROR) {
      subscription.errorCount += 1;
      subscription.lastErrorAt = new Date();
    } else if (status === SubscriptionStatus.ACTIVE) {
      subscription.errorCount = 0;
      subscription.error = null;
      subscription.lastErrorAt = null;
    }
    
    await this.subscriptionRepository.save(subscription);
    
    // 清除相关缓存
    await this.clearSubscriptionCache(id);
    await this.clearSubscriptionListCache();
  }

  async refreshFeed(id: number): Promise<void> {
    const subscription = await this.findOne(id);
    
    try {
      this.logger.log(`Refreshing feed for subscription ${id}: ${subscription.feedUrl}`);
      
      // 更新最后更新时间
      subscription.lastUpdatedAt = new Date();
      await this.subscriptionRepository.save(subscription);
      
      // 使用 FeedParserService 解析订阅源
      const parsedFeed = await this.feedParserService.parseFeed(
        subscription.feedUrl,
        subscription.feedType,
      );
      
      // 处理解析后的数据
      await this.processParsedFeed(subscription, parsedFeed);
      
      // 更新订阅状态
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.lastSuccessfulUpdateAt = new Date();
      subscription.error = null;
      subscription.errorCount = 0;
      subscription.lastErrorAt = null;
      
      await this.subscriptionRepository.save(subscription);
      
      this.logger.log(`Successfully refreshed feed for subscription ${id}`);
    } catch (error) {
      this.logger.error(`Failed to refresh feed for subscription ${id}: ${error.message}`, error.stack);
      
      // 更新订阅状态为错误
      await this.updateStatus(
        id,
        SubscriptionStatus.ERROR,
        `Failed to refresh feed: ${error.message}`,
      );
      
      throw new BadRequestException(`Failed to refresh feed: ${error.message}`);
    }
  }

  private async processParsedFeed(subscription: Subscription, parsedFeed: ParsedFeed): Promise<void> {
    // 更新订阅信息
    if (parsedFeed.title && parsedFeed.title !== subscription.title) {
      subscription.title = parsedFeed.title;
    }
    
    if (parsedFeed.description && !subscription.description) {
      subscription.description = parsedFeed.description;
    }
    
    if (parsedFeed.link && !subscription.siteUrl) {
      subscription.siteUrl = parsedFeed.link;
    }
    
    if (parsedFeed.imageUrl && !subscription.imageUrl) {
      subscription.imageUrl = parsedFeed.imageUrl;
    }
    
    await this.subscriptionRepository.save(subscription);
    
    // 处理文章
    for (const item of parsedFeed.items) {
      if (!item.guid) {
        this.logger.warn(`Skipping article without guid in subscription ${subscription.id}`);
        continue;
      }
      
      // 检查文章是否已存在
      const existingArticle = await this.articleRepository.findOne({
        where: { guid: item.guid },
      });
      
      if (existingArticle) {
        continue; // 跳过已存在的文章
      }
      
      try {
        const article = this.articleRepository.create({
          subscriptionId: subscription.id,
          title: item.title,
          description: item.description || '',
          content: item.content || item.description || '',
          link: item.link || '',
          guid: item.guid,
          author: item.author || '',
          publishedAt: item.publishedAt,
          categories: item.categories || [],
          imageUrl: item.imageUrl,
          isRead: false,
          isFavorite: false,
        });
        
        // 保存文章
        await this.articleRepository.save(article);

        // 如果启用了自动翻译，尝试翻译文章
        if (subscription.autoTranslate && subscription.targetLanguage) {
          try {
            await this.translateArticle(article, subscription.sourceLanguage, subscription.targetLanguage);
          } catch (translationError) {
            this.logger.error(
              `Failed to translate article ${article.id} for subscription ${subscription.id}: ${translationError.message}`,
              translationError.stack,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to save article ${item.guid} for subscription ${subscription.id}: ${error.message}`,
          error.stack,
        );
      }
    }

    // 清除相关缓存
    await this.clearSubscriptionCache(subscription.id);
  }

  // 缓存清理辅助方法
  private async clearSubscriptionCache(id: number): Promise<void> {
    // 清除订阅详情缓存
    await this.cacheService.del(`subscription:${id}`);
    // 清除订阅文章列表缓存
    await this.cacheService.del(`subscription:${id}:articles:*`);
  }

  private async clearSubscriptionListCache(): Promise<void> {
    // 清除订阅列表缓存
    await this.cacheService.del('subscriptions:list:*');
  }

  /**
   * 翻译文章的标题、描述和内容
   * @param article 要翻译的文章
   * @param sourceLanguage 源语言代码
   * @param targetLanguage 目标语言代码
   */
  private async translateArticle(
    article: Article,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<void> {
    try {
      // 准备需要翻译的文本数组
      const textsToTranslate = [
        article.title,
        article.description,
        article.content,
      ].filter(text => text && text.trim().length > 0); // 过滤掉空文本

      if (textsToTranslate.length === 0) {
        return; // 没有需要翻译的内容
      }

      // 批量翻译所有文本
      const translatedTexts = await this.translationService.translateBatch(
        textsToTranslate,
        sourceLanguage,
        targetLanguage,
      );

      // 更新文章的翻译字段
      let index = 0;
      if (article.title) {
        article.translatedTitle = translatedTexts[index++];
      }
      if (article.description) {
        article.translatedDescription = translatedTexts[index++];
      }
      if (article.content) {
        article.translatedContent = translatedTexts[index];
      }

      // 更新翻译状态
      article.translatedAt = new Date();
      article.sourceLanguage = sourceLanguage;
      article.translationRetries = 0; // 重置重试次数
      article.lastTranslationError = null; // 清除错误信息

      // 保存更新后的文章
      await this.articleRepository.save(article);
    } catch (error) {
      // 更新翻译错误状态
      article.translationRetries = (article.translationRetries || 0) + 1;
      article.lastTranslationError = error.message;
      await this.articleRepository.save(article);

      // 抛出错误以便上层处理
      throw error;
    }
  }
}
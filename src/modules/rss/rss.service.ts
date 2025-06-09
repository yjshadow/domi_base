import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, Connection } from 'typeorm';
import { RssSource } from './entities/rss-source.entity';
import { FetchProgress } from './entities/fetch-progress.entity';
import { Article } from '../subscription/models/article.entity';
import { CreateRssSourceDto } from './dto/create-rss-source.dto';
import { UpdateRssSourceDto } from './dto/update-rss-source.dto';
import { BaseTranslationService } from '../translation/translation.service';
import { ArticlePurifierService } from './services/article-purifier.service';
import { PurifyOptionsDto } from './dto/purify-options.dto';
import * as Parser from 'rss-parser';
import axios from 'axios';
import * as cheerio from 'cheerio';

@Injectable()
export class RssService {
  private readonly logger = new Logger(RssService.name);
  private readonly parser: Parser;
  private readonly MAX_RETRY_COUNT = 3;
  private readonly RETRY_DELAY = 30 * 60 * 1000; // 30分钟

  private defaultPurifyOptions: PurifyOptionsDto = {
    extractTitle: true,
    extractDescription: true,
    extractAuthor: false,
    extractPublishDate: true,
    extractContent: true,
    contentSelector: 'article, .post-content, .article-content, .content',
  };

  constructor(
    @InjectRepository(RssSource)
    private rssSourceRepository: Repository<RssSource>,
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
    @InjectRepository(FetchProgress)
    private progressRepository: Repository<FetchProgress>,
    private translationService: BaseTranslationService,
    private articlePurifierService: ArticlePurifierService,
    private connection: Connection,
  ) {
    this.parser = new Parser({
      customFields: {
        item: [
          ['content:encoded', 'contentEncoded'],
          ['description', 'description'],
        ],
      },
    });
  }

  // RSS源管理
  async createSource(createRssSourceDto: CreateRssSourceDto): Promise<RssSource> {
    const source = this.rssSourceRepository.create(createRssSourceDto);
    await this.rssSourceRepository.save(source);
    // 创建后立即获取文章
    await this.fetchArticles(source);
    return source;
  }

  async updateSource(
    id: number,
    updateRssSourceDto: UpdateRssSourceDto,
  ): Promise<RssSource> {
    const source = await this.rssSourceRepository.findOne({ where: { id } });
    if (!source) {
      throw new NotFoundException(`RSS source #${id} not found`);
    }

    Object.assign(source, updateRssSourceDto);
    return this.rssSourceRepository.save(source);
  }

  async deleteSource(id: number): Promise<void> {
    const result = await this.rssSourceRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`RSS source #${id} not found`);
    }
  }

  async getSource(id: number): Promise<RssSource> {
    const source = await this.rssSourceRepository.findOne({ where: { id } });
    if (!source) {
      throw new NotFoundException(`RSS source #${id} not found`);
    }
    return source;
  }

  async getAllSources(): Promise<RssSource[]> {
    return this.rssSourceRepository.find();
  }

  // 文章获取和处理
  async fetchArticles(source: RssSource, forceRefresh = false): Promise<void> {
    const BATCH_SIZE = 50; // 限制每批处理的文章数量

    try {
      // 获取或创建进度记录
      let progress = await this.progressRepository.findOne({
        where: { sourceId: source.id, isCompleted: false },
      });

      if (!progress || forceRefresh) {
        // 如果没有进度记录或强制刷新，创建新的进度记录
        progress = this.progressRepository.create({
          sourceId: source.id,
          processedCount: 0,
          totalCount: 0,
          isCompleted: false,
          failedItems: [],
        });
        await this.progressRepository.save(progress);
      }

      // 获取RSS Feed
      const feed = await this.parser.parseURL(source.url);
      const items = feed.items.slice(0, BATCH_SIZE); // 只处理最新的50篇文章
      
      // 更新进度记录的总数
      progress.totalCount = items.length;
      await this.progressRepository.save(progress);

      // 处理失败的项目（如果有）
      await this.retryFailedItems(source, progress);

      // 使用事务处理整批文章
      await this.connection.transaction(async (entityManager) => {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const itemGuid = item.guid || item.link;
          
          // 如果有上次处理的项目，跳过直到找到该项目
          if (progress.lastProcessedItem && progress.processedCount > 0) {
            if (progress.lastProcessedItem.guid === itemGuid) {
              // 找到上次处理的项目，从下一个开始
              progress.lastProcessedItem = null;
              continue;
            }
            
            if (progress.lastProcessedItem) {
              // 还没找到上次处理的项目，继续跳过
              continue;
            }
          }

          try {
            // 检查文章是否已存在
            const existingArticle = await entityManager.findOne(Article, {
              where: { guid: itemGuid },
            });

            if (!existingArticle) {
              const article = new Article();
              article.subscriptionId = source.id;
              article.title = item.title;
              article.translatedDescription = item.description;
              article.content = item.contentEncoded || item.content;
              article.link = item.link;
              article.guid = itemGuid;
              article.author = item.creator || item.author;
              article.publishedAt = new Date(item.pubDate || item.isoDate);
              article.categories = item.categories;

              // 如果配置了自定义选择器，使用它来提取内容
              if (source.custom_selector && article.link) {
                try {
                  const fullContent = await this.fetchFullContent(
                    article.link,
                    source.custom_selector,
                  );
                  if (fullContent) {
                    article.content = fullContent;
                  }
                } catch (error) {
                  this.logger.error(
                    `Error fetching full content for ${article.link}: ${error.message}`,
                  );
                  // 不抛出错误，继续处理其他内容
                }
              }

              // 翻译文章（在事务中处理）
              try {
                const [translatedTitle, translatedContent, translatedDesc] = await Promise.all([
                  this.translationService.translate(article.title, 'auto', 'zh'),
                  article.content ? this.translationService.translate(article.content, 'auto', 'zh') : Promise.resolve(null),
                  article.translatedDescription ? this.translationService.translate(article.translatedDescription, 'auto', 'zh') : Promise.resolve(null)
                ]);

                article.translatedTitle = translatedTitle;
                if (translatedContent) article.translatedContent = translatedContent;
                if (translatedDesc) article.translatedDescription = translatedDesc;
              } catch (error) {
                this.logger.error(
                  `Error translating article ${article.title}: ${error.message}`,
                );
                
                // 记录失败的项目，以便稍后重试
                this.addFailedItem(progress, itemGuid, error.message);
                await this.progressRepository.save(progress);
                
                // 继续处理下一个项目，而不是抛出错误
                continue;
              }

              await entityManager.save(Article, article);
            }

            // 更新进度
            progress.processedCount++;
            progress.lastProcessedItem = {
              guid: itemGuid,
              publishDate: item.pubDate || item.isoDate,
            };
            await entityManager.save(FetchProgress, progress);
          } catch (error) {
            // 记录失败的项目，以便稍后重试
            this.addFailedItem(progress, itemGuid, error.message);
            await entityManager.save(FetchProgress, progress);
            
            this.logger.error(
              `Error processing item ${itemGuid}: ${error.message}`,
              error.stack,
            );
            
            // 继续处理下一个项目，而不是抛出错误
            continue;
          }
        }

        // 如果所有项目都已处理，标记为完成
        if (progress.processedCount >= progress.totalCount && progress.failedItems.length === 0) {
          progress.isCompleted = true;
          await entityManager.save(FetchProgress, progress);
        }

        // 更新源的最后获取时间和错误计数（在同一事务中）
        source.last_fetch_time = new Date();
        source.error_count = progress.failedItems.length;
        source.last_error = progress.failedItems.length > 0 
          ? `${progress.failedItems.length} items failed to process` 
          : null;
        await entityManager.save(RssSource, source);
      });
    } catch (error) {
      this.logger.error(`Error processing RSS feed: ${error.message}`);
      
      // 更新源的错误信息（在事务外，确保错误状态被记录）
      source.error_count += 1;
      source.last_error = error.message;
      await this.rssSourceRepository.save(source);
      
      // 更新进度记录
      const progress = await this.progressRepository.findOne({
        where: { sourceId: source.id, isCompleted: false },
      });
      
      if (progress) {
        progress.lastError = error.message;
        await this.progressRepository.save(progress);
      }
      
      throw error;
    }
  }

  // 重试失败的项目
  private async retryFailedItems(source: RssSource, progress: FetchProgress): Promise<void> {
    if (!progress.failedItems || progress.failedItems.length === 0) {
      return;
    }

    const now = new Date();
    const itemsToRetry = progress.failedItems.filter(item => {
      const lastRetry = new Date(item.lastRetry);
      const timeSinceLastRetry = now.getTime() - lastRetry.getTime();
      return item.retryCount < this.MAX_RETRY_COUNT && timeSinceLastRetry >= this.RETRY_DELAY;
    });

    if (itemsToRetry.length === 0) {
      return;
    }

    // 获取RSS Feed以找到要重试的项目
    const feed = await this.parser.parseURL(source.url);
    
    for (const failedItem of itemsToRetry) {
      const feedItem = feed.items.find(item => (item.guid || item.link) === failedItem.guid);
      
      if (!feedItem) {
        // 如果在Feed中找不到该项目，从失败列表中移除
        progress.failedItems = progress.failedItems.filter(
          item => item.guid !== failedItem.guid
        );
        continue;
      }

      try {
        await this.connection.transaction(async (entityManager) => {
          // 检查文章是否已存在
          const existingArticle = await entityManager.findOne(Article, {
            where: { guid: failedItem.guid },
          });

          if (!existingArticle) {
            const article = new Article();
            article.subscriptionId = source.id;
            article.title = feedItem.title;
            article.translatedDescription = feedItem.description;
            article.content = feedItem.contentEncoded || feedItem.content;
            article.link = feedItem.link;
            article.guid = failedItem.guid;
            article.author = feedItem.creator || feedItem.author;
            article.publishedAt = new Date(feedItem.pubDate || feedItem.isoDate);
            article.categories = feedItem.categories;

            // 如果配置了自定义选择器，使用它来提取内容
            if (source.custom_selector && article.link) {
              try {
                const fullContent = await this.fetchFullContent(
                  article.link,
                  source.custom_selector,
                );
                if (fullContent) {
                  article.content = fullContent;
                }
              } catch (error) {
                this.logger.error(
                  `Error fetching full content for ${article.link}: ${error.message}`,
                );
              }
            }

            // 翻译文章
            const [translatedTitle, translatedContent, translatedDesc] = await Promise.all([
              this.translationService.translate(article.title, 'auto', 'zh'),
              article.content ? this.translationService.translate(article.content, 'auto', 'zh') : Promise.resolve(null),
              article.translatedDescription ? this.translationService.translate(article.translatedDescription, 'auto', 'zh') : Promise.resolve(null)
            ]);

            article.translatedTitle = translatedTitle;
            if (translatedContent) article.translatedContent = translatedContent;
            if (translatedDesc) article.translatedDescription = translatedDesc;

            await entityManager.save(Article, article);
            
            // 从失败列表中移除
            progress.failedItems = progress.failedItems.filter(
              item => item.guid !== failedItem.guid
            );
            progress.processedCount++;
          }
        });
      } catch (error) {
        // 更新重试计数和时间
        failedItem.retryCount++;
        failedItem.lastRetry = new Date().toISOString();
        failedItem.error = error.message;
        
        this.logger.error(
          `Retry failed for item ${failedItem.guid}: ${error.message}`,
          error.stack,
        );
      }
    }

    // 保存更新后的进度
    await this.progressRepository.save(progress);
  }

  // 添加失败的项目到进度记录
  private addFailedItem(progress: FetchProgress, guid: string, error: string): void {
    if (!progress.failedItems) {
      progress.failedItems = [];
    }
    
    // 检查是否已存在
    const existingItem = progress.failedItems.find(item => item.guid === guid);
    
    if (existingItem) {
      existingItem.retryCount++;
      existingItem.lastRetry = new Date().toISOString();
      existingItem.error = error;
    } else {
      progress.failedItems.push({
        guid,
        error,
        retryCount: 0,
        lastRetry: new Date().toISOString(),
      });
    }
  }

  // 获取完整文章内容
  private async fetchFullContent(
    url: string,
    selector: string,
  ): Promise<string | null> {
    try {
      const response = await axios.get(url);
      const purifyOptions = { ...this.defaultPurifyOptions };
      if (selector) {
        purifyOptions.contentSelector = selector;
      }
      
      const purified = this.articlePurifierService.purifyArticle(
        response.data,
        purifyOptions
      );
      
      return purified.content || null;
    } catch (error) {
      this.logger.error(`Error fetching content from ${url}: ${error.message}`);
      return null;
    }
  }

  // 文章管理
  async getArticles(
    sourceId?: number,
    page = 1,
    limit = 20,
    isRead?: boolean,
    isFavorite?: boolean,
  ): Promise<[Article[], number]> {
    const query = this.articleRepository.createQueryBuilder('article');

    if (sourceId) {
      query.where('article.subscriptionId = :sourceId', { sourceId });
    }

    if (isRead !== undefined) {
      query.andWhere('article.isRead = :isRead', { isRead });
    }

    if (isFavorite !== undefined) {
      query.andWhere('article.isFavorite = :isFavorite', { isFavorite });
    }

    query
      .orderBy('article.publishedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    return query.getManyAndCount();
  }

  async markArticleAsRead(id: number, isRead: boolean): Promise<Article> {
    const article = await this.articleRepository.findOne({ where: { id } });
    if (!article) {
      throw new NotFoundException(`Article #${id} not found`);
    }

    article.isRead = isRead;
    return this.articleRepository.save(article);
  }

  async toggleArticleFavorite(id: number): Promise<Article> {
    const article = await this.articleRepository.findOne({ where: { id } });
    if (!article) {
      throw new NotFoundException(`Article #${id} not found`);
    }

    article.isFavorite = !article.isFavorite;
    return this.articleRepository.save(article);
  }

  // 获取进度信息
  async getFetchProgress(sourceId: number): Promise<FetchProgress> {
    const progress = await this.progressRepository.findOne({
      where: { sourceId },
      order: { updatedAt: 'DESC' },
    });
    
    if (!progress) {
      throw new NotFoundException(`No fetch progress found for source #${sourceId}`);
    }
    
    return progress;
  }

  // 重置进度并强制刷新
  async resetAndRefetch(sourceId: number): Promise<void> {
    const source = await this.rssSourceRepository.findOne({ where: { id: sourceId } });
    if (!source) {
      throw new NotFoundException(`RSS source #${sourceId} not found`);
    }
    
    // 删除现有的进度记录
    await this.progressRepository.delete({ sourceId });
    
    // 强制刷新
    await this.fetchArticles(source, true);
  }

  // 定时任务相关
  async updateAllActiveSources(): Promise<void> {
    const sources = await this.rssSourceRepository.find({
      where: { active: true },
    });

    for (const source of sources) {
      const now = new Date();
      const lastFetch = source.last_fetch_time || new Date(0);
      const minutesSinceLastFetch = Math.floor(
        (now.getTime() - lastFetch.getTime()) / (1000 * 60),
      );

      if (minutesSinceLastFetch >= source.update_interval) {
        try {
          await this.fetchArticles(source);
        } catch (error) {
          this.logger.error(
            `Error updating source ${source.name}: ${error.message}`,
          );
        }
      }
    }
  }
}
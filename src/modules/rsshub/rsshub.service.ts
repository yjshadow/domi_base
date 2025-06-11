
import { RssArticle } from  './entities/rss-article.entity';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, Connection } from 'typeorm';
import { RssSource } from './entities/rss-source.entity';
import { FetchProgress } from   './entities/fetch-progress.entity';
import { CreateRssSourceDto } from '../rsshub/dto/create-rss-source.dto';
import { ArticlePurifierService } from  './services/article-purifier.service';
import { PurifyOptionsDto } from '../rsshub/dto/purify-options.dto';
import * as Parser from 'rss-parser';
import axios from 'axios';

@Injectable()
export class RsshubService {
    private readonly logger = new Logger(RsshubService.name); 
    
    private readonly parser: Parser; 
    private readonly MAX_RETRY_COUNT = 3;
    private readonly RETRY_DELAY = 30 * 60 * 1000; // 30分钟

     private defaultPurifyOptions: PurifyOptionsDto = {
        extractTitle: true,
        extractDescription: true,
        extractAuthor: false,
        extractPublishDate: true,
        extractContent: false,
        contentSelector: 'rssArticle, .post-content, .rssArticle-content, .content',
      };

    constructor(
    @InjectRepository(RssSource)
    private readonly rssSourceRepository: Repository<RssSource>,
    @InjectRepository(RssArticle)
    private readonly articleRepository: Repository<RssArticle>,
    private readonly articlePurifierService: ArticlePurifierService,
    @InjectRepository(FetchProgress)
    private progressRepository: Repository<FetchProgress>,
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

    /**
       * RSS源管理
       * 创建新的RSS订阅源
       * @param createRssSourceDto RSS源创建参数
       * @returns 创建的RSS源实体
       */
      async createSource(createRssSourceDto: CreateRssSourceDto): Promise<RssSource> {
        const source = this.rssSourceRepository.create(createRssSourceDto);
        await this.rssSourceRepository.save(source);
        // 创建后立即获取文章
        //await this.fetchArticles(source);
        return source;
      }

      async getSourceById(id: number): Promise<RssSource> {
        return this.rssSourceRepository.findOne({where: {id}});
      }

      /**
        * 文章获取和处理
        * 从RSS源获取文章并进行处理（翻译、内容提取等）
        * @param source RSS源实体
        * @param forceRefresh 是否强制刷新，忽略现有进度
        * @throws 当RSS解析或处理过程中出错时抛出异常
        */
       async fetchArticles(source: RssSource, forceRefresh = false): Promise<any> {
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
              
                    console.log(i+'>>>>>1111111111111111111111111>>>>>>');
                  
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
               console.log(i+'>>>>>2222222222222222222222222222222222222>>>>>>');
               try {
                 // 检查文章是否已存在
                 const existingArticle = await entityManager.findOne(RssArticle, {
                   where: { guid: itemGuid },
                 });
                 console.log(i+'>>>>>33333333333333333333333333333333333333333>>>>>>');
                 if (!existingArticle) {
                   const rssArticle = new RssArticle();
                   rssArticle.source_id = source.id;
                   rssArticle.title = await this.articlePurifierService.cleanHtml(item.title);
                   rssArticle.description = await this.articlePurifierService.cleanHtml(item.description);
                   rssArticle.content = await this.articlePurifierService.cleanHtml(item.contentEncoded || item.content);
                   rssArticle.link = item.link;
                   rssArticle.guid = itemGuid;
                   rssArticle.author = item.creator || item.author;
                   rssArticle.pub_date = new Date(item.pubDate || item.isoDate);
                   rssArticle.categories = item.categories;
                   
                   // 如果配置了自定义选择器，使用它来提取内容
                  
     
                   // 翻译文章（在事务中处理）
                   // try {
                   //   const [translatedTitle, translatedContent, translatedDesc] = await Promise.all([
                   //     this.translationService.translate(rssArticle.title, 'auto', 'zh'),
                   //     rssArticle.content ? this.translationService.translate(rssArticle.content, 'auto', 'zh') : Promise.resolve(null),
                   //     rssArticle.translatedDescription ? this.translationService.translate(rssArticle.translatedDescription, 'auto', 'zh') : Promise.resolve(null)
                   //   ]);
     
                   //   rssArticle.translatedTitle = translatedTitle;
                   //   if (translatedContent) rssArticle.translatedContent = translatedContent;
                   //   if (translatedDesc) rssArticle.translatedDescription = translatedDesc;
                   // } catch (error) {
                   //   this.logger.error(
                   //     `Error translating rssArticle ${rssArticle.title}: ${error.message}`,
                   //   );
                     
                   //   // 记录失败的项目，以便稍后重试
                   //   this.addFailedItem(progress, itemGuid, error.message);
                   //   await this.progressRepository.save(progress);
                     
                   //   // 继续处理下一个项目，而不是抛出错误
                   //   continue;
                   // }
                  
                  console.log(i+'>>>>>44444444444444444444444444444444444444>>>>>>');
                  
                   await entityManager.save(RssArticle, rssArticle);
                   console.log(items.length);
                   console.log(i);
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
     
       /**
        * 重试失败的项目
        * 根据重试策略尝试重新处理之前失败的文章项目
        * @param source RSS源实体
        * @param progress 当前的获取进度记录
        */
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
               const existingArticle = await entityManager.findOne(RssArticle, {
                 where: { guid: failedItem.guid },
               });
     
               if (!existingArticle) {
                 const rssArticle = new RssArticle();
                 rssArticle.source_id = source.id;
                 rssArticle.title = await this.articlePurifierService.cleanHtml(feedItem.title);
                 rssArticle.description = await this.articlePurifierService.cleanHtml(feedItem.description);
                 rssArticle.content = await this.articlePurifierService.cleanHtml(feedItem.contentEncoded || feedItem.content);
                 rssArticle.link = feedItem.link;
                 rssArticle.guid = failedItem.guid;
                 rssArticle.author = feedItem.creator || feedItem.author;
                 rssArticle.pub_date = new Date(feedItem.pubDate || feedItem.isoDate);
                 rssArticle.categories = feedItem.categories;
                
                 // 如果配置了自定义选择器，使用它来提取内容
                
     
                 // 翻译文章
                 // const [translatedTitle, translatedContent, translatedDesc] = await Promise.all([
                 //   this.translationService.translate(rssArticle.title, 'auto', 'zh'),
                 //   rssArticle.content ? this.translationService.translate(rssArticle.content, 'auto', 'zh') : Promise.resolve(null),
                 //   rssArticle.translatedDescription ? this.translationService.translate(rssArticle.translatedDescription, 'auto', 'zh') : Promise.resolve(null)
                 // ]);
     
                 // rssArticle.translatedTitle = translatedTitle;
                 // if (translatedContent) rssArticle.translatedContent = translatedContent;
                 // if (translatedDesc) rssArticle.translatedDescription = translatedDesc;
                 console.log(rssArticle);
                 await entityManager.save(RssArticle, rssArticle);
                 
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
     
       /**
        * 添加失败的项目到进度记录
        * 记录处理失败的文章信息，以便后续重试
        * @param progress 当前的获取进度记录
        * @param guid 文章的唯一标识符
        * @param error 错误信息
        */
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
     
       /**
        * 获取完整文章内容
        * 通过访问原文链接并使用选择器提取完整内容
        * @param url 文章URL
        * @param selector CSS选择器，用于提取内容
        * @returns 提取的文章内容或null（如果提取失败）
        */
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
     
}
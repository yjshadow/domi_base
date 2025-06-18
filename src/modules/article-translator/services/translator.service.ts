import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TranslateOptionsDto } from '../dto/translate-options.dto';
import axios from 'axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { TranslationTask } from '../dto/translation-result.dto';

interface TranslationResult {
  [key: string]: string;
}

interface CachedTranslation {
  key: string;
  originalText: string;
  targetLanguages: string[];
  translations: TranslationResult;
  createdAt: Date;
}

@Injectable()
export class TranslatorService {
  private readonly logger = new Logger(TranslatorService.name);
  private readonly apiKey: string;
  private readonly apiEndpoint: string;
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24小时缓存过期时间
  private readonly CACHE_KEY_SET = 'translation_cache_keys';

  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectQueue('translation') private translationQueue: Queue,
  ) {
    this.apiKey = this.configService.get<string>('DEEPSEEK_API_KEY','sk-0e21698c156a431b8f99f68b791a340a');
    this.apiEndpoint = this.configService.get<string>('DEEPSEEK_API_ENDPOINT', 'https://api.deepseek.com/v1/chat/completions');
  }

  /**
   * 将文本翻译成多种目标语言
   * @param text 要翻译的文本
   * @param options 翻译选项
   * @returns 包含各语言翻译结果的对象
   */
  async translateText(text: string, options: TranslateOptionsDto): Promise<TranslationResult> {
    try {
      const cacheKey = this.generateCacheKey(text, options.targetLanguages);
      
      // 如果启用缓存且缓存中存在结果，则直接返回缓存的结果
      if (options.useCache) {
        const cachedData = await this.cacheManager.get<CachedTranslation>(cacheKey);
        if (cachedData) {
          this.logger.debug('Using cached translation result');
          return cachedData.translations;
        }
      }

      // 如果是异步处理，则将翻译任务加入队列
      if (options.async) {
        this.queueTranslation(text, options);
        return { status: 'queued', message: 'Translation task has been queued' } as any;
      }

      const results: TranslationResult = {};
      
      // 并行处理所有语言的翻译
      await Promise.all(
        options.targetLanguages.map(async (targetLang) => {
          try {
            results[targetLang] = await this.translateToLanguage(text, targetLang);
          } catch (error) {
            this.logger.error(`Failed to translate to ${targetLang}: ${error.message}`);
            results[targetLang] = text; // 降级方案：使用原文
          }
        })
      );

      // 缓存翻译结果
      if (options.useCache) {
        const cachedTranslation: CachedTranslation = {
          key: cacheKey,
          originalText: text,
          targetLanguages: options.targetLanguages,
          translations: results,
          createdAt: new Date(),
        };
        
        this.logger.debug(`Caching translation with key: ${cacheKey}`);
        await this.cacheManager.set(cacheKey, cachedTranslation, this.CACHE_TTL);
        
        // 将缓存键添加到缓存键集合中
        const cacheKeys = await this.getCacheKeys();
        this.logger.debug(`Current cache keys: ${JSON.stringify(cacheKeys)}`);
        
        if (!cacheKeys.includes(cacheKey)) {
          cacheKeys.push(cacheKey);
          this.logger.debug(`Adding new cache key: ${cacheKey}`);
          await this.cacheManager.set(this.CACHE_KEY_SET, cacheKeys, 0); // 永不过期
          this.logger.debug(`Updated cache keys: ${JSON.stringify(await this.getCacheKeys())}`);
        }
      }

      return results;
    } catch (error) {
      this.logger.error(`Translation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 将文本翻译成指定的目标语言
   * @param text 要翻译的文本
   * @param targetLang 目标语言代码
   * @returns 翻译后的文本
   */
  async translateToLanguage(text: string, targetLang: string): Promise<string> {
    if (!text?.trim()) {
      return text;
    }

    try {
      const response = await axios.post(
        this.apiEndpoint,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `你是一个专业的翻译助手。请将以下文本翻译成${this.getLanguageName(targetLang)}。保持原文的语气和风格，确保翻译准确、自然。直接输出翻译结果，不要添加任何解释或标记。`
            },
            {
              role: 'user',
              content: text
            }
          ],
          temperature: 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const translatedText = response.data.choices[0]?.message?.content?.trim();
      
      if (!translatedText) {
        throw new Error('Empty response from translation API');
      }

      return translatedText;
    } catch (error) {
      this.logger.error(`Translation to ${targetLang} failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * 生成缓存键
   * @param text 原文
   * @param targetLanguages 目标语言列表
   * @returns 缓存键
   */
  private generateCacheKey(text: string, targetLanguages: string[]): string {
    // 确保目标语言是排序的，以保持一致性
    const sortedLanguages = [...targetLanguages].sort();
    
    // 创建一个包含所有相关信息的字符串
    const dataToHash = `${text.trim()}|${sortedLanguages.join(',')}`;
    
    this.logger.debug(`Generating cache key for text: "${text.substring(0, 50)}..." with languages: ${sortedLanguages.join(',')}`);
    
    const hash = require('crypto')
      .createHash('md5')
      .update(dataToHash)
      .digest('hex');
    
    const cacheKey = `translation:${hash}`;
    this.logger.debug(`Generated cache key: ${cacheKey}`);
    
    return cacheKey;
  }

  /**
   * 获取语言的完整名称
   * @param langCode 语言代码
   * @returns 语言名称
   */
  private getLanguageName(langCode: string): string {
    const languageNames: Record<string, string> = {
      'en': '英语',
      'zh': '中文',
      'ja': '日语',
      'ko': '韩语',
      'es': '西班牙语',
      'fr': '法语',
      'de': '德语',
      'it': '意大利语',
      'ru': '俄语',
      'pt': '葡萄牙语',
    };
    return languageNames[langCode] || langCode;
  }

  /**
   * 将翻译任务加入异步队列
   * @param text 要翻译的文本
   * @param options 翻译选项
   * @returns Promise<void>
   * 
   * 该方法使用 Bull 队列来处理异步翻译任务：
   * 1. 创建一个包含必要信息的任务数据对象
   * 2. 将任务添加到队列中，设置任务选项
   * 3. 记录任务添加的状态
   * 4. 如果出现错误，记录错误并重新抛出
   */
  /**
   * 创建新的翻译任务
   * @param text 要翻译的文本
   * @param to 目标语言
   * @param from 源语言（可选）
   * @returns 任务信息
   */
  async createTranslationTask(text: string, to: string, from?: string): Promise<TranslationTask> {
    try {
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const jobData = {
        taskId,
        text,
        from,
        to,
        timestamp: new Date(),
      };

      const jobOptions = {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: false, // 保留任务记录以便查询状态
        timeout: 5 * 60 * 1000,
        jobId: taskId, // 使用自定义taskId作为jobId
      };

      const job = await this.translationQueue.add('translate', jobData, jobOptions);
      
      const task: TranslationTask = {
        taskId,
        status: 'queued',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 存储任务信息到缓存
      await this.cacheManager.set(`translation_task:${taskId}`, task, 24 * 60 * 60 * 1000);

      this.logger.log(`Translation task created with ID: ${taskId}`);
      
      return task;
    } catch (error) {
      this.logger.error(`Failed to create translation task: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取翻译任务状态
   * @param taskId 任务ID
   * @returns 任务状态信息
   */
  async getTaskStatus(taskId: string): Promise<TranslationTask> {
    try {
      // 从缓存中获取任务信息
      const task = await this.cacheManager.get<TranslationTask>(`translation_task:${taskId}`);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      // 如果任务还在队列中，获取最新进度
      if (task.status === 'queued' || task.status === 'processing') {
        const job = await this.translationQueue.getJob(taskId);
        if (job) {
          const jobState = await job.getState();
          const progress = await job.progress();
          
          task.status = jobState === 'completed' ? 'completed' 
                     : jobState === 'failed' ? 'failed'
                     : jobState === 'active' ? 'processing'
                     : 'queued';
          task.progress = progress || task.progress;
          task.updatedAt = new Date();

          // 更新缓存
          await this.cacheManager.set(`translation_task:${taskId}`, task, 24 * 60 * 60 * 1000);
        }
      }

      return task;
    } catch (error) {
      this.logger.error(`Failed to get task status: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 更新任务状态
   * @param taskId 任务ID
   * @param status 新状态
   * @param progress 进度
   * @param result 翻译结果
   * @param error 错误信息
   */
  async updateTaskStatus(
    taskId: string,
    status: TranslationTask['status'],
    progress: number,
    result?: string,
    error?: string,
  ): Promise<void> {
    try {
      const task = await this.getTaskStatus(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      const updatedTask: TranslationTask = {
        ...task,
        status,
        progress,
        result,
        error,
        updatedAt: new Date(),
      };

      await this.cacheManager.set(`translation_task:${taskId}`, updatedTask, 24 * 60 * 60 * 1000);
      this.logger.debug(`Updated task ${taskId} status to ${status}`);
    } catch (error) {
      this.logger.error(`Failed to update task status: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取所有缓存的翻译键
   * @returns 缓存键数组
   */
  private async getCacheKeys(): Promise<string[]> {
    this.logger.debug('Getting cache keys from cache manager');
    let keys = await this.cacheManager.get<string[]>(this.CACHE_KEY_SET);
    
    if (!keys) {
      this.logger.debug('No cache keys found, initializing empty array');
      keys = [];
      // 初始化缓存键集合
      await this.cacheManager.set(this.CACHE_KEY_SET, keys, 0);
    } else {
      this.logger.debug(`Found ${keys.length} cache keys: ${JSON.stringify(keys)}`);
    }
    
    return keys;
  }

  /**
   * 获取所有缓存的翻译
   * @returns 缓存的翻译数组
   */
  async getAllCachedTranslations(): Promise<CachedTranslation[]> {
    try {
      const keys = await this.getCacheKeys();
      this.logger.debug(`Retrieved ${keys.length} cache keys for translation cache`);
      
      const cachedTranslations: CachedTranslation[] = [];
      const expiredKeys: string[] = [];

      for (const key of keys) {
        try {
          this.logger.debug(`Fetching cached translation with key: ${key}`);
          const cachedTranslation = await this.cacheManager.get<CachedTranslation>(key);
          
          if (cachedTranslation) {
            this.logger.debug(`Found valid cache for key: ${key}`);
            cachedTranslations.push(cachedTranslation);
          } else {
            this.logger.debug(`Cache expired or not found for key: ${key}`);
            expiredKeys.push(key);
          }
        } catch (err) {
          this.logger.error(`Error retrieving cache for key ${key}: ${err.message}`);
          expiredKeys.push(key);
        }
      }

      // 如果有过期的键，从集合中移除它们
      if (expiredKeys.length > 0) {
        this.logger.debug(`Removing ${expiredKeys.length} expired keys from cache key set`);
        const updatedKeys = keys.filter(k => !expiredKeys.includes(k));
        await this.cacheManager.set(this.CACHE_KEY_SET, updatedKeys, 0);
      }

      this.logger.debug(`Returning ${cachedTranslations.length} cached translations`);
      return cachedTranslations;
    } catch (error) {
      this.logger.error(`Failed to get cached translations: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * 清除所有翻译缓存
   * @returns 是否成功清除
   */
  async clearAllTranslationCache(): Promise<boolean> {
    try {
      const keys = await this.getCacheKeys();
      this.logger.debug(`Clearing ${keys.length} translation cache entries`);
      
      // 删除所有缓存项
      let successCount = 0;
      let failCount = 0;
      
      for (const key of keys) {
        try {
          this.logger.debug(`Deleting cache entry: ${key}`);
          await this.cacheManager.del(key);
          successCount++;
        } catch (err) {
          this.logger.error(`Failed to delete cache entry ${key}: ${err.message}`);
          failCount++;
        }
      }
      
      // 清空键集合
      this.logger.debug('Resetting cache key set to empty array');
      await this.cacheManager.set(this.CACHE_KEY_SET, [], 0);
      
      this.logger.log(`Cache clearing completed. Successfully deleted: ${successCount}, Failed: ${failCount}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to clear translation cache: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 将翻译任务加入异步队列
   * @param text 要翻译的文本
   * @param options 翻译选项
   * @returns Promise<void>
   */
  private async queueTranslation(text: string, options: TranslateOptionsDto): Promise<void> {
    try {
      const tasks = await Promise.all(
        options.targetLanguages.map(targetLang =>
          this.createTranslationTask(text, targetLang)
        )
      );
      
      this.logger.log(`Created ${tasks.length} translation tasks`);
    } catch (error) {
      this.logger.error(`Failed to queue translation tasks: ${error.message}`, error.stack);
      throw error;
    }
  }
}
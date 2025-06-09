import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TranslationService } from '../translation.interface';
import { TranslationCacheService } from './translation-cache.service';
import { TranslationRateLimiterService } from './translation-rate-limiter.service';
import { TranslationRetryService } from './translation-retry.service';
import { v2 } from '@google-cloud/translate';

@Injectable()
export class GoogleTranslationService implements TranslationService {
  private readonly translator: v2.Translate;
  private readonly logger = new Logger(GoogleTranslationService.name);
  private readonly targetLanguage: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: TranslationCacheService,
    private readonly rateLimiter: TranslationRateLimiterService,
    private readonly retryService: TranslationRetryService,
  ) {
    const credentials = this.configService.get('GOOGLE_TRANSLATE_CREDENTIALS');
    this.targetLanguage = this.configService.get('TARGET_LANGUAGE', 'zh-CN');

    this.translator = new v2.Translate({
      credentials: JSON.parse(credentials),
    });
  }

  async translate(
    text: string,
    targetLanguage = this.targetLanguage,
    sourceLanguage = 'auto'
  ): Promise<string> {
    if (!text) {
      return '';
    }

    // 检查缓存
    const cacheKey = `${sourceLanguage}-${targetLanguage}-${text}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // 获取限流许可
      await this.rateLimiter.acquire();

      // 使用重试服务包装翻译操作
      const result = await this.retryService.withRetry(
        async () => {
          const [translation] = await this.translator.translate(text, {
            from: sourceLanguage,
            to: targetLanguage,
          });
          return translation;
        },
        `text: ${text.substring(0, 50)}...`, // 日志中只显示前50个字符
      );

      // 缓存结果
      await this.cacheService.set(cacheKey, result);

      return result;
    } catch (error) {
      this.logger.error(
        `Translation failed: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      // 释放限流许可
      this.rateLimiter.release();
    }
  }

  async translateBatch(
    texts: string[],
    targetLanguage = this.targetLanguage,
    sourceLanguage = 'auto'
  ): Promise<string[]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    try {
      await this.rateLimiter.acquire();

      const results = await this.retryService.withRetry(
        async () => {
          const translations = await Promise.all(
            texts.map(text => 
              this.translate(text, targetLanguage, sourceLanguage)
            )
          );
          return translations;
        },
        `batch translation (${texts.length} texts)`,
      );

      return results;
    } catch (error) {
      this.logger.error(
        `Batch translation failed: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      this.rateLimiter.release();
    }
  }

  async detectLanguage(text: string): Promise<string> {
    try {
      await this.rateLimiter.acquire();
      
      const result = await this.retryService.withRetry(
        async () => {
          const [detection] = await this.translator.detect(text);
          return detection.language;
        },
        'language detection',
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Language detection failed: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      this.rateLimiter.release();
    }
  }
}
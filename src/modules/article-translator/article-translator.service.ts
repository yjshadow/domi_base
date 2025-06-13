import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TranslatedArticle } from './entities/translated-article.entity';
import { RssArticle } from '../rsshub/entities/rss-article.entity';
import { TranslationRequestDto } from './dto/translation-request.dto';
import { TranslationResultDto, SingleTranslationResultDto, TranslationDto } from './dto/translation-result.dto';
import { TranslationConfigDto } from './dto/translation-config.dto';
import { TranslationStatsDto } from './dto/translation-stats.dto';
import { ConfigService } from '@nestjs/config';
import { TranslationEngineFactory } from './factories/translation-engine.factory';
import { TranslationEngine, TranslationConfig, TranslationResult } from './interfaces/translation-engine.interface';

@Injectable()
export class ArticleTranslatorService {
  private readonly logger = new Logger(ArticleTranslatorService.name);
  private readonly defaultLanguages: string[] = ['zh'];
  private readonly defaultEngine: string = 'openai';

  constructor(
    @InjectRepository(TranslatedArticle)
    private translatedArticleRepository: Repository<TranslatedArticle>,
    @InjectRepository(RssArticle)
    private rssArticleRepository: Repository<RssArticle>,
    private configService: ConfigService,
    private translationEngineFactory: TranslationEngineFactory,
  ) {
    this.defaultLanguages = this.configService.get<string[]>(
      'DEFAULT_TRANSLATION_LANGUAGES',
      ['zh']
    );
    this.defaultEngine = this.configService.get<string>(
      'DEFAULT_TRANSLATION_ENGINE',
      'openai'
    );
  }

  async translateArticle(
    articleId: number,
    translationRequest: TranslationRequestDto,
  ): Promise<TranslationResultDto> {
    // 查找文章
    const article = await this.rssArticleRepository.findOne({
      where: { id: articleId },
      relations: ['translatedArticle'],
    });

    if (!article) {
      throw new NotFoundException(`Article with ID ${articleId} not found`);
    }

    // 获取或创建翻译记录
    let translatedArticle = article.translatedArticle;
    if (!translatedArticle) {
      translatedArticle = new TranslatedArticle();
      translatedArticle.article = article;
      translatedArticle.originalTitle = article.title;
      translatedArticle.originalContent = article.content;
      
      // 初始化翻译元数据
      translatedArticle.translationMetadata = {
        statistics: {
          totalTranslations: 0,
          languageCounts: {},
          engineUsage: {},
        }
      };
      
      // 检测源语言
      const sourceLanguage = await this.detectLanguage(article.content);
      translatedArticle.sourceLanguage = sourceLanguage;
      translatedArticle.translations = {};
      
      // 设置默认引擎
      const defaultEngine = translationRequest.config?.engine || this.defaultEngine;
      translatedArticle.translationMetadata.defaultEngine = defaultEngine;
    }

    // 确定要翻译的语言
    const languages = translationRequest.languages || this.defaultLanguages;
    const engine = translationRequest.config?.engine || this.defaultEngine;
    
    // 是否强制重新翻译
    const forceTranslate = translationRequest.config?.forceTranslate || false;
    
    // 是否保存到数据库
    const saveToDatabase = translationRequest.config?.saveToDatabase !== false;

    // 净化内容
    const purifyOptions = translationRequest.purifyOptions || {
      removeHtml: true,
      removeExcessWhitespace: true,
    };
    
    const purifiedTitle = this.purifyContent(article.title, purifyOptions);
    const purifiedContent = this.purifyContent(article.content, purifyOptions);

    // 对每种语言进行翻译
    for (const language of languages) {
      // 如果源语言与目标语言相同，则跳过翻译
      if (translatedArticle.sourceLanguage === language) {
        this.logger.log(`Skipping translation for ${language} as it's the same as source language`);
        continue;
      }

      // 如果不是强制翻译且已有该语言的翻译，则跳过
      if (!forceTranslate && translatedArticle.hasTranslation(language)) {
        this.logger.log(`Skipping translation for ${language} as it already exists and forceTranslate is false`);
        continue;
      }

      try {
        // 执行翻译
        const translationResult = await this.performTranslation(
          purifiedTitle,
          purifiedContent,
          language,
          engine,
          translationRequest.config,
        );

        // 更新翻译记录
        translatedArticle.setTranslation(language, {
          title: translationResult.title,
          content: translationResult.content,
          quality: translationResult.quality,
          engine: engine,
          usageInfo: translationResult.usage,
          metadata: translationResult.metadata,
        });
      } catch (error) {
        this.logger.error(`Translation error for language ${language}:`, error);
        throw new BadRequestException(`Translation failed for language ${language}: ${error.message}`);
      }
    }

    // 保存翻译结果
    if (saveToDatabase) {
      await this.translatedArticleRepository.save(translatedArticle);
    }

    // 返回结果
    return this.mapToTranslationResultDto(translatedArticle);
  }

  async getTranslation(
    articleId: number,
    language?: string,
  ): Promise<TranslationResultDto | any> {
    // 查找文章的翻译
    const translatedArticle = await this.translatedArticleRepository.findOne({
      where: { article: { id: articleId } },
    });

    if (!translatedArticle) {
      throw new NotFoundException(`Translation for article with ID ${articleId} not found`);
    }

    // 如果指定了语言，只返回该语言的翻译
    if (language) {
      if (!translatedArticle.translations[language]) {
        throw new NotFoundException(`Translation for language ${language} not found`);
      }
      
      return {
        articleId,
        originalTitle: translatedArticle.originalTitle,
        originalContent: translatedArticle.originalContent,
        sourceLanguage: translatedArticle.sourceLanguage,
        translation: translatedArticle.translations[language],
        language,
      };
    }

    // 否则返回所有翻译
    return this.mapToTranslationResultDto(translatedArticle);
  }

  private async performTranslation(
    title: string,
    content: string,
    targetLanguage: string,
    engineName: string,
    config?: any,
  ): Promise<{ title: string; content: string; quality?: number; usage?: any }> {
    this.logger.log(`Translating to ${targetLanguage} using ${engineName} engine`);
    
    try {
      // 获取翻译引擎
      let translationEngine: TranslationEngine;
      try {
        translationEngine = this.translationEngineFactory.getEngine(engineName);
      } catch (error) {
        this.logger.warn(`Engine ${engineName} not found, using default engine`);
        translationEngine = this.translationEngineFactory.getDefaultEngine();
      }
      
      // 准备翻译配置
      const translationConfig: TranslationConfig = {
        temperature: config?.temperature || 0.3,
        maxTokens: config?.maxTokens,
        model: config?.model,
        retryCount: config?.retryCount || 2,
        retryDelay: config?.retryDelay || 1000,
      };
      
      // 检测源语言（如果未提供）
      const sourceLanguage = config?.sourceLanguage || 
                            await this.detectLanguage(title + "\n" + content.substring(0, 1000));
      
      // 执行翻译
      const result = await translationEngine.translate(
        title,
        content,
        targetLanguage,
        sourceLanguage,
        translationConfig,
      );
      
      return {
        title: result.title,
        content: result.content,
        quality: result.quality,
        usage: result.usage,
      };
    } catch (error) {
      this.logger.error(`Translation error: ${error.message}`, error.stack);
      throw new BadRequestException(`Translation failed: ${error.message}`);
    }
  }

  private async detectLanguage(text: string): Promise<string> {
    try {
      // 使用默认翻译引擎的语言检测功能
      const engine = this.translationEngineFactory.getDefaultEngine();
      return await engine.detectLanguage(text);
    } catch (error) {
      this.logger.warn(`Language detection error: ${error.message}. Using fallback detection.`);
      
      // 简单的语言检测逻辑作为备选
      const hasChineseChars = /[\u4e00-\u9fa5]/.test(text);
      const hasJapaneseChars = /[\u3040-\u30ff]/.test(text);
      const hasKoreanChars = /[\uac00-\ud7af]/.test(text);
      
      if (hasChineseChars && !hasJapaneseChars && !hasKoreanChars) {
        return 'zh';
      } else if (hasJapaneseChars && !hasChineseChars) {
        return 'ja';
      } else if (hasKoreanChars && !hasChineseChars) {
        return 'ko';
      }
      
      // 默认假设为英语
      return 'en';
    }
  }
  
  /**
   * 获取支持的翻译引擎列表
   */
  async getSupportedEngines(): Promise<string[]> {
    return this.translationEngineFactory.getAvailableEngines();
  }

  /**
   * 获取指定引擎支持的语言列表
   * @param engineName 引擎名称
   */
  async getSupportedLanguages(engineName?: string): Promise<string[]> {
    try {
      const engine = engineName 
        ? this.translationEngineFactory.getEngine(engineName)
        : this.translationEngineFactory.getDefaultEngine();
      
      return await engine.getSupportedLanguages();
    } catch (error) {
      this.logger.error(`Failed to get supported languages: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get supported languages: ${error.message}`);
    }
  }

  private purifyContent(content: string, options: any): string {
    let result = content;
    
    // 移除HTML标签
    if (options.removeHtml) {
      result = result.replace(/<[^>]*>/g, '');
    }
    
    // 移除多余空白字符
    if (options.removeExcessWhitespace) {
      result = result.replace(/\s+/g, ' ').trim();
    }
    
    // 移除表情符号
    if (options.removeEmojis) {
      result = result.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    }
    
    // 移除URL链接
    if (options.removeUrls) {
      result = result.replace(/https?:\/\/\S+/g, '');
    }
    
    // 移除话题标签
    if (options.removeHashtags) {
      result = result.replace(/#\w+/g, '');
    }
    
    // 移除提及
    if (options.removeMentions) {
      result = result.replace(/@\w+/g, '');
    }
    
    // 限制内容长度
    if (options.maxLength && result.length > options.maxLength) {
      result = result.substring(0, options.maxLength) + (options.truncationMarker || '...');
    }
    
    return result;
  }

  private mapToTranslationResultDto(entity: TranslatedArticle): TranslationResultDto {
    return {
      articleId: entity.article?.id,
      originalTitle: entity.originalTitle,
      originalContent: entity.originalContent,
      sourceLanguage: entity.sourceLanguage,
      translations: entity.translations,
      translationMetadata: entity.translationMetadata,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  /**
   * 批量翻译文章
   * @param articleIds 文章ID列表
   * @param translationRequest 翻译请求配置
   */
  async batchTranslateArticles(
    articleIds: number[],
    translationRequest: TranslationRequestDto,
  ): Promise<TranslationResultDto[]> {
    const results: TranslationResultDto[] = [];
    const errors: { articleId: number; error: string }[] = [];

    for (const articleId of articleIds) {
      try {
        const result = await this.translateArticle(articleId, translationRequest);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to translate article ${articleId}: ${error.message}`);
        errors.push({ articleId, error: error.message });
      }
    }

    if (errors.length > 0) {
      this.logger.warn(`Batch translation completed with ${errors.length} errors`, { errors });
    }

    return results;
  }

  /**
   * 评估翻译质量
   * @param articleId 文章ID
   * @param language 目标语言
   */
  async evaluateTranslationQuality(
    articleId: number,
    language: string,
  ): Promise<number> {
    const translation = await this.getTranslation(articleId, language);
    if (!translation) {
      throw new NotFoundException(`Translation not found for article ${articleId} in language ${language}`);
    }

    try {
      const engine = this.translationEngineFactory.getDefaultEngine();
      const prompt = `Please evaluate the quality of this translation on a scale of 0-100:
      
Original Title: ${translation.originalTitle}
Translated Title: ${translation.translation.title}

Original Content (first 500 chars): ${translation.originalContent.substring(0, 500)}
Translated Content (first 500 chars): ${translation.translation.content.substring(0, 500)}

Consider:
1. Accuracy of meaning
2. Natural flow in target language
3. Preservation of tone and style
4. Proper handling of technical terms
5. Consistency

Respond with just a number between 0 and 100.`;

      const response = await engine.translate('', prompt, 'en');
      const qualityScore = parseInt(response.content.trim());
      
      if (isNaN(qualityScore) || qualityScore < 0 || qualityScore > 100) {
        return 75; // 默认质量分数
      }

      // 更新翻译质量分数
      const translatedArticle = await this.translatedArticleRepository.findOne({
        where: { article: { id: articleId } },
      });

      if (translatedArticle && translatedArticle.translations[language]) {
        translatedArticle.translations[language].quality = qualityScore;
        await this.translatedArticleRepository.save(translatedArticle);
      }

      return qualityScore;
    } catch (error) {
      this.logger.error(`Failed to evaluate translation quality: ${error.message}`);
      return 75; // 默认质量分数
    }
  }

  /**
   * 获取翻译统计信息
   * @param articleId 文章ID
   */
  async getTranslationStats(articleId: number): Promise<TranslationStatsDto> {
    const translatedArticle = await this.translatedArticleRepository.findOne({
      where: { article: { id: articleId } },
    });

    if (!translatedArticle) {
      throw new NotFoundException(`Translation not found for article ${articleId}`);
    }

    const stats: TranslationStatsDto = {
      totalLanguages: Object.keys(translatedArticle.translations).length,
      averageQuality: 0,
      engineUsage: {},
      lastUpdated: null,
      translationTimes: {},
      errors: []
    };

    let totalQuality = 0;
    let qualityCount = 0;

    for (const [lang, translation] of Object.entries(translatedArticle.translations)) {
      // 计算平均质量
      if (translation.quality) {
        totalQuality += translation.quality;
        qualityCount++;
      }

      // 统计引擎使用
      const engine = translation.engine || this.defaultEngine;
      stats.engineUsage[engine] = (stats.engineUsage[engine] || 0) + 1;

      // 记录最后更新时间
      const updatedAt = translation.updatedAt || translatedArticle.updatedAt;
      if (!stats.lastUpdated || updatedAt > stats.lastUpdated) {
        stats.lastUpdated = updatedAt;
      }

      // 记录翻译时间
      if (translation.usageInfo?.responseTime) {
        stats.translationTimes[lang] = translation.usageInfo.responseTime;
      }

      // 收集错误信息
      if (translation.metadata?.error) {
        stats.errors.push({
          language: lang,
          error: translation.metadata.error
        });
      }
    }

    if (qualityCount > 0) {
      stats.averageQuality = Math.round(totalQuality / qualityCount);
    }

    // 如果没有错误，将 errors 设置为 undefined
    if (stats.errors.length === 0) {
      stats.errors = undefined;
    }

    return stats;
  }
}
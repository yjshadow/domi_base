import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTranslationService, TranslationError } from './translation.service';
import axios from 'axios';

/**
 * 使用 Google Translate API 实现的翻译服务
 */
@Injectable()
export class GoogleTranslationService extends BaseTranslationService {
  private readonly logger: Logger;
  private readonly apiKey: string;
  private readonly baseUrl = 'https://translation.googleapis.com/language/translate/v2';

  constructor(
    private readonly configService: ConfigService,
    @Optional() logger?: Logger,
  ) {
    super();
    this.logger = logger || new Logger(GoogleTranslationService.name);
    
    // 从配置服务获取 API 密钥
    this.apiKey = this.configService.get<string>('GOOGLE_TRANSLATE_API_KEY');
    
    if (!this.apiKey) {
      this.logger.warn(
        'GOOGLE_TRANSLATE_API_KEY not found in configuration. Google translation service will not work properly.',
      );
    }
  }

  /**
   * 使用 Google Translate API 翻译文本
   * @param text 要翻译的文本
   * @param sourceLanguage 源语言代码
   * @param targetLanguage 目标语言代码
   * @returns 翻译后的文本
   */
  async translate(
    text: string,
    targetLanguage = 'zh',
    sourceLanguage = 'auto'
  ): Promise<string> {
    try {
      if (!text || text.trim().length === 0) {
        return '';
      }

      if (!this.apiKey) {
        throw new TranslationError(
          'Google Translate API key is not configured',
          sourceLanguage,
          targetLanguage,
        );
      }

      // 构建请求参数
      const params = {
        q: text,
        target: targetLanguage,
        key: this.apiKey,
      };

      // 如果提供了源语言，添加到请求参数中
      if (sourceLanguage && sourceLanguage !== 'auto') {
        params['source'] = sourceLanguage;
      }

      // 发送翻译请求
      const response = await axios.post(`${this.baseUrl}`, null, {
        params,
      });

      // 检查响应
      if (
        !response.data ||
        !response.data.data ||
        !response.data.data.translations ||
        response.data.data.translations.length === 0
      ) {
        throw new TranslationError(
          'Invalid response from Google Translate API',
          sourceLanguage,
          targetLanguage,
        );
      }

      // 返回翻译结果
      return response.data.data.translations[0].translatedText;
    } catch (error) {
      // 处理 API 错误
      if (error.response) {
        const errorMessage = error.response.data?.error?.message || error.message;
        this.logger.error(
          `Google Translate API error: ${errorMessage}`,
          error.stack,
        );
        throw new TranslationError(
          `Translation failed: ${errorMessage}`,
          sourceLanguage,
          targetLanguage,
          error,
        );
      }

      // 处理其他错误
      this.logger.error(`Translation error: ${error.message}`, error.stack);
      throw new TranslationError(
        `Translation failed: ${error.message}`,
        sourceLanguage,
        targetLanguage,
        error,
      );
    }
  }

  /**
   * 使用 Google Translate API 检测文本语言
   * @param text 要检测的文本
   * @returns 检测到的语言代码
   */
  /**
   * 获取 Google Translate API 支持的语言列表
   * @returns 支持的语言代码数组
   */
  async getSupportedLanguages(): Promise<string[]> {
    try {
      if (!this.apiKey) {
        throw new TranslationError('Google Translate API key is not configured');
      }

      // 构建请求参数
      const params = {
        key: this.apiKey,
      };

      // 发送获取支持语言列表的请求
      const response = await axios.get(
        `${this.baseUrl}/languages`,
        {
          params,
        },
      );

      // 检查响应
      if (
        !response.data ||
        !response.data.data ||
        !response.data.data.languages
      ) {
        throw new TranslationError('Invalid response from Google Translate API');
      }

      // 返回语言代码列表
      return response.data.data.languages.map(lang => lang.language);
    } catch (error) {
      // 处理 API 错误
      if (error.response) {
        const errorMessage = error.response.data?.error?.message || error.message;
        this.logger.error(
          `Google Translate API error: ${errorMessage}`,
          error.stack,
        );
        throw new TranslationError(
          `Failed to get supported languages: ${errorMessage}`,
          undefined,
          undefined,
          error,
        );
      }

      // 处理其他错误
      this.logger.error(`Failed to get supported languages: ${error.message}`, error.stack);
      throw new TranslationError(
        `Failed to get supported languages: ${error.message}`,
        undefined,
        undefined,
        error,
      );
    }
  }

  /**
   * 批量翻译文本
   * @param texts 要翻译的文本数组
   * @param sourceLanguage 源语言代码
   * @param targetLanguage 目标语言代码
   * @returns 翻译后的文本数组
   */
  async translateBatch(
    texts: string[],
    targetLanguage = 'zh',
  ): Promise<string[]> {
    const sourceLanguage = 'auto';
    try {
      if (!texts || texts.length === 0) {
        return [];
      }

      if (!this.apiKey) {
        throw new TranslationError(
          'Google Translate API key is not configured',
          sourceLanguage,
          targetLanguage,
        );
      }

      // 构建请求参数
      const params = {
        q: texts,
        target: targetLanguage,
        key: this.apiKey,
      };

      // 如果提供了源语言，添加到请求参数中
      if (sourceLanguage && sourceLanguage !== 'auto') {
        params['source'] = sourceLanguage;
      }

      // 发送批量翻译请求
      const response = await axios.post(`${this.baseUrl}`, null, {
        params,
      });

      // 检查响应
      if (
        !response.data ||
        !response.data.data ||
        !response.data.data.translations ||
        response.data.data.translations.length === 0
      ) {
        throw new TranslationError(
          'Invalid response from Google Translate API',
          sourceLanguage,
          targetLanguage,
        );
      }

      // 返回翻译结果数组
      return response.data.data.translations.map(t => t.translatedText);
    } catch (error) {
      // 处理 API 错误
      if (error.response) {
        const errorMessage = error.response.data?.error?.message || error.message;
        this.logger.error(
          `Google Translate API error: ${errorMessage}`,
          error.stack,
        );
        throw new TranslationError(
          `Batch translation failed: ${errorMessage}`,
          sourceLanguage,
          targetLanguage,
          error,
        );
      }

      // 处理其他错误
      this.logger.error(`Batch translation error: ${error.message}`, error.stack);
      throw new TranslationError(
        `Batch translation failed: ${error.message}`,
        sourceLanguage,
        targetLanguage,
        error,
      );
    }
  }

  async detectLanguage(text: string): Promise<string> {
    try {
      if (!text || text.trim().length === 0) {
        return '';
      }

      if (!this.apiKey) {
        throw new TranslationError('Google Translate API key is not configured');
      }

      // 构建请求参数
      const params = {
        q: text,
        key: this.apiKey,
      };

      // 发送语言检测请求
      const response = await axios.post(
        `${this.baseUrl}/detect`,
        null,
        {
          params,
        },
      );

      // 检查响应
      if (
        !response.data ||
        !response.data.data ||
        !response.data.data.detections ||
        response.data.data.detections.length === 0 ||
        response.data.data.detections[0].length === 0
      ) {
        throw new TranslationError('Invalid response from Google Translate API');
      }

      // 返回检测到的语言代码
      return response.data.data.detections[0][0].language;
    } catch (error) {
      // 处理 API 错误
      if (error.response) {
        const errorMessage = error.response.data?.error?.message || error.message;
        this.logger.error(
          `Google Translate API error: ${errorMessage}`,
          error.stack,
        );
        throw new TranslationError(
          `Language detection failed: ${errorMessage}`,
          undefined,
          undefined,
          error,
        );
      }

      // 处理其他错误
      this.logger.error(`Language detection error: ${error.message}`, error.stack);
      throw new TranslationError(
        `Language detection failed: ${error.message}`,
        undefined,
        undefined,
        error,
      );
    }
  }
}
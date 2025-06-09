import { Injectable } from '@nestjs/common';

/**
 * 翻译服务的基类，定义了翻译服务需要实现的基本接口
 */
@Injectable()
export abstract class BaseTranslationService {
  /**
   * 翻译单个文本
   * @param text 要翻译的文本
   * @param sourceLanguage 源语言代码
   * @param targetLanguage 目标语言代码
   * @returns 翻译后的文本
   */
  abstract translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<string>;

  /**
   * 批量翻译多个文本
   * @param texts 要翻译的文本数组
   * @param sourceLanguage 源语言代码
   * @param targetLanguage 目标语言代码
   * @returns 翻译后的文本数组
   */
  async translateBatch(
    texts: string[],
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<string[]> {
    try {
      // 过滤掉空文本
      const validTexts = texts.filter(text => text && text.trim().length > 0);
      
      if (validTexts.length === 0) {
        return [];
      }

      // 使用 Promise.all 并行处理多个翻译请求
      const translatedTexts = await Promise.all(
        validTexts.map(text =>
          this.translate(text, sourceLanguage, targetLanguage),
        ),
      );

      return translatedTexts;
    } catch (error) {
      throw new Error(`Batch translation failed: ${error.message}`);
    }
  }

  /**
   * 检测文本的语言
   * @param text 要检测的文本
   * @returns 检测到的语言代码
   */
  abstract detectLanguage(text: string): Promise<string>;

  /**
   * 获取翻译服务支持的语言列表
   * @returns 支持的语言代码数组
   */
  abstract getSupportedLanguages(): Promise<string[]>;
}

/**
 * 翻译错误类
 */
export class TranslationError extends Error {
  constructor(
    message: string,
    public readonly sourceLanguage?: string,
    public readonly targetLanguage?: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'TranslationError';
  }
}
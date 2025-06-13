import { Injectable, Logger } from '@nestjs/common';
import { TranslationConfigDto } from '../dto/translation-config.dto';
import axios from 'axios';

@Injectable()
export class TranslatorService {
  private readonly logger = new Logger(TranslatorService.name);
  private readonly apiKey: string = process.env.DEEPSEEK_API_KEY || '';
  private readonly apiEndpoint: string = 'https://api.deepseek.com/v1/chat/completions';
  
  // 翻译缓存，用于减少重复请求
  private translationCache: Map<string, string> = new Map();
  
  /**
   * 将文本翻译为多种目标语言
   * @param text 要翻译的文本
   * @param targetLanguages 目标语言代码数组
   * @param sourceLanguage 源语言代码（可选，默认自动检测）
   * @param config 翻译配置
   * @returns 包含各语言翻译结果的对象
   */
  async translateText(
    text: string, 
    targetLanguages: string[] = ['en', 'zh', 'ja'], 
    sourceLanguage: string = 'auto',
    config: TranslationConfigDto = new TranslationConfigDto()
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    
    try {
      // 处理空文本
      if (!text || text.trim() === '') {
        targetLanguages.forEach(lang => results[lang] = '');
        return results;
      }
      
      // 如果文本过长，分段处理
      if (text.length > config.maxContentLength) {
        return this.translateLongText(text, targetLanguages, sourceLanguage, config);
      }
      
      // 并行处理所有目标语言的翻译
      await Promise.all(
        targetLanguages.map(async (lang) => {
          try {
            // 生成缓存键
            const cacheKey = `${text}_${sourceLanguage}_${lang}`;
            
            // 检查缓存
            if (config.enableCache && this.translationCache.has(cacheKey)) {
              results[lang] = this.translationCache.get(cacheKey);
              return;
            }
            
            // 调用翻译API
            const translatedText = await this.translateToLanguage(text, lang, sourceLanguage);
            results[lang] = translatedText;
            
            // 更新缓存
            if (config.enableCache) {
              this.translationCache.set(cacheKey, translatedText);
            }
          } catch (error) {
            this.logger.error(`Error translating to ${lang}: ${error.message}`);
            results[lang] = `[Translation Error: ${error.message}]`;
          }
        })
      );
      
      return results;
    } catch (error) {
      this.logger.error(`Translation error: ${error.message}`, error.stack);
      throw new Error(`Failed to translate text: ${error.message}`);
    }
  }
  
  /**
   * 将长文本分段翻译
   */
  private async translateLongText(
    text: string,
    targetLanguages: string[],
    sourceLanguage: string,
    config: TranslationConfigDto
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    targetLanguages.forEach(lang => results[lang] = '');
    
    // 简单的分段策略：按句子分割
    const segments = this.splitTextIntoSegments(text, config.maxContentLength);
    
    // 对每个语言，翻译所有段落并合并
    for (const lang of targetLanguages) {
      let translatedSegments: string[] = [];
      
      for (const segment of segments) {
        try {
          const translatedSegment = await this.translateToLanguage(segment, lang, sourceLanguage);
          translatedSegments.push(translatedSegment);
        } catch (error) {
          this.logger.error(`Error translating segment to ${lang}: ${error.message}`);
          translatedSegments.push(`[Translation Error: ${error.message}]`);
        }
      }
      
      results[lang] = translatedSegments.join(' ');
    }
    
    return results;
  }
  
  /**
   * 将文本分割成较小的段落
   */
  private splitTextIntoSegments(text: string, maxLength: number): string[] {
    const segments: string[] = [];
    
    // 按句子分割（简单实现，可能需要更复杂的逻辑）
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentSegment = '';
    
    for (const sentence of sentences) {
      if (currentSegment.length + sentence.length > maxLength) {
        segments.push(currentSegment);
        currentSegment = sentence;
      } else {
        currentSegment += (currentSegment ? ' ' : '') + sentence;
      }
    }
    
    if (currentSegment) {
      segments.push(currentSegment);
    }
    
    return segments;
  }
  
  /**
   * 将文本翻译为特定语言
   */
  private async translateToLanguage(text: string, targetLang: string, sourceLang: string = 'auto'): Promise<string> {
    try {
      // 构建提示词
      const prompt = this.buildTranslationPrompt(text, targetLang, sourceLang);
      
      // 调用AI模型进行翻译
      const response = await axios.post(
        this.apiEndpoint,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2, // 低温度以获得更准确的翻译
          max_tokens: text.length * 2 // 估算所需token数量
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      
      // 提取翻译结果
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      this.logger.error(`Translation API error: ${error.message}`, error.stack);
      
      // 重试逻辑可以在这里添加
      
      throw new Error(`Translation failed: ${error.message}`);
    }
  }
  
  /**
   * 构建翻译提示词
   */
  private buildTranslationPrompt(text: string, targetLang: string, sourceLang: string): string {
    // 语言代码到全名的映射
    const langNames = {
      'en': 'English',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'fr': 'French',
      'de': 'German',
      'es': 'Spanish',
      'ru': 'Russian',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'auto': 'auto-detected language'
    };
    
    // 获取语言全名
    const targetLanguage = langNames[targetLang] || targetLang;
    const sourceLanguage = langNames[sourceLang] || 'the source language';
    
    // 构建提示词
    let prompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}. `;
    prompt += `Maintain the original meaning, tone, and formatting as much as possible. `;
    prompt += `Only provide the translation, without any explanations or notes.\n\n`;
    prompt += `Text to translate:\n${text}`;
    
    return prompt;
  }
  
  /**
   * 清除翻译缓存
   */
  clearCache(): void {
    this.translationCache.clear();
    this.logger.log('Translation cache cleared');
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TranslationEngine, TranslationConfig, TranslationResult } from '../interfaces/translation-engine.interface';
import axios from 'axios';

@Injectable()
export class OpenAITranslationEngine implements TranslationEngine {
  private readonly logger = new Logger(OpenAITranslationEngine.name);
  private readonly apiKey: string;
  private readonly apiUrl: string = 'https://api.openai.com/v1/chat/completions';
  private readonly supportedLanguages: string[] = [
    'en', 'zh', 'es', 'fr', 'de', 'ru', 'ja', 'ko', 'pt', 'it',
    'nl', 'pl', 'tr', 'ar', 'hi', 'th', 'vi', 'id', 'cs', 'sv'
  ];

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!this.apiKey) {
      this.logger.warn('OPENAI_API_KEY not found in environment variables');
    }
  }

  getName(): string {
    return 'openai';
  }

  getDescription(): string {
    return 'OpenAI GPT translation engine';
  }

  async getSupportedLanguages(): Promise<string[]> {
    return this.supportedLanguages;
  }

  async detectLanguage(text: string): Promise<string> {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a language detection tool. Respond with only the ISO 639-1 language code of the text.'
            },
            {
              role: 'user',
              content: `Detect the language of the following text: "${text.substring(0, 500)}..."`
            }
          ],
          temperature: 0.1,
          max_tokens: 10
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      const detectedLanguage = response.data.choices[0].message.content.trim().toLowerCase();
      return detectedLanguage;
    } catch (error) {
      this.logger.error(`Error detecting language: ${error.message}`);
      throw new Error(`Failed to detect language: ${error.message}`);
    }
  }

  async translate(
    title: string,
    content: string,
    targetLanguage: string,
    sourceLanguage?: string,
    config?: TranslationConfig,
  ): Promise<TranslationResult> {
    // 默认配置
    const defaultConfig: TranslationConfig = {
      temperature: 0.3,
      maxTokens: 4096,
      model: 'gpt-3.5-turbo',
      retryCount: 2,
      retryDelay: 1000,
    };

    // 合并配置
    const finalConfig = { ...defaultConfig, ...config };

    // 如果没有提供源语言，尝试检测
    if (!sourceLanguage) {
      try {
        sourceLanguage = await this.detectLanguage(title + ' ' + content.substring(0, 500));
      } catch (error) {
        this.logger.warn(`Failed to detect language, proceeding without source language: ${error.message}`);
      }
    }

    // 构建提示
    const systemPrompt = this.buildSystemPrompt(targetLanguage, sourceLanguage);
    const userPrompt = this.buildUserPrompt(title, content);

    // 执行翻译
    let attempts = 0;
    let lastError: Error;

    while (attempts <= finalConfig.retryCount) {
      try {
        const startTime = Date.now();
        
        const response = await axios.post(
          this.apiUrl,
          {
            model: finalConfig.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: finalConfig.temperature,
            max_tokens: finalConfig.maxTokens
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`
            }
          }
        );

        const responseTime = Date.now() - startTime;
        const result = this.parseResponse(response.data);
        
        // 添加使用信息
        const usage = {
          tokens: response.data.usage?.total_tokens,
          promptTokens: response.data.usage?.prompt_tokens,
          completionTokens: response.data.usage?.completion_tokens,
          model: finalConfig.model,
          responseTime
        };

        return {
          ...result,
          usage,
          metadata: {
            sourceLanguage,
            targetLanguage,
            timestamp: new Date().toISOString()
          }
        };
      } catch (error) {
        this.logger.warn(`Translation attempt ${attempts + 1} failed: ${error.message}`);
        lastError = error;
        attempts++;
        
        if (attempts <= finalConfig.retryCount) {
          await new Promise(resolve => setTimeout(resolve, finalConfig.retryDelay));
        }
      }
    }

    throw new Error(`Translation failed after ${finalConfig.retryCount + 1} attempts: ${lastError.message}`);
  }

  private buildSystemPrompt(targetLanguage: string, sourceLanguage?: string): string {
    let prompt = `You are a professional translator. Translate the provided title and content `;
    
    if (sourceLanguage) {
      prompt += `from ${sourceLanguage} `;
    }
    
    prompt += `to ${targetLanguage}. 
    
    Maintain the original formatting, including paragraphs, bullet points, and line breaks.
    Preserve HTML tags if present.
    Translate with high accuracy while maintaining the original tone and style.
    
    Respond with a JSON object in the following format:
    {
      "title": "translated title",
      "content": "translated content"
    }
    
    Do not include any explanations or notes outside of the JSON object.`;
    
    return prompt;
  }

  private buildUserPrompt(title: string, content: string): string {
    return `Title: ${title}\n\nContent: ${content}`;
  }

  private parseResponse(response: any): TranslationResult {
    try {
      const content = response.choices[0].message.content.trim();
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Response does not contain valid JSON');
      }
      
      const jsonContent = jsonMatch[0];
      const parsed = JSON.parse(jsonContent);
      
      if (!parsed.title || !parsed.content) {
        throw new Error('Response JSON missing required fields');
      }
      
      return {
        title: parsed.title,
        content: parsed.content,
        quality: 85 // 默认质量评分
      };
    } catch (error) {
      this.logger.error(`Error parsing translation response: ${error.message}`);
      throw new Error(`Failed to parse translation response: ${error.message}`);
    }
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { TranslationEngine, TranslationOptions, TranslationResult } from '../interfaces/translation-engine.interface';
import axios from 'axios';

@Injectable()
export class DeepseekTranslationEngine implements TranslationEngine {
  private readonly logger = new Logger(DeepseekTranslationEngine.name);
  readonly name = 'deepseek';
  readonly supportedLanguages = [
    'en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'it', 'pt', 'ru',
    'ar', 'hi', 'bn', 'id', 'ms', 'th', 'vi', 'nl', 'tr', 'pl'
  ];

  private readonly apiKey: string;
  private readonly apiEndpoint: string;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    this.apiEndpoint = process.env.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions';
    
    if (!this.apiKey) {
      this.logger.warn('DEEPSEEK_API_KEY not set. DeepSeek translation engine will not work properly.');
    }
  }

  async translate(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string,
    options?: TranslationOptions,
  ): Promise<TranslationResult> {
    try {
      const temperature = options?.temperature || 0.2;
      const maxTokens = options?.maxTokens || 4000;
      const retryCount = options?.retryCount || 3;
      const retryDelay = options?.retryDelay || 1000;

      let attempts = 0;
      let lastError: Error;

      while (attempts < retryCount) {
        try {
          const prompt = this.buildTranslationPrompt(text, targetLanguage, sourceLanguage);
          
          const response = await axios.post(
            this.apiEndpoint,
            {
              model: 'deepseek-chat',
              messages: [
                { role: 'system', content: 'You are a professional translator.' },
                { role: 'user', content: prompt }
              ],
              temperature,
              max_tokens: maxTokens,
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
              },
            },
          );

          const translatedText = response.data.choices[0].message.content.trim();
          
          return {
            translatedText,
            sourceLanguage: sourceLanguage || 'auto',
            targetLanguage,
            quality: 0.9,
            metadata: {
              engine: this.name,
              model: 'deepseek-chat',
              promptTokens: response.data.usage.prompt_tokens,
              completionTokens: response.data.usage.completion_tokens,
              totalTokens: response.data.usage.total_tokens,
            },
          };
        } catch (error) {
          lastError = error;
          attempts++;
          
          if (attempts < retryCount) {
            this.logger.warn(`Translation attempt ${attempts} failed. Retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }

      throw lastError;
    } catch (error) {
      this.logger.error(`Translation failed: ${error.message}`, error.stack);
      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  async batchTranslate(
    texts: string[],
    targetLanguage: string,
    sourceLanguage?: string,
    options?: TranslationOptions,
  ): Promise<TranslationResult[]> {
    const results: TranslationResult[] = [];
    
    for (const text of texts) {
      const result = await this.translate(text, targetLanguage, sourceLanguage, options);
      results.push(result);
    }
    
    return results;
  }

  async detectLanguage(text: string): Promise<string> {
    try {
      const prompt = `Detect the language of the following text and respond with only the ISO 639-1 language code (e.g., 'en', 'zh', 'ja', etc.):\n\n${text.substring(0, 500)}`;
      
      const response = await axios.post(
        this.apiEndpoint,
        {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'You are a language detection tool.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 10,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
        },
      );

      const languageCode = response.data.choices[0].message.content.trim().toLowerCase();
      return languageCode;
    } catch (error) {
      this.logger.error(`Language detection failed: ${error.message}`, error.stack);
      throw new Error(`Language detection failed: ${error.message}`);
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  private buildTranslationPrompt(text: string, targetLanguage: string, sourceLanguage?: string): string {
    const languageNames = {
      'en': 'English',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'fr': 'French',
      'de': 'German',
      'es': 'Spanish',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'bn': 'Bengali',
      'id': 'Indonesian',
      'ms': 'Malay',
      'th': 'Thai',
      'vi': 'Vietnamese',
      'nl': 'Dutch',
      'tr': 'Turkish',
      'pl': 'Polish',
    };

    const targetLanguageName = languageNames[targetLanguage] || targetLanguage;
    const sourceLanguageName = sourceLanguage ? (languageNames[sourceLanguage] || sourceLanguage) : 'the original language';

    return `Translate the following text from ${sourceLanguageName} to ${targetLanguageName}. 
Maintain the original meaning, tone, and style as much as possible. 
Preserve formatting elements like paragraphs, bullet points, and emphasis.
Only return the translated text without explanations or notes.

Text to translate:
${text}`;
  }
}
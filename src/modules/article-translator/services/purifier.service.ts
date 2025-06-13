import { Injectable, Logger } from '@nestjs/common';
import { PurifyOptionsDto } from '../dto/purify-options.dto';
import axios from 'axios';

@Injectable()
export class PurifierService {
  private readonly logger = new Logger(PurifierService.name);
  private readonly apiKey: string = process.env.DEEPSEEK_API_KEY || '';
  private readonly apiEndpoint: string = 'https://api.deepseek.com/v1/chat/completions';

  /**
   * 提炼文本，保持核心语义但减少冗余信息
   * @param text 原始文本
   * @param options 提炼选项
   * @returns 提炼后的文本
   */
  async purifyText(text: string, options: PurifyOptionsDto = new PurifyOptionsDto()): Promise<string> {
    try {
      // 如果文本太短，不需要提炼
      if (text.length <= options.maxLength) {
        return text;
      }

      // 构建提示词
      const prompt = this.buildPrompt(text, options);
      
      // 调用AI模型进行文本提炼
      const purifiedText = await this.callAiModel(prompt, options);
      
      return purifiedText;
    } catch (error) {
      this.logger.error(`Error purifying text: ${error.message}`, error.stack);
      // 如果提炼失败，返回截断的原始文本作为降级方案
      return text.substring(0, options.maxLength);
    }
  }

  /**
   * 构建发送给AI模型的提示词
   */
  private buildPrompt(text: string, options: PurifyOptionsDto): string {
    let prompt = `请提炼以下文本的核心内容，保持主要语义，但使总长度不超过${options.maxLength}个字符：\n\n${text}\n\n`;
    
    if (options.keepKeyPoints) {
      prompt += '请确保保留所有关键点和重要信息。';
    }
    
    if (options.removeRedundancy) {
      prompt += '请移除所有冗余和重复的信息。';
    }
    
    if (options.enhanceReadability) {
      prompt += '请提高文本的可读性和流畅度。';
    }
    
    if (options.preserveFormatting) {
      prompt += '请尽量保持原文的格式结构。';
    }
    
    return prompt;
  }

  /**
   * 调用AI模型进行文本提炼
   */
  private async callAiModel(prompt: string, options: PurifyOptionsDto): Promise<string> {
    try {
      // 使用DeepSeek API
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
          temperature: 0.3, // 较低的温度以获得更确定性的输出
          max_tokens: Math.ceil(options.maxLength / 2) // 估算token数量
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      // 提取AI回复的文本
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      this.logger.error(`Error calling AI model: ${error.message}`, error.stack);
      throw new Error(`Failed to purify text: ${error.message}`);
    }
  }

  /**
   * 清理HTML标签，保留纯文本
   */
  cleanHtml(html: string): string {
    if (!html) return '';
    // 简单的HTML标签清理
    return html
      .replace(/<[^>]*>/g, ' ') // 替换HTML标签为空格
      .replace(/\s+/g, ' ')     // 合并多个空格
      .trim();                  // 去除首尾空格
  }
}
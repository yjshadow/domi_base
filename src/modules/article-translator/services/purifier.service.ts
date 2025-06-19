import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PurifyOptionsDto } from '../dto/purify-options.dto';
import axios from 'axios';

@Injectable()
export class PurifierService {
  private readonly logger = new Logger(PurifierService.name);
  private readonly apiKey: string;
  private readonly apiEndpoint: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DEEPSEEK_API_KEY', 'sk-0e21698c156a431b8f99f68b791a340a');
    this.apiEndpoint = this.configService.get<string>('DEEPSEEK_API_ENDPOINT', 'https://api.deepseek.com/v1/chat/completions');
  }

  /**
   * 提炼文本内容，压缩冗余信息，保持核心语义
   * @param content 原始文本内容
   * @param options 提炼选项
   * @returns 提炼后的文本内容
   */
  async purifyText(content: string, options: PurifyOptionsDto): Promise<string> {
    try {
      // 首先进行基本的文本清理
      let purifiedText = this.basicTextCleaning(content, options);
      // 如果启用了AI提炼，则调用AI模型进行进一步提炼
      if (options.useAiPurification && this.apiKey) {
        purifiedText = await this.aiPurification(purifiedText, options);
      }

      // 确保文本长度不超过最大限制
      if (options.maxLength && purifiedText.length > options.maxLength) {
        purifiedText = purifiedText.substring(0, options.maxLength - (options.truncationMarker || '...').length) + (options.truncationMarker || '...');
      }

      return purifiedText;
    } catch (error) {
      this.logger.error(`Error purifying text: ${error.message}`, error.stack);
      // 如果AI提炼失败，返回基本清理后的文本
      return this.basicTextCleaning(content, options);
    }
  }

  /**
   * 基本的文本清理功能
   * @param content 原始文本内容
   * @param options 清理选项
   * @returns 清理后的文本内容
   */
  private basicTextCleaning(content: string, options: PurifyOptionsDto): string {
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
    
    return result;
  }

  /**
   * 使用AI模型进行文本提炼
   * @param content 已经基本清理过的文本内容
   * @param options 提炼选项
   * @returns AI提炼后的文本内容
   */
  private async aiPurification(content: string, options: PurifyOptionsDto): Promise<string> {
    try {
      if (!content.trim()) {
        return content;
      }

      const maxOutputLength = options.maxLength || 400;
      const response = await axios.post(
        this.apiEndpoint,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `你是一个专业的文本提炼助手。你的任务是压缩输入文本中的冗余信息，保留核心语义，生成简洁明了的摘要。摘要应该保持原文的主要观点和关键信息，但要更加精炼。输出不应超过${maxOutputLength}个字符。直接输出提炼后的内容，不要添加任何额外的解释或标记,不要改变原文的语言。`
            },
            {
              role: 'user',
              content: content
            }
          ],
          max_tokens: Math.min(maxOutputLength * 2, 800),
          temperature: 0.2
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // 提取AI生成的回复
      const purifiedText = response.data.choices[0]?.message?.content?.trim();
      
      if (!purifiedText) {
        throw new Error('Empty response from AI model');
      }

      return purifiedText;
    } catch (error) {
      this.logger.error(`AI purification failed: ${error.message}`, error.stack);
      // 如果AI提炼失败，返回原始内容
      return content;
    }
  }
}
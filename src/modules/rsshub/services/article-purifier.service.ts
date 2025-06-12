import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { PurifyOptionsDto } from '../dto/purify-options.dto';

@Injectable()
export class ArticlePurifierService {
  /**
   * 提纯文章内容
   * @param rawHtml 原始HTML内容
   * @param options 提纯选项
   * @returns 提纯后的文章对象
   */
  purifyArticle(rawHtml: string, options: PurifyOptionsDto) {
    const $ = cheerio.load(rawHtml);
    const result: any = {};

    // 提取标题
    if (options.extractTitle) {
      result.title = this.cleanText($(options.titleSelector || 'title').text());
    }

    // 提取描述
    if (options.extractDescription) {
      result.description = this.cleanText(
        $(options.descriptionSelector || 'meta[name="description"]').attr('content') ||
        $(options.descriptionSelector || 'meta[property="og:description"]').attr('content') ||
        ''
      );
    }

    // 提取作者
    if (options.extractAuthor) {
      result.author = this.cleanText(
        $(options.authorSelector || 'meta[name="author"]').attr('content') ||
        $(options.authorSelector || '[itemprop="author"]').text() ||
        ''
      );
    }

    // 提取发布时间
    if (options.extractPublishDate) {
      result.publishDate = this.parseDate(
        $(options.publishDateSelector || 'meta[property="article:published_time"]').attr('content') ||
        $(options.publishDateSelector || 'time[datetime]').attr('datetime') ||
        ''
      );
    }

    // 提取正文内容
    if (options.extractContent) {
      const contentElement = options.contentSelector 
        ? $(options.contentSelector) 
        : $('body');
      result.content = this.cleanHtml(contentElement.html() || '');
    }

    return result;
  }

  /**
   * 清理文本内容
   */
  public cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 清理HTML内容
   */
   cleanHtml(html: string): string {
    return  html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/\s+/g, ' ')
      .replace(/<[^>]*>/g, '')
      .trim();
  }

  /**
   * 解析日期字符串
   */
  public parseDate(dateString: string): Date | null {
    if (!dateString) return null;
    try {
      return new Date(dateString);
    } catch {
      return null;
    }
  }
}
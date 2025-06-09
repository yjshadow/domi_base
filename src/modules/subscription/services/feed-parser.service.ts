import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as Parser from 'rss-parser';
import { FeedType } from '../models/subscription.entity';

export interface ParsedFeed {
  title: string;
  description?: string;
  link?: string;
  imageUrl?: string;
  language?: string;
  items: ParsedFeedItem[];
}

export interface ParsedFeedItem {
  title: string;
  description?: string;
  content?: string;
  link?: string;
  guid: string;
  author?: string;
  publishedAt: Date;
  categories?: string[];
  imageUrl?: string;
}

@Injectable()
export class FeedParserService {
  private readonly logger = new Logger(FeedParserService.name);
  private readonly parser: Parser;

  constructor(private readonly httpService: HttpService) {
    this.parser = new Parser({
      customFields: {
        feed: [
          'language',
          'image',
          // 使用类型断言解决类型不匹配问题
          ['atom:link', 'atomLink'] as unknown as string,
        ],
        item: [
          'content:encoded',
          'description',
          'guid',
          ['media:content', 'media'] as unknown as string,
          ['media:thumbnail', 'thumbnail'] as unknown as string,
        ],
      },
    });
  }

  async detectFeedType(url: string): Promise<FeedType> {
    try {
      const response = await firstValueFrom(this.httpService.get(url));
      const contentType = response.headers['content-type'] || '';
      const data = response.data;

      if (typeof data === 'object') {
        return FeedType.JSON;
      }

      if (typeof data === 'string') {
        if (contentType.includes('json') || data.includes('"version":')) {
          return FeedType.JSON;
        }

        if (data.includes('<feed') || data.includes('xmlns="http://www.w3.org/2005/Atom"')) {
          return FeedType.ATOM;
        }

        if (data.includes('<rss') || data.includes('xmlns="http://purl.org/rss/')) {
          return FeedType.RSS;
        }
      }

      throw new Error('Unable to determine feed type');
    } catch (error) {
      this.logger.error(`Failed to detect feed type for ${url}: ${error.message}`);
      throw error;
    }
  }

  async parseFeed(url: string, feedType?: FeedType): Promise<ParsedFeed> {
    try {
      const response = await firstValueFrom(this.httpService.get(url));
      const data = response.data;

      if (!feedType) {
        feedType = await this.detectFeedType(url);
      }

      switch (feedType) {
        case FeedType.JSON:
          return this.parseJsonFeed(data);
        case FeedType.ATOM:
        case FeedType.RSS:
          return this.parseXmlFeed(data);
        default:
          throw new Error(`Unsupported feed type: ${feedType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to parse feed ${url}: ${error.message}`);
      throw error;
    }
  }

  private async parseXmlFeed(xmlData: string): Promise<ParsedFeed> {
    try {
      const feed = await this.parser.parseString(xmlData);

      return {
        title: feed.title || 'Untitled Feed',
        description: feed.description,
        link: feed.link,
        imageUrl: feed.image?.url,
        language: feed.language,
        items: (feed.items || []).map(item => ({
          title: item.title || 'Untitled',
          description: item.description || item.summary,
          content: item['content:encoded'] || item.content || item.description,
          link: item.link,
          guid: item.guid || item.id || item.link,
          author: item.author || item.creator,
          publishedAt: item.pubDate || item.date ? new Date(item.pubDate || item.date) : new Date(),
          categories: item.categories || [],
          imageUrl: this.extractImageFromItem(item),
        })),
      };
    } catch (error) {
      this.logger.error('Failed to parse XML feed:', error);
      throw error;
    }
  }

  private parseJsonFeed(jsonData: any): ParsedFeed {
    try {
      // 支持 JSONFeed 格式 (https://www.jsonfeed.org/)
      const version = jsonData.version?.startsWith('https://jsonfeed.org/version/') 
        ? jsonData.version 
        : null;

      if (!version) {
        throw new Error('Invalid JSON feed format');
      }

      return {
        title: jsonData.title || 'Untitled Feed',
        description: jsonData.description,
        link: jsonData.home_page_url,
        imageUrl: jsonData.icon || jsonData.favicon,
        language: jsonData.language,
        items: (jsonData.items || []).map(item => ({
          title: item.title || 'Untitled',
          description: item.summary,
          content: item.content_html || item.content_text,
          link: item.url || item.external_url,
          guid: item.id,
          author: item.author?.name,
          publishedAt: item.date_published ? new Date(item.date_published) : new Date(),
          categories: item.tags || [],
          imageUrl: item.image || this.extractImageFromJsonItem(item),
        })),
      };
    } catch (error) {
      this.logger.error('Failed to parse JSON feed:', error);
      throw error;
    }
  }

  private extractImageFromItem(item: any): string | undefined {
    if (item.media?.$ && item.media.$.url) {
      return item.media.$.url;
    }

    if (item.thumbnail?.$ && item.thumbnail.$.url) {
      return item.thumbnail.$.url;
    }

    if (item.enclosure?.$ && item.enclosure.$.url && item.enclosure.$.type?.startsWith('image/')) {
      return item.enclosure.$.url;
    }

    // 尝试从内容中提取第一张图片
    const content = item['content:encoded'] || item.content || item.description;
    if (content) {
      const match = /<img[^>]+src="([^">]+)"/.exec(content);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  private extractImageFromJsonItem(item: any): string | undefined {
    if (item.image) {
      return item.image;
    }

    if (item.banner_image) {
      return item.banner_image;
    }

    if (item.attachments) {
      const imageAttachment = item.attachments.find(
        (attachment: any) => attachment.mime_type?.startsWith('image/'),
      );
      if (imageAttachment) {
        return imageAttachment.url;
      }
    }

    return undefined;
  }
}
import { Test, TestingModule } from '@nestjs/testing';
import { FeedParserService } from './feed-parser.service';
import { FeedType } from '../models/subscription.entity';
import { BadRequestException } from '@nestjs/common';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FeedParserService', () => {
  let service: FeedParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FeedParserService],
    }).compile();

    service = module.get<FeedParserService>(FeedParserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectFeedType', () => {
    it('should detect RSS feed type', async () => {
      const rssContent = `
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>RSS Feed</title>
          </channel>
        </rss>
      `;

      mockedAxios.get.mockResolvedValueOnce({ data: rssContent });

      const result = await service.detectFeedType('https://example.com/rss');
      expect(result).toBe(FeedType.RSS);
    });

    it('should detect Atom feed type', async () => {
      const atomContent = `
        <?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Atom Feed</title>
        </feed>
      `;

      mockedAxios.get.mockResolvedValueOnce({ data: atomContent });

      const result = await service.detectFeedType('https://example.com/atom');
      expect(result).toBe(FeedType.ATOM);
    });

    it('should detect JSON feed type', async () => {
      const jsonContent = {
        version: 'https://jsonfeed.org/version/1',
        title: 'JSON Feed'
      };

      mockedAxios.get.mockResolvedValueOnce({ data: jsonContent });

      const result = await service.detectFeedType('https://example.com/json');
      expect(result).toBe(FeedType.JSON);
    });

    it('should throw BadRequestException for invalid URL', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Invalid URL'));

      await expect(service.detectFeedType('invalid-url')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid feed content', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: 'Invalid content' });

      await expect(service.detectFeedType('https://example.com/invalid')).rejects.toThrow(BadRequestException);
    });

    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.detectFeedType('https://example.com/error')).rejects.toThrow(BadRequestException);
    });
  });

  describe('parseFeed', () => {
    it('should parse RSS feed', async () => {
      const rssContent = `
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>RSS Feed</title>
            <description>RSS Description</description>
            <link>https://example.com</link>
            <image>
              <url>https://example.com/image.jpg</url>
            </image>
            <item>
              <title>Article Title</title>
              <description>Article Description</description>
              <content:encoded><![CDATA[Article Content]]></content:encoded>
              <link>https://example.com/article</link>
              <guid>article-guid</guid>
              <author>John Doe</author>
              <pubDate>Tue, 15 Nov 2023 12:00:00 GMT</pubDate>
              <category>Technology</category>
              <enclosure url="https://example.com/article-image.jpg" type="image/jpeg" />
            </item>
          </channel>
        </rss>
      `;

      mockedAxios.get.mockResolvedValueOnce({ data: rssContent });

      const result = await service.parseFeed('https://example.com/rss', FeedType.RSS);

      expect(result).toEqual({
        title: 'RSS Feed',
        description: 'RSS Description',
        link: 'https://example.com',
        imageUrl: 'https://example.com/image.jpg',
        items: [
          {
            title: 'Article Title',
            description: 'Article Description',
            content: 'Article Content',
            link: 'https://example.com/article',
            guid: 'article-guid',
            author: 'John Doe',
            publishedAt: expect.any(Date),
            categories: ['Technology'],
            imageUrl: 'https://example.com/article-image.jpg',
          },
        ],
      });
    });

    it('should parse Atom feed', async () => {
      const atomContent = `
        <?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <title>Atom Feed</title>
          <subtitle>Atom Description</subtitle>
          <link href="https://example.com" />
          <icon>https://example.com/image.jpg</icon>
          <entry>
            <title>Article Title</title>
            <summary>Article Description</summary>
            <content type="html">Article Content</content><link href="https://example.com/article" />
            <id>article-guid</id>
            <author>
              <name>John Doe</name>
            </author>
            <published>2023-11-15T12:00:00Z</published>
            <category term="Technology" />
          </entry>
        </feed>
      `;

      mockedAxios.get.mockResolvedValueOnce({ data: atomContent });

      const result = await service.parseFeed('https://example.com/atom', FeedType.ATOM);

      expect(result).toEqual({
        title: 'Atom Feed',
        description: 'Atom Description',
        link: 'https://example.com',
        imageUrl: 'https://example.com/image.jpg',
        items: [
          {
            title: 'Article Title',
            description: 'Article Description',
            content: 'Article Content',
            link: 'https://example.com/article',
            guid: 'article-guid',
            author: 'John Doe',
            publishedAt: expect.any(Date),
            categories: ['Technology'],
            imageUrl: null,
          },
        ],
      });
    });

    it('should parse JSON feed', async () => {
      const jsonContent = {
        version: 'https://jsonfeed.org/version/1',
        title: 'JSON Feed',
        description: 'JSON Description',
        home_page_url: 'https://example.com',
        icon: 'https://example.com/image.jpg',
        items: [
          {
            title: 'Article Title',
            summary: 'Article Description',
            content_html: 'Article Content',
            url: 'https://example.com/article',
            id: 'article-guid',
            author: { name: 'John Doe' },
            date_published: '2023-11-15T12:00:00Z',
            tags: ['Technology'],
            image: 'https://example.com/article-image.jpg',
          },
        ],
      };

      mockedAxios.get.mockResolvedValueOnce({ data: jsonContent });

      const result = await service.parseFeed('https://example.com/json', FeedType.JSON);

      expect(result).toEqual({
        title: 'JSON Feed',
        description: 'JSON Description',
        link: 'https://example.com',
        imageUrl: 'https://example.com/image.jpg',
        items: [
          {
            title: 'Article Title',
            description: 'Article Description',
            content: 'Article Content',
            link: 'https://example.com/article',
            guid: 'article-guid',
            author: 'John Doe',
            publishedAt: expect.any(Date),
            categories: ['Technology'],
            imageUrl: 'https://example.com/article-image.jpg',
          },
        ],
      });
    });

    it('should handle missing optional fields', async () => {
      const minimalRssContent = `
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>Minimal RSS</title>
            <item>
              <title>Minimal Article</title>
              <guid>minimal-guid</guid>
            </item>
          </channel>
        </rss>
      `;

      mockedAxios.get.mockResolvedValueOnce({ data: minimalRssContent });

      const result = await service.parseFeed('https://example.com/minimal', FeedType.RSS);

      expect(result).toEqual({
        title: 'Minimal RSS',
        description: null,
        link: null,
        imageUrl: null,
        items: [
          {
            title: 'Minimal Article',
            description: null,
            content: null,
            link: null,
            guid: 'minimal-guid',
            author: null,
            publishedAt: null,
            categories: [],
            imageUrl: null,
          },
        ],
      });
    });

    it('should throw BadRequestException for invalid feed type', async () => {
      await expect(service.parseFeed('https://example.com', 'invalid' as FeedType))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid feed content', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: 'Invalid content' });

      await expect(service.parseFeed('https://example.com', FeedType.RSS))
        .rejects.toThrow(BadRequestException);
    });

    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.parseFeed('https://example.com', FeedType.RSS))
        .rejects.toThrow(BadRequestException);
    });

    it('should handle malformed dates', async () => {
      const rssWithInvalidDate = `
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>RSS Feed</title>
            <item>
              <title>Article</title>
              <guid>guid</guid>
              <pubDate>Invalid Date</pubDate>
            </item>
          </channel>
        </rss>
      `;

      mockedAxios.get.mockResolvedValueOnce({ data: rssWithInvalidDate });

      const result = await service.parseFeed('https://example.com', FeedType.RSS);

      expect(result.items[0].publishedAt).toBeNull();
    });

    it('should sanitize HTML content', async () => {
      const rssWithUnsafeContent = `
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0">
          <channel>
            <title>RSS Feed</title>
            <item>
              <title>Article</title>
              <guid>guid</guid>
              <description><![CDATA[<script>alert('xss')</script><p>Safe content</p>]]></description>
            </item>
          </channel>
        </rss>
      `;

      mockedAxios.get.mockResolvedValueOnce({ data: rssWithUnsafeContent });

      const result = await service.parseFeed('https://example.com', FeedType.RSS);

      expect(result.items[0].description).toBe('<p>Safe content</p>');
    });
  });
});
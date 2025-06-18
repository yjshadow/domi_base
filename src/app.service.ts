import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly configService: ConfigService,
  ) {}



  /**
   * 获取应用程序配置信息
   */
  getConfig() {
    // 只返回非敏感的配置信息
    return {
      code: 200,
      data: {
        environment: this.configService.get<string>('NODE_ENV', 'development'),
        rssFetchInterval: this.configService.get<number>('RSS_FETCH_INTERVAL', 300),
        rssCacheTTL: this.configService.get<number>('RSS_CACHE_TTL', 3600),
        translationProvider: this.configService.get<string>('TRANSLATION_PROVIDER', 'mock'),
        useRealTranslation: this.configService.get<string>('USE_REAL_TRANSLATION') === 'true',
      },
      message: 'Configuration retrieved successfully',
      timestamp: new Date().toISOString(),
    };
  }
}
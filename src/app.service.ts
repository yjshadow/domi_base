import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTranslationService } from './modules/translation/translation.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject('TranslationService')
    private readonly translationService: BaseTranslationService,
  ) {}

  /**
   * 获取应用程序状态信息
   */
  async getStatus() {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const useRealTranslation = this.configService.get<string>('USE_REAL_TRANSLATION') === 'true';
    const translationProvider = this.configService.get<string>('TRANSLATION_PROVIDER', 'mock');

    // 检查翻译服务状态
    let translationServiceStatus = 'unknown';
    try {
      const testResult = await this.translationService.translate('test', 'en', 'zh');
      translationServiceStatus = testResult ? 'healthy' : 'unhealthy';
    } catch (error) {
      this.logger.error(`Translation service check failed: ${error.message}`);
      translationServiceStatus = 'error';
    }

    // 获取支持的语言列表
    let supportedLanguages: string[] = [];
    try {
      supportedLanguages = await this.translationService.getSupportedLanguages();
    } catch (error) {
      this.logger.error(`Failed to get supported languages: ${error.message}`);
    }

    return {
      code: 200,
      data: {
        status: 'running',
        environment: nodeEnv,
        translation: {
          provider: useRealTranslation ? translationProvider : 'mock',
          status: translationServiceStatus,
          supportedLanguages,
        },
        timestamp: new Date().toISOString(),
      },
      message: 'Service is running',
      timestamp: new Date().toISOString(),
    };
  }

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
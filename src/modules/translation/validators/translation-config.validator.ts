import { Injectable } from '@nestjs/common';
import { TranslationConfigDto } from '../dto/translation-config.dto';

@Injectable()
export class TranslationConfigValidator {
  validate(config: TranslationConfigDto): void {
    if (!config.apiKey) {
      throw new Error('Translation API key is required');
    }

    if (config.timeout && (config.timeout < 100 || config.timeout > 30000)) {
      throw new Error('Timeout must be between 100 and 30000 milliseconds');
    }

    // 验证自定义端点格式
    if (config.endpoint && !this.isValidUrl(config.endpoint)) {
      throw new Error('Invalid endpoint URL format');
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
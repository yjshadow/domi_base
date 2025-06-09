import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TranslationRetryService {
  private readonly logger = new Logger(TranslationRetryService.name);
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1秒

  async withRetry<T>(
    operation: () => Promise<T>,
    context: string,
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        this.logger.warn(
          `Translation attempt ${attempt}/${this.maxRetries} failed for ${context}: ${error.message}`,
        );

        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt); // 指数退避
        }
      }
    }

    throw new Error(
      `Translation failed after ${this.maxRetries} attempts: ${lastError.message}`,
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
import { Injectable } from '@nestjs/common';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class TranslationRateLimiterService {
  private readonly maxConcurrent = 5; // 最大并发请求数
  private readonly timeWindow = 1000; // 时间窗口（毫秒）
  private currentRequests = 0;
  private queue: Array<() => void> = [];

  async acquire(): Promise<void> {
    if (this.currentRequests < this.maxConcurrent) {
      this.currentRequests++;
      return;
    }

    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    this.currentRequests--;

    if (this.queue.length > 0 && this.currentRequests < this.maxConcurrent) {
      const next = this.queue.shift();
      if (next) {
        this.currentRequests++;
        next();
      }
    }
  }
}
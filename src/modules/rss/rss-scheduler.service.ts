import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RssService } from './rss.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RssSource } from './entities/rss-source.entity';

/**
 * RSS调度服务
 * 负责定时获取和更新RSS源的内容
 */
@Injectable()
export class RssSchedulerService {
  private readonly logger = new Logger(RssSchedulerService.name);
  private isUpdating = false;

  constructor(
    private readonly rssService: RssService,
    @InjectRepository(RssSource)
    private readonly rssSourceRepository: Repository<RssSource>,
  ) {}

  /**
   * 每分钟执行一次的定时任务
   * 检查并更新所有活跃的RSS源
   * 使用锁机制(isUpdating)防止并发更新
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleRssUpdates() {
    if (this.isUpdating) {
      this.logger.log('Update already in progress, skipping...');
      return;
    }

    try {
      this.isUpdating = true;
      await this.updateSources();
    } catch (error) {
      this.logger.error(`Error in RSS update cycle: ${error.message}`);
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * 更新所有活跃的RSS源
   * - 获取所有活跃的RSS源
   * - 根据更新间隔检查是否需要更新
   * - 处理更新过程中的错误
   * - 如果源持续发生错误，会自动停用
   */
  private async updateSources() {
    const sources = await this.rssSourceRepository.find({
      where: { active: true },
    });

    this.logger.log(`Found ${sources.length} active RSS sources to check`);

    for (const source of sources) {
      try {
        const now = new Date();
        const lastFetch = source.last_fetch_time || new Date(0);
        const minutesSinceLastFetch = Math.floor(
          (now.getTime() - lastFetch.getTime()) / (1000 * 60),
        );

        // 检查是否需要更新
        if (minutesSinceLastFetch >= source.update_interval) {
          this.logger.log(
            `Updating RSS source: ${source.name} (${source.url})`,
          );
          
          await this.rssService.fetchArticles(source);
          
          this.logger.log(
            `Successfully updated RSS source: ${source.name}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error updating RSS source ${source.name}: ${error.message}`,
        );

        // 更新源的错误状态
        source.error_count += 1;
        source.last_error = error.message;

        // 如果连续错误次数过多，自动停用源
        if (source.error_count >= 5) {
          source.active = false;
          this.logger.warn(
            `Deactivating RSS source ${source.name} due to repeated errors`,
          );
        }

        await this.rssSourceRepository.save(source);
      }
    }
  }

  /**
   * 手动触发RSS更新
   * 允许在定时任务之外手动触发更新过程
   * 如果当前已有更新在进行中，则不会重复触发
   */
  async triggerUpdate() {
    if (!this.isUpdating) {
      await this.handleRssUpdates();
    }
  }
}
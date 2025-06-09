import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RssService } from './rss.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RssSource } from './entities/rss-source.entity';

@Injectable()
export class RssSchedulerService {
  private readonly logger = new Logger(RssSchedulerService.name);
  private isUpdating = false;

  constructor(
    private readonly rssService: RssService,
    @InjectRepository(RssSource)
    private readonly rssSourceRepository: Repository<RssSource>,
  ) {}

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

  // 手动触发更新
  async triggerUpdate() {
    if (!this.isUpdating) {
      await this.handleRssUpdates();
    }
  }
}
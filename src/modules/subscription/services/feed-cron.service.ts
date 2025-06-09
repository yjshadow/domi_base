import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { Subscription, SubscriptionStatus } from '../models/subscription.entity';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class FeedCronService {
  private readonly logger = new Logger(FeedCronService.name);
  private readonly MAX_CONCURRENT_JOBS = 5;
  private runningJobs = 0;
  private jobQueue: Array<{ id: number; name: string }> = [];

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly subscriptionService: SubscriptionService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async startCronJobs(): Promise<void> {
    this.logger.log('Starting feed cron jobs');
    
    // 每分钟检查一次需要更新的订阅
    const checkJob = new CronJob('0 * * * * *', () => {
      this.checkSubscriptionsForUpdate().catch(error => {
        this.logger.error('Error checking subscriptions for update', error);
      });
    });
    
    this.schedulerRegistry.addCronJob('check-subscriptions', checkJob);
    checkJob.start();
    
    // 每小时清理一次过期文章
    const cleanupJob = new CronJob('0 0 * * * *', () => {
      this.cleanupOldArticles().catch(error => {
        this.logger.error('Error cleaning up old articles', error);
      });
    });
    
    this.schedulerRegistry.addCronJob('cleanup-articles', cleanupJob);
    cleanupJob.start();
    
    this.logger.log('Feed cron jobs started');
  }

  private async checkSubscriptionsForUpdate(): Promise<void> {
    if (this.runningJobs >= this.MAX_CONCURRENT_JOBS) {
      this.logger.debug(`Max concurrent jobs (${this.MAX_CONCURRENT_JOBS}) reached, skipping check`);
      return;
    }
    
    try {
      // 查找需要更新的订阅
      const now = new Date();
      const subscriptions = await this.subscriptionRepository.find({
        where: [
          {
            status: SubscriptionStatus.ACTIVE,
            lastUpdatedAt: null,
          },
          {
            status: SubscriptionStatus.ACTIVE,
            lastUpdatedAt: this.getDateCondition(now),
          },
          {
            status: SubscriptionStatus.ERROR,
            errorCount: this.getLessThanCondition(5), // 错误次数小于5次的订阅
            lastUpdatedAt: this.getDateCondition(now, 60), // 至少60分钟前更新过
          },
        ],
        order: {
          lastUpdatedAt: 'ASC',
        },
        take: 10, // 一次最多处理10个订阅
      });
      
      if (subscriptions.length === 0) {
        return;
      }
      
      this.logger.debug(`Found ${subscriptions.length} subscriptions to update`);
      
      // 将订阅添加到队列
      for (const subscription of subscriptions) {
        const jobName = `refresh-feed-${subscription.id}`;
        
        // 检查是否已经在队列中
        if (this.jobQueue.some(job => job.id === subscription.id) || 
            this.schedulerRegistry.doesExist('cron', jobName)) {
          continue;
        }
        
        this.jobQueue.push({ id: subscription.id, name: jobName });
      }
      
      // 处理队列
      this.processJobQueue();
    } catch (error) {
      this.logger.error('Error checking subscriptions for update', error);
    }
  }

  private async processJobQueue(): Promise<void> {
    if (this.runningJobs >= this.MAX_CONCURRENT_JOBS || this.jobQueue.length === 0) {
      return;
    }
    
    const job = this.jobQueue.shift();
    if (!job) {
      return;
    }
    
    this.runningJobs++;
    
    try {
      this.logger.debug(`Processing job ${job.name} for subscription ${job.id}`);
      await this.subscriptionService.refreshFeed(job.id);
      this.logger.debug(`Job ${job.name} completed successfully`);
    } catch (error) {
      this.logger.error(`Error processing job ${job.name}`, error);
    } finally {
      this.runningJobs--;
      // 继续处理队列
      this.processJobQueue();
    }
  }

  private async cleanupOldArticles(): Promise<void> {
    this.logger.debug('Cleaning up old articles');
    
    try {
      // 实现清理逻辑，例如删除30天前的文章
      // 这里可以根据需要实现具体的清理逻辑
    } catch (error) {
      this.logger.error('Error cleaning up old articles', error);
    }
  }

  // TypeORM 查询条件辅助方法
  private getDateCondition(now: Date, minutes = 0): any {
    const date = new Date(now);
    date.setMinutes(date.getMinutes() - minutes);
    
    return {
      lessThan: date,
    };
  }

  private getLessThanCondition(value: number): any {
    return {
      lessThan: value,
    };
  }
}
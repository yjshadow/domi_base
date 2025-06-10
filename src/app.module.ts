import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { RedisClientOptions } from 'redis';
import { redisStore } from 'cache-manager-redis-yet';
import { TranslationModule } from './modules/translation/translation.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { MailModule } from './modules/mail/mail.module';
import { RssModule } from './modules/rss/rss.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { RsshubModule } from './modules/rsshub/rsshub.module';

@Module({
  imports: [
    // 翻译模块
    TranslationModule,
    AuthModule,
    UserModule,
    MailModule,
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true, // 使配置全局可用
      envFilePath: ['.env.local', '.env'], // 按优先级加载环境变量文件
    }),

    // 缓存模块（Redis）
    CacheModule.registerAsync<RedisClientOptions>({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
          },
          password: configService.get('REDIS_PASSWORD', ''),
          database: configService.get('REDIS_DB', 0),
        }),
        ttl: configService.get('RSS_CACHE_TTL', 3600), // 默认缓存时间 1 小时
      }),
      inject: [ConfigService],
    }),

    // 数据库模块
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DATABASE_HOST', 'localhost'),
        port: configService.get('DATABASE_PORT', 3306),
        username: configService.get('DATABASE_USERNAME', 'root'),
        password: configService.get('DATABASE_PASSWORD', 'root'),
        database: configService.get('DATABASE_NAME', 'domibase'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        charset: 'utf8mb4',
        collation: 'utf8mb4_unicode_ci',
        synchronize: false, // 暂时关闭自动迁移
        logging: configService.get('NODE_ENV', 'development') === 'development',
        
      }),
      inject: [ConfigService],
    }),
    

    // 定时任务模块
    ScheduleModule.forRoot(),
    

    

    RsshubModule,

    
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
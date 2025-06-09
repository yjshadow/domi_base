import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as compression from 'compression';
import  helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  // 创建 NestJS 应用实例
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  
  // 获取应用配置
  const port = configService.get<number>('PORT', 3000);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  
  // 启用 CORS
  app.enableCors();
  
  // 使用 Helmet 增强安全性
  app.use(helmet());
  
  // 启用 Gzip 压缩
  app.use(compression());
  
  // 设置全局前缀
  app.setGlobalPrefix('api');
  
  // 配置全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // 自动转换类型
      whitelist: true, // 过滤掉未在 DTO 中声明的属性
      forbidNonWhitelisted: true, // 如果存在未在 DTO 中声明的属性，则抛出错误
      disableErrorMessages: nodeEnv === 'production', // 在生产环境中禁用详细错误消息
    }),
  );
  
  // 配置 Swagger 文档
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('RSS 翻译器 API')
      .setDescription('RSS 翻译器的 API 文档')
      .setVersion('1.0')
      .addTag('rss')
      .addTag('user')
      .addTag('auth')
      .addTag('translation')
      .addTag('system')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    
    logger.log('Swagger 文档已启用，访问路径: /api/docs');
  }
  
  // 启动应用
  await app.listen(port);
  logger.log(`应用已启动，运行环境: ${nodeEnv}，监听端口: ${port}`);
}

bootstrap();
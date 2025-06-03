import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  
const app = await NestFactory.create<NestExpressApplication>(AppModule);
const config = new DocumentBuilder()
.setTitle('Your App Title')
.setDescription('The API description of your app')
.setVersion('1.0')
.addTag('your - tag')
.build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api', app, document);
// 配置 CORS
app.enableCors({
  origin: '*', // 允许所有来源（生产环境建议指定具体域名）
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', // 允许的请求方法
  credentials: true, // 允许携带 Cookie
  allowedHeaders: '*', // 允许所有请求头
});

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

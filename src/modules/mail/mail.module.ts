import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        service: 'Gmail',
        auth: {
          user: '你的邮箱地址', // 发件人邮箱
          pass: '你的邮箱授权码', // Gmail 需生成应用专用密码
        },
      },
      template: {
        dir: __dirname + '/templates', // 邮件模板目录
        adapter: new HandlebarsAdapter(), // 使用 Handlebars 模板引擎
        options: {
          strict: true,
        },
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService], // 导出服务供其他模块使用
})
export class MailModule {}

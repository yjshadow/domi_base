import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { MailService } from './mail.service';
import { join } from 'path';

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        service: 'qq',
        auth: {
          user: '78701531@qq.com', // 发件人邮箱
          pass: 'bqchhcoadlzhbhah', // Gmail 需生成应用专用密码
        },
      },
      template: {
        dir: join(__dirname,'/templates'),// 邮件模板目录
        adapter: new HandlebarsAdapter(), // 使用 Handlebars 模板引擎
        options: {
          strict: true,
        },
      },
    }),
  ],
  providers: [MailService ],
  exports: [MailService], // 导出服务供其他模块使用
})
export class MailModule {}

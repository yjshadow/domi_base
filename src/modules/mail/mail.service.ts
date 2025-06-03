import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  // 发送验证码邮件
  async sendVerificationEmail(to: string, code: string, expiresIn: number) {
    await this.mailerService.sendMail({
      to,
      from: 'noreply@your-domain.com', // 发件人显示名称
      subject: '【用户注册】邮箱验证码',
      template: 'verification', // 对应 templates/verification.hbs 模板
      context: {
        code,
        expiresIn: Math.floor(expiresIn / 60), // 转换为分钟
      },
    });
  }
}
import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { Cache } from 'cache-manager';
import {CACHE_MANAGER} from '@nestjs/cache-manager';
import { CacheService } from 'src/common/cache';

// 验证码存储结构
interface VerificationCode {
  code: string;
  expiresAt: number; // 存储为时间戳
  lastSentAt: number; // 存储为时间戳
}

@Injectable()
export class VerificationService {
  constructor(
    private readonly mailService: MailService,
    private  cacheManager: CacheService,
  ) {}

  // 发送验证码
  async sendCode(email: string): Promise<void> {
    try {
      // 检查发送频率限制
      const existingCodeStr = await this.cacheManager.get<string>(email);
      if (existingCodeStr) {
        const existingCode: VerificationCode = JSON.parse(existingCodeStr);
        const timeSinceLastSend = Date.now() - existingCode.lastSentAt;
        if (timeSinceLastSend < 60 * 1000) {
          throw new BadRequestException('发送频率过高，请稍后再试');
        }
      }

      // 生成新验证码
      const code = this.generateCode();
      const now = Date.now();
      const expiresAt = now + 5 * 60 * 1000; // 5分钟有效期

      // 存入缓存
      const verificationData: VerificationCode = {
        code,
        expiresAt,
        lastSentAt: now,
      };

      await this.cacheManager.set(
        email,
        JSON.stringify(verificationData)
      ).then(() => console.log('缓存设置成功'))
      .catch(err => console.error('缓存设置失败', err));;
       console.log(verificationData);
      // 发送邮件
      await this.sendEmail(email, code);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('发送验证码失败，请稍后重试');
    }
  }

  // 验证验证码
  async verifyCode(email: string, code: string): Promise<boolean> {
    try {
      const entryStr = await this.cacheManager.get<string>(email);
      if (!entryStr) {
        return false;
      }

      const entry: VerificationCode = JSON.parse(entryStr);

      // 检查是否过期
      if (Date.now() > entry.expiresAt) {
        await this.cacheManager.del(email); // 移除过期验证码
        return false;
      }

      // 验证验证码
      const isValid = entry.code === code;
      if (isValid) {
        await this.cacheManager.del(email); // 验证通过后移除
      }

      return isValid;
    } catch (error) {
      return false;
    }
  }

  // 生成6位数字验证码
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // 发送邮件
  private async sendEmail(email: string, code: string): Promise<void> {
    await this.mailService.sendVerificationEmail(
      email,
      code,
      300, // 5分钟有效期
    );
  }
}
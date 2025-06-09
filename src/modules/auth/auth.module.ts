import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { VerificationService } from './verification.service';
import { MailModule } from '../mail/mail.module';
import { CacheModule } from '../../common/cache/cache.module';

@Module({
  imports: [
    CacheModule,
    UserModule,
    JwtModule.register({
      global: true, // 全局使用，不需要在每个模块中导入
      secret: 'domidomi', // 密钥
      signOptions: { expiresIn: '24h' }, // 过期时间
    }),
    MailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    VerificationService,
    AuthGuard,
  ], // 可以添加服务提供
  exports: [AuthService,VerificationService], 
})
export class AuthModule {}
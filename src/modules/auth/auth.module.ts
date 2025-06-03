import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [UserModule,JwtModule.register(
    {
      global:true, // 全局使用，不需要在每个模块中导入
      secret:'domidomi', // 密钥
      signOptions:{expiresIn:'24h'}, // 过期时间
    }
  )],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    }
  ], // 可以添加服务提供
  exports: [AuthService], 
})
export class AuthModule {}

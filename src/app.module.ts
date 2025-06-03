//应用的注册中心  类似于.net core program.cs

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';
import { User } from './modules/user/user.entity';
import { AuthModule } from './modules/auth/auth.module';
import { MailModule } from './modules/mail/mail.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [TypeOrmModule.forRoot(
    {
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'root',
      database: 'domibase',
      //synchronize: true,  //是否自动同步实体类到数据库实体类的路径
      //autoLoadEntities: true, //自动加载实体类
      entities: [User], //实体类的路径
    }
  ),UserModule,AuthModule, MailModule, RedisModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}


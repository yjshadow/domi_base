import { Controller,Get, UseGuards,Post, Param ,Request, BadRequestException} from '@nestjs/common';
import { Public } from './public.decorator';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { User } from '../user/user.entity';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { success,error } from 'src/utils';
import { Body } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('api/auth')
@UseGuards(AuthGuard)
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly verificationService: VerificationService,
        private readonly authGurd: AuthGuard,
    ) {}
    //登录
    @ApiTags('login')
    @ApiOperation({summary:'登录',description:'登录'})
    @Public()
    @Post('login')
    async login(@Body() body:any){
        const {username,password} = body;
        return await this.authService.login(username,password)
       .then((data)=>success(data,'登录成功'))
       .catch((err)=>error('登录失败'))
       ;
    }

    //发送验证码
    @Public()
    @ApiOperation({ summary: '创建用户' })
    @ApiBody({
    description: '用户信息',
    required: true,
    schema: {
      type: 'object',
      required: ['email', 'type'],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          description: '用户邮箱',
          example: 'user@example.com',
        },
        type: {
          type: 'string',
          description: '发送的页面',
          example: 'register/revise-password',
        }
      },
    },
  })
  @Post('send-code')
  async sendVerificationCode(@Body('email') email: string,@Body('type') type: string) {
    const user = await this.authService.isExist(email);
    if(type=='register'){
      if(user) throw new BadRequestException('用户已存在');}
    else  {
      if(!user)throw new BadRequestException('用户不存在');}
    if (!email)
      throw new BadRequestException('邮箱不能为空');
    await this.verificationService.sendCode(email);
    return { message: '验证码已发送' };
  }

  // 验证验证码
  @Public()
  @Post('verify-code')
   @ApiBody({
    description: '用户信息',
    required: true,
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: {
          type: 'string',
          format: 'email',
          description: '用户邮箱',
          example: 'user@example.com',
        },
        code: {
          type: 'string',
          description: '验证码',
          example: '123456',
        },
      },
    },
  })
  async verifyCode(
    @Body('email') email: string,
    @Body('code') code: string,
  ) {
    if (!email || !code) {
      throw new BadRequestException('邮箱和验证码不能为空');
    }
    const isValid = await this.verificationService.verifyCode(email, code);
    if (!isValid) {
      throw new BadRequestException('验证码无效');
    }
    return { message: '验证成功' };
  }

  //注册
  @Public()
  @Post('register')
   @ApiBody({
    description: '用户信息',
    required: true,
    schema: {
      type: 'object',
      required: ['username', 'password', 'code','default_l','avatar'],
      properties: {
        username: {
          type: 'string',
          format: 'email',
          description: '用户邮箱',
          example: 'user@example.com',
        },
        password: {
          type: 'string',
          description: '密码',
          example: '123456',
        },
        code: {
          type: 'string',
          description: '验证码',
          example: '123456',
        },
        default_l: {
          type: 'string',
          description: '默认语言',
          example: 'en',
        },
        avatar: {
          type: 'string',
          description: '头像地址',
          example: '123456',
        },
      },
    },
  })
  async register(@Body() body:CreateUserDto){
    const code=body.code;
    const email=body.username;
    if (!email || !code) {
      throw new BadRequestException('邮箱和验证码不能为空');
    }
    const isValid = await this.verificationService.verifyCode(email, code);
    if (!isValid) {
      throw new BadRequestException('验证码无效');
    }
    return await this.authService.register(body)
    .then((data)=>success(data,'注册成功'))
    .catch((err)=>error('注册失败'))
    ;
  }

  async changePassword(@Request() req:any,@Body() body:ChangePasswordDto){
    body.username=req.user.username;
    return await this.authService.changePassword(body)
    .then((data)=>success(data,'修改密码成功'))
    .catch((err)=>error('修改密码失败'))
    ;
  }
}
import { Controller,Get, UseGuards,Post, Param ,Optional} from '@nestjs/common';
import { Public } from './public.decorator';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { User } from '../user/user.entity';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { success,error } from 'src/utils';
import { Body } from '@nestjs/common';


@Controller('api/auth')
@UseGuards(AuthGuard)
export class AuthController {
    constructor(
        private readonly authService: AuthService,
    ) {}

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

}

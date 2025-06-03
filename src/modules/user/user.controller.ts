import { Controller,Get,Post,Put,Delete,Param, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { Public } from '../auth/public.decorator';
import { wrapperResponse } from 'src/utils';

@Controller('api/user')
export class UserController {
    constructor(private readonly userService:UserService) {}
   
    @Public()
    @Get()
    async GetAll() {
        return await this.userService.GetAll();
    }
  

    @Get('info')
    async GetUserInfoByToken(@Req() request: any){
       return wrapperResponse(
             this.userService.findByUsername(request.user.username),
            '成功获取用户信息',
        );
    }
    
}

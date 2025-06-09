import { Injectable, UnauthorizedException, ConflictException, Post } from '@nestjs/common';
import {UserService} from '../user/user.service';
import { User } from '../user/user.entity';
import * as md5 from 'md5'; // 引入md5加密库，用于密码加密
import { hasSubscribers } from 'diagnostics_channel';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
    ) {}

    async register(createUserDto: CreateUserDto) {
        // 创建新用户
        const newUser = new User();
        newUser.username = createUserDto.username;
        newUser.password = md5(createUserDto.password);
        newUser.avatar = createUserDto.avatar;
        newUser.default_l = createUserDto.default_l;

        // 保存用户
        const savedUser = await this.userService.Create(newUser);

        // 生成token
        const payload = { 
            username: savedUser.username, 
            sub: savedUser.id, 
            role: savedUser.role_sn, 
            level: savedUser.level_sn 
        };

        return {
            token: await this.jwtService.signAsync(payload),
        };
    }

    async login(username,password) {
        const user= await this.userService.findByUsername(username);
        if(!user){
            return user;
        }
        const hashPassword=md5(password); // 对密码进行加密
        console.log(hashPassword);
        if(user.password!==hashPassword){ // 比较加密后的密码是否匹配
             throw new UnauthorizedException('密码错误');
       }
        const payload = { username: user.username, sub: user.id ,role:user.role_sn,level:user.level_sn}; // 生成token的payload
        return {
            token: await this.jwtService.signAsync(payload), // 生成token
        };
       
    }

    //用户是否存在
    async isExist(username:string){
        const user= await this.userService.findByUsername(username);
        if(!user){
            return user;
        }
        return user;
    }
    //用户修改密码
    async changePassword(changePasswordDto:ChangePasswordDto){
        const user= await this.userService.findByUsername(changePasswordDto.username);
        if(!user){
            throw new UnauthorizedException('用户不存在');
        }
        const hashPassword=md5(changePasswordDto.oldpassword); // 对密码进行加密
        if(user.password!==hashPassword){ // 比较加密后的密码是否匹配
             throw new UnauthorizedException('密码错误');
       }
        const hashNewPassword=md5(changePasswordDto.newpassword); // 对密码进行加密
        user.password=hashNewPassword;
        const savedUser=await this.userService.UpdatePassWord(user.username,user.password);
        if(savedUser){
            const payload = { username: user.username, sub: user.id ,role:user.role_sn,level:user.level_sn}; // 生成token的payload
            return {
                token: await this.jwtService.signAsync(payload), // 生成token
            };
        }else{
            throw new ConflictException('修改失败');
        }
    }
}
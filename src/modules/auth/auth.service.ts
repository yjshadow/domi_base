import { Injectable, UnauthorizedException, ConflictException, Post } from '@nestjs/common';
import {UserService} from '../user/user.service';
import { User } from '../user/user.entity';
import * as md5 from 'md5'; // 引入md5加密库，用于密码加密
import { hasSubscribers } from 'diagnostics_channel';
import { JwtService } from '@nestjs/jwt';
import { Public } from './public.decorator';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
    ) {}

    async register(username: string, password: string, nickname?: string) {
        // 检查用户名是否已存在
        const existingUser = await this.userService.findByUsername(username);
        if (existingUser) {
            throw new ConflictException('用户名已存在');
        }

        // 创建新用户
        const newUser = new User();
        newUser.username = username;
        newUser.password = md5(password);
        newUser.nickname = nickname || username; // 如果没有提供昵称，使用用户名作为默认昵称

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
}
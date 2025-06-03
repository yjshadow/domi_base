import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()   
export class UserService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async GetAll(): Promise<User[]> {
        return await this.userRepository.find({order: { creat_date: 'DESC' }});
    }
    async GetOne(id: number): Promise<User> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new Error(`未找到 ID 为 ${id} 的用户`);
        }
        return user;
    }
    async findByUsername(username: string): Promise<User> {
        const user =  await this.userRepository.findOneBy({ username });
        if (!user) {
            throw new Error(`未找到 ${username} 的用户`);
        }
        return user;
    }
    async GetUserInfoByJwt(username: string): Promise<User> {
        const user =  await this.userRepository.findOneBy({ username });
        if (!user) {
            throw new Error(`未找到 ${username} 的用户`);
        }
        return user;
    }
    async Create(user: User): Promise<User> {
        return await this.userRepository.save(user);
    }
}
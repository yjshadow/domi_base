import { Entity, Column, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('domi_user') // 表名 默认为类名的小写  可以通过name属性指定表名  如@Entity('user') 或者@Entity('user', '')
export class User {
    @Column({name:'id',type:'bigint'})
    @PrimaryGeneratedColumn()
    id: number; 
    
    @Column({name:'uname',type:'varchar',length:50})
    @Unique(['uname'])
    username: string; //用户名 唯一(邮箱)
    
    @Column({name:'upass',type:'varchar',length:500})
    password: string;
    
    @Column({name:'avatar',type:'varchar',length:100,nullable:true})
    avatar: string; //头像地址
   
    @Column({name:'nickname',type:'varchar',length:30})
    nickname: string; //昵称 唯一
   
// 修正拼写错误，将 'datatime' 改为 'datetime'
    @Column({name:'creat_date',type:'timestamp',default: () => 'CURRENT_TIMESTAMP'})
    creat_date: Date;
   
    @Column({name:'role_sn',type:'int'})
    role_sn: number; // 权限等级 1普通用户 2管理员 3超级管理员
   
    @Column({name:'level_sn',type:'int'})
    level_sn: number; // 会员等级 1普通会员 2高级会员 3超级会员
   
    @Column({name:'u_state',type:'int'})
    u_state: number; //状态 1正常 2禁用 3注销
   
    @Column({name:'default_l',type:'varchar',length:10})
    default_l: string; // default language
   
    @Column({name:'uphone',type:'varchar',length:20})
    uphone: string; // phone number
}
import { IsString, IsEmail, MinLength } from 'class-validator';

export class  CreateUserDto{
  @IsEmail()
  username: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(6)
  code:string;

  @IsString()
  @MinLength(2)
  default_l:string;

  @IsString()
  avatar:string;

}
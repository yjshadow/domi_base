import { IsString, IsEmail, MinLength } from 'class-validator';

export class ChangePasswordDto {

  username: string;

  @IsEmail()  @IsString()
  @MinLength(8)
  oldpassword: string;

  @IsString()
  @MinLength(8)
  newpassword: string;
}
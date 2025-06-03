import { Injectable,CanActivate,ExecutionContext, UnauthorizedException } from "@nestjs/common"; //引入CanActivate接口 守卫
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { JWT_SECRET_KEY } from "./auth.jwt.secret";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthGuard implements CanActivate{
    constructor(private reflector : Reflector,private jwtService:JwtService){}
    async canActivate(context: ExecutionContext): Promise<boolean>{
        // 这里可以添加具体的守卫逻辑
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY,[
            context.getHandler(),
            context.getClass()
        ]); // 获取元数据 看是否是公开的路由;
        if(isPublic){ // 如果是公开的路由 则直接返回true;
            return true;
        } 
        const request = context.switchToHttp().getRequest(); // 获取请求对象
        const token=extractTokenFromHeader(request);
        if(!token){
            throw new UnauthorizedException(); 
        }
        try{
            const payload = await this.jwtService.verifyAsync(token,{secret:JWT_SECRET_KEY}); // 解密token
            request.user = payload; // 将解密后的数据挂载到请求对象上
            return true;
        } catch(err){
            throw new UnauthorizedException(); // 如果解密失败 则抛出异常
        }
        return true; // 或者返回true 表示通过守卫 可以访问路由;
    }
}

function extractTokenFromHeader(request){
   //const [type,token] request.headers.get('Authorization')?.split(' ');
   const [type,token] = request.headers['authorization']?.split(' ') ?? [];
   return type
}

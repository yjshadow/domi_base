import { Controller, Get,Post,Put,Delete,Param, UseFilters} from '@nestjs/common';
import { AppService } from './app.service';
import { HttpExceptionFilter } from './exception/http-exception-filer';
// 由于 'response' 已声明但从未使用，移除该导入
// import { response ,} from 'express';
//传输数据方式
//1.@Query()：url 参数
//2.@Body()：post参数
//3.@Param() :restful API参数
//4.@Headers()：
//5.@Res()
//6.@Req()
//7.@Next()
//8.@Session()
//9.@Ip()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  
}

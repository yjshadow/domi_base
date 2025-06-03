import { Injectable, HttpException, HttpStatus  } from '@nestjs/common';
import { retry } from 'rxjs';

@Injectable()
export class AppService {
  getHello(): string {
    return '你好，世界！';
  }
  getHello2(parmas): string {
    if(!parmas.id){
      throw new HttpException('我不在',HttpStatus.BAD_GATEWAY);
    }
    return 'nihao'+parmas.id;
  }
}

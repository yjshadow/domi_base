import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * 响应数据接口
 */
export interface Response<T> {
  code: number;
  data: T;
  message: string;
  timestamp: string;
}

/**
 * 响应拦截器
 * 用于统一处理成功的响应格式
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((data) => ({
        code: statusCode,
        data,
        message: this.getDefaultMessage(statusCode),
        timestamp: new Date().toISOString(),
      })),
    );
  }

  /**
   * 根据状态码获取默认消息
   */
  private getDefaultMessage(statusCode: number): string {
    switch (statusCode) {
      case 200:
        return '请求成功';
      case 201:
        return '创建成功';
      case 204:
        return '处理成功';
      default:
        return '操作成功';
    }
  }
}
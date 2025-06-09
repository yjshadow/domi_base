import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * 全局 HTTP 异常过滤器
 * 用于统一处理应用程序中的所有 HTTP 异常
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // 确定 HTTP 状态码
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // 获取错误消息
    const message =
      exception instanceof HttpException
        ? exception.message
        : '服务器内部错误';

    // 获取详细错误信息
    const errorResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message };

    // 记录错误日志
    this.logger.error({
      path: request.url,
      method: request.method,
      status,
      message,
      error: exception instanceof Error ? exception.stack : String(exception),
      timestamp: new Date().toISOString(),
    });

    // 构造错误响应
    const responseBody = {
      code: status,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      error:
        typeof errorResponse === 'object'
          ? errorResponse
          : { message: errorResponse },
    };

    response.status(status).json(responseBody);
  }
}
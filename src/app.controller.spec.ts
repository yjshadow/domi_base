// 导入NestJS测试模块中的Test和TestingModule，用于创建测试环境
import { Test, TestingModule } from '@nestjs/testing';
// 导入需要测试的控制器类AppController
import { AppController } from './app.controller';
// 导入控制器依赖的服务类AppService
import { AppService } from './app.service';

// 定义测试套件，名称为'AppController'，第二个参数是测试函数
 describe('AppController', () => {
  // 声明一个变量用于存储AppController实例
  let appController: AppController;

  // beforeEach钩子函数：在每个测试用例执行前运行，用于初始化测试环境
  beforeEach(async () => {
    // 创建测试模块，配置需要测试的控制器和依赖的服务
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController], // 指定要测试的控制器
      providers: [AppService], // 指定控制器依赖的服务
    }).compile(); // 编译模块（异步操作）

    // 从模块中获取AppController的实例，赋值给appController变量
    appController = app.get<AppController>(AppController);
  });

  // 定义子测试套件，名称为'root'，用于测试根路由相关功能
  describe('root', () => {
    // 定义具体的测试用例，描述为'应该返回"Hello World!"'
    it('should return "Hello World!"', () => {
      // 断言：调用appController的getHello方法应返回'Hello World!'
      expect(appController.getHello()).toBe('你好，世界！');
    });
  });
});

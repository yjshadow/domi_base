import { Module, DynamicModule, Provider, Optional } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleTranslationService } from './google-translation.service';
import { basename } from 'path';
import { BaseTranslationService } from './translation.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'TranslationService',
      useClass: GoogleTranslationService,
    },
  ],
  exports: ['TranslationService'],
})
export class TranslationModule {
  /**
   * 使用自定义翻译服务提供者配置模块
   * @param provider 翻译服务提供者
   * @returns 配置后的动态模块
   */
  static forRoot(provider: Provider): DynamicModule {
    return {
      module: TranslationModule,
      providers: [
        {
          provide: 'TranslationService',
          ...provider,
        } as Provider,
      ],
      exports: ['TranslationService'],
    };
  }

  /**
   * 使用指定的翻译服务类配置模块
   * @param translationServiceClass 翻译服务类
   * @returns 配置后的动态模块
   */
  static forFeature(translationServiceClass: any): DynamicModule {
    return {
      module: TranslationModule,
      providers: [
        {
          provide: 'TranslationService',
          useClass: translationServiceClass,
        },
      ],
      exports: ['TranslationService'],
    };
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { TranslationEngine } from '../interfaces/translation-engine.interface';
import { OpenAITranslationEngine } from '../engines/openai-translation.engine';

@Injectable()
export class TranslationEngineFactory {
  private readonly logger = new Logger(TranslationEngineFactory.name);
  private readonly engines: Map<string, TranslationEngine> = new Map();

  constructor(private readonly openAIEngine: OpenAITranslationEngine) {
    this.registerEngine(openAIEngine);
  }

  /**
   * 注册翻译引擎
   * @param engine 翻译引擎实例
   */
  registerEngine(engine: TranslationEngine): void {
    const engineName = engine.getName();
    this.engines.set(engineName, engine);
    this.logger.log(`Registered translation engine: ${engineName}`);
  }

  /**
   * 获取翻译引擎
   * @param engineName 引擎名称
   * @returns 翻译引擎实例
   */
  getEngine(engineName: string): TranslationEngine {
    const engine = this.engines.get(engineName);
    if (!engine) {
      throw new Error(`Translation engine not found: ${engineName}`);
    }
    return engine;
  }

  /**
   * 获取默认翻译引擎
   * @returns 默认翻译引擎实例
   */
  getDefaultEngine(): TranslationEngine {
    return this.openAIEngine;
  }

  /**
   * 获取所有可用的翻译引擎
   * @returns 翻译引擎列表
   */
  getAllEngines(): TranslationEngine[] {
    return Array.from(this.engines.values());
  }

  /**
   * 获取所有可用的翻译引擎名称
   * @returns 翻译引擎名称列表
   */
  getAvailableEngineNames(): string[] {
    return Array.from(this.engines.keys());
  }
}
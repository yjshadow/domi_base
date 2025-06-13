/**
 * 翻译配置接口
 */
export interface TranslationConfig {
  /**
   * 温度参数（0-2）：较低的值使输出更确定，较高的值使输出更多样化
   */
  temperature?: number;

  /**
   * 最大令牌数
   */
  maxTokens?: number;

  /**
   * 使用的模型
   */
  model?: string;

  /**
   * 重试次数
   */
  retryCount?: number;

  /**
   * 重试延迟（毫秒）
   */
  retryDelay?: number;
}

/**
 * 翻译结果接口
 */
export interface TranslationResult {
  /**
   * 翻译后的标题
   */
  title: string;

  /**
   * 翻译后的内容
   */
  content: string;

  /**
   * 翻译质量评分（0-100）
   */
  quality?: number;

  /**
   * 使用信息
   */
  usage?: {
    tokens?: number;
    promptTokens?: number;
    completionTokens?: number;
    cost?: number;
    model?: string;
  };

  /**
   * 额外元数据
   */
  metadata?: Record<string, any>;
}

/**
 * 翻译引擎接口
 */
export interface TranslationEngine {
  /**
   * 获取引擎名称
   */
  getName(): string;

  /**
   * 获取引擎描述
   */
  getDescription(): string;

  /**
   * 获取支持的语言列表
   */
  getSupportedLanguages(): Promise<string[]>;

  /**
   * 检测文本语言
   * @param text 要检测的文本
   */
  detectLanguage(text: string): Promise<string>;

  /**
   * 翻译文本
   * @param title 标题
   * @param content 内容
   * @param targetLanguage 目标语言
   * @param sourceLanguage 源语言（可选，如果不提供将自动检测）
   * @param config 翻译配置（可选）
   */
  translate(
    title: string,
    content: string,
    targetLanguage: string,
    sourceLanguage?: string,
    config?: TranslationConfig,
  ): Promise<TranslationResult>;
}
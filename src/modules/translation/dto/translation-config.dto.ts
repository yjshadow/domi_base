export class TranslationConfigDto {
  apiKey: string;
  defaultTargetLanguage = 'zh'; // 默认翻译为中文
  timeout = 5000; // 默认超时5秒
  endpoint?: string; // 自定义API端点
}
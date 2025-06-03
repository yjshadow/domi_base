import { nanoid } from 'nanoid';

// 生成指定长度的数字验证码（如 6 位）
export function generateVerifyCode(length = 6): string {
  return nanoid(length).replace(/[a-z]/g, (char) => 
    ((parseInt(char, 10) + 10) % 10).toString() // 确保结果为纯数字且为字符串类型
  );
}
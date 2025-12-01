/**
 * 时间工具函数
 */

/**
 * 获取当前北京时间（UTC+8）
 * @returns 北京时间 Date 对象
 */
export function getBeijingTime(): Date {
  const now = new Date();
  // 获取 UTC 时间
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  // 转换为北京时间（UTC+8）
  const beijingTime = new Date(utcTime + 8 * 3600000);
  return beijingTime;
}

/**
 * 将 Date 对象转换为北京时间字符串
 * @param date Date 对象
 * @returns 北京时间字符串（格式：YYYY-MM-DD HH:mm:ss）
 */
export function formatBeijingTime(date: Date | null): string | null {
  if (!date) {
    return null;
  }
  const beijingDate = new Date(date);
  // 如果日期是 UTC 时间，需要转换为北京时间
  const utcTime = beijingDate.getTime() + beijingDate.getTimezoneOffset() * 60000;
  const beijingTime = new Date(utcTime + 8 * 3600000);

  const year = beijingTime.getFullYear();
  const month = String(beijingTime.getMonth() + 1).padStart(2, '0');
  const day = String(beijingTime.getDate()).padStart(2, '0');
  const hours = String(beijingTime.getHours()).padStart(2, '0');
  const minutes = String(beijingTime.getMinutes()).padStart(2, '0');
  const seconds = String(beijingTime.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}


/**
 * 获取北京时间（UTC+8）
 */
export function getBeijingTime(): Date {
  const now = new Date();
  // 北京时间是 UTC+8
  const beijingOffset = 8 * 60; // 8小时 = 480分钟
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const beijingTime = new Date(utc + beijingOffset * 60000);
  return beijingTime;
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm:ss
 * @param date 日期对象或日期字符串
 * @returns 格式化后的字符串
 */
export function formatDateTime(
  date: Date | string | null | undefined,
): string | null {
  if (!date) {
    return null;
  }

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) {
    return null;
  }

  // 转换为北京时间显示
  const beijingOffset = 8 * 60; // 8小时 = 480分钟
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const beijingTime = new Date(utc + beijingOffset * 60000);

  const year = beijingTime.getFullYear();
  const month = String(beijingTime.getMonth() + 1).padStart(2, '0');
  const day = String(beijingTime.getDate()).padStart(2, '0');
  const hours = String(beijingTime.getHours()).padStart(2, '0');
  const minutes = String(beijingTime.getMinutes()).padStart(2, '0');
  const seconds = String(beijingTime.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 将日期转换为北京时间并返回 Date 对象（用于数据库存储）
 * @param date 日期对象
 * @returns 北京时间 Date 对象
 */
export function toBeijingDate(date: Date): Date {
  const beijingOffset = 8 * 60; // 8小时 = 480分钟
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const beijingTime = new Date(utc + beijingOffset * 60000);
  return beijingTime;
}



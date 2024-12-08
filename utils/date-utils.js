/**
 * 日期处理工具类
 */
export class DateUtils {
  /**
   * 解析 ISO 格式的时间字符串
   * @param {string} isoString - ISO格式的时间字符串
   * @returns {Object} 包含格式化后的日期和时间信息
   */
  static parseISODateTime(isoString) {
    const date = new Date(isoString);
    
    // 获取日期部分
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // 获取时间部分
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    // 构建友好的显示格式
    const dateStr = `${year}年${month}月${day}日`;
    const timeStr = `${hours}:${minutes}`;
    
    return {
      date: dateStr,
      time: timeStr,
      fullDateTime: `${dateStr} ${timeStr}`
    };
  }

  /**
   * 格式化日期对象为字符串
   * @param {Date} date - 日期对象
   * @returns {string} 格式化后的日期字符串
   */
  static formatDateTime(date) {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  /**
   * 将日期转换为Google Calendar URL格式
   * @param {Date} date - 日期对象
   * @returns {string} 格式化后的URL日期字符串
   */
  static formatDateTimeForGoogleCalendar(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }
}

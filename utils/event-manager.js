import { calendarAPI } from '../calendar-api.js';
import { DateUtils } from './date-utils.js';

/**
 * 事件管理类
 */
export class EventManager {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.schedules = [];
  }

  /**
   * 设置事件列表
   * @param {Array} schedules - 事件列表
   */
  setSchedules(schedules) {
    this.schedules = schedules;
  }

  /**
   * 获取事件列表
   * @returns {Array} 事件列表
   */
  getSchedules() {
    return this.schedules;
  }

  /**
   * 添加到Google日历（需要授权）
   * @param {number} eventIndex - 事件索引
   */
  async addToGoogleCalendar(eventIndex) {
    const schedule = this.schedules[eventIndex];
    if (!schedule) return;

    try {
      this.uiManager.showProgress('正在添加到Google日历...');
      
      const event = {
        summary: schedule.title || '未命名事件',
        description: schedule.description || '',
        start: {
          dateTime: new Date(schedule.startTime).toISOString()
        },
        end: {
          dateTime: new Date(schedule.endTime).toISOString()
        },
        location: schedule.location || ''
      };

      await calendarAPI.insertEvent(event);
      
      this.uiManager.hideProgress();
      const button = document.querySelector(`#schedule-${eventIndex} .add-to-calendar-btn`);
      this.uiManager.setButtonSuccess(button, '✓ 添加成功');
      
    } catch (error) {
      this.uiManager.hideProgress();
      console.error('添加失败:', error);
      alert('添加失败：' + error.message);
    }
  }

  /**
   * 快速添加到Google日历（无需授权）
   * @param {number} eventIndex - 事件索引
   */
  quickAddToGoogleCalendar(eventIndex) {
    const schedule = this.schedules[eventIndex];
    if (!schedule) return;

    // 构造Google Calendar事件URL
    const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
    const title = encodeURIComponent(schedule.title || '未命名事件');
    
    // 格式化时间
    const startTime = DateUtils.formatDateTimeForGoogleCalendar(new Date(schedule.startTime));
    const endTime = DateUtils.formatDateTimeForGoogleCalendar(new Date(schedule.endTime));
    
    // 构造详细信息
    const details = encodeURIComponent(schedule.description || '');
    const location = encodeURIComponent(schedule.location || '');

    // 组合完整的URL
    const url = `${baseUrl}&text=${title}&dates=${startTime}/${endTime}&details=${details}&location=${location}`;

    // 在新标签页中打开Google Calendar
    window.open(url, '_blank');
    
    // 更新按钮状态
    const button = document.querySelector(`#schedule-${eventIndex} .quick-add-btn`);
    this.uiManager.setButtonSuccess(button, '✓ 已打开');
  }

  /**
   * 下载ICS文件
   * @param {number} eventIndex - 事件索引
   */
  async downloadICS(eventIndex) {
    const schedule = this.schedules[eventIndex];
    if (!schedule) return;

    try {
      this.uiManager.showProgress('正在生成ICS文件...');
      
      const response = await fetch('/api/generate-ics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(schedule)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${schedule.title || 'schedule'}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.uiManager.hideProgress();
      const button = document.querySelector(`#schedule-${eventIndex} .download-ics-btn`);
      this.uiManager.setButtonSuccess(button, '✓ 下载完成');
      
    } catch (error) {
      this.uiManager.hideProgress();
      console.error('下载失败:', error);
      alert('下载失败：' + error.message);
    }
  }
}

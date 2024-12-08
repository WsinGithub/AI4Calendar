/**
 * UI管理类
 */
export class UIManager {
  constructor() {
    this.progressContainer = null;
    this.progressText = null;
    this.timeLeftSpan = null;
    this.scheduleList = null;
    this.countdownTimer = null;
  }

  /**
   * 初始化UI管理器
   */
  initialize() {
    this.progressContainer = document.getElementById('progressContainer');
    this.progressText = document.getElementById('progressText');
    this.timeLeftSpan = document.getElementById('timeLeft');
    this.scheduleList = document.getElementById('scheduleList');
  }

  /**
   * 显示进度条
   * @param {string} text - 显示的文本
   * @param {number} seconds - 倒计时秒数
   */
  showProgress(text, seconds = 15) {
    if (!this.progressContainer) {
      console.error('UIManager not initialized');
      return;
    }

    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }

    this.progressText.textContent = text;
    this.progressContainer.style.display = 'block';
    this.scheduleList.style.display = 'none';
    
    let timeLeft = seconds;
    this.timeLeftSpan.textContent = timeLeft;

    this.countdownTimer = setInterval(() => {
      timeLeft--;
      this.timeLeftSpan.textContent = timeLeft;
      
      if (timeLeft <= 0) {
        clearInterval(this.countdownTimer);
        this.hideProgress();
      }
    }, 1000);
  }

  /**
   * 隐藏进度条
   */
  hideProgress() {
    if (!this.progressContainer) {
      console.error('UIManager not initialized');
      return;
    }

    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.progressContainer.style.display = 'none';
    this.scheduleList.style.display = 'block';
  }

  /**
   * 设置按钮成功状态
   * @param {HTMLElement} button - 按钮元素
   * @param {string} text - 显示的文本
   */
  setButtonSuccess(button, text) {
    const originalText = button.textContent;
    const originalColor = button.style.backgroundColor;
    
    button.textContent = text;
    button.style.backgroundColor = '#4CAF50';
    button.disabled = true;

    setTimeout(() => {
      button.textContent = originalText;
      button.style.backgroundColor = originalColor;
      button.disabled = false;
    }, 2000);
  }

  /**
   * 创建事件卡片
   * @param {Object} schedule - 事件信息
   * @param {number} index - 事件索引
   * @returns {HTMLElement} 事件卡片元素
   */
  createScheduleCard(schedule, index) {
    const card = document.createElement('div');
    card.className = 'schedule-card';
    card.id = `schedule-${index}`;
    
    // 添加事件标题
    const title = document.createElement('div');
    title.className = 'schedule-title';
    title.textContent = schedule.title || '未命名事件';
    card.appendChild(title);
    
    // 添加事件时间
    if (schedule.startTime || schedule.endTime) {
      const time = document.createElement('div');
      time.className = 'schedule-time';
      time.textContent = `${schedule.startTime || ''} - ${schedule.endTime || ''}`;
      card.appendChild(time);
    }
    
    // 添加事件描述
    if (schedule.description) {
      const desc = document.createElement('div');
      desc.className = 'schedule-description';
      desc.textContent = schedule.description;
      card.appendChild(desc);
    }
    
    // 添加事件地点
    if (schedule.location) {
      const loc = document.createElement('div');
      loc.className = 'schedule-location';
      loc.textContent = schedule.location;
      card.appendChild(loc);
    }
    
    // 添加按钮组
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';
    
    // 添加到Google日历按钮
    const addButton = document.createElement('button');
    addButton.className = 'add-to-calendar-btn';
    addButton.textContent = '添加到Google日历';
    buttonGroup.appendChild(addButton);
    
    // 快速添加按钮
    const quickAddButton = document.createElement('button');
    quickAddButton.className = 'quick-add-btn';
    quickAddButton.textContent = '快速添加';
    buttonGroup.appendChild(quickAddButton);
    
    card.appendChild(buttonGroup);
    
    return card;
  }

  /**
   * 清空日程列表
   */
  clearScheduleList() {
    if (!this.scheduleList) {
      console.error('UIManager not initialized');
      return;
    }
    this.scheduleList.innerHTML = '';
  }

  /**
   * 添加日程卡片到列表
   * @param {HTMLElement} card - 日程卡片元素
   */
  appendScheduleCard(card) {
    if (!this.scheduleList) {
      console.error('UIManager not initialized');
      return;
    }
    this.scheduleList.appendChild(card);
  }
}

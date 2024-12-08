import { calendarAPI } from './calendar-api.js';

document.addEventListener('DOMContentLoaded', async function() {
  const refreshBtn = document.getElementById('refreshBtn');
  const scheduleList = document.getElementById('scheduleList');
  const progressContainer = document.getElementById('progressContainer');
  const progressText = document.getElementById('progressText');
  const timeLeftSpan = document.getElementById('timeLeft');
  let countdownTimer = null;

  async function executeContentScript(tabId) {
    try {
      console.log('开始注入脚本...');
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      console.log('脚本注入成功');
      // 等待脚本初始化
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('注入脚本失败:', error);
      throw error;
    }
  }

  function showProgress(text, seconds = 15) {
    progressContainer.style.display = 'block';
    progressText.textContent = text;
    scheduleList.style.display = 'none';
    
    if (countdownTimer) {
      clearInterval(countdownTimer);
    }
    
    let timeLeft = seconds;
    timeLeftSpan.textContent = timeLeft;
    
    countdownTimer = setInterval(() => {
      timeLeft--;
      timeLeftSpan.textContent = timeLeft;
      
      if (timeLeft <= 0) {
        clearInterval(countdownTimer);
      }
    }, 1000);
  }
  
  function hideProgress() {
    progressContainer.style.display = 'none';
    scheduleList.style.display = 'block';
    
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  async function refreshSchedules() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    try {
      showProgress('正在分析页面内容...', 8);
      console.log('尝试发送消息到 content script');
      
      // 先尝试注入脚本
      await executeContentScript(tab.id);
      
      // 然后发送消息
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractSchedule' });
      console.log('收到响应:', response);
      
      if (response.schedule) {
        hideProgress();
        displaySchedule(response.schedule);
      } else if (response.error) {
        hideProgress();
        scheduleList.innerHTML = `<div class="no-schedule">错误: ${response.error}</div>`;
      } else {
        hideProgress();
        scheduleList.innerHTML = '<div class="no-schedule">未能识别出日程信息</div>';
      }
    } catch (error) {
      showProgress('正在重新加载识别组件...', 2);
      console.log('消息发送失败，尝试重新注入 content script...');
      try {
        await executeContentScript(tab.id);
        console.log('content script 重新注入成功');
        
        setTimeout(async () => {
          try {
            showProgress('重新尝试分析页面...', 8);
            console.log('重试发送消息...');
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractSchedule' });
            console.log('重试后收到响应:', response);
            
            hideProgress();
            if (response.schedule) {
              displaySchedule(response.schedule);
            } else if (response.error) {
              scheduleList.innerHTML = `<div class="no-schedule">错误: ${response.error}</div>`;
            } else {
              scheduleList.innerHTML = '<div class="no-schedule">未能识别出日程信息</div>';
            }
          } catch (retryError) {
            hideProgress();
            console.error('重试失败:', retryError);
            scheduleList.innerHTML = `<div class="no-schedule">无法识别页面内容: ${retryError.message}</div>`;
          }
        }, 300);
      } catch (injectionError) {
        hideProgress();
        console.error('注入失败:', injectionError);
        scheduleList.innerHTML = `<div class="no-schedule">脚本注入失败: ${injectionError.message}</div>`;
      }
    }
  }

  function displaySchedule(schedule) {
    let scheduleHtml = '';
    
    // 遍历所有事件
    schedule.events.forEach((event, index) => {
      const startDate = parseISODateTime(event.startDate);
      const endDate = parseISODateTime(event.endDate);
      
      scheduleHtml += `
        <div class="schedule-card">
          <div class="event-header">
            <div class="event-title">${event.title}</div>
            ${schedule.confidence ? 
              `<div class="confidence-badge">${(schedule.confidence * 100).toFixed(1)}% 可信度</div>` 
              : ''}
          </div>
          
          <div class="event-details">
            <div class="event-item">
              <div class="detail-label">时间：</div>
              <div class="detail-content">
                <div>开始：${formatDateTime(startDate)}</div>
                <div>结束：${formatDateTime(endDate)}</div>
              </div>
            </div>
            
            ${event.location ? `
              <div class="event-item">
                <div class="detail-label">地点：</div>
                <div class="detail-content">${event.location}</div>
              </div>
            ` : ''}
            
            ${event.description ? `
              <div class="event-item">
                <div class="detail-label">描述：</div>
                <div class="detail-content">${event.description}</div>
              </div>
            ` : ''}
          </div>

          <div class="button-group">
            <button class="primary-btn" onclick="quickAddToGoogleCalendar(${index})" data-action="quickAdd" data-index="${index}">
              添加到 Google Calendar
            </button>
            <button data-action="copyLogseq" data-index="${index}" class="secondary-btn">
              复制 Logseq 格式
            </button>
          </div>
        </div>
      `;
    });

    scheduleList.innerHTML = scheduleHtml;
  }

// 解析 ISO 格式的时间字符串
function parseISODateTime(isoString) {
  if (!isoString) return null;

  try {
    // 处理完整的 ICS 时间格式
    let timeStr = isoString;
    
    // 如果包含 TZID，提取时间部分
    if (isoString.includes('TZID=')) {
      timeStr = isoString.split(':')[1];
    }
    
    // 如果包含 DTSTART 或 DTEND，去掉前缀
    if (timeStr.includes('DTSTART') || timeStr.includes('DTEND')) {
      timeStr = timeStr.split(':').pop();
    }
    
    const year = parseInt(timeStr.substr(0, 4));
    const month = parseInt(timeStr.substr(4, 2)) - 1;
    const day = parseInt(timeStr.substr(6, 2));
    const hour = parseInt(timeStr.substr(9, 2));
    const minute = parseInt(timeStr.substr(11, 2));
    const second = parseInt(timeStr.substr(13, 2) || '00');

    return new Date(year, month, day, hour, minute, second);
  } catch (error) {
    console.error('解析时间失败:', error, isoString);
    return null;
  }
}

  function formatDateTime(date) {
    if (!(date instanceof Date) || isNaN(date)) {
      return '无效时间';
    }
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  window.downloadICS = async function() {
    try {
      showProgress('正在生成日历文件...', 5);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'generateICS' });
      
      console.log('下载响应:', response);
      
      if (response.error) {
        hideProgress();
        console.error('生成ICS失败:', response.error);
        alert('生成失败：' + response.error);
        return;
      }
      
      // 使用 Blob 创建下载
      const blob = new Blob([response.icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${response.filename || 'schedule'}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      hideProgress();
    } catch (error) {
      hideProgress();
      console.error('下载失败:', error);
      alert('下载失败：' + error.message);
    }
  };

  // 初始化函数
  async function initialize() {
    const config = await chrome.storage.local.get(['openaiApiKey', 'modelConfig']);
    
    if (config.modelConfig) {
      document.getElementById('modelSelect').value = config.modelConfig.model;
      document.getElementById('temperatureInput').value = config.modelConfig.temperature;
      document.getElementById('temperatureValue').textContent = config.modelConfig.temperature;
    }
    
    if (config.openaiApiKey) {
      apiKeyInput.value = config.openaiApiKey;
      await refreshSchedules();
    } else {
      scheduleList.innerHTML = '<div class="no-schedule">请先设置 OpenAI API Key</div>';
    }

    // 设置事件监听
    refreshBtn.addEventListener('click', refreshSchedules);
    
    // 添加 temperature 滑块事件
    document.getElementById('temperatureInput').addEventListener('input', function(e) {
      document.getElementById('temperatureValue').textContent = e.target.value;
    });

    // 添加全局事件委托
    document.addEventListener('click', async function(event) {
      const button = event.target.closest('button');
      if (!button) return;

      const action = button.dataset.action;
      const index = parseInt(button.dataset.index);

      if (action === 'addToCalendar') {
        await addToGoogleCalendar(index);
      } else if (action === 'copyLogseq') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const response = await chrome.tabs.sendMessage(tab.id, { 
          action: 'getLastRecognizedSchedule'
        });
        
        if (response.schedule && response.schedule.events[index]) {
          try {
            const event = response.schedule.events[index];
            const startDate = parseISODateTime(event.startDate);
            const logseqContent = `- TODO ${event.title} ${event.location ? `@${event.location}` : ''} #Event\n` +
              `  SCHEDULED: <${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')} ` +
              `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][startDate.getDay()]} ` +
              `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}>\n` +
              `  :AGENDA:\n` +
              `  estimated: ${Math.ceil((parseISODateTime(event.endDate) - startDate) / (1000 * 60 * 60))}h\n` +
              `  :END:`;

            await navigator.clipboard.writeText(logseqContent);
            setButtonSuccess(button, '✓ 已复制');
          } catch (error) {
            console.error('复制失败:', error);
            alert('复制失败');
          }
        }
      } else if (action === 'quickAdd') {
        await quickAddToGoogleCalendar(index);
      }
    });
  }

  // 添加 API key 管理
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveApiKeyBtn = document.getElementById('saveApiKey');

  // 加载已保存的 API key
  chrome.storage.local.get(['openaiApiKey'], function(result) {
    if (result.openaiApiKey) {
      apiKeyInput.value = result.openaiApiKey;
    }
  });

  // 保存 API key 并立即执行识别
  saveApiKeyBtn.addEventListener('click', async function() {
    const apiKey = apiKeyInput.value.trim();
    const model = document.getElementById('modelSelect').value;
    const temperature = parseFloat(document.getElementById('temperatureInput').value);
    
    if (apiKey) {
      await chrome.storage.local.set({ 
        openaiApiKey: apiKey,
        modelConfig: {
          model: model,
          temperature: temperature,
          max_tokens: 1000
        }
      });
      alert('设置已保存');
      await refreshSchedules();
    }
  });

  // 添加按钮状态处理函数
  function setButtonSuccess(button, text) {
    const originalText = button.textContent;  // 保存原始文本
  
    // 先恢复按钮状态
    button.disabled = false;
  
    // 添加过渡类
    button.classList.add('btn-transition', 'btn-ripple');
  
    // 触发波纹动画
    button.classList.add('success');
  
    // 更改样式和文本
    button.classList.add('btn-success');
    button.textContent = text;
  
    // 3秒后恢复原状
    setTimeout(() => {
      button.classList.remove('btn-success', 'success');
      button.textContent = originalText;  // 使用保存的原始文本
    }, 3000);
  
    // 清理波纹动画类
    setTimeout(() => {
      button.classList.remove('success');
    }, 1000);
  }

  // 修改添加到日历的处理
  async function addToGoogleCalendar(eventIndex) {
    const button = document.querySelector(`[data-action="addToCalendar"][data-index="${eventIndex}"]`);
    if (!button) return;

    try {
      console.log('开始添加到 Google Calendar, eventIndex:', eventIndex);
      
      // 更改按钮状态
      button.disabled = true;
      button.textContent = '正在添加...';
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { 
        action: 'getLastRecognizedSchedule'
      });
      
      if (response.schedule && response.schedule.events[eventIndex]) {
        const event = response.schedule.events[eventIndex];
        try {
          const result = await calendarAPI.addEventToCalendar(event);
          console.log('Calendar API 返回结果:', result);
          setButtonSuccess(button, '✓ 已添加到日历');
        } catch (calendarError) {
          console.error('Calendar API 错误:', calendarError);
          // 恢复按钮状态
          button.disabled = false;
          button.textContent = '添加到 Google Calendar';
          if (calendarError.message.includes('token')) {
            alert('请先登录 Google 账号并授权日历访问权限');
          } else {
            alert(`添加失败: ${calendarError.message}`);
          }
        }
      } else {
        console.error('未找到事件信息:', response);
        // 恢复按钮状态
        button.disabled = false;
        button.textContent = '添加到 Google Calendar';
        alert('未找到事件信息');
      }
    } catch (error) {
      console.error('添加到 Google Calendar 失败:', error);
      // 恢复按钮状态
      button.disabled = false;
      button.textContent = '添加到 Google Calendar';
      alert(`添加失败: ${error.message}`);
    }
  }

  // 同样修改下载成功的处理
  async function downloadICS() {
    try {
      const button = document.querySelector('[data-action="downloadICS"]');
      showProgress('正在生成日历文件...', 5);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'generateICS' });
      
      console.log('下载响应:', response);
      
      if (response.error) {
        hideProgress();
        console.error('生成ICS失败:', response.error);
        alert('生成失败：' + response.error);
        return;
      }
      
      const blob = new Blob([response.icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${response.filename || 'schedule'}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      hideProgress();
      
      // 下载成功后
      setButtonSuccess(button, '✓ 下载完成');
    } catch (error) {
      hideProgress();
      console.error('下载失败:', error);
      alert('下载失败：' + error.message);
    }
  }

  // 快速添加到Google Calendar（无需授权）
  window.quickAddToGoogleCalendar = async function(eventIndex) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { 
        action: 'getLastRecognizedSchedule'
      });
      
      if (response.schedule && response.schedule.events[eventIndex]) {
        const event = response.schedule.events[eventIndex];
        console.log('Event data:', event);  
        
        // 构造Google Calendar事件URL
        const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
        const title = encodeURIComponent(event.title || '未命名事件');
        
        // 处理时区转换（从美东时间转换为UTC）
        const convertToUTC = (dateStr) => {
          // 解析日期字符串 (YYYYMMDDTHHMMSS 格式)
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(4, 6)) - 1; // 月份从0开始
          const day = parseInt(dateStr.substring(6, 8));
          const hour = parseInt(dateStr.substring(9, 11));
          const minute = parseInt(dateStr.substring(11, 13));
          const second = parseInt(dateStr.substring(13, 15));

          // 创建美东时间的日期对象
          const etDate = new Date(year, month, day, hour, minute, second);
          
          // 转换为UTC
          const utcYear = etDate.getUTCFullYear();
          const utcMonth = String(etDate.getUTCMonth() + 1).padStart(2, '0');
          const utcDay = String(etDate.getUTCDate()).padStart(2, '0');
          const utcHour = String(etDate.getUTCHours()).padStart(2, '0');
          const utcMinute = String(etDate.getUTCMinutes()).padStart(2, '0');
          const utcSecond = String(etDate.getUTCSeconds()).padStart(2, '0');

          return `${utcYear}${utcMonth}${utcDay}T${utcHour}${utcMinute}${utcSecond}Z`;
        };

        const startTime = convertToUTC(event.startDate);
        const endTime = convertToUTC(event.endDate);
        
        // 构造详细信息
        const details = encodeURIComponent(event.description || '');
        const location = encodeURIComponent(event.location || '');

        // 组合完整的URL
        const url = `${baseUrl}&text=${title}&dates=${startTime}/${endTime}&details=${details}&location=${location}`;
        console.log('Google Calendar URL:', url);

        // 在新标签页中打开Google Calendar
        window.open(url, '_blank');
        
        // 更新按钮状态
        const button = document.querySelector(`[data-action="quickAdd"][data-index="${eventIndex}"]`);
        if (button) {
          setButtonSuccess(button, '✓ 已打开');
        }
      }
    } catch (error) {
      console.error('快速添加失败:', error);
      alert('快速添加失败: ' + error.message);
    }
  };

  // 执行初始化
  await initialize();
}); 
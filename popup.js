document.addEventListener('DOMContentLoaded', function() {
  const extractBtn = document.getElementById('extractBtn');
  const resultDiv = document.getElementById('result');
  const downloadBtn = document.getElementById('downloadICS');

  extractBtn.addEventListener('click', async () => {
    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // 向内容脚本发送消息
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractSchedule' });
    
    if (response.schedule) {
      resultDiv.innerHTML = `
        <h3>${response.schedule.title}</h3>
        <p>时间：${response.schedule.startDate} - ${response.schedule.endDate}</p>
        <p>描述：${response.schedule.description}</p>
      `;
      downloadBtn.style.display = 'block';
    } else {
      resultDiv.innerHTML = '未能识别出日程信息';
    }
  });

  downloadBtn.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'generateICS' });
  });
}); 
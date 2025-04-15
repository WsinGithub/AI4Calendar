console.log('content script loaded');

// 使用简单的全局变量作为缓存
let lastRecognizedSchedule = null;

// 提取页面文本内容和邮件元数据
function extractPageContent() {
  const emailBody = document.querySelector('.a3s.aiL') || document.body;
  
  // 尝试获取邮件时间
  let emailDate = null;
  try {
    // Gmail 邮件时间选择器
    const timeElement = document.querySelector('.g3');
    if (timeElement) {
      emailDate = new Date(timeElement.getAttribute('title') || timeElement.textContent);
      console.log('提取到的邮件时间:', emailDate);
    }
  } catch (error) {
    console.error('提取邮件时间失败:', error);
  }
  
  // 提取所有链接，特别是会议链接（如Zoom）
  const links = {};
  try {
    const allLinks = emailBody.querySelectorAll('a');
    allLinks.forEach(link => {
      const href = link.getAttribute('href');
      const text = link.textContent.trim();
      
      if (href) {
        // 识别常见会议链接
        if (href.includes('zoom.us')) {
          links.zoom = links.zoom || href;
        } else if (href.includes('teams.microsoft.com')) {
          links.teams = links.teams || href;
        } else if (href.includes('meet.google.com')) {
          links.gmeet = links.gmeet || href;
        } else if (href.includes('webex.com')) {
          links.webex = links.webex || href;
        }
        
        // 保存链接文本与URL的对应关系
        links[text] = href;
      }
    });
    console.log('提取到的链接:', links);
  } catch (error) {
    console.error('提取链接失败:', error);
  }

  const extractedContent = {
    text: emailBody.innerText,
    html: emailBody.innerHTML,
    emailDate: emailDate ? emailDate.toISOString() : null,
    links: links
  };
  console.log('提取到的页面内容:', extractedContent);
  return extractedContent;
}

async function extractScheduleInfo() {
  const pageContent = extractPageContent();
  
  try {
    // 获取 API key 和模型配置
    const config = await chrome.storage.local.get(['openaiApiKey', 'modelConfig']);
    if (!config.openaiApiKey) {
      throw new Error('API key not found');
    }

    // 默认使用 gpt-4o-mini，除非特别指定
    const modelConfig = config.modelConfig || {
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 3000
    };

    console.log('使用模型配置:', modelConfig);

    const prompt = `
      你是一个日程识别助手。请分析以下文本，提取日程信息并生成两种格式：ICS 格式和 Logseq TODO 格式。

      要求：
      1. 识别文本中所有可能的日程事件
      2. 智能推断时间：
         - 所有时间均基于美东时间 (America/New_York)
         - 如果遇到"明天"、"下周"等相对时间，请基于邮件发送时间 ${pageContent.emailDate} 来计算
         - 如果没有提供发送时间，则基于当前时间计算
         - 优先使用明确的日期时间
      3. 如无结束时间：会议默认1小时，活动默认2小时，全天事件用当天全天
      4. 地点可以是实体地点或线上会议链接
      5. 每个事件生成独立的 VEVENT 条目
      6. 如果文本中提到"每周"、"每月"等重复模式，请添加 RRULE 属性
      7. 优先使用邮件中提取到的会议链接，特别是在LOCATION字段使用

      邮件中提取到的链接:
      ${JSON.stringify(pageContent.links, null, 2)}

      请按照以下格式返回：

      ---ICS_START---
      BEGIN:VCALENDAR
      VERSION:2.0
      BEGIN:VTIMEZONE
      TZID:America/New_York
      BEGIN:STANDARD
      DTSTART:20241103T020000
      TZOFFSETFROM:-0400
      TZOFFSETTO:-0500
      RRULE:FREQ=YEARLY;BYDAY=1SU;BYMONTH=11
      END:STANDARD
      BEGIN:DAYLIGHT
      DTSTART:20240310T020000
      TZOFFSETFROM:-0500
      TZOFFSETTO:-0400
      RRULE:FREQ=YEARLY;BYDAY=2SU;BYMONTH=3
      END:DAYLIGHT
      END:VTIMEZONE
      BEGIN:VEVENT
      SUMMARY:事件标题
      DTSTART;TZID=America/New_York:20240321T100000
      DTEND;TZID=America/New_York:20240321T110000
      LOCATION:地点或会议链接 (邮件中提取到的链接可以在这里使用！)
      DESCRIPTION:描述
      END:VEVENT
      END:VCALENDAR
      ---ICS_END---

      ---LOGSEQ_START---
      - TODO 事件标题 @地点或会议链接 #PennEvent
      SCHEDULED: <2024-03-21 Thu 10:00> 
      :AGENDA:
      estimated: 1h
      :END:
      ---LOGSEQ_END---

      另外在最后，请用 JSON 格式提供识别的可信度和推理过程：
      {
        "confidence": 0.95,
        "reasoning": "时间推断说明..."
      }

      待分析文本：
      ${pageContent.text}
    `;

    console.log('准备发送到 OpenAI 的提示词:', prompt);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openaiApiKey}`
      },
      body: JSON.stringify({
        model: modelConfig.model,
        messages: [{
          role: "system",
          content: "你是一个专业的日程识别助手，善于生成标准ICS格式的日历文件。"
        }, {
          role: "user",
          content: prompt
        }],
        temperature: modelConfig.temperature,
        max_tokens: modelConfig.max_tokens
      })
    });

    const data = await response.json();
    console.log('OpenAI 返回的原始数据:', data);

    if (data.error) {
      throw new Error(data.error.message);
    }

    const responseContent = data.choices[0].message.content;
    console.log('OpenAI 返回的处理后内容:', responseContent);

    const icsMatch = responseContent.match(/---ICS_START---\n([\s\S]*?)\n---ICS_END---/);
    const logseqMatch = responseContent.match(/---LOGSEQ_START---\n([\s\S]*?)\n---LOGSEQ_END---/);
    const confidenceMatch = responseContent.match(/{\s*"confidence":\s*([\d.]+),\s*"reasoning":\s*"([^"]+)"\s*}/);
    
    if (!icsMatch) {
      throw new Error('无法解析ICS内容');
    }

    const icsContent = icsMatch[1];
    const logseqContent = logseqMatch ? logseqMatch[1] : null;
    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : null;
    const reasoning = confidenceMatch ? confidenceMatch[2] : null;

    console.log('解析出的 ICS 内容:', icsContent);
    console.log('识别可信度:', confidence);

    // 解析所有 VEVENT 块时也解析 RRULE
    const eventMatches = icsContent.matchAll(/BEGIN:VEVENT\n([\s\S]*?)END:VEVENT/g);
    const events = [];

    for (const match of eventMatches) {
      const eventContent = match[1];
      events.push({
        title: (eventContent.match(/SUMMARY:(.+)/) || [])[1] || null,
        startDate: (eventContent.match(/DTSTART;TZID=America\/New_York:(.+)/) || [])[1] || null,
        endDate: (eventContent.match(/DTEND;TZID=America\/New_York:(.+)/) || [])[1] || null,
        location: (eventContent.match(/LOCATION:(.+)/) || [])[1] || null,
        description: (eventContent.match(/DESCRIPTION:(.+)/) || [])[1] || null,
        recurrence: (eventContent.match(/RRULE:(.+)/) || [])[1] || null
      });
    }

    return {
      events: events,
      confidence: confidence,
      reasoning: reasoning,
      icsContent: icsContent,
      logseqContent: logseqContent,
      debug: {
        sentText: pageContent.text,
        emailDate: pageContent.emailDate,
        receivedContent: data.choices[0].message.content
      }
    };

  } catch (error) {
    console.error('AI 识别失败:', error);
    return extractScheduleInfoBasic(pageContent.text);
  }
}

// 基础的日程识别方法（作为后备方案）
function extractScheduleInfoBasic(text) {
  // ... 基础识别逻辑保持不变 ...
}

// 修改消息监听器
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request.action);
  
  if (request.action === 'getLastRecognizedSchedule') {
    if (lastRecognizedSchedule) {
      console.log('返回缓存的识别结果');
      sendResponse({ schedule: lastRecognizedSchedule });
    } else {
      console.log('没有缓存的识别结果，需要重新识别');
      extractScheduleInfo()
        .then(schedule => {
          if (schedule) {
            lastRecognizedSchedule = schedule;
            sendResponse({ schedule });
          } else {
            sendResponse({ error: '无法识别日程信息' });
          }
        })
        .catch(error => {
          console.error('识别失败:', error);
          sendResponse({ error: error.message });
        });
    }
    return true;
  }
  
  if (request.action === 'extractSchedule') {
    extractScheduleInfo()
      .then(schedule => {
        if (schedule) {
          console.log('识别结果:', schedule);
          lastRecognizedSchedule = schedule;  // 保存到缓存
          sendResponse({ schedule });
        } else {
          sendResponse({ error: '无法识别日程信息' });
        }
      })
      .catch(error => {
        console.error('识别失败:', error);
        sendResponse({ error: error.message });
      });
    return true;
  }
  
  if (request.action === 'generateICS') {
    if (lastRecognizedSchedule && lastRecognizedSchedule.icsContent) {
      console.log('使用缓存的识别结果生成 ICS 文件');
      sendResponse({ 
        icsContent: lastRecognizedSchedule.icsContent,
        filename: lastRecognizedSchedule.events?.[0]?.title || 'schedule'
      });
    } else {
      extractScheduleInfo()
        .then(schedule => {
          if (schedule && schedule.icsContent) {
            console.log('生成 ICS 文件:', schedule);
            lastRecognizedSchedule = schedule;  // 保存到缓存
            sendResponse({ 
              icsContent: schedule.icsContent,
              filename: schedule.events?.[0]?.title || 'schedule'
            });
          } else {
            sendResponse({ error: '无法生成 ICS 文件' });
          }
        })
        .catch(error => {
          console.error('生成失败:', error);
          sendResponse({ error: error.message });
        });
    }
    return true;
  }
  
  if (request.action === 'clearCache') {
    lastRecognizedSchedule = null;
    sendResponse({ success: true });
    return true;
  }
});
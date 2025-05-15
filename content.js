console.log('content script loaded');

// 使用简单的全局变量作为缓存
let lastRecognizedSchedule = null;

// 获取当前年份的函数
function getCurrentYear() {
  return new Date().getFullYear();
}

// 验证并修正事件日期年份
function validateAndCorrectEventDates(events, icsContent, logseqContent) {
  const currentYear = getCurrentYear();
  let updatedIcsContent = icsContent;
  let updatedLogseqContent = logseqContent;
  
  events.forEach(event => {
    // 检查并修正开始日期年份
    if (event.startDate) {
      // 如果年份是过去的年份，修正为当前年份
      const startYear = parseInt(event.startDate.substring(0, 4));
      if (startYear < currentYear) {
        const oldStartDate = event.startDate;
        event.startDate = currentYear + event.startDate.substring(4);
        console.log(`修正开始日期年份: ${startYear} -> ${currentYear}`);
        
        // 更新ICS内容
        updatedIcsContent = updatedIcsContent.replace(
          `DTSTART;TZID=America/New_York:${oldStartDate}`,
          `DTSTART;TZID=America/New_York:${event.startDate}`
        );
        
        // 更新Logseq内容
        if (updatedLogseqContent) {
          // 将旧年份替换为新年份 (格式如 <2023-12-25 Mon 14:00>)
          updatedLogseqContent = updatedLogseqContent.replace(
            new RegExp(`<${startYear}-`, 'g'),
            `<${currentYear}-`
          );
        }
      }
    }
    
    // 检查并修正结束日期年份
    if (event.endDate) {
      const endYear = parseInt(event.endDate.substring(0, 4));
      if (endYear < currentYear) {
        const oldEndDate = event.endDate;
        event.endDate = currentYear + event.endDate.substring(4);
        console.log(`修正结束日期年份: ${endYear} -> ${currentYear}`);
        
        // 更新ICS内容
        updatedIcsContent = updatedIcsContent.replace(
          `DTEND;TZID=America/New_York:${oldEndDate}`,
          `DTEND;TZID=America/New_York:${event.endDate}`
        );
      }
    }
  });
  
  return {
    correctedEvents: events,
    updatedIcsContent: updatedIcsContent,
    updatedLogseqContent: updatedLogseqContent
  };
}

// 提取页面文本内容和邮件元数据
async function extractPageContent() {
  // 获取配置
  const config = await chrome.storage.local.get(['processAllEmails']);
  const processAllEmails = config.processAllEmails !== false; // 默认开启
  
  // 尝试获取邮件主题
  let emailSubject = '';
  try {
    // Gmail邮件主题选择器
    const subjectElement = document.querySelector('.hP');
    if (subjectElement) {
      emailSubject = subjectElement.textContent.trim();
      console.log('提取到的邮件主题:', emailSubject);
    }
  } catch (error) {
    console.error('提取邮件主题失败:', error);
  }
  
  // 获取所有邮件
  const emailElements = document.querySelectorAll('.a3s.aiL');
  let emailContent = '';
  let emailsData = [];
  
  if (emailElements.length > 0) {
    // 处理所有邮件(无论配置如何，都收集数据，但根据配置决定如何使用)
    for (let i = 0; i < emailElements.length; i++) {
      const emailElement = emailElements[i];
      const emailContainer = emailElement.closest('.gs');
      
      // 获取发件人信息
      let sender = 'Unknown';
      let senderEmail = '';
      try {
        if (emailContainer) {
          // 尝试获取发件人名称
          const senderNameElement = emailContainer.querySelector('.gD');
          if (senderNameElement) {
            sender = senderNameElement.textContent.trim();
          }
          
          // 尝试获取发件人邮箱
          const senderEmailElement = emailContainer.querySelector('.go');
          if (senderEmailElement) {
            const emailMatch = senderEmailElement.textContent.match(/<([^>]+)>/);
            senderEmail = emailMatch ? emailMatch[1] : '';
          }
        }
      } catch (error) {
        console.error('提取发件人信息失败:', error);
      }
      
      // 获取邮件时间
      let emailTime = '';
      try {
        if (emailContainer) {
          const timeElement = emailContainer.querySelector('.g3');
          if (timeElement) {
            emailTime = timeElement.getAttribute('title') || timeElement.textContent.trim();
          }
        }
      } catch (error) {
        console.error('提取邮件时间失败:', error);
      }
      
      // 获取邮件正文
      const emailText = emailElement.innerText.trim();
      
      // 将邮件信息添加到数组
      emailsData.push({
        sender: sender,
        email: senderEmail,
        time: emailTime,
        content: emailText
      });
    }
    
    // 构建结构化的邮件内容
    // 如果是单封邮件或未启用多邮件处理，只处理第一封
    if (!processAllEmails || emailsData.length === 1) {
      emailContent = emailsData[0].content;
    } else {
      // 处理多封邮件，按照从新到旧的顺序组织
      emailContent = `主题: ${emailSubject}\n\n`;
      
      for (let i = 0; i < emailsData.length; i++) {
        const email = emailsData[i];
        emailContent += `[邮件 ${i+1}]\n`;
        emailContent += `发件人: ${email.sender}${email.email ? ` <${email.email}>` : ''}\n`;
        emailContent += `时间: ${email.time}\n`;
        emailContent += `---\n${email.content}\n\n`;
        
        if (i < emailsData.length - 1) {
          emailContent += `--- 邮件分割线 ---\n\n`;
        }
      }
    }
  } else {
    // 如果没有找到邮件元素，回退到整个页面内容
    emailContent = document.body.innerText;
    emailsData = [{
      sender: 'Unknown',
      email: '',
      time: '',
      content: emailContent
    }];
  }
  
  // 提取所有链接，特别是会议链接
  const links = {};
  try {
    const allLinks = document.querySelectorAll('a');
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
  
  // 检查是否启用图像识别
  const configImage = await chrome.storage.local.get(['enableImageRecognition']);
  const enableImageRecognition = configImage.enableImageRecognition === true;
  
  // 初始化图像数据
  let extractedImages = [];
  
  // 提取图像（仅在启用时）
  if (enableImageRecognition) {
    try {
      const allImages = document.querySelectorAll('img');
      console.log('找到图片数量:', allImages.length);
      
      // 过滤并提取图片
      for (const img of allImages) {
        const src = img.getAttribute('src');
        const alt = img.getAttribute('alt') || '';
        const width = img.width;
        const height = img.height;
        
        // 跳过小图标、表情符号等小图片
        if (width < 100 || height < 100 || !src) {
          continue;
        }
        
        // 跳过常见的图标、logo等
        if (src.includes('icon') || src.includes('logo') || alt.includes('icon') || alt.includes('logo')) {
          continue;
        }
        
        try {
          // 将图片转换为base64
          const response = await fetch(src);
          const blob = await response.blob();
          const base64 = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
          
          extractedImages.push({
            src: src,
            base64: base64,
            alt: alt,
            width: width,
            height: height
          });
          
          console.log('提取到图片:', src);
          
          // 最多提取3张图片，避免API成本过高
          if (extractedImages.length >= 3) {
            break;
          }
        } catch (imgError) {
          console.error('图片处理失败:', imgError);
        }
      }
      
      console.log('成功提取图片数量:', extractedImages.length);
    } catch (error) {
      console.error('提取图片失败:', error);
    }
  } else {
    console.log('图像识别未启用，跳过图像提取');
  }

  // 返回更加结构化的内容
  const extractedContent = {
    subject: emailSubject,
    text: emailContent,
    originalText: emailsData.map(e => e.content).join('\n\n'), // 保存原始文本用于备份
    emails: emailsData, // 结构化的邮件数据
    emailCount: emailsData.length,
    isMultipleEmails: emailsData.length > 1,
    links: links,
    imageRecognitionEnabled: enableImageRecognition,
    images: extractedImages
  };
  
  console.log('提取到的页面内容:', extractedContent);
  return extractedContent;
}

async function extractScheduleInfo() {
  const pageContent = await extractPageContent();
  const currentYear = getCurrentYear();
  
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

    // 准备消息数组
    const messages = [
      {
        role: "system",
        content: "你是一个专业的日程识别助手，善于生成标准ICS格式的日历文件。"
      }
    ];
    
    // 准备提示词
    let userPrompt = `
      你是一个日程识别助手。请分析以下${pageContent.isMultipleEmails ? '邮件对话' : '文本'}${pageContent.imageRecognitionEnabled ? '和图像' : ''}，提取日程信息并生成两种格式：ICS 格式和 Logseq TODO 格式。

      ${pageContent.subject ? `邮件主题: ${pageContent.subject}` : ''}
      
      ${pageContent.isMultipleEmails ? `这是一个包含 ${pageContent.emailCount} 封邮件的对话。请确保综合考虑所有邮件的内容，尤其注意回复和后续邮件可能修改了最初的日程安排。` : ''}

      要求：
      1. 识别${pageContent.isMultipleEmails ? '所有邮件中' : '文本中'}的所有可能的日程事件
      2. 智能推断时间：
         - 所有时间均基于美东时间 (America/New_York)
         - 如果遇到"明天"、"下周"等相对时间，请基于最新邮件的发送时间 ${pageContent.emails?.[0]?.time || ''} 来计算
         - 优先使用明确的日期时间
         - 当文本中没有明确提到年份时，请使用当前年份(${currentYear})
      3. 如无结束时间：会议默认1小时，活动默认2小时，全天事件用当天全天
      4. 地点可以是实体地点或线上会议链接
      5. 每个事件生成独立的 VEVENT 条目
      6. 如果文本中提到"每周"、"每月"等重复模式，请添加 RRULE 属性
      7. 优先使用邮件中提取到的会议链接，特别是在LOCATION字段使用

      邮件中提取到的链接:
      ${JSON.stringify(pageContent.links, null, 2)}
      
      ${pageContent.imageRecognitionEnabled ? '分析提供的图片中可能存在的日程信息，特别是海报、截图或文档图片中的日期、时间、地点等。' : ''}

      请按照以下格式返回：

      ---ICS_START---
      BEGIN:VCALENDAR
      VERSION:2.0
      BEGIN:VTIMEZONE
      TZID:America/New_York
      BEGIN:STANDARD
      DTSTART:${currentYear}1103T020000
      TZOFFSETFROM:-0400
      TZOFFSETTO:-0500
      RRULE:FREQ=YEARLY;BYDAY=1SU;BYMONTH=11
      END:STANDARD
      BEGIN:DAYLIGHT
      DTSTART:${currentYear}0310T020000
      TZOFFSETFROM:-0500
      TZOFFSETTO:-0400
      RRULE:FREQ=YEARLY;BYDAY=2SU;BYMONTH=3
      END:DAYLIGHT
      END:VTIMEZONE
      BEGIN:VEVENT
      SUMMARY:事件标题
      DTSTART;TZID=America/New_York:${currentYear}0321T100000
      DTEND;TZID=America/New_York:${currentYear}0321T110000
      LOCATION:地点或会议链接 (邮件中提取到的链接可以在这里使用！)
      DESCRIPTION:描述
      END:VEVENT
      END:VCALENDAR
      ---ICS_END---

      ---LOGSEQ_START---
      - TODO 事件标题 @地点或会议链接 #PennEvent
      SCHEDULED: <${currentYear}-03-21 Thu 10:00> 
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
    
    messages.push({
      role: "user",
      content: userPrompt
    });
    
    // 如果启用了图像识别并且有图片，添加图片到消息中
    if (pageContent.imageRecognitionEnabled && pageContent.images.length > 0) {
      const content = [
        {
          type: "text",
          text: userPrompt
        }
      ];
      
      // 添加图片内容
      for (const image of pageContent.images) {
        content.push({
          type: "image_url",
          image_url: {
            url: image.base64,
            detail: "high"
          }
        });
      }
      
      // 替换第一个消息为包含图片的消息
      messages[1] = {
        role: "user",
        content: content
      };
    }

    console.log('准备发送到 OpenAI 的提示词:', messages);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.openaiApiKey}`
      },
      body: JSON.stringify({
        model: modelConfig.model,
        messages: messages,
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

    // 验证并修正事件日期年份
    const { correctedEvents, updatedIcsContent, updatedLogseqContent } = validateAndCorrectEventDates(events, icsContent, logseqContent);

    return {
      events: correctedEvents,
      confidence: confidence,
      reasoning: reasoning,
      icsContent: updatedIcsContent,
      logseqContent: updatedLogseqContent,
      debug: {
        sentText: pageContent.text,
        emailDate: pageContent.emails?.[0]?.time || '',
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
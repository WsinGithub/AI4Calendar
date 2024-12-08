class GoogleCalendarAPI {
  constructor() {
    this.CLIENT_ID = '704840528023-alhe8tqss81a979k2mc3cttcpk860rdu.apps.googleusercontent.com';
  }

  async getAuthToken() {
    try {
      console.log('正在获取认证令牌...');
      const auth = await chrome.identity.getAuthToken({ 
        interactive: true,
        scopes: [
          "https://www.googleapis.com/auth/calendar",
          "https://www.googleapis.com/auth/calendar.events"
        ]
      });
      console.log('获取令牌成功:', auth);
      
      if (!auth || !auth.token) {
        throw new Error('未能获取认证令牌');
      }
      
      return auth.token;
    } catch (error) {
      console.error('获取认证令牌失败:', error);
      throw new Error('获取认证令牌失败: ' + error.message);
    }
  }

  async addEventToCalendar(event) {
    try {
      console.log('开始添加事件到日历:', event);
      const token = await this.getAuthToken();
      
      const calendarEvent = {
        summary: event.title,
        location: event.location,
        description: event.description,
        start: {
          dateTime: this.formatDateTime(event.startDate),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        end: {
          dateTime: this.formatDateTime(event.endDate),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      };

      console.log('准备发送的事件数据:', calendarEvent);

      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(calendarEvent)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API 返回错误:', errorData);
        throw new Error(`添加日历事件失败: ${errorData.error?.message || '未知错误'}`);
      }

      const result = await response.json();
      console.log('事件添加成功:', result);
      return result;
    } catch (error) {
      console.error('添加到日历失败:', error);
      throw error;
    }
  }

  formatDateTime(isoString) {
    try {
      // 将 "20240321T100000Z" 格式转换为 "2024-03-21T10:00:00Z"
      const formatted = isoString.replace(
        /(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/,
        '$1-$2-$3T$4:$5:$6Z'
      );
      console.log('格式化后的时间:', formatted);
      return formatted;
    } catch (error) {
      console.error('时间格式化失败:', error);
      throw error;
    }
  }
}

export const calendarAPI = new GoogleCalendarAPI(); 
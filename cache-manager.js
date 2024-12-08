class CacheManager {
  constructor() {
    this.cache = {
      schedule: null,
      lastUpdated: null
    };
  }

  // 保存识别结果
  setSchedule(schedule) {
    this.cache.schedule = schedule;
    this.cache.lastUpdated = new Date();
    console.log('缓存已更新:', this.cache);
  }

  // 获取识别结果
  getSchedule() {
    return this.cache.schedule;
  }

  // 检查缓存是否有效（例如：15分钟内的缓存有效）
  isValid() {
    if (!this.cache.lastUpdated) return false;
    const now = new Date();
    const diffMinutes = (now - this.cache.lastUpdated) / (1000 * 60);
    return diffMinutes < 15;
  }

  // 清除缓存
  clear() {
    this.cache = {
      schedule: null,
      lastUpdated: null
    };
    console.log('缓存已清除');
  }
}

export const cacheManager = new CacheManager(); 
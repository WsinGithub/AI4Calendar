/**
 * 存储管理类
 */
export class StorageManager {
  /**
   * 保存API密钥
   * @param {string} apiKey - API密钥
   */
  static async saveApiKey(apiKey) {
    await chrome.storage.local.set({ 'openaiApiKey': apiKey });
  }

  /**
   * 获取API密钥
   * @returns {Promise<string>} API密钥
   */
  static async getApiKey() {
    const result = await chrome.storage.local.get(['openaiApiKey']);
    return result.openaiApiKey;
  }

  /**
   * 保存模型配置
   * @param {Object} config - 模型配置
   */
  static async saveModelConfig(config) {
    await chrome.storage.local.set({ 'modelConfig': config });
  }

  /**
   * 获取模型配置
   * @returns {Promise<Object>} 模型配置
   */
  static async getModelConfig() {
    const result = await chrome.storage.local.get(['modelConfig']);
    return result.modelConfig;
  }
}

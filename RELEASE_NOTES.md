# v0.5.4 - 稳定版本 (Stable Release)

## 🔄 重要说明

由于 GPT-5 系列模型 API 存在兼容性问题，本版本**回退到经过验证的稳定配置**。

### ❌ v0.5.1 - v0.5.3 已废弃

这些版本尝试升级到 GPT-5 系列模型，但遇到以下问题：
- GPT-5 API 参数限制过严（不支持自定义 temperature）
- max_tokens 参数变更为 max_completion_tokens
- 整体稳定性不如 GPT-4o 系列

### ✅ v0.5.4 = v0.5.0 (稳定版)

本版本基于 **v0.5.0** 的稳定代码：
- 使用经过验证的 **GPT-4o-mini** 和 **GPT-4o** 模型
- API 稳定可靠
- 参数可灵活调节
- 性能和准确度经过实际验证

## 📦 功能特性

- 🤖 智能识别：使用 AI 自动识别网页中的日程信息
- 📅 快速添加：一键添加事件到 Google Calendar
- 📥 ICS 下载：支持下载标准 ICS 格式的日历文件
- 📝 Logseq 集成：以 Logseq 格式复制事件
- 🌐 多场景支持：支持邮件、网页等多种场景的日程识别
- 🖼️ 图像识别：可选的图像内容识别（需手动启用）
- 📧 多邮件处理：支持提取邮件对话的完整上下文

## 🎯 推荐配置

- **默认模型**: GPT-4o-mini (快速且经济)
- **复杂任务**: GPT-4o (更强大的识别能力)
- **Temperature**: 0.3 (可调节，获得稳定输出)

## 📝 给用户的建议

如果你正在使用 v0.5.1、v0.5.2 或 v0.5.3，请立即更新到 v0.5.4 以获得稳定的体验。

---

**下载**: [AI4Calendar-v0.5.4.zip](https://github.com/WsinGithub/AI4Calendar/releases/download/v0.5.4/AI4Calendar-v0.5.4.zip)

# AI4Calendar Chrome 扩展

AI4Calendar 是一个智能的 Chrome 扩展，它可以自动识别网页中的日程信息（支持同时识别多个事件），并提供快速添加到 Google Calendar 或复制到 Logseq 的功能。

## 主要功能

- 🤖 智能识别：使用 AI 自动识别网页中的日程信息
- 📅 快速添加：一键添加事件到 Google Calendar
- 📥 ICS 下载：支持下载标准 ICS 格式的日历文件
- 📝 Logseq 集成：以 Logseq 格式复制事件，支持标准的任务格式
- 🌐 多场景支持：支持邮件、网页等多种场景的日程识别
- ⚡ 无需授权：使用 Google Calendar 快速添加链接，无需账号授权

## 安装方法

1. 下载本扩展的源代码
2. 打开 Chrome 浏览器，进入扩展管理页面 (`chrome://extensions/`)
3. 开启"开发者模式"
4. 点击"加载已解压的扩展"
5. 选择本扩展的目录

## 使用说明

1. 配置 OpenAI API Key：
   - 点击扩展图标
   - 在设置中填入你的 OpenAI API Key
   - 选择合适的模型和参数

2. 识别日程：
   - 在包含日程信息的网页上点击扩展图标
   - 等待 AI 识别日程信息
   - 查看识别结果

3. 添加到日历：
   - 点击"添加到 Google Calendar"按钮
   - 在新打开的 Google Calendar 页面中确认信息
   - 点击保存
   - 或者点击"下载 ICS"按钮，获取标准日历文件

4. 复制到 Logseq：
   - 点击"复制 Logseq 格式"按钮
   - 在 Logseq 中粘贴即可

## Logseq 格式说明

复制到 Logseq 的内容将按以下格式组织：
```
- TODO 事件标题 @位置 #Event
  SCHEDULED: <2024-12-08 Sun 14:00>
  :AGENDA:
  estimated: 1h
  :END:
```

## 版本历史

### v0.4.0
- 添加 ICS 文件下载功能
- 在事件卡片中添加下载按钮
- 支持导出标准 ICS 格式的日历文件

### v0.3.0
- 修复 Logseq 复制功能，现在只复制单个选中的事件
- 优化 Logseq 输出格式，使用标准的缩进结构

### v0.2.0
- 简化用户界面
- 移除需要授权的功能
- 使用快速添加作为主要功能

### v0.1.0
- 初始版本
- 基础日历功能实现

## 技术栈

- JavaScript (ES6+)
- Chrome Extension APIs
- OpenAI API
- Google Calendar API (快速添加链接)

## 开发说明

本扩展使用纯 JavaScript 开发，不依赖任何前端框架。主要文件说明：

- `manifest.json`: 扩展配置文件
- `content.js`: 页面内容识别逻辑
- `sidebar.js`: 侧边栏界面交互逻辑
- `calendar-api.js`: 日历相关功能
- `utils/`: 工具函数目录

## 注意事项

1. 需要自己提供 OpenAI API Key
2. 日程识别准确度依赖于网页内容的格式和清晰度
3. 时区默认使用美东时间 (America/New_York)

## 贡献指南

欢迎提交 Issue 和 Pull Request 来改进这个扩展。在提交代码前，请确保：

1. 代码风格保持一致
2. 新功能有适当的注释说明
3. 所有现有功能正常工作

## 许可证

MIT License

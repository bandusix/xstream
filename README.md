# Xtream IPTV 播放列表生成器

这是一个简单的 Web 应用程序，用于生成 Xtream IPTV 播放列表。用户可以上传包含频道信息的 M3U 播放列表文件，服务器会解析文件内容并生成符合 xstream 协议格式的播放列表 URL。该 URL 可用于在支持 xstream 协议的播放器中加载播放列表。

## 功能

- 导入 M3U 播放列表文件
- 用户注册、登录与会话管理
- 根据上传的 M3U 文件生成 xstream 协议格式播放列表 URL
- 下载生成的播放列表

## 使用方法

1. 克隆仓库到本地
2. 安装依赖：`npm install`
3. 启动应用：`npm start`
4. 在浏览器中访问：`http://localhost:3000`

## 部署

请参考 [DEPLOY.md](DEPLOY.md) 部署指南。

## 技术栈

- 前端：HTML, CSS, JavaScript
- 后端：Node.js, Express
- 数据存储：内存存储（演示用途，生产环境建议使用数据库）

## 许可证

MIT

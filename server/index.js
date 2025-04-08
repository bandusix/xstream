const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.post('/upload-m3u', upload.single('m3uFile'), (req, res) => {
  const filePath = req.file.path;
  const fixedServerUrl = 'https://xstream-production.up.railway.app/8080'; // 强制使用指定的API服务器URL

  // 解析M3U文件并生成Xtream API URL
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: '文件读取失败' });
    }

    // 假设解析M3U文件并生成频道列表
    const channels = parseM3U(data);

    // 使用会话中的用户ID作为用户名
    const username = req.session.userId || 'defaultUser'; 
    const password = 'defaultPass'; // 可以根据需要生成或存储密码

    // 生成Xtream API URL
    const xtreamApiUrl = `${fixedServerUrl}/api/xtream?username=${username}&password=${password}&channels=${encodeURIComponent(JSON.stringify(channels))}`;

    // 返回生成的URL
    res.json({ xtreamApiUrl });
  });
});

function parseM3U(data) {
  // 解析M3U文件的逻辑
  // 返回频道列表
  return [];
}

const PORT = process.env.PORT || 3000; // 使用Railway提供的端口

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(session({
  secret: process.env.SESSION_SECRET || 'xstream-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, 'playlist-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (path.extname(file.originalname).toLowerCase() !== '.m3u') {
      return cb(new Error('只允许上传.m3u文件'));
    }
    cb(null, true);
  }
});

let users = [];
let playlists = [];

// 用户注册、登录、登出与会话管理的代码（略，此部分保持不变）

// 删除 /api/xtream-playlist 相关的路由，仅保留上传 M3U 文件生成播放列表的方式

// 上传 M3U 文件并生成 xstream code 协议 URL
app.post('/api/upload-m3u', upload.single('m3uFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }
    
    const filePath = req.file.path;
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // 使用简单逻辑解析 M3U 文件，提取频道信息
    const channels = parseM3U(fileContent);
    
    // 使用会话中的用户 ID 作为用户名（可根据实际需求调整）
    const username = req.session.userId || 'defaultUser';
    const password = 'defaultPass';
    
    // 生成 xstream code 协议 URL：格式示例  
    // xstream://?username=xxx&password=xxx&channels=ENCODED_CHANNELS
    const xstreamCodeUrl = `xstream://?username=${username}&password=${password}&channels=${encodeURIComponent(JSON.stringify(channels))}`;
    
    // 保存播放列表信息
    const playlist = {
      id: Date.now().toString(),
      name: req.body.name || path.basename(req.file.originalname, '.m3u'),
      userId: req.session.userId,
      filePath,
      channels,
      xstreamCodeUrl
    };
    
    playlists.push(playlist);
    
    res.json({ 
      message: '文件上传成功', 
      playlistId: playlist.id,
      channelCount: channels.length,
      xstreamCodeUrl
    });
  } catch (error) {
    console.error('文件上传错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 解析 M3U 文件的辅助函数
function parseM3U(content) {
  const lines = content.split('\n');
  const channels = [];
  let currentChannel = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('#EXTINF:')) {
      // 使用正则解析频道信息
      const infoMatch = line.match(/#EXTINF:(-?\d+)(?:.*tvg-id="([^"]*)")?(?:.*tvg-name="([^"]*)")?(?:.*tvg-logo="([^"]*)")?(?:.*group-title="([^"]*)")?(?:.*,(.*))?/);
      
      if (infoMatch) {
        currentChannel = {
          duration: infoMatch[1] || '-1',
          tvgId: infoMatch[2] || '',
          tvgName: infoMatch[3] || '',
          tvgLogo: infoMatch[4] || '',
          groupTitle: infoMatch[5] || '',
          title: infoMatch[6] || `Channel ${channels.length + 1}`
        };
      } else {
        // 后备解析
        const titleMatch = line.match(/,(.*)$/);
        currentChannel = {
          duration: '-1',
          title: titleMatch ? titleMatch[1] : `Channel ${channels.length + 1}`
        };
      }
    } else if (line && !line.startsWith('#') && currentChannel) {
      // 读取频道 URL
      currentChannel.url = line;
      channels.push(currentChannel);
      currentChannel = null;
    }
  }
  
  return channels;
}

app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});

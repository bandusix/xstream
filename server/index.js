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

// 配置会话
app.use(session({
  secret: process.env.SESSION_SECRET || 'xstream-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// 解析请求体
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// 配置文件上传
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, 'playlist-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({
  storage: storage,
  fileFilter: function(req, file, cb) {
    if (path.extname(file.originalname).toLowerCase() !== '.m3u') {
      return cb(new Error('只允许上传.m3u文件'));
    }
    cb(null, true);
  }
});

// 内存数据存储
let users = [];
let playlists = [];

// 用户注册
app.post('/register', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码都是必需的' });
    }
    if (users.find(u => u.username === username)) {
      return res.status(400).json({ error: '用户名已存在' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { id: Date.now().toString(), username, password: hashedPassword };
    users.push(newUser);
    req.session.userId = newUser.id;
    res.status(201).json({ message: '用户注册成功' });
  } catch (e) {
    next(e);
  }
});

// 用户登录
app.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(400).json({ error: '用户名或密码不正确' });
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(400).json({ error: '用户名或密码不正确' });
    }
    req.session.userId = user.id;
    res.json({ message: '登录成功' });
  } catch (e) {
    next(e);
  }
});

// 检查登录状态
app.get('/check-auth', (req, res) => {
  if (req.session.userId) {
    const user = users.find(u => u.id === req.session.userId);
    if (user) return res.json({ authenticated: true, username: user.username });
  }
  res.json({ authenticated: false });
});

// 用户登出
app.post('/logout', (req, res, next) => {
  req.session.destroy(err => {
    if (err) return next(err);
    res.json({ message: '登出成功' });
  });
});

// 上传 M3U 文件并生成 xstream 协议 URL
app.post('/upload-m3u', upload.single('m3uFile'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }
    
    const filePath = req.file.path;
    const content = fs.readFileSync(filePath, 'utf8');
    const channels = parseM3U(content);
    
    // 使用会话中的用户ID作为用户名，如无则使用默认值
    const username = req.session.userId || 'defaultUser';
    const password = 'defaultPass';
    
    // 生成 xstream 协议 URL 格式：xstream://?username=...&password=...&channels=...
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
  } catch (e) {
    next(e);
  }
});

// 获取当前用户播放列表
app.get('/playlists', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: '未授权' });
  }
  const userPlaylists = playlists
    .filter(p => p.userId === req.session.userId)
    .map(p => ({ id: p.id, name: p.name, channelCount: p.channels.length }));
  res.json(userPlaylists);
});

// 下载播放列表
app.get('/download/:id', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: '未授权' });
  }
  const playlist = playlists.find(p => p.id === req.params.id && p.userId === req.session.userId);
  if (!playlist) {
    return res.status(404).json({ error: '播放列表未找到' });
  }
  res.download(playlist.filePath, `${playlist.name}.m3u`);
});

// 辅助函数：解析 M3U 文件
function parseM3U(content) {
  const lines = content.split('\n');
  const channels = [];
  let currentChannel = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('#EXTINF:')) {
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
        const titleMatch = line.match(/,(.*)$/);
        currentChannel = {
          duration: '-1',
          title: titleMatch ? titleMatch[1] : `Channel ${channels.length + 1}`
        };
      }
    } else if (line && !line.startsWith('#') && currentChannel) {
      currentChannel.url = line;
      channels.push(currentChannel);
      currentChannel = null;
    }
  }
  
  return channels;
}

// 全局错误处理中间件，保证出错时返回 JSON 格式数据
app.use((err, req, res, next) => {
  console.error('全局捕获错误：', err);
  res.status(500).json({ error: '服务器发生错误' });
});

app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});

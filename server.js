const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// 设置会话
app.use(session({
  secret: process.env.SESSION_SECRET || 'xstream-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// 解析JSON和表单数据
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 提供静态文件
app.use(express.static('public'));

// 设置文件上传
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

// 用户数据存储（在实际应用中应使用数据库）
let users = [];

// 上传的播放列表存储
let playlists = [];

// 路由

// 注册用户
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 验证输入
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码都是必需的' });
    }
    
    // 检查用户是否已存在
    if (users.find(user => user.username === username)) {
      return res.status(400).json({ error: '用户名已存在' });
    }
    
    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 创建新用户
    const newUser = {
      id: Date.now().toString(),
      username,
      password: hashedPassword
    };
    
    users.push(newUser);
    
    // 设置会话
    req.session.userId = newUser.id;
    
    res.status(201).json({ message: '用户注册成功' });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 用户登录
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 查找用户
    const user = users.find(user => user.username === username);
    
    if (!user) {
      return res.status(400).json({ error: '用户名或密码不正确' });
    }
    
    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(400).json({ error: '用户名或密码不正确' });
    }
    
    // 设置会话
    req.session.userId = user.id;
    
    res.json({ message: '登录成功' });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 检查登录状态
app.get('/api/check-auth', (req, res) => {
  if (req.session.userId) {
    const user = users.find(user => user.id === req.session.userId);
    if (user) {
      return res.json({ authenticated: true, username: user.username });
    }
  }
  res.json({ authenticated: false });
});

// 登出
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: '登出失败' });
    }
    res.json({ message: '登出成功' });
  });
});

// 上传M3U文件
app.post('/api/upload-m3u', upload.single('m3uFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }
    
    // 读取上传的文件
    const filePath = req.file.path;
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // 解析M3U文件（简单实现，实际应用可能需要更复杂的解析）
    const channels = parseM3U(fileContent);
    
    // 强制使用指定的API服务器URL
    const fixedServerUrl = 'https://xstream-production.up.railway.app/8080';

    // 用户名和密码（假设从请求中获取）
    const username = req.session.userId || 'defaultUser'; // 使用会话中的用户ID作为用户名
    const password = 'defaultPass'; // 可以根据需要生成或存储密码

    // 生成Xtream API URL
    const xtreamApiUrl = `${fixedServerUrl}/api/xtream?username=${username}&password=${password}&channels=${encodeURIComponent(JSON.stringify(channels))}`;

    // 保存播放列表信息
    const playlist = {
      id: Date.now().toString(),
      name: req.body.name || path.basename(req.file.originalname, '.m3u'),
      userId: req.session.userId,
      filePath,
      channels,
      xtreamApiUrl // 保存生成的URL
    };
    
    playlists.push(playlist);
    
    res.json({ 
      message: '文件上传成功', 
      playlistId: playlist.id,
      channelCount: channels.length,
      xtreamApiUrl // 返回生成的URL
    });
  } catch (error) {
    console.error('文件上传错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取用户的播放列表
app.get('/api/playlists', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: '未授权' });
  }
  
  const userPlaylists = playlists
    .filter(playlist => playlist.userId === req.session.userId)
    .map(({ id, name, channels }) => ({ id, name, channelCount: channels.length }));
  
  res.json(userPlaylists);
});

// 通过Xtream API获取播放列表
app.post('/api/xtream-playlist', async (req, res) => {
  try {
    const { apiUrl, username, password } = req.body;
    
    if (!apiUrl || !username || !password) {
      return res.status(400).json({ error: '所有字段都是必需的' });
    }
    
    // 构建API URL
    const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    
    // 获取用户信息
    const authUrl = `${baseUrl}/player_api.php?username=${username}&password=${password}`;
    const authResponse = await axios.get(authUrl);
    
    if (authResponse.data.user_info.auth !== 1) {
      return res.status(401).json({ error: '无效的Xtream凭据' });
    }
    
    // 获取直播流
    const liveStreamsUrl = `${baseUrl}/player_api.php?username=${username}&password=${password}&action=get_live_streams`;
    const liveStreamsResponse = await axios.get(liveStreamsUrl);
    
    // 生成M3U播放列表
    const m3uContent = generateM3U(liveStreamsResponse.data, baseUrl, username, password);
    
    // 保存生成的播放列表
    const playlistPath = path.join(__dirname, 'uploads', `xtream-${Date.now()}.m3u`);
    fs.writeFileSync(playlistPath, m3uContent);
    
    // 解析生成的M3U内容
    const channels = parseM3U(m3uContent);
    
    // 保存播放列表信息
    const playlist = {
      id: Date.now().toString(),
      name: `Xtream Playlist (${new Date().toLocaleDateString()})`,
      userId: req.session.userId,
      filePath: playlistPath,
      channels,
      xtreamInfo: {
        apiUrl,
        username
      }
    };
    
    playlists.push(playlist);
    
    res.json({ 
      message: 'Xtream播放列表生成成功', 
      playlistId: playlist.id,
      channelCount: channels.length 
    });
  } catch (error) {
    console.error('Xtream API错误:', error);
    res.status(500).json({ error: '无法连接到Xtream服务器或处理响应' });
  }
});

// 获取播放列表内容
app.get('/api/playlist/:id', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: '未授权' });
  }
  
  const playlist = playlists.find(p => p.id === req.params.id && p.userId === req.session.userId);
  
  if (!playlist) {
    return res.status(404).json({ error: '播放列表未找到' });
  }
  
  res.json(playlist);
});

// 下载播放列表
app.get('/api/download/:id', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: '未授权' });
  }
  
  const playlist = playlists.find(p => p.id === req.params.id && p.userId === req.session.userId);
  
  if (!playlist) {
    return res.status(404).json({ error: '播放列表未找到' });
  }
  
  res.download(playlist.filePath, `${playlist.name}.m3u`);
});

// 辅助函数

// 解析M3U文件
function parseM3U(content) {
  const lines = content.split('\n');
  const channels = [];
  let currentChannel = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('#EXTINF:')) {
      // 解析频道信息
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
        // 简单的后备解析
        const titleMatch = line.match(/,(.*)$/);
        currentChannel = {
          duration: '-1',
          title: titleMatch ? titleMatch[1] : `Channel ${channels.length + 1}`
        };
      }
    } else if (line && !line.startsWith('#') && currentChannel) {
      // 添加URL并保存频道
      currentChannel.url = line;
      channels.push(currentChannel);
      currentChannel = null;
    }
  }
  
  return channels;
}

// 生成M3U播放列表
function generateM3U(streams, baseUrl, username, password) {
  let m3uContent = '#EXTM3U\n';
  
  streams.forEach(stream => {
    const streamUrl = `${baseUrl}/${username}/${password}/${stream.stream_id}`;
    m3uContent += `#EXTINF:-1 tvg-id="${stream.epg_channel_id || ''}" tvg-name="${stream.name || ''}" tvg-logo="${stream.stream_icon || ''}" group-title="${stream.category_name || ''}",${stream.name}\n`;
    m3uContent += `${streamUrl}\n`;
  });
  
  return m3uContent;
}

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});
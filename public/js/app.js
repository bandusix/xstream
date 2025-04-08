// DOM 元素
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const userInfo = document.getElementById('user-info');
const logoutBtn = document.getElementById('logout-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const uploadForm = document.getElementById('upload-form');
const playlistsList = document.getElementById('playlists-list');
const noPlaylistsMessage = document.getElementById('no-playlists-message');
const notification = document.getElementById('notification');
const m3uFileInput = document.getElementById('m3u-file');
const fileNameDisplay = document.getElementById('file-name');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('[APP] DOMContentLoaded: 初始化开始');
  checkAuthStatus();
  setupTabs();
  setupFileInput();
});

// 检查用户认证状态
async function checkAuthStatus() {
  try {
    console.log('[AUTH] 检查用户认证状态...');
    const response = await fetch('/check-auth');
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      console.log('[AUTH] 返回数据：', data);
      if (data.authenticated) {
        showAuthenticatedUI(data.username);
        loadPlaylists();
      } else {
        showUnauthenticatedUI();
      }
    } else {
      const text = await response.text();
      console.error('[AUTH] 预期 JSON，但实际返回：', text);
      showNotification('服务器返回数据异常', 'error');
    }
  } catch (error) {
    console.error('[AUTH] 检查认证状态错误:', error);
    showNotification('服务器连接错误', 'error');
  }
}

// 显示已认证 UI
function showAuthenticatedUI(username) {
  authContainer.style.display = 'none';
  appContainer.style.display = 'block';
  userInfo.textContent = `欢迎, ${username}`;
  logoutBtn.style.display = 'inline-block';
  logoutBtn.addEventListener('click', handleLogout);
}

// 显示未认证 UI
function showUnauthenticatedUI() {
  authContainer.style.display = 'block';
  appContainer.style.display = 'none';
  userInfo.textContent = '未登录';
  logoutBtn.style.display = 'none';
}

// 设置标签页切换
function setupTabs() {
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
      console.log(`[TABS] 切换到 ${tabId} 标签页`);
    });
  });
}

// 设置文件输入显示
function setupFileInput() {
  m3uFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      fileNameDisplay.textContent = e.target.files[0].name;
      console.log('[FILE] 选择文件：', e.target.files[0].name);
    } else {
      fileNameDisplay.textContent = '未选择文件';
    }
  });
}

// 通用的 fetch 请求处理函数，增加返回数据类型检查和日志输出
async function fetchData(url, options) {
  try {
    console.log(`[FETCH] 请求 ${url}，选项：`, options);
    const response = await fetch(url, options);
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      console.log(`[FETCH] ${url} 返回 JSON 数据：`, data);
      if (!response.ok) {
        throw new Error(data.error || '请求失败');
      }
      return data;
    } else {
      const text = await response.text();
      console.error(`[FETCH] ${url} 预期 JSON，但返回的数据为：`, text);
      throw new Error('服务器返回非 JSON 格式数据');
    }
  } catch (error) {
    console.error(`[FETCH] 请求 ${url} 出错:`, error);
    showNotification('服务器连接错误', 'error');
    throw error;
  }
}

// 处理登录请求
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  try {
    await fetchData('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    console.log('[LOGIN] 登录成功');
    showAuthenticatedUI(username);
    loadPlaylists();
    showNotification('登录成功', 'success');
  } catch (error) {
    showNotification(error.message, 'error');
  }
});

// 处理注册请求
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('register-username').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password').value;
  
  if (password !== confirmPassword) {
    showNotification('密码不匹配', 'error');
    return;
  }
  
  try {
    await fetchData('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    console.log('[REGISTER] 注册成功');
    showNotification('注册成功', 'success');
    document.querySelector('[data-tab="login"]').click();
    registerForm.reset();
  } catch (error) {
    showNotification(error.message, 'error');
  }
});

// 处理上传 M3U 文件请求，生成 xstream 协议 URL
uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const playlistName = document.getElementById('playlist-name').value;
  const m3uFile = m3uFileInput.files[0];
  
  if (!m3uFile) {
    showNotification('请选择M3U文件', 'error');
    return;
  }
  
  const formData = new FormData();
  formData.append('name', playlistName);
  formData.append('m3uFile', m3uFile);
  
  try {
    console.log('[UPLOAD] 开始上传文件...');
    const response = await fetch('/upload-m3u', {
      method: 'POST',
      body: formData
    });
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      console.log('[UPLOAD] 返回数据：', data);
      if (response.ok) {
        showNotification(`上传成功: ${data.channelCount} 个频道\nXstream URL: ${data.xstreamCodeUrl}`, 'success');
        uploadForm.reset();
        fileNameDisplay.textContent = '未选择文件';
        loadPlaylists();
      } else {
        showNotification(data.error || '上传失败', 'error');
      }
    } else {
      const text = await response.text();
      console.error('[UPLOAD] 预期 JSON，但返回的数据为：', text);
      showNotification('服务器返回非 JSON 格式数据', 'error');
    }
  } catch (error) {
    console.error('[UPLOAD] 上传错误:', error);
    showNotification('服务器连接错误', 'error');
  }
});

// 处理登出请求
async function handleLogout() {
  try {
    const response = await fetch('/logout', { method: 'POST' });
    if (response.ok) {
      console.log('[LOGOUT] 登出成功');
      showNotification('登出成功', 'success');
      showUnauthenticatedUI();
    } else {
      const data = await response.json();
      console.error('[LOGOUT] 登出失败：', data);
      showNotification(data.error || '登出失败', 'error');
    }
  } catch (error) {
    console.error('[LOGOUT] 请求错误:', error);
    showNotification('服务器连接错误', 'error');
  }
}

// 加载当前用户播放列表
async function loadPlaylists() {
  try {
    console.log('[PLAYLISTS] 开始加载播放列表...');
    const response = await fetch('/playlists');
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const playlists = await response.json();
      console.log('[PLAYLISTS] 返回数据：', playlists);
      if (playlists.length > 0) {
        renderPlaylists(playlists);
        noPlaylistsMessage.style.display = 'none';
      } else {
        playlistsList.innerHTML = '';
        noPlaylistsMessage.style.display = 'block';
      }
    } else {
      const text = await response.text();
      console.error('[PLAYLISTS] 预期 JSON，但返回的数据为：', text);
      showNotification('服务器返回非 JSON 格式数据', 'error');
    }
  } catch (error) {
    console.error('[PLAYLISTS] 加载播放列表错误:', error);
    showNotification('无法加载播放列表', 'error');
  }
}

// 渲染播放列表到页面中
function renderPlaylists(playlists) {
  playlistsList.innerHTML = '';
  playlists.forEach(playlist => {
    const li = document.createElement('li');
    li.className = 'playlist-item';
    li.innerHTML = `
      <div class="playlist-info">
        <div class="playlist-name">${playlist.name}</div>
        <div class="playlist-channels">${playlist.channelCount} 个频道</div>
      </div>
      <div class="playlist-actions">
        <button class="btn btn-small btn-primary download-btn" data-id="${playlist.id}">下载</button>
      </div>
    `;
    playlistsList.appendChild(li);
  });
  
  // 添加下载按钮事件
  document.querySelectorAll('.download-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const playlistId = btn.getAttribute('data-id');
      console.log('[DOWNLOAD] 开始下载播放列表：', playlistId);
      window.location.href = `/download/${playlistId}`;
    });
  });
}

// 显示通知
function showNotification(message, type = 'info') {
  notification.textContent = message;
  notification.className = 'notification';
  notification.classList.add(type);
  notification.classList.add('show');
  
  // 延长显示时间，确保日志完整可见（8秒）
  setTimeout(() => {
    notification.classList.remove('show');
  }, 8000);
}

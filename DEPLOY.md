# Xtream IPTV 播放列表生成器部署指南

## 部署到GitHub Pages

### 前提条件

- 拥有GitHub账户
- 基本了解Git操作
- 安装了Git客户端（可选，也可以使用GitHub网页界面）

### 详细步骤

1. **Fork或克隆仓库**
   - 访问[项目GitHub仓库](https://github.com/your-username/xstream)（请替换为实际仓库地址）
   - 点击右上角的"Fork"按钮，将仓库复制到您的GitHub账户
   - 或者克隆仓库到本地：`git clone https://github.com/your-username/xstream.git`

2. **修改项目配置（如需要）**
   - 由于GitHub Pages只支持静态网站，您需要确保应用可以作为纯前端应用运行
   - 修改`public/js/app.js`中的API调用，使其适应静态网站环境
   - 考虑使用浏览器本地存储（localStorage）替代服务器存储

3. **配置GitHub Pages**
   - 进入您的GitHub仓库
   - 点击仓库顶部的"Settings"标签
   - 在左侧菜单中找到并点击"Pages"
   - 在"Source"部分，选择分支（通常是`main`或`master`）
   - 在"Folder"下拉菜单中选择`/(root)`或`/docs`（如果您将静态文件移至docs文件夹）
   - 点击"Save"按钮

4. **等待部署完成**
   - GitHub会显示一条消息，表明您的站点正在构建中
   - 几分钟后，您将看到一条成功消息，其中包含您的站点URL
   - 通常格式为`https://[你的用户名].github.io/xstream/`

5. **验证部署**
   - 点击提供的URL访问您的应用
   - 确保所有功能正常工作
   - 如果遇到问题，检查浏览器控制台中的错误信息

### 针对GitHub Pages的特殊注意事项

- **静态网站限制**：GitHub Pages只支持静态内容，不支持服务器端代码（如Node.js）
- **前端适配**：您可能需要修改应用，使其在没有后端服务的情况下工作
- **API调用**：考虑使用第三方API服务或Serverless函数来处理需要后端的功能
- **数据存储**：使用localStorage或IndexedDB在客户端存储数据
- **自定义域名**：您可以在GitHub Pages设置中配置自定义域名

## 部署到其他平台

### Heroku

1. **准备工作**
   - 创建一个[Heroku账户](https://signup.heroku.com/)
   - 安装[Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
   - 登录Heroku CLI：`heroku login`

2. **创建Heroku应用**
   - 在项目目录中运行：`heroku create xstream-app`（替换为您想要的应用名称）
   - 或在Heroku仪表板中手动创建应用

3. **配置应用**
   - 确保`package.json`中有正确的启动脚本：`"start": "node server.js"`
   - 添加`Procfile`文件（如果尚未存在）：`web: node server.js`

4. **设置环境变量**
   - 在Heroku仪表板中或使用CLI设置必要的环境变量：
     ```
     heroku config:set SESSION_SECRET=your-secure-secret-key
     heroku config:set NODE_ENV=production
     ```

5. **部署应用**
   - 使用Git推送到Heroku：
     ```
     git add .
     git commit -m "准备部署到Heroku"
     git push heroku main
     ```
   - 或连接GitHub仓库并启用自动部署

6. **打开应用**
   - 运行：`heroku open`
   - 或访问应用URL：`https://xstream-app.herokuapp.com`

### Netlify

1. **准备工作**
   - 创建一个[Netlify账户](https://app.netlify.com/signup)
   - 确保项目已推送到GitHub

2. **导入项目**
   - 在Netlify仪表板中点击"New site from Git"
   - 选择GitHub作为Git提供商
   - 授权Netlify访问您的GitHub仓库
   - 选择您的xstream仓库

3. **配置构建设置**
   - 如果只部署前端（静态部分）：
     - 构建命令：留空或使用`npm run build`（如果有构建脚本）
     - 发布目录：`public`
   - 如果使用Netlify Functions处理后端：
     - 添加`netlify.toml`文件配置函数目录

4. **设置环境变量**
   - 在Netlify站点设置中添加必要的环境变量

5. **部署站点**
   - 点击"Deploy site"按钮
   - 等待部署完成
   - 访问提供的Netlify URL

### Railway

1. **准备工作**
   - 创建一个[Railway账户](https://railway.app/)
   - 安装[Railway CLI](https://docs.railway.app/develop/cli)
   - 登录Railway CLI：`railway login`

2. **项目配置**
   - 确保`package.json`中有正确的启动脚本：
     ```json
     {
       "scripts": {
         "start": "node server.js",
         "dev": "nodemon server.js"
       }
     }
     ```
   - 确保项目根目录有`.env.example`文件（可选）

3. **创建Railway项目**
   - 在Railway仪表板中点击"New Project"
   - 选择"Deploy from GitHub repo"
   - 选择您的xstream仓库
   - 或使用CLI创建：`railway init`

4. **配置环境变量**
   - 在Railway仪表板的"Variables"标签页中设置
   - 或使用CLI：`railway vars set KEY=VALUE`
   - 必要的环境变量：
     ```
     NODE_ENV=production
     PORT=3000
     ```

5. **部署应用**
   - Railway会自动检测代码更改并部署
   - 手动部署：`railway up`
   - 查看部署状态：`railway status`

6. **域名设置**
   - Railway自动提供一个`.railway.app`域名
   - 在"Settings"中可以配置自定义域名
   - 自动配置SSL证书

7. **监控和日志**
   - 在Railway仪表板查看实时日志
   - 监控CPU和内存使用情况
   - 查看部署历史和版本回滚

8. **特色功能**
   - 自动HTTPS支持
   - 自动扩展
   - 实时日志和指标
   - 自动化部署
   - 内置数据库支持（如需要）

9. **故障排除**
   - 检查`railway logs`输出
   - 确保所有必要的环境变量已设置
   - 验证`start`脚本正确配置
   - 检查项目的构建日志

## 故障排除

### 常见问题

1. **GitHub Pages部署后显示空白页面**
   - 检查HTML文件中的资源路径是否正确
   - 确保使用相对路径而非绝对路径
   - 检查是否有JavaScript错误阻止页面加载

2. **API请求失败**
   - 在静态托管环境中，服务器端API将无法工作
   - 考虑使用Serverless函数或第三方API服务

3. **CORS错误**
   - 如果使用外部API，确保它们允许跨域请求
   - 或使用CORS代理服务

## 最佳实践

- 在部署前测试应用在本地环境中的静态版本
- 使用环境变量区分开发和生产环境
- 定期备份用户数据和配置
- 实现自动化部署流程
- 为生产环境启用HTTPS

## 安全注意事项

- 不要在代码中硬编码敏感信息（如API密钥）
- 使用环境变量存储敏感配置
- 定期更新依赖项以修复安全漏洞
- 在生产环境中使用强密码和安全的SESSION_SECRET
- 考虑实现速率限制以防止滥用
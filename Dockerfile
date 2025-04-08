FROM node:16-alpine

# 设置工作目录
WORKDIR /usr/src/app

# 复制 package.json 并安装依赖
COPY package*.json ./
RUN npm install

# 复制所有项目文件
COPY . .

# 启动优化后的 index.js
CMD ["node", "index.js"]

# DB AI Assistant

DB AI Assistant 是一款类似 Chat2DB-AI 的数据库工具，允许用户通过界面连接到 MySQL 数据库，并使用自然语言生成 SQL 查询。

## 功能特点

- 连接 MySQL 数据库并管理连接
- 可视化数据库结构（数据库、表、字段）
- 查看表数据和结构
- 执行 SQL 查询
- 使用 AI 将自然语言转换为 SQL 查询

## 技术栈

- 前端：React、Ant Design、Monaco Editor
- 后端：Node.js、Express
- 数据库：MySQL
- AI：OpenAI API

## 安装与设置

### 前置要求

- Node.js 14+
- MySQL 服务器

### 安装步骤

1. 克隆仓库
   ```
   git clone https://github.com/dudl0428/chat-db.git
   cd chat-db
   ```

2. 安装依赖
   ```
   npm install
   ```

3. 配置环境变量
   
   创建 `.env` 文件，并配置以下内容：
   ```
   PORT=5000
   OPENAI_API_KEY=your_openai_api_key
   ```
   
   请将 `your_openai_api_key` 替换为您的 OpenAI API 密钥。

4. 启动开发服务器
   ```
   npm run dev
   ```

5. 访问应用
   
   打开浏览器，访问 `http://localhost:3000`

## 功能演示
![DB AI Assistant 演示](demo.gif)

## 使用说明

1. **连接数据库**
   - 在首页填写 MySQL 连接信息
   - 点击"连接"按钮
   
2. **浏览数据库**
   - 在左侧边栏查看数据库和表结构
   - 点击表名查看表数据
   
3. **查询数据**
   - 在"SQL 查询"标签页中编写 SQL 查询
   - 点击"执行查询"按钮
   
4. **AI 生成 SQL**
   - 点击"Chat with AI"按钮
   - 输入您的自然语言请求，如"显示最近一个月的订单"
   - AI 将生成相应的 SQL 查询

## 开发说明

### 项目结构

```
db-ai-assistant/
├── src/
│   ├── client/            # 前端代码
│   │   ├── components/    # React 组件
│   │   ├── pages/         # 页面组件
│   │   └── ...
│   ├── server/            # 后端代码
│   │   ├── controllers/   # 控制器
│   │   ├── routes/        # 路由
│   │   ├── services/      # 服务
│   │   └── index.js       # 服务器入口
│   └── ...
├── .env                   # 环境变量
└── package.json           # 项目配置
```

### 构建生产版

```
npm run build
```

生产版文件将被输出到 `dist` 目录。

## 许可证

MIT 
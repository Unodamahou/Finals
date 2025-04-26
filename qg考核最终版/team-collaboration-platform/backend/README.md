# 团队协作平台后端服务

这是一个基于Node.js和MySQL的团队协作平台后端服务。

## 环境要求

- Node.js (v14或更高版本)
- MySQL (v5.7或更高版本)
- npm或yarn

## 安装步骤

1. 安装依赖：
```bash
npm install
```

2. 配置环境变量：
创建`.env`文件并设置以下变量：
```
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=team_collaboration
PORT=3000
JWT_SECRET=your_jwt_secret_key
```

3. 初始化数据库：
- 登录MySQL
- 运行`init-db.sql`脚本：
```bash
mysql -u your_username -p < init-db.sql
```

## 运行服务

开发模式：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

## API端点

### 认证
- POST `/api/admin/login` - 管理员登录

### 成员管理
- GET `/api/members` - 获取所有成员
- POST `/api/members` - 添加新成员

### 小组管理
- GET `/api/groups` - 获取所有小组
- POST `/api/groups` - 创建新小组

### 任务管理
- GET `/api/tasks` - 获取所有任务
- POST `/api/tasks` - 创建新任务

## 默认管理员账号
- 用户名：admin
- 密码：admin123

## 注意事项
- 所有API请求（除了登录）都需要在请求头中包含有效的JWT令牌
- 令牌格式：`Authorization: Bearer <token>`
- 确保MySQL服务正在运行
- 确保端口3000未被占用 
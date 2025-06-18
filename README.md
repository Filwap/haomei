# 纪念网站部署指南

这个指南将帮助你设置和部署纪念网站的后端服务，包括Cloudflare D1数据库和Worker。

## 前置要求

1. 安装 [Node.js](https://nodejs.org/) (版本 16.13.0 或更高)
2. 安装 Wrangler CLI:
   ```bash
   npm install -g wrangler
   ```
3. 登录到你的Cloudflare账户:
   ```bash
   wrangler login
   ```

## 设置步骤

### 1. 创建D1数据库

```bash
# 创建数据库
wrangler d1 create memorial_site_db

# 输出将类似于：
# ✅ Created database 'memorial_site_db' (ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
```

将输出的数据库ID复制到 `wrangler.toml` 文件中的 `database_id` 字段。

### 2. 创建数据库表

```bash
# 创建本地D1数据库用于开发
wrangler d1 execute memorial_site_db --local --file=./schema.sql

# 在生产环境创建表
wrangler d1 execute memorial_site_db --file=./schema.sql
```

### 3. 部署Worker

```bash
# 部署Worker到Cloudflare
wrangler deploy
```

### 4. 更新网站配置

在 `script.js` 文件中，将 `API_BASE_URL` 更新为你的Worker URL：

```javascript
const API_BASE_URL = 'https://memorial-site-worker.[your-username].workers.dev';
```

将 `[your-username]` 替换为你的Cloudflare账户子域名。

## 本地开发

1. 启动本地开发服务器：
   ```bash
   wrangler dev
   ```

2. 在浏览器中访问 `http://localhost:8787` 测试API

## 数据库操作

### 查看数据

```bash
# 查看所有留言
wrangler d1 execute memorial_site_db --command="SELECT * FROM messages;"

# 查看所有纪念日
wrangler d1 execute memorial_site_db --command="SELECT * FROM anniversaries;"
```

### 备份数据

```bash
# 导出数据库
wrangler d1 backup memorial_site_db
```

## 故障排除

1. 如果遇到CORS错误，确保Worker中的CORS头部配置正确

2. 如果数据库操作失败：
   - 检查数据库ID是否正确配置
   - 确保SQL语句语法正确
   - 查看Worker的错误日志

3. 如果Worker部署失败：
   - 确保wrangler.toml配置正确
   - 检查是否有语法错误
   - 确保已经登录到Cloudflare账户

## 安全注意事项

1. 不要在代码中硬编码敏感信息
2. 考虑添加适当的访问控制
3. 定期备份数据库
4. 监控Worker的使用情况

## 维护

1. 定期更新依赖包
2. 监控Worker的性能
3. 检查数据库大小和使用情况
4. 保持代码库的更新

如果遇到任何问题，请查看 [Cloudflare Workers文档](https://developers.cloudflare.com/workers/) 或 [D1数据库文档](https://developers.cloudflare.com/d1/)。
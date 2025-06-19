# 纪念网站

一个专门用于记录和分享美好回忆的网站，支持在线和离线使用，具有自动数据同步功能。

## 功能特点

### 1. 纪念日管理
- 添加重要的纪念日期
- 自动计算倒计时
- 支持自定义纪念日名称和日期

### 2. 留言板
- 发布留言和心情
- 支持离线留言
- 网络恢复后自动同步

### 3. 照片墙
- 展示珍贵的照片回忆
- 支持照片预览
- 优雅的图片布局

### 4. 在线/离线支持
- 支持离线访问和操作
- 网络恢复后自动同步数据
- 实时网络状态提示

### 5. 背景音乐
- 支持自定义背景音乐
- 音乐播放控制
- 优雅的音乐播放器界面

## 技术特点

- 前端：原生JavaScript，无需框架依赖
- 后端：Cloudflare Workers
- 数据库：Cloudflare D1（SQLite）
- 存储：GitHub（照片存储）
- 部署：GitHub Pages（前端）+ Cloudflare Workers（后端）

## 部署指南

我们提供了两份部署指南，根据你的技术水平选择合适的指南：

1. [快速部署指南](快速部署指南.md) - 专为技术小白设计，包含详细的图文说明
2. [详细部署指南](部署指南.md) - 包含完整的技术细节和配置说明

## 开发环境设置

1. 克隆仓库：
```bash
git clone https://github.com/你的用户名/memorial-site.git
cd memorial-site
```

2. 安装依赖：
```bash
npm install
```

3. 本地开发：
```bash
# 启动本地开发服务器
wrangler dev

# 在另一个终端窗口启动前端
npx http-server
```

## 项目结构

```
memorial-site/
├── index.html          # 主页面
├── admin.html         # 管理员页面
├── styles.css         # 主样式文件
├── admin.css         # 管理员页面样式
├── script.js         # 主要JavaScript代码
├── sync.js          # 数据同步相关代码
├── worker.js        # Cloudflare Worker代码
├── wrangler.toml    # Wrangler配置文件
├── schema.sql       # 数据库架构
└── photos/          # 照片存储目录
```

## 配置说明

### 1. Cloudflare Workers配置
配置文件：`wrangler.toml`
```toml
name = "memorial-site-worker"
main = "worker.js"
compatibility_date = "2023-01-01"

[[d1_databases]]
binding = "DB"
database_name = "memorial-site-db"
database_id = "你的数据库ID"
```

### 2. 前端API配置
配置文件：`script.js`
```javascript
const API_BASE_URL = 'https://your-worker.workers.dev';
```

## 常见问题

### Q: 如何修改网站标题和样式？
A: 编辑 `index.html` 和 `styles.css` 文件进行自定义。

### Q: 如何添加/更换背景音乐？
A: 将音乐文件放在 `music` 目录下，并在 `script.js` 中更新音乐配置。

### Q: 如何设置管理员密码？
A: 在 `worker.js` 中修改 `ADMIN_PASSWORD` 常量。

### Q: 数据如何备份？
A: 所有数据都存储在Cloudflare D1数据库中，可以使用Wrangler命令导出备份：
```bash
wrangler d1 backup memorial-site-db
```

## 贡献指南

1. Fork 本仓库
2. 创建你的特性分支：`git checkout -b feature/AmazingFeature`
3. 提交你的改动：`git commit -m 'Add some AmazingFeature'`
4. 推送到分支：`git push origin feature/AmazingFeature`
5. 提交 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 联系方式

如果你在使用过程中遇到任何问题，可以：
1. 提交 Issue
2. 发送邮件至：[你的邮箱]
3. 在项目讨论区提问

---

希望这个项目能帮助你记录和分享美好的回忆！
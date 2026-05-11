# 情侣纪念网站 · 部署指南

## 架构概览

```
浏览器访问 haomei.cc.cd
    → Cloudflare Pages（托管静态网站）
    → Cloudflare Worker（后端 API）
    → Cloudflare D1（数据库）
```

全部免费，数据永久保存，中国访问快。

---

## 第一步：准备工作

1. 注册 Cloudflare 账号：https://dash.cloudflare.com/sign-up
2. 确保 `haomei.cc.cd` 的 DNS 已托管在 Cloudflare（已确认 ✅）

---

## 第二步：创建 D1 数据库

1. 登录 Cloudflare Dashboard
2. 左侧菜单 → **Workers & Pages** → **D1 SQL Database**
3. 点击 **Create** → 数据库名填 `haomei-db` → 点 **Create**
4. 创建成功后，复制右上角的 **Database ID**（一串 UUID）
5. 打开项目里的 `wrangler.toml`，把 `database_id` 替换成刚才复制的 ID
6. 在 D1 页面点击 **Console** 标签，把 `schema.sql` 里的全部内容粘贴进去，点 **Execute** 运行

---

## 第三步：部署 Worker（后端 API）

### 方法 A：用 Cloudflare Dashboard（推荐，无需安装工具）

1. 左侧菜单 → **Workers & Pages** → **Create** → **Create Worker**
2. 给 Worker 起名：`haomei-api`
3. 点 **Deploy**，进入编辑界面
4. 把本项目 `worker.js` 的全部内容粘贴进去
5. **【重要】修改密码**：找到文件顶部的：
   ```js
   const ADMIN_PASS = 'haomei2025';
   const JWT_SECRET = 'haomei_secret_2025';
   ```
   把这两个值改成你自己想要的密码和随机字符串
6. 点 **Deploy** 保存

### 绑定 D1 数据库
1. 在 Worker 页面 → **Settings** → **Bindings**
2. 点 **Add** → 选 **D1 database**
3. Variable name 填：`DB`
4. D1 database 选：`haomei-db`
5. 点 **Save**

### 记录 Worker 地址
部署完成后，Worker 地址格式为：
```
https://haomei-api.你的用户名.workers.dev
```
记下这个地址，后面要用。

---

## 第四步：修改网站 API 地址

打开项目文件，把以下两处 `YOUR_WORKER_SUBDOMAIN` 替换成你的 Cloudflare 用户名：

**`script.js` 第 8 行：**
```js
const API_BASE = 'https://haomei-api.你的用户名.workers.dev';
```

**`admin.html` 中的 script 部分：**
```js
const API_BASE = 'https://haomei-api.你的用户名.workers.dev';
```

---

## 第五步：上传到 GitHub

1. 登录 GitHub，新建仓库：`haomei`（Public 或 Private 均可）
2. 把整个项目文件夹上传（可直接拖拽，或用 GitHub Desktop）

---

## 第六步：部署到 Cloudflare Pages

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. 连接你的 GitHub 账号，选择 `haomei` 仓库
3. 构建配置：
   - Framework preset：**None**
   - Build command：（留空）
   - Build output directory：`/`（或留空）
4. 点 **Save and Deploy**

---

## 第七步：绑定自定义域名

1. Pages 部署完成后，进入 Pages 项目 → **Custom domains**
2. 点 **Set up a custom domain**
3. 输入：`haomei.cc.cd`
4. 因为 DNS 已在 Cloudflare，会自动添加 CNAME 记录
5. 等待几分钟生效

---

## 第八步：验证是否正常

1. 访问 `https://haomei.cc.cd` → 看到主页 ✅
2. 访问 `https://haomei.cc.cd/admin.html` → 看到登录页 ✅
3. 用你设置的账号密码登录后台，添加一条纪念日
4. 刷新主页，看是否显示出来 ✅

---

## 修改管理员密码

打开 Cloudflare Worker 编辑界面，修改：
```js
const ADMIN_USER = 'admin';        // 账号
const ADMIN_PASS = 'haomei2025';   // 密码（改成你自己的）
const JWT_SECRET = 'xxxxxxxx';     // 密钥（改成随机字符串）
```
修改后重新 Deploy 即可。

---

## 照片上传方式

由于是纯静态方案，照片需要先上传到图床再复制链接：

推荐免费图床：
- **imgbb.com** （免费，无时限）
- **sm.ms** （免费，国内可访问）
- **cloudinary.com** （免费额度很大）

步骤：上传图片 → 复制链接 → 粘贴到管理后台

---

## 文件说明

| 文件 | 说明 |
|------|------|
| `index.html` | 主站页面 |
| `script.js` | 主站脚本（已接入云端 API） |
| `styles.css` | 样式 |
| `admin.html` | 管理后台页面 |
| `worker.js` | Cloudflare Worker 后端代码 |
| `wrangler.toml` | Worker 配置文件 |
| `schema.sql` | 数据库建表 SQL |
| `DEPLOY.md` | 本部署指南 |

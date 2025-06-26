# 纪念网站 - Cloudflare Worker 部署指南

本指南将帮助你部署Cloudflare Worker，使纪念网站能够在云端存储数据，实现多设备数据同步。

## 前提条件

1. 拥有一个Cloudflare账户
2. 安装Node.js和npm

## 部署步骤

### 1. 安装Wrangler CLI

Wrangler是Cloudflare Workers的命令行工具。

```bash
npm install -g wrangler
```

### 2. 登录Cloudflare账户

```bash
wrangler login
```

按照提示在浏览器中完成授权。

### 3. 创建KV命名空间

KV命名空间用于存储纪念日和留言数据。

```bash
wrangler kv:namespace create "MEMORIAL_KV"
```

命令执行后，你会看到类似以下输出：

```
🌀 Creating namespace with title "worker-MEMORIAL_KV"
✨ Success!
Add the following to your configuration file:
kv_namespaces = [
	{ binding = "MEMORIAL_KV", id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
]
```

### 4. 更新wrangler.toml配置

使用上一步得到的命名空间ID，更新wrangler.toml文件中的`<your-namespace-id>`。

### 5. 部署Worker

```bash
wrangler deploy
```

部署成功后，你会看到Worker的URL，类似：
`https://memorial-site-worker.your-subdomain.workers.dev`

### 6. 更新API_URL

打开`script.js`文件，将`API_URL`变量更新为你的Worker URL：

```javascript
const API_URL = 'https://memorial-site-worker.your-subdomain.workers.dev';
```

## 测试

部署完成后，刷新网站并尝试以下操作：

1. 添加一个新的纪念日
2. 添加一个新的留言
3. 在不同的设备或浏览器上访问网站，确认数据已同步

## 故障排除

如果遇到问题：

1. 检查浏览器控制台是否有错误信息
2. 确认API_URL是否正确设置
3. 检查Cloudflare Worker是否正常运行

如果API连接失败，网站会自动回退到使用localStorage存储数据。

## 高级配置

### 自定义域名

如果你想使用自定义域名，可以在Cloudflare仪表板中配置Workers路由。

### 增加KV存储限制

免费账户的KV存储有一定限制。如果需要更多存储空间，可以升级到Cloudflare Workers付费计划。

## 管理员设置指南

### 设置管理员用户名和密码

1. 打开`worker.js`文件，找到以下代码段：

```javascript
// 管理员凭据 - 在实际应用中应使用更安全的方式存储
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'password';
```

2. 将默认的用户名`admin`和密码`password`修改为你自己的安全凭据。

3. 重新部署Worker：

```bash
wrangler deploy
```

### 管理员登录和照片上传

1. 访问`admin.html`页面进行登录
2. 使用你设置的用户名和密码登录
3. 登录成功后会自动跳转到照片管理页面
4. 在照片管理页面，你可以：
   - 上传新照片
   - 为照片添加描述
   - 照片上传成功后会自动显示在首页的照片墙中

### 安全提示

- 请使用强密码（包含大小写字母、数字和特殊字符）
- 定期更改管理员密码
- 不要与他人分享管理员凭据
- 考虑使用环境变量或KV存储来存储管理员凭据，而不是硬编码在代码中

## 网站部署指南（小白版）

### 第一步：准备工作

1. **注册 Cloudflare 账号**
   - 打开浏览器，访问 https://dash.cloudflare.com/sign-up
   - 使用你的邮箱注册一个账号
   - 按照提示完成邮箱验证

2. **安装必要工具**
   - 安装 Node.js
     1. 访问 https://nodejs.org/
     2. 下载并安装"LTS"版本（长期支持版）
     3. 安装完成后，打开命令提示符（按 Win+R，输入 cmd，回车）
     4. 输入 `node --version` 确认安装成功

### 第二步：安装 Wrangler

1. **打开命令提示符**
   - 按 Win+R
   - 输入 cmd
   - 点击确定

2. **安装 Wrangler**
   ```bash
   npm install -g wrangler
   ```

3. **登录 Cloudflare**
   ```bash
   wrangler login
   ```
   - 这会打开浏览器
   - 点击"允许"或"Authorize"按钮
   - 看到"授权成功"信息后关闭浏览器

### 第三步：创建 KV 存储空间

1. **登录 Cloudflare 控制台**
   - 访问 https://dash.cloudflare.com/
   - 使用你的账号登录

2. **创建 Workers KV**
   - 点击左侧菜单的"Workers & Pages"
   - 点击"KV"选项卡
   - 点击"创建命名空间"（Create namespace）
   - 输入名称：`MEMORIAL_KV`
   - 点击"添加"（Add）

3. **记录 KV ID**
   - 创建后会看到一个ID（形如：xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx）
   - 把这个ID复制下来，后面要用

### 第四步：修改配置文件

1. **编辑 wrangler.toml 文件**
   - 用记事本打开项目文件夹中的 wrangler.toml
   - 将以下内容复制进去（注意替换你的KV ID）：
   ```toml
   name = "memorial-site-worker"
   main = "worker.js"
   compatibility_date = "2023-01-01"

   kv_namespaces = [
     { binding = "MEMORIAL_KV", id = "你的KV ID" }
   ]
   ```

2. **修改 worker.js**
   - 用记事本打开 worker.js
   - 找到以下代码段：
   ```javascript
   // 管理员凭据 - 在实际应用中应使用更安全的方式存储
   const ADMIN_USERNAME = 'admin';
   const ADMIN_PASSWORD_HASH = '5f4dcc3b5aa765d61d8327deb882cf99'; // 默认密码: memorial2023
   const JWT_SECRET = 'memorial-site-jwt-secret-key';
   ```

   **重要安全说明：**
   - 当前实现使用MD5进行密码哈希，这是为了演示目的。在生产环境中，你应该：
     1. 使用更安全的哈希算法（如bcrypt、Argon2）
     2. 添加随机盐值
     3. 使用专业的密码哈希库
   - JWT实现也是简化版本，生产环境应使用成熟的JWT库
   - 所有敏感信息（用户名、密码哈希、JWT密钥）都应该通过环境变量配置
   - 修改管理员用户名（默认是`admin`）
   - 如果想修改密码：
     1. 访问在线MD5工具：https://www.md5hashgenerator.com/
     2. 输入你想要的新密码
     3. 点击"Generate"生成MD5哈希值
     4. 将生成的哈希值复制并替换`ADMIN_PASSWORD_HASH`的值
     
     **注意：** MD5不是最安全的哈希算法。在实际应用中，建议修改代码使用更安全的算法如bcrypt。
   - 生成安全的JWT密钥：
     1. 访问：https://generate-secret.vercel.app/32 生成随机密钥
     2. 或者在命令提示符中运行：
        ```bash
        node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
        ```
     3. 将生成的密钥替换`JWT_SECRET`的值

   **重要安全提示：**
   - 永远不要使用默认的密码和JWT密钥
   - JWT密钥至少应该是32个字符的随机字符串
   - 密码应该包含大小写字母、数字和特殊字符
   - 定期更换密码和JWT密钥
   - 不要将包含真实凭据的配置文件分享给他人

3. **修改网站文件中的 API 地址**
   - 用记事本打开 script.js
   - 找到这一行：`const API_URL = 'https://memorial-site-worker.your-subdomain.workers.dev';`
   - 用记事本打开 photos.html
   - 找到这一行：`const API_URL = 'https://memorial-site-worker.your-subdomain.workers.dev';`
   - 将两个文件中的API_URL都修改为你的Workers地址（部署后会得到）

### 第五步：部署网站

1. **部署 Worker**
   ```bash
   wrangler deploy
   ```
   - 部署成功后会显示一个网址（例如：https://memorial-site-worker.xxx.workers.dev）
   - 复制这个网址

2. **更新 API 地址**
   - 用记事本打开 script.js 和 photos.html
   - 找到这一行：`const API_URL = 'https://memorial-site-worker.your-subdomain.workers.dev';`
   - 将两个文件中的API_URL都修改为你刚才复制的网址
   - 保存文件
   
   **重要提示：** 必须同时更新两个文件中的API_URL：
   - script.js - 用于主页面的数据加载和保存
   - photos.html - 用于照片管理功能
   
   如果只更新了一个文件，部分功能将无法正常工作。

3. **部署静态文件**
   - 推荐使用 Cloudflare Pages（与Workers结合最佳）或 GitHub Pages
   
   **使用 Cloudflare Pages 部署（推荐）：**
   1. 在 Cloudflare 控制台中点击"Workers & Pages"
   2. 点击"创建应用程序"
   3. 选择"Pages"选项卡
   4. 点击"连接到 Git"
      - 如果你有GitHub/GitLab账号：
        1. 选择你的Git提供商
        2. 授权Cloudflare访问
        3. 选择包含网站文件的仓库
      - 如果没有Git仓库：
        1. 点击"直接上传"
        2. 将所有HTML、CSS、JS和图片文件拖放到上传区域
   5. 设置部署配置：
      - 项目名称：memorial-site
      - 生产分支：main（或master）
      - 构建设置：保持默认（无需构建命令）
   6. 点击"保存并部署"
   7. 等待部署完成，Cloudflare会提供一个网址（例如：https://memorial-site.pages.dev）
   
   **使用 GitHub Pages 部署：**
   1. 在 GitHub 创建新仓库
   2. 上传所有HTML、CSS、JS和图片文件到仓库
   3. 在仓库页面点击"Settings"
   4. 在左侧菜单找到"Pages"
   5. 在"Source"部分选择"main"分支和"/(root)"文件夹
   6. 点击"Save"
   7. 等待几分钟，GitHub会提供一个网址

### 第六步：测试网站

1. **测试照片墙**
   - 访问你的网站首页（Cloudflare Pages或GitHub Pages提供的网址）
   - 确认页面布局正常显示
   - 如果已有照片，应该能看到照片墙
   - 如果还没有照片，页面应该显示"暂无照片"的提示

2. **测试管理功能**
   - 点击页面底部半透明的"管理员入口"链接
   - 使用你设置的用户名和密码登录
     - 默认用户名：admin
     - 默认密码：memorial2023（除非你已修改）
   - 登录后，你应该能看到管理面板
   - 尝试上传一张照片：
     1. 点击"选择文件"按钮
     2. 选择一张图片（建议小于5MB）
     3. 填写照片描述
     4. 点击"上传"按钮
     5. 上传成功后，返回首页查看照片是否显示

3. **测试照片详情**
   - 在照片墙上点击任意照片
   - 应该能看到照片的大图和描述

### 常见问题解决

1. **如果 wrangler deploy 失败**
   - 确认已经正确登录（wrangler login）
   - 检查 wrangler.toml 文件格式是否正确
   - 确认 KV ID 已正确填写

2. **如果上传照片失败**
   - 检查 API_URL 是否正确设置
   - 确认已经正确登录管理员账号
   - 检查照片大小是否超过限制（建议小于 5MB）

3. **如果照片墙显示不正常**
   - 检查浏览器控制台是否有错误信息（按 F12 打开）
   - 确认 API_URL 设置正确
   - 清除浏览器缓存后重试

### 获取帮助

如果遇到问题：
1. 查看 Cloudflare Workers 文档：https://developers.cloudflare.com/workers/
2. 在 GitHub 上搜索相似问题
3. 在 Cloudflare 社区论坛寻求帮助：https://community.cloudflare.com/

记住：部署过程中遇到问题是正常的，不要着急，按步骤排查，大多数问题都能解决！

## 常见问题解答(FAQ)

### 1. 照片无法显示或上传失败

**可能原因和解决方法：**
- **API地址错误**：确认script.js和photos.html中的API_URL是否正确设置为你的Workers地址
- **CORS错误**：在浏览器控制台(F12)中查看是否有CORS错误。如果有，检查worker.js中的CORS设置
- **KV绑定问题**：确认wrangler.toml中的KV绑定名称是`MEMORIAL_KV`而不是其他名称
- **文件大小限制**：Cloudflare Workers有1MB的请求大小限制，尝试上传更小的图片

### 2. 管理员登录失败

**可能原因和解决方法：**
- **凭据错误**：确认使用的是正确的用户名和密码
- **密码哈希问题**：如果修改过密码，确认bcrypt哈希值格式正确
- **JWT密钥问题**：确认JWT_SECRET已设置为有效的字符串
- **Cookie问题**：确认浏览器允许设置Cookie，尝试清除浏览器缓存和Cookie

### 3. 部署后网站显示404错误

**可能原因和解决方法：**
- **路径问题**：确认index.html在网站根目录
- **部署未完成**：等待几分钟，有时部署需要时间生效
- **缓存问题**：尝试强制刷新页面(Ctrl+F5)或清除浏览器缓存

### 4. Workers部署失败

**可能原因和解决方法：**
- **wrangler.toml配置错误**：检查配置文件格式是否正确
- **KV ID错误**：确认KV命名空间ID正确复制到配置文件
- **账户权限问题**：确认你的Cloudflare账户有足够权限部署Workers

### 5. 其他技术问题

如果遇到其他技术问题：
- 检查浏览器控制台(F12)中的错误信息
- 查看Cloudflare Workers日志（在Workers控制台中）
- 确认所有文件（HTML、CSS、JS）都已正确上传
- 尝试使用不同的浏览器测试

## 本地开发和测试指南

在部署到Cloudflare之前，你可以在本地环境测试网站功能：

### 设置本地开发环境

1. **安装本地服务器**
   ```bash
   npm install -g http-server
   ```

2. **启动本地服务器**
   ```bash
   http-server -p 8080
   ```
   
3. **访问本地网站**
   - 打开浏览器，访问 http://localhost:8080
   - 网站应该能正常显示，但API功能将无法工作

### 本地测试Worker

1. **使用Wrangler开发模式**
   ```bash
   wrangler dev
   ```
   
2. **更新API_URL为本地地址**
   - 临时修改script.js和photos.html中的API_URL：
   ```javascript
   const API_URL = 'http://localhost:8787';
   ```
   
3. **测试完成后恢复**
   - 测试完成后，记得将API_URL改回Cloudflare Worker的地址

## 性能优化建议

提高网站性能和用户体验的建议：

### 图片优化

1. **压缩上传的图片**
   - 在上传前使用工具压缩图片（如TinyPNG、ImageOptim）
   - 理想的照片大小应在200KB-500KB之间
   - 考虑添加前端图片压缩功能

2. **使用合适的图片尺寸**
   - 照片墙缩略图建议尺寸：300x300像素
   - 详情页大图建议最大尺寸：1200x1200像素

### 缓存策略

1. **启用Cloudflare缓存**
   - 在Cloudflare仪表板中启用缓存规则
   - 为静态资源（CSS、JS、图片）设置较长的缓存时间

2. **使用浏览器缓存**
   - 添加适当的Cache-Control头
   - 为静态资源添加版本号或哈希值

### 代码优化

1. **压缩前端代码**
   - 使用工具压缩HTML、CSS和JavaScript文件
   - 考虑使用Webpack或Parcel等构建工具

2. **延迟加载**
   - 实现图片懒加载，只在需要时加载图片
   - 将非关键JavaScript延迟加载
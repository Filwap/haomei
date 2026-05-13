# 移动端视频优化方案

## 问题诊断

### 当前状态
- **视频文件大小**: 102.5 MB
- **问题**: 移动端网络带宽有限，无法流畅播放大文件

### 根本原因
1. 视频未针对移动端优化
2. 缺少多分辨率版本
3. 移动端网络适应性差

---

## 解决方案

### 方案一：手动转码（快速实施）

#### 第一步：安装转码工具

在本地安装 FFmpeg：
```bash
# Windows (使用 winget)
winget install ffmpeg

# macOS
brew install ffmpeg

# Linux
sudo apt install ffmpeg
```

#### 第二步：生成移动端视频版本

创建三个分辨率版本：

```bash
# 进入视频目录
cd music

# 480p 版本（移动端优先，文件最小）
ffmpeg -i 原始视频.mp4 \
  -vf "scale=854:480:force_original_aspect_ratio=decrease,pad=854:480:(ow-iw)/2:(oh-ih)/2" \
  -c:v libx264 -preset medium -crf 23 \
  -b:v 1000k -c:a aac -b:a 128k \
  -movflags +faststart \
  旅游Vlog_480p.mp4

# 720p 版本（平衡画质和大小）
ffmpeg -i 原始视频.mp4 \
  -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" \
  -c:v libx264 -preset medium -crf 22 \
  -b:v 2500k -c:a aac -b:a 128k \
  -movflags +faststart \
  旅游Vlog_720p.mp4

# 1080p 版本（高清版，PC端使用）
ffmpeg -i 原始视频.mp4 \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
  -c:v libx264 -preset medium -crf 20 \
  -b:v 5000k -c:a aac -b:a 192k \
  -movflags +faststart \
  旅游Vlog_1080p.mp4
```

#### 第三步：生成视频封面

```bash
# 从视频第1秒截取封面图
ffmpeg -i 原始视频.mp4 \
  -ss 00:00:01 \
  -vframes 1 \
  -q:v 2 \
  视频封面.jpg
```

#### 第四步：上传到腾讯云 COS

使用腾讯云 COS 控制台或命令行工具上传转码后的视频文件。

#### 第五步：更新数据库

在 D1 数据库中更新视频记录：

```sql
UPDATE videos
SET
  url = 'https://haomei-video-xxx.cos.ap-guangzhou.myqcloud.com/旅游Vlog_480p.mp4',
  url_720p = 'https://haomei-video-xxx.cos.ap-guangzhou.myqcloud.com/旅游Vlog_720p.mp4',
  url_1080p = 'https://haomei-video-xxx.cos.ap-guangzhou.myqcloud.com/旅游Vlog_1080p.mp4',
  thumbnail = 'https://haomei-video-xxx.cos.ap-guangzhou.myqcloud.com/视频封面.jpg',
  duration = 125  -- 视频时长（秒）
WHERE id = 7;
```

---

### 方案二：自动化转码服务（长期方案）

#### 架构设计

```
用户上传视频
    ↓
[Cloudflare Workers] 接收上传
    ↓
[腾讯云 SCF] 触发转码
    ↓
[FFmpeg] 生成多版本
    ↓
[COS] 存储多版本
    ↓
[更新 D1 数据库]
    ↓
[返回给前端]
```

#### 实施步骤

1. **创建腾讯云 SCF 函数**
   - 使用 Python 或 Node.js
   - 集成 FFmpeg
   - 配置 COS 触发器

2. **配置 COS 生命周期**
   - 自动清理过期文件
   - 智能分层存储

3. **前端适配**
   - 检测设备和网络
   - 自动选择最佳分辨率

---

## 文件大小对比

| 版本 | 分辨率 | 码率 | 预估大小 | 适用场景 |
|------|--------|------|----------|----------|
| 原始 | 1080p | 极高 | 102.5 MB | ❌ 不推荐 |
| 480p | 854x480 | 1000k | ~12 MB | ✅ 移动端首选 |
| 720p | 1280x720 | 2500k | ~30 MB | ✅ 平板/中端机 |
| 1080p | 1920x1080 | 5000k | ~60 MB | ✅ PC端/高端机 |

---

## 前端适配代码

### 添加到 script.js

```javascript
// 检测移动端并选择最佳视频质量
function selectBestVideoUrl(videoData) {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isWifi = navigator.connection ?
        navigator.connection.effectiveType === 'wifi' : true;

    // 默认使用低质量版本
    let url = videoData.url_480p || videoData.url;

    // WiFi 环境可以使用更高质量
    if (isWifi) {
        if (videoData.url_1080p && window.innerWidth > 1024) {
            url = videoData.url_1080p;
        } else if (videoData.url_720p) {
            url = videoData.url_720p;
        }
    }

    return url;
}

// 懒加载视频（移动端优化）
function lazyLoadVideo(videoElement, src) {
    // 使用 IntersectionObserver 延迟加载
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                videoElement.src = src;
                observer.unobserve(videoElement);
            }
        });
    }, { rootMargin: '100px' });

    observer.observe(videoElement);
}
```

---

## 快速检查清单

- [ ] 确认视频文件已转码为 480p 版本
- [ ] 确认封面图已生成并上传
- [ ] 确认数据库中的视频 URL 已更新
- [ ] 确认腾讯云 COS 已配置 CORS（允许 haomei.cn.mt）
- [ ] 测试移动端播放是否流畅

---

## 预期效果

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 视频大小 | 102.5 MB | ~12 MB (480p) |
| 加载时间 | >30 秒 | <3 秒 |
| 移动端播放 | 卡顿/失败 | 流畅播放 |
| 用户体验 | 差 | 优秀 |

/**
 * 视频处理工具 - Cloudflare Worker
 *
 * 功能：
 * 1. 视频转码（多分辨率）
 * 2. 视频压缩
 * 3. 生成缩略图
 * 4. 移动端适配
 *
 * 使用：
 * 1. 安装 ffmpeg.wasm: npm install @ffmpeg/ffmpeg @ffmpeg/util
 * 2. 部署到 Cloudflare Workers
 * 3. 调用 API 进行视频处理
 */

// 视频配置
const VIDEO_CONFIG = {
    resolutions: [
        { name: '480p', width: 854, height: 480, bitrate: '1000k' },
        { name: '720p', width: 1280, height: 720, bitrate: '2500k' },
        { name: '1080p', width: 1920, height: 1080, bitrate: '5000k' }
    ],
    thumbnail: {
        time: '00:00:01', // 截取第1秒作为封面
        size: '320x180'
    },
    mobileOptimized: {
        // 移动端专用配置：更低的码率，更小的文件
        width: 640,
        height: 360,
        bitrate: '500k',
        maxFileSize: 10 * 1024 * 1024 // 10MB
    }
};

/**
 * 生成视频转码命令
 * @param {Object} options - 转码选项
 * @returns {Array} ffmpeg 命令参数
 */
function generateTranscodeCommand(options = {}) {
    const {
        inputPath,
        outputPath,
        width = VIDEO_CONFIG.mobileOptimized.width,
        height = VIDEO_CONFIG.mobileOptimized.height,
        bitrate = VIDEO_CONFIG.mobileOptimized.bitrate
    } = options;

    return [
        '-i', inputPath,
        '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-crf', '23',
        '-b:v', bitrate,
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart', // 优化 web 播放
        '-progress', 'pipe:1',
        outputPath
    ];
}

/**
 * 生成视频缩略图命令
 * @param {string} inputPath - 输入视频路径
 * @param {string} outputPath - 输出图片路径
 * @returns {Array} ffmpeg 命令参数
 */
function generateThumbnailCommand(inputPath, outputPath) {
    return [
        '-i', inputPath,
        '-ss', VIDEO_CONFIG.thumbnail.time,
        '-vframes', '1',
        '-q:v', '2',
        '-vf', `scale=${VIDEO_CONFIG.thumbnail.size}`,
        outputPath
    ];
}

/**
 * 获取视频信息
 * @param {ArrayBuffer} videoData - 视频文件数据
 * @returns {Object} 视频信息
 */
async function getVideoInfo(videoData) {
    // 这里需要调用 ffprobe 获取视频信息
    // 返回：时长、分辨率、码率、编码格式等
    return {
        duration: 0,
        width: 0,
        height: 0,
        bitrate: 0,
        codec: 'h264',
        size: videoData.byteLength
    };
}

/**
 * 检查是否需要转码
 * @param {Object} videoInfo - 视频信息
 * @returns {boolean} 是否需要转码
 */
function needsTranscoding(videoInfo) {
    const { width, height, bitrate, size } = videoInfo;

    // 如果分辨率大于 720p，需要转码
    if (width > 1280 || height > 720) return true;

    // 如果文件大于 20MB，需要转码
    if (size > 20 * 1024 * 1024) return true;

    // 如果码率高于 2500kbps，需要转码
    if (bitrate > 2500) return true;

    return false;
}

/**
 * 生成自适应视频 URL（HLS/DASH）
 * @param {Array} videoVersions - 视频版本数组
 * @returns {Object} 自适应流配置
 */
function generateAdaptiveStream(videoVersions) {
    return {
        playlist: videoVersions.map(v => ({
            resolution: v.resolution,
            bandwidth: v.bandwidth,
            url: v.url
        })),
        hls: {
            // HLS 主播放列表
            master: videoVersions.map(v =>
                `#EXT-X-STREAM-INF:BANDWIDTH=${v.bandwidth},RESOLUTION=${v.resolution}\n${v.filename}.m3u8`
            ).join('\n')
        }
    };
}

module.exports = {
    VIDEO_CONFIG,
    generateTranscodeCommand,
    generateThumbnailCommand,
    getVideoInfo,
    needsTranscoding,
    generateAdaptiveStream
};

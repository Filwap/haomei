#!/bin/bash
# 视频转码脚本 - 将视频转换为移动端友好的480p版本
# 使用方法: ./convert-video.sh <输入视频URL> <输出文件名>

FFMPEG="E:/ZHH/工具/ffmpeg-8.1.1-essentials_build/bin/ffmpeg.exe"
FFPROBE="E:/ZHH/工具/ffmpeg-8.1.1-essentials_build/bin/ffprobe.exe"
INPUT_URL="$1"
OUTPUT_FILE="$2"
TEMP_DIR="C:/Users/admin/Desktop/ZHH/杂/haomei/temp"

# 创建临时目录
mkdir -p "$TEMP_DIR"

# 输出文件
OUTPUT_PATH="$TEMP_DIR/$OUTPUT_FILE"

echo "=========================================="
echo "FFmpeg 视频转码脚本"
echo "=========================================="
echo "输入URL: $INPUT_URL"
echo "输出文件: $OUTPUT_PATH"
echo ""

# 检查输入
if [ -z "$INPUT_URL" ] || [ -z "$OUTPUT_FILE" ]; then
    echo "用法: ./convert-video.sh <输入URL> <输出文件名>"
    echo "示例: ./convert-video.sh \"https://example.com/video.mp4\" output_480p.mp4"
    exit 1
fi

# 显示输入视频信息
echo ">>> 原始视频信息:"
"$FFPROBE" -v quiet -print_format json -show_format -show_streams "$INPUT_URL" | grep -E '"width"|"height"|"duration"|"bit_rate"' | head -4
echo ""

# 开始转码
echo ">>> 开始转码 (480p, CRF 28, 码率上限 1M)..."
echo ">>> 这可能需要几分钟时间，请耐心等待..."
echo ""

"$FFMPEG" -i "$INPUT_URL" \
    -vf "scale='min(854,iw)':'min(480,ih)':force_original_aspect_ratio=decrease" \
    -c:v libx264 -preset fast -crf 28 \
    -maxrate 1M -bufsize 2M \
    -c:a aac -b:a 128k \
    -movflags +faststart \
    -y "$OUTPUT_PATH" 2>&1

# 检查转码结果
if [ $? -eq 0 ] && [ -f "$OUTPUT_PATH" ]; then
    echo ""
    echo "=========================================="
    echo "✅ 转码成功！"
    echo "=========================================="

    # 显示输出视频信息
    echo ""
    echo ">>> 输出视频信息:"
    "$FFPROBE" -v quiet -print_format json -show_format "$OUTPUT_PATH" | grep -E '"filename"|"format_name"|"duration"|"size"|"bit_rate"'

    # 文件大小
    echo ""
    echo ">>> 文件大小:"
    ls -lh "$OUTPUT_PATH"
else
    echo ""
    echo "=========================================="
    echo "❌ 转码失败！"
    echo "=========================================="
    exit 1
fi

document.addEventListener('DOMContentLoaded', function() {
    // 更新页脚年份
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // 计算在一起的天数（默认日期：2023年1月1日，用户可以修改为实际日期）
    const startDate = new Date('2023-01-01');
    const today = new Date();
    const timeDiff = Math.abs(today.getTime() - startDate.getTime());
    const daysTogether = Math.floor(timeDiff / (1000 * 3600 * 24));
    
    document.getElementById('days-together').textContent = daysTogether;
    
    // 为照片卡片添加点击事件，提示用户可以更换图片
    const photoPlaceholders = document.querySelectorAll('.photo.placeholder');
    photoPlaceholders.forEach(placeholder => {
        placeholder.addEventListener('click', function() {
            alert('在实际使用时，您可以将这里替换为您的照片。\n\n修改方法：编辑HTML文件，将placeholder div替换为<img>标签，并设置src属性指向您的照片路径。');
        });
    });
    
    // 为特殊时刻添加淡入效果
    const moments = document.querySelectorAll('.moment');
    
    // 检查元素是否在视口中
    function isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
    
    // 添加滚动监听，实现元素进入视口时的动画
    function handleScroll() {
        moments.forEach(moment => {
            if (isInViewport(moment)) {
                moment.style.opacity = '1';
                moment.style.transform = 'translateX(0)';
            }
        });
    }
    
    // 初始化样式
    moments.forEach(moment => {
        moment.style.opacity = '0';
        moment.style.transform = 'translateX(-20px)';
        moment.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });
    
    // 添加滚动事件监听
    window.addEventListener('scroll', handleScroll);
    
    // 初始检查
    handleScroll();
});

// 添加一个简单的页面加载动画
window.addEventListener('load', function() {
    document.body.classList.add('loaded');
    
    // 尝试播放背景音乐
    playBackgroundMusic();
});

// 背景音乐控制
let playAttempts = 0;
const maxPlayAttempts = 5;

// 更新状态提示
function updateStatus(message, isError = false) {
    const statusEl = document.getElementById('audioStatus');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.style.display = 'block';
        statusEl.style.backgroundColor = isError ? 'rgba(255,0,0,0.7)' : 'rgba(0,0,0,0.7)';
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 3000);
    }
    console.log('[音乐状态]', message);
}

function tryPlayMusic(bgMusic) {
    updateStatus('尝试播放音乐...');
    bgMusic.muted = false;
    
    // 确保音频已加载
    if (bgMusic.readyState < 2) {
        bgMusic.load();
    }

    const playPromise = bgMusic.play();
    
    if (playPromise !== undefined) {
        playPromise.then(() => {
            updateStatus('背景音乐已开始播放');
            document.getElementById('musicControl').classList.add('playing');
        }).catch(error => {
            updateStatus(`播放失败: ${error.message}`, true);
            if (playAttempts < maxPlayAttempts) {
                playAttempts++;
                setTimeout(() => tryPlayMusic(bgMusic), 500);
            }
        });
    }
}

function toggleMusic() {
    const bgMusic = document.getElementById('bgMusic');
    const control = document.getElementById('musicControl');
    
    if (!bgMusic) {
        updateStatus('未找到音频元素', true);
        return;
    }
    
    if (bgMusic.paused) {
        updateStatus('尝试开始播放...');
        bgMusic.muted = false;
        bgMusic.play()
            .then(() => {
                updateStatus('音乐已播放');
                control.classList.add('playing');
            })
            .catch(error => {
                updateStatus(`播放失败: ${error.message}`, true);
                control.classList.remove('playing');
            });
    } else {
        updateStatus('音乐已暂停');
        bgMusic.pause();
        control.classList.remove('playing');
    }
}

function initAudioEvents() {
    const bgMusic = document.getElementById('bgMusic');
    if (!bgMusic) {
        updateStatus('未找到音频元素', true);
        return;
    }

    // 音频事件监听
    bgMusic.addEventListener('error', () => {
        updateStatus('音频加载失败，请检查文件路径', true);
    });

    bgMusic.addEventListener('canplay', () => {
        updateStatus('音频已准备好播放');
    });

    bgMusic.addEventListener('playing', () => {
        updateStatus('音乐正在播放');
    });

    bgMusic.addEventListener('waiting', () => {
        updateStatus('等待音频数据...');
    });
}

function playBackgroundMusic() {
    const bgMusic = document.getElementById('bgMusic');
    if (!bgMusic) return;

    // 微信浏览器特殊处理
    if (typeof WeixinJSBridge !== 'undefined') {
        updateStatus('检测到微信环境，尝试特殊处理...');
        document.addEventListener('WeixinJSBridgeReady', () => {
            updateStatus('微信接口准备就绪');
            tryPlayMusic(bgMusic);
        }, false);
        
        WeixinJSBridge.invoke('getNetworkType', {}, () => {
            updateStatus('微信网络检测完成');
            tryPlayMusic(bgMusic);
        }, false);
    }
    
    // 通用尝试
    tryPlayMusic(bgMusic);
}

// 初始化音乐控制
function initMusicControl() {
    const control = document.getElementById('musicControl');
    if (control) {
        control.addEventListener('click', toggleMusic);
    }
}

// 页面加载后初始化
document.addEventListener('DOMContentLoaded', () => {
    initAudioEvents();
    initMusicControl();
    playBackgroundMusic();
});

window.addEventListener('load', () => {
    const bgMusic = document.getElementById('bgMusic');
    if (bgMusic && bgMusic.paused) {
        tryPlayMusic(bgMusic);
    }
});

// 全局点击事件作为后备
document.addEventListener('click', () => {
    const bgMusic = document.getElementById('bgMusic');
    if (bgMusic && bgMusic.paused) {
        tryPlayMusic(bgMusic);
    }
}, {once: true});

// 设置用户交互后播放音乐
function setupMusicPlayOnInteraction() {
    const interactionHandler = function() {
        const bgMusic = document.getElementById('bgMusic');
        if (bgMusic) {
            bgMusic.play()
                .then(() => {
                    document.getElementById('musicToggle').classList.add('playing');
                    console.log('用户交互后音乐已播放');
                })
                .catch(error => console.log('播放失败', error));
        }
        
        // 移除所有交互事件监听器
        document.removeEventListener('click', interactionHandler);
        document.removeEventListener('touchstart', interactionHandler);
        document.removeEventListener('keydown', interactionHandler);
    };
    
    // 添加各种交互事件监听器
    document.addEventListener('click', interactionHandler);
    document.addEventListener('touchstart', interactionHandler);
    document.addEventListener('keydown', interactionHandler);
}

// 音乐控制按钮功能
document.addEventListener('DOMContentLoaded', function() {
    const musicToggle = document.getElementById('musicToggle');
    const bgMusic = document.getElementById('bgMusic');
    
    if (musicToggle && bgMusic) {
        musicToggle.addEventListener('click', function() {
            if (bgMusic.paused) {
                bgMusic.play();
                musicToggle.classList.add('playing');
            } else {
                bgMusic.pause();
                musicToggle.classList.remove('playing');
            }
        });
    }

// 允许用户自定义在一起的日期
function setCustomDate() {
    const dateString = prompt('请输入你们在一起的日期 (格式: YYYY-MM-DD):', '2023-01-01');
    
    if (dateString) {
        const customDate = new Date(dateString);
        
        // 检查日期是否有效
        if (isNaN(customDate.getTime())) {
            alert('日期格式无效，请使用YYYY-MM-DD格式');
            return;
        }
        
        // 计算天数
        const today = new Date();
        const timeDiff = Math.abs(today.getTime() - customDate.getTime());
        const daysTogether = Math.floor(timeDiff / (1000 * 3600 * 24));
        
        // 更新显示
        document.getElementById('days-together').textContent = daysTogether;
        
        // 存储日期到本地存储
        localStorage.setItem('anniversaryDate', dateString);
    }
}

// 检查是否有保存的日期
document.addEventListener('DOMContentLoaded', function() {
    const savedDate = localStorage.getItem('anniversaryDate');
    if (savedDate) {
        const customDate = new Date(savedDate);
        const today = new Date();
        const timeDiff = Math.abs(today.getTime() - customDate.getTime());
        const daysTogether = Math.floor(timeDiff / (1000 * 3600 * 24));
        document.getElementById('days-together').textContent = daysTogether;
    }
    
    // 为日期计数器添加点击事件，允许用户修改日期
    document.querySelector('.date-counter').addEventListener('click', setCustomDate);
});
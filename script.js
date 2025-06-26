// 数据类型常量
const DATA_TYPES = {
    ANNIVERSARY: 'anniversary',
    MESSAGE: 'message',
    PHOTO: 'photo'
};

// 操作类型常量
const OPERATION_TYPES = {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    READ: 'read'
};

// 全局同步管理器实例
let syncManager;

document.addEventListener('DOMContentLoaded', function() {
    // 设置恋爱开始日期（修改为实际日期）
    const loveStartDate = new Date('2023-04-17');

    // 初始化欢迎弹窗
    initWelcomeModal();
    
    // 初始化同步管理器
    initSyncManager();
    
    // 初始化背景音乐
    initBackgroundMusic();
    
    // 加载已保存的纪念日
    loadAnniversaries();
    
    // 加载已保存的留言
    loadMessages();
    
    // 加载照片墙
    loadGallery();
    
    // 计算恋爱天数
    calculateDaysTogether(loveStartDate);
    
    // 计算所有纪念日倒计时
    calculateAllCountdowns();
    
    // 设置导航栏平滑滚动
    setupSmoothScrolling();
    
    // 设置表单提交事件
    setupFormSubmissions();
    
    // 每天更新一次天数
    setInterval(() => calculateDaysTogether(loveStartDate), 86400000); // 24小时 = 86400000毫秒
    
    // 每小时更新一次倒计时
    setInterval(calculateAllCountdowns, 3600000); // 1小时 = 3600000毫秒

    // 清除欢迎状态，使得每次刷新都显示欢迎弹窗
    localStorage.removeItem('welcomed');
});

/**
 * 初始化欢迎弹窗
 */
function initWelcomeModal() {
    const welcomeModal = document.getElementById('welcome-modal');
    const welcomeOverlay = document.getElementById('welcome-overlay');
    const closeWelcomeBtn = document.getElementById('close-welcome');

    // 显示欢迎弹窗
    welcomeModal.style.display = 'block';
    welcomeOverlay.style.display = 'block';

    // 关闭欢迎弹窗
    closeWelcomeBtn.addEventListener('click', function() {
        welcomeModal.style.display = 'none';
        welcomeOverlay.style.display = 'none';
        localStorage.setItem('welcomed', 'true');
    });
}

/**
 * 初始化背景音乐
 */
function initBackgroundMusic() {
    const bgMusic = document.getElementById('bgMusic');
    const musicControl = document.getElementById('musicControl');
    let isPlaying = false;

    if (musicControl && bgMusic) {
        musicControl.addEventListener('click', function() {
            if (isPlaying) {
                bgMusic.pause();
                musicControl.classList.remove('playing');
            } else {
                bgMusic.play();
                musicControl.classList.add('playing');
            }
            isPlaying = !isPlaying;
        });
    }
}

/**
 * 初始化同步管理器
 */
function initSyncManager() {
    // 创建同步管理器实例
    syncManager = new SyncManager({
        apiBaseUrl: API_BASE_URL,
        debug: true // 开启调试模式
    });
    
    // 添加同步状态监听器
    syncManager.addSyncListener(function(data) {
        console.log('同步状态更新:', data);
        
        // 显示同步状态通知
        if (data.status === 'success' || data.status === 'error') {
            const notification = document.createElement('div');
            notification.className = `save-notification ${data.status === 'error' ? 'warning' : ''}`;
            notification.textContent = data.message;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 2000);
        }
    });
    
    // 设置网络状态监听
    setupNetworkListener();
}

/**
 * 设置网络状态监听
 */
function setupNetworkListener() {
    // 创建网络状态指示器
    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'network-status';
    document.body.appendChild(statusIndicator);

    // 更新网络状态UI
    function updateNetworkStatus(online) {
        statusIndicator.style.display = 'block';
        if (online) {
            statusIndicator.classList.add('online');
            statusIndicator.classList.remove('offline');
            statusIndicator.textContent = '网络已连接';
            // 网络恢复时触发同步
            syncManager.syncAll();
            // 3秒后隐藏在线状态提示
            setTimeout(() => {
                statusIndicator.style.display = 'none';
            }, 3000);
        } else {
            statusIndicator.classList.add('offline');
            statusIndicator.classList.remove('online');
            statusIndicator.textContent = '网络已断开';
        }
    }

    // 监听网络状态变化
    window.addEventListener('online', () => {
        updateNetworkStatus(true);
    });

    window.addEventListener('offline', () => {
        updateNetworkStatus(false);
    });

    // 初始化时检查网络状态
    updateNetworkStatus(navigator.onLine);
}

/**
 * 计算恋爱天数并显示在页面上
 * @param {Date} startDate - 恋爱开始的日期
 */
function calculateDaysTogether(startDate) {
    const today = new Date();
    const timeDiff = today - startDate;
    const daysTogether = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    
    // 更新页面上的天数显示
    document.getElementById('days-count').textContent = daysTogether;
    document.getElementById('footer-days').textContent = daysTogether;
}

/**
 * 计算所有纪念日的倒计时
 */
function calculateAllCountdowns() {
    const countdownElements = document.querySelectorAll('.countdown');
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 重置时间为当天0点
    
    countdownElements.forEach(element => {
        const dateStr = element.getAttribute('data-date');
        if (!dateStr) return;
        
        const originalDate = new Date(dateStr);
        
        // 计算今年的纪念日
        const thisYearDate = new Date(dateStr);
        thisYearDate.setFullYear(today.getFullYear());
        
        // 如果今年的纪念日已经过去，计算明年的
        if (thisYearDate < today) {
            thisYearDate.setFullYear(today.getFullYear() + 1);
        }
        
        // 计算天数差异
        const timeDiff = thisYearDate - today;
        const daysLeft = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        
        // 更新倒计时显示
        const daysElement = element.querySelector('.days');
        if (daysElement) {
            daysElement.textContent = daysLeft;
        }
    });
}

/**
 * 设置导航栏平滑滚动
 */
function setupSmoothScrolling() {
    const navLinks = document.querySelectorAll('nav a');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 获取目标部分的ID
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                // 平滑滚动到目标部分
                window.scrollTo({
                    top: targetSection.offsetTop - 60, // 减去导航栏高度
                    behavior: 'smooth'
                });
                
                // 更新活动链接
                navLinks.forEach(link => link.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
    
    // 滚动时更新活动链接
    window.addEventListener('scroll', function() {
        const scrollPosition = window.scrollY;
        
        document.querySelectorAll('.section').forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionBottom = sectionTop + section.offsetHeight;
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
                const currentId = section.getAttribute('id');
                
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${currentId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    });
}

/**
 * 设置表单提交事件
 */
function setupFormSubmissions() {
    // 添加纪念日表单
    const addDateForm = document.getElementById('add-date-form');
    if (addDateForm) {
        addDateForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const nameInput = this.querySelector('input[type="text"]');
            const dateInput = this.querySelector('input[type="date"]');
            
            if (nameInput && dateInput && nameInput.value && dateInput.value) {
                // 创建新的纪念日卡片
                addNewDateCard(nameInput.value, dateInput.value, true);
                
                // 显示成功提示
                alert('纪念日添加成功！');
                
                // 重置表单
                this.reset();
            }
        });
    }
    
    // 留言板表单
    const messageForm = document.getElementById('message-form');
    if (messageForm) {
        messageForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const nameInput = this.querySelector('input[type="text"]');
            const messageInput = this.querySelector('textarea');
            
            if (nameInput && messageInput && nameInput.value && messageInput.value) {
                // 添加新留言
                addNewMessage(nameInput.value, messageInput.value);
                
                // 重置表单
                this.reset();
            } else {
                alert('请填写完整的姓名和留言内容！');
            }
        });
    }
}

// 照片墙相关函数
function initLazyLoading() {
    const images = document.querySelectorAll('.gallery-item img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.addEventListener('load', () => {
                    img.classList.add('loaded');
                });
                observer.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// 照片预览模态框相关函数
let currentPhotoIndex = 0;

function openPhotoModal(index) {
    const modal = document.getElementById('photoModal');
    const modalPhoto = document.getElementById('modalPhoto');
    const loadingSpinner = document.getElementById('photoLoading');
    
    currentPhotoIndex = index;
    modal.style.display = 'block';
    modalPhoto.classList.add('loading');
    loadingSpinner.style.display = 'block';
    
    const photo = window.galleryPhotos[index];
    modalPhoto.src = photo.download_url;
    
    modalPhoto.onload = function() {
        modalPhoto.classList.remove('loading');
        loadingSpinner.style.display = 'none';
    };
}

function closePhotoModal() {
    const modal = document.getElementById('photoModal');
    modal.style.display = 'none';
}

function showNextPhoto() {
    currentPhotoIndex = (currentPhotoIndex + 1) % window.galleryPhotos.length;
    openPhotoModal(currentPhotoIndex);
}

function showPrevPhoto() {
    currentPhotoIndex = (currentPhotoIndex - 1 + window.galleryPhotos.length) % window.galleryPhotos.length;
    openPhotoModal(currentPhotoIndex);
}

// 添加事件监听器
document.addEventListener('DOMContentLoaded', function() {
    // 照片模态框关闭按钮
    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closePhotoModal);
    }
    
    // 上一张/下一张按钮
    const prevBtn = document.querySelector('.prev-photo');
    const nextBtn = document.querySelector('.next-photo');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            showPrevPhoto();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            showNextPhoto();
        });
    }
    
    // 键盘事件
    document.addEventListener('keydown', function(e) {
        if (document.getElementById('photoModal').style.display === 'block') {
            if (e.key === 'ArrowLeft') {
                showPrevPhoto();
            } else if (e.key === 'ArrowRight') {
                showNextPhoto();
            } else if (e.key === 'Escape') {
                closePhotoModal();
            }
        }
    });
});
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
    // 设置恋爱开始日期（示例日期，需要修改为实际日期）
    const loveStartDate = new Date('2025-04-17');

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
});

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
    statusIndicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 14px;
        z-index: 1000;
        transition: all 0.3s ease;
        display: none;
    `;
    document.body.appendChild(statusIndicator);

    // 更新网络状态UI
    function updateNetworkStatus(online) {
        statusIndicator.style.display = 'block';
        if (online) {
            statusIndicator.style.backgroundColor = '#4CAF50';
            statusIndicator.style.color = 'white';
            statusIndicator.textContent = '网络已连接';
            // 网络恢复时触发同步
            syncManager.syncAll();
            // 3秒后隐藏在线状态提示
            setTimeout(() => {
                statusIndicator.style.display = 'none';
            }, 3000);
        } else {
            statusIndicator.style.backgroundColor = '#f44336';
            statusIndicator.style.color = 'white';
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

// API基础URL - 已更新为实际的Cloudflare Worker URL
const API_BASE_URL = 'https://memorial-site-worker.lxbtip-ddnscom.workers.dev';

// 管理员认证相关函数
async function adminLogin(password) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });
        
        if (!response.ok) {
            throw new Error('登录失败');
        }
        
        const data = await response.json();
        if (data.token) {
            localStorage.setItem('admin_token', data.token);
            return true;
        }
        return false;
    } catch (error) {
        console.error('管理员登录失败:', error);
        return false;
    }
}

async function verifyAdmin() {
    const token = localStorage.getItem('admin_token');
    if (!token) return false;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            localStorage.removeItem('admin_token');
            return false;
        }
        
        const data = await response.json();
        return data.valid === true;
    } catch (error) {
        console.error('验证失败:', error);
        localStorage.removeItem('admin_token');
        return false;
    }
}

// 获取GitHub令牌
async function getGitHubToken() {
    const token = localStorage.getItem('admin_token');
    if (!token) return null;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/verify`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        return data.token;
    } catch (error) {
        console.error('获取GitHub令牌失败:', error);
        return null;
    }
}

// 照片墙加载函数
async function loadGallery() {
    const galleryContainer = document.querySelector('.gallery-container');
    if (!galleryContainer) return;
    
    try {
        // 尝试使用GitHub令牌获取照片
        let response;
        let useToken = false;
        
        try {
            const githubToken = await getGitHubToken();
            if (githubToken) {
                response = await fetch('https://api.github.com/repos/Filwap/memorial-site/contents/photos', {
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                useToken = true;
            }
        } catch (tokenError) {
            console.log('无法获取GitHub令牌，将使用公共访问:', tokenError);
        }
        
        // 如果没有令牌或令牌请求失败，使用公共访问
        if (!useToken) {
            response = await fetch('https://api.github.com/repos/Filwap/memorial-site/contents/photos');
        }
        
        if (!response.ok) {
            throw new Error('获取照片列表失败');
        }
        
        const files = await response.json();
        // 过滤出图片文件
        window.galleryPhotos = files.filter(file => 
            file.name.match(/\.(jpg|jpeg|png|gif)$/i)
        );
        
        // 生成照片墙HTML
        galleryContainer.innerHTML = window.galleryPhotos.map((photo, index) => `
            <div class="gallery-item" onclick="openPhotoModal(${index})">
                <img data-src="${photo.download_url}" alt="${photo.name}" loading="lazy">
                <div class="overlay">
                    <p>美好回忆 ${index + 1}</p>
                </div>
            </div>
        `).join('');
        
        // 初始化懒加载
        initLazyLoading();
        
    } catch (error) {
        console.error('加载照片失败:', error);
        galleryContainer.innerHTML = '<div class="error-message">加载照片失败，请刷新页面重试</div>';
    }
}

// 保存纪念日到Cloudflare D1数据库
async function saveAnniversaries() {
    try {
        // 这里我们不需要获取所有纪念日并保存，因为每个纪念日都会单独保存
        return true;
    } catch (error) {
        console.error('保存纪念日失败:', error);
        return false;
    }
}

// 从数据库加载保存的纪念日
async function loadAnniversaries() {
    try {
        // 使用同步管理器获取所有纪念日
        const anniversaries = await syncManager.getAllFromStore(DATA_TYPES.ANNIVERSARY);
        
        // 显示所有纪念日
        anniversaries.forEach(item => {
            addNewDateCard(item.name, item.date, false, item.id);
        });
        
        // 触发同步
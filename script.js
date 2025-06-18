document.addEventListener('DOMContentLoaded', function() {
    // 设置恋爱开始日期（示例日期，需要修改为实际日期）
    const loveStartDate = new Date('2025-04-17');

    // 初始化背景音乐
    initBackgroundMusic();
    
    // 加载已保存的纪念日
    loadAnniversaries();
    
    // 加载已保存的留言
    loadMessages();
    
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

// 从Cloudflare D1数据库加载保存的纪念日
async function loadAnniversaries() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/anniversaries`);
        if (!response.ok) {
            throw new Error('获取纪念日失败');
        }
        
        const anniversaries = await response.json();
        anniversaries.forEach(item => {
            addNewDateCard(item.name, item.date, false);
        });
    } catch (error) {
        console.error('加载纪念日失败:', error);
        // 如果API失败，尝试从localStorage加载（作为备份）
        const saved = localStorage.getItem('anniversaries');
        if (saved) {
            const anniversaries = JSON.parse(saved);
            anniversaries.forEach(item => {
                addNewDateCard(item.name, item.date, false);
            });
        }
    }
}

/**
 * 添加新的纪念日卡片
 * @param {string} name - 纪念日名称
 * @param {string} date - 纪念日日期
 * @param {boolean} [shouldSave=true] - 是否需要保存到数据库
 * @param {number} [id] - 纪念日ID（从数据库获取时使用）
 */
async function addNewDateCard(name, date, shouldSave = true, id = null) {
    const anniversaryContainer = document.querySelector('.anniversary');
    if (!anniversaryContainer) return;
    
    // 创建新的日期卡片
    const dateCard = document.createElement('div');
    dateCard.className = 'date-card';
    
    // 格式化日期为可读格式
    const formattedDate = new Date(date).toLocaleDateString('zh-CN');
    
    // 设置卡片内容
    dateCard.innerHTML = `
        <h3>${name}</h3>
        <div class="date">${formattedDate}</div>
        <div class="countdown" data-date="${date}">
            <span class="days">0</span> 天
        </div>
        <button class="delete-date-btn">删除</button>
    `;
    
    // 如果有ID，存储在卡片上
    if (id) {
        dateCard.setAttribute('data-id', id);
    }
    
    // 添加删除事件
    dateCard.querySelector('.delete-date-btn').addEventListener('click', async function(e) {
        e.stopPropagation(); // 防止事件冒泡
        if (confirm('确定要删除这个纪念日吗？')) {
            dateCard.style.transition = 'all 0.3s ease';
            dateCard.style.opacity = '0';
            dateCard.style.transform = 'translateX(100px)';
            
            // 获取纪念日ID
            const cardId = dateCard.getAttribute('data-id');
            
            try {
                if (cardId) {
                    // 从数据库删除
                    await fetch(`${API_BASE_URL}/api/anniversaries`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ id: cardId })
                    });
                }
                
                setTimeout(() => {
                    dateCard.remove();
                    calculateAllCountdowns();
                    // 使用更优雅的通知方式
                    const notification = document.createElement('div');
                    notification.className = 'save-notification';
                    notification.textContent = '纪念日已删除！';
                    document.body.appendChild(notification);
                    setTimeout(() => notification.remove(), 2000);
                }, 300);
            } catch (error) {
                console.error('删除纪念日失败:', error);
                alert('删除纪念日失败，请重试！');
            }
        }
    });
    
    // 添加到容器
    anniversaryContainer.appendChild(dateCard);
    
    // 更新倒计时
    calculateAllCountdowns();
    
    // 保存到数据库
    if (shouldSave) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/anniversaries`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, date })
            });
            
            if (!response.ok) {
                throw new Error('保存纪念日失败');
            }
            
            const result = await response.json();
            if (result.success) {
                // 如果保存成功，将返回的ID存储在卡片上
                if (result.id) {
                    dateCard.setAttribute('data-id', result.id);
                }
                
                // 同时保存到localStorage作为备份
                const saved = localStorage.getItem('anniversaries') || '[]';
                const anniversaries = JSON.parse(saved);
                anniversaries.push({ name, date });
                localStorage.setItem('anniversaries', JSON.stringify(anniversaries));
            }
        } catch (error) {
            console.error('保存纪念日失败:', error);
            // 如果API保存失败，仍然保存到localStorage作为备份
            const saved = localStorage.getItem('anniversaries') || '[]';
            const anniversaries = JSON.parse(saved);
            anniversaries.push({ name, date });
            localStorage.setItem('anniversaries', JSON.stringify(anniversaries));
        }
    }
}

/**
 * 添加新留言
 * @param {string} name - 留言者姓名
 * @param {string} message - 留言内容
 */
// 保存留言到Cloudflare D1数据库
async function saveMessages() {
    try {
        // 由于我们现在单独保存每条留言，这个函数主要用于备份到localStorage
        const messages = [];
        document.querySelectorAll('.message').forEach(msg => {
            messages.push({
                name: msg.querySelector('.name').textContent,
                date: msg.querySelector('.date').textContent,
                content: msg.querySelector('p').textContent
            });
        });
        localStorage.setItem('loveMessages', JSON.stringify(messages));
        console.log('留言备份到localStorage成功:', messages);
        return true;
    } catch (error) {
        console.error('备份留言失败:', error);
        return false;
    }
}

// 从Cloudflare D1数据库加载保存的留言
async function loadMessages() {
    try {
        // 从Cloudflare D1数据库加载留言
        const response = await fetch(`${API_BASE_URL}/api/messages`);
        if (!response.ok) {
            throw new Error('获取留言失败');
        }
        
        const messages = await response.json();
        const messageWall = document.querySelector('.message-wall');
        
        if (messageWall) {
            messageWall.innerHTML = ''; // 清空现有留言
            
            // 按时间倒序显示留言
            messages.forEach(msg => {
                const messageElement = document.createElement('div');
                messageElement.className = 'message';
                messageElement.setAttribute('data-id', msg.id); // 存储留言ID
                
                // 格式化日期
                const date = new Date(msg.timestamp).toLocaleDateString('zh-CN');
                
                messageElement.innerHTML = `
                    <div class="message-header">
                        <span class="name">${msg.name}</span>
                        <span class="date">${date}</span>
                    </div>
                    <p>${msg.content}</p>
                    <button class="delete-btn">删除</button>
                `;
                messageWall.appendChild(messageElement);
            });
        }
    } catch (error) {
        console.error('加载留言失败:', error);
        // 如果API失败，从localStorage加载作为备份
        const savedMessages = localStorage.getItem('loveMessages');
        if (savedMessages) {
            const messages = JSON.parse(savedMessages);
            const messageWall = document.querySelector('.message-wall');
            
            if (messageWall) {
                messageWall.innerHTML = ''; // 清空现有留言
                
                messages.reverse().forEach(msg => {
                    const messageElement = document.createElement('div');
                    messageElement.className = 'message';
                    messageElement.innerHTML = `
                        <div class="message-header">
                            <span class="name">${msg.name}</span>
                            <span class="date">${msg.date}</span>
                        </div>
                        <p>${msg.content}</p>
                        <button class="delete-btn">删除</button>
                    `;
                    messageWall.appendChild(messageElement);
                });
            }
        }
    }
}

async function addNewMessage(name, message) {
    const messageWall = document.querySelector('.message-wall');
    if (!messageWall) return;
    
    // 获取当前日期
    const currentDate = new Date().toLocaleDateString('zh-CN');
    const timestamp = new Date().toISOString();
    
    try {
        // 保存到Cloudflare D1数据库
        const response = await fetch(`${API_BASE_URL}/api/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                content: message
            })
        });
        
        if (!response.ok) {
            throw new Error('保存留言失败');
        }
        
        // 创建新留言元素
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        
        // 设置留言内容
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="name">${name}</span>
                <span class="date">${currentDate}</span>
            </div>
            <p>${message}</p>
            <button class="delete-btn">删除</button>
        `;
        
        // 添加删除事件监听器
        messageElement.querySelector('.delete-btn').addEventListener('click', function() {
            if (confirm('确定要删除这条留言吗？')) {
                messageElement.style.transition = 'all 0.3s ease';
                messageElement.style.opacity = '0';
                messageElement.style.transform = 'translateX(100px)';
                
                setTimeout(() => {
                    messageElement.remove();
                    saveMessages(); // 更新localStorage备份
                    // 显示删除成功提示
                    const notification = document.createElement('div');
                    notification.className = 'save-notification';
                    notification.textContent = '留言已删除！';
                    document.body.appendChild(notification);
                    setTimeout(() => notification.remove(), 2000);
                }, 300);
            }
        });
        
        // 添加到留言墙的顶部
        messageWall.insertBefore(messageElement, messageWall.firstChild);
        
        // 同时保存到localStorage作为备份
        saveMessages();
        
        // 显示保存成功提示
        const notification = document.createElement('div');
        notification.className = 'save-notification';
        notification.textContent = '留言已保存！';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
        
    } catch (error) {
        console.error('保存留言失败:', error);
        
        // 如果API保存失败，仍然显示留言并保存到localStorage
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        
        // 设置留言内容
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="name">${name}</span>
                <span class="date">${currentDate}</span>
            </div>
            <p>${message}</p>
            <button class="delete-btn">删除</button>
        `;
        
        // 添加删除事件监听器
        messageElement.querySelector('.delete-btn').addEventListener('click', function() {
            if (confirm('确定要删除这条留言吗？')) {
                messageElement.style.transition = 'all 0.3s ease';
                messageElement.style.opacity = '0';
                messageElement.style.transform = 'translateX(100px)';
                
                setTimeout(() => {
                    messageElement.remove();
                    saveMessages();
                    // 显示删除成功提示
                    const notification = document.createElement('div');
                    notification.className = 'save-notification';
                    notification.textContent = '留言已删除！';
                    document.body.appendChild(notification);
                    setTimeout(() => notification.remove(), 2000);
                }, 300);
            }
        });
        
        // 添加到留言墙的顶部
        messageWall.insertBefore(messageElement, messageWall.firstChild);
        
        // 保存到localStorage
        saveMessages();
        
        // 显示保存成功提示（但提示用户网络问题）
        const notification = document.createElement('div');
        notification.className = 'save-notification warning';
        notification.textContent = '网络问题，留言已本地保存';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    }
}

// 优化后的删除功能
document.addEventListener('DOMContentLoaded', function() {
    const messageWall = document.querySelector('.message-wall');
    if (messageWall) {
        messageWall.addEventListener('click', async function(e) {
            if (e.target.classList.contains('delete-btn')) {
                const message = e.target.closest('.message');
                if (confirm('确定要删除这条留言吗？')) {
                    message.style.transition = 'all 0.3s ease';
                    message.style.opacity = '0';
                    message.style.transform = 'translateX(100px)';
                    
                    // 获取留言ID
                    const messageId = message.getAttribute('data-id');
                    
                    try {
                        if (messageId) {
                            // 从数据库删除
                            await fetch(`${API_BASE_URL}/api/messages`, {
                                method: 'DELETE',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ id: messageId })
                            });
                        }
                        
                        setTimeout(() => {
                            message.remove();
                            saveMessages(); // 更新localStorage备份
                            
                            // 显示删除成功提示
                            const notification = document.createElement('div');
                            notification.className = 'save-notification';
                            notification.textContent = '留言已删除！';
                            document.body.appendChild(notification);
                            setTimeout(() => notification.remove(), 2000);
                        }, 300);
                    } catch (error) {
                        console.error('删除留言失败:', error);
                        
                        // 即使API删除失败，也从UI中移除
                        setTimeout(() => {
                            message.remove();
                            saveMessages(); // 更新localStorage备份
                            
                            // 显示删除成功提示，但带有警告
                            const notification = document.createElement('div');
                            notification.className = 'save-notification warning';
                            notification.textContent = '网络问题，留言已本地删除';
                            document.body.appendChild(notification);
                            setTimeout(() => notification.remove(), 2000);
                        }, 300);
                    }
                }
            }
        });
    }
});

// 保存数据到服务器
async function saveToServer(endpoint, data) {
    try {
        const response = await fetch(`http://127.0.0.1:8888/www/wwwroot/haomei_fun${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error('保存失败');
        }
        return await response.json();
    } catch (error) {
        console.error('保存错误:', error);
        alert('保存失败，请检查网络连接');
        throw error;
    }
}

// 可靠滚动到顶部函数
function scrollToTop() {
    const scrollStep = -window.scrollY / (500 / 15);
    const scrollInterval = setInterval(() => {
        if (window.scrollY !== 0) {
            window.scrollBy(0, scrollStep);
        } else {
            clearInterval(scrollInterval);
        }
    }, 15);
}

// 确保各种情况下都能滚动到顶部
document.addEventListener('DOMContentLoaded', function() {
    scrollToTop();
    setTimeout(scrollToTop, 100);
});

// 页面完全加载后再次确保
window.addEventListener('load', function() {
    scrollToTop();
    setTimeout(scrollToTop, 300);
    setTimeout(scrollToTop, 1000);
    
    // 原有欢迎弹窗代码
    setTimeout(() => {
        const welcomeModal = document.getElementById('welcome-modal');
        const welcomeOverlay = document.getElementById('welcome-overlay');
        const closeWelcome = document.getElementById('close-welcome');
        
        // 显示弹窗
        welcomeModal.style.display = 'block';
        welcomeOverlay.style.display = 'block';
        
        // 关闭弹窗
        closeWelcome.addEventListener('click', function() {
            welcomeModal.style.display = 'none';
            welcomeOverlay.style.display = 'none';
        });
    }, 500);
});

/**
 * 初始化背景音乐
 */
function initBackgroundMusic() {
    const bgMusic = document.getElementById('bgMusic');
    const musicControl = document.getElementById('musicControl');
    
    if (!bgMusic || !musicControl) return;
    
    // 检测是否是微信浏览器
    const isWechat = /MicroMessenger/i.test(navigator.userAgent);
    
    // 音乐控制按钮点击事件
    musicControl.addEventListener('click', function() {
        if (bgMusic.paused) {
            bgMusic.play().then(() => {
                musicControl.classList.add('playing');
            }).catch(err => {
                console.error('播放失败:', err);
            });
        } else {
            bgMusic.pause();
            musicControl.classList.remove('playing');
        }
    });
    
    // 尝试自动播放
    function attemptAutoplay() {
        bgMusic.play().then(() => {
            musicControl.classList.add('playing');
            console.log('音乐自动播放成功');
        }).catch(err => {
            console.log('自动播放失败，需要用户交互:', err);
            // 如果自动播放失败，添加一个提示
            if (isWechat) {
                const tip = document.createElement('div');
                tip.style.position = 'fixed';
                tip.style.top = '10px';
                tip.style.left = '50%';
                tip.style.transform = 'translateX(-50%)';
                tip.style.padding = '10px';
                tip.style.backgroundColor = 'rgba(0,0,0,0.7)';
                tip.style.color = 'white';
                tip.style.borderRadius = '5px';
                tip.style.zIndex = '10000';
                tip.textContent = '点击右下角按钮播放背景音乐';
                tip.style.fontSize = '14px';
                
                document.body.appendChild(tip);
                
                setTimeout(() => {
                    tip.style.opacity = '0';
                    tip.style.transition = 'opacity 1s';
                    setTimeout(() => document.body.removeChild(tip), 1000);
                }, 3000);
            }
        });
    }
    
    // 处理微信浏览器
    if (isWechat) {
        // 微信浏览器需要在用户触摸屏幕后播放
        document.addEventListener('WeixinJSBridgeReady', attemptAutoplay, false);
        document.addEventListener('touchstart', function() {
            attemptAutoplay();
            // 只需要触发一次
            document.removeEventListener('touchstart', arguments.callee);
        }, false);
    } else {
        // 其他浏览器直接尝试自动播放
        attemptAutoplay();
    }
    
    // 监听页面可见性变化，当页面重新变为可见时恢复播放
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && musicControl.classList.contains('playing')) {
            bgMusic.play().catch(err => console.log('恢复播放失败:', err));
        }
    });
}

// 鼠标彩虹轨迹效果
(function() {
    // 彩虹颜色数组
    const colors = [
        '#FF0000', // 红
        '#FF7F00', // 橙
        '#FFFF00', // 黄
        '#00FF00', // 绿
        '#0000FF', // 蓝
        '#4B0082', // 靛
        '#9400D3'  // 紫
    ];
    let colorIndex = 0;
    
    // 节流函数，限制函数执行频率
    function throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }
    
    // 创建红色像素爱心
    function createHeart(e) {
        // 如果鼠标在弹窗或遮罩层上，不创建爱心
        if (e.target.closest('.welcome-modal') || e.target.closest('.modal-overlay')) {
            return;
        }

        // 创建爱心元素
        const heart = document.createElement('div');
        heart.className = 'pixel-heart';
        
        // 设置爱心样式为红色像素风格
        heart.style.backgroundImage = `
            linear-gradient(135deg, 
                transparent 0%, transparent 20%,
                #ff0000 20%, #ff0000 40%,
                transparent 40%, transparent 60%,
                #ff0000 60%, #ff0000 80%,
                transparent 80%, transparent 100%
            ),
            linear-gradient(45deg, 
                transparent 0%, transparent 20%,
                #ff0000 20%, #ff0000 40%,
                transparent 40%, transparent 60%,
                #ff0000 60%, #ff0000 80%,
                transparent 80%, transparent 100%
            )`;
        heart.style.backgroundSize = '16px 16px';
        
        // 添加随机偏移
        const offsetX = Math.random() * 20 - 10; // -10 to 10px
        const offsetY = Math.random() * 20 - 10; // -10 to 10px
        
        // 设置位置
        heart.style.left = (e.clientX - 8 + offsetX) + 'px';
        heart.style.top = (e.clientY - 8 + offsetY) + 'px';
        
        document.body.appendChild(heart);
        
        // 在3秒后移除爱心
        setTimeout(() => {
            if (heart.parentNode) {
                document.body.removeChild(heart);
            }
        }, 3000);
    }
    
    // 使用节流函数限制爱心的创建频率
    window.addEventListener('mousemove', throttle(createHeart, 100));
})();

// 鼠标点击动画效果
(function () {
    var a_idx = 0;
    window.onclick = function (event) {
        // 如果点击的是弹窗或遮罩层，不显示动画
        if (event.target.closest('.welcome-modal') || event.target.closest('.modal-overlay')) {
            return;
        }

        var a = new Array("❤爱小梅❤", "❤爱小浩❤", "❤抱抱小浩❤", "❤抱抱小梅❤");

        var heart = document.createElement("b"); //创建b元素
        heart.onselectstart = new Function('event.returnValue=false'); //防止拖动

        document.body.appendChild(heart).innerHTML = a[a_idx]; //将b元素添加到页面上
        a_idx = (a_idx + 1) % a.length;
        heart.style.cssText = "position: fixed;left:-100%;"; //给元素设置样式

        var f = 16, // 字体大小
            x = event.clientX - f / 2, // 横坐标
            y = event.clientY - f, // 纵坐标
            c = randomColor(), // 随机颜色
            a = 1, // 透明度
            s = 1.2; // 放大缩小

        var timer = setInterval(function () { //添加定时器
            if (a <= 0) {
                document.body.removeChild(heart);
                clearInterval(timer);
            } else {
                heart.style.cssText = "font-size:16px;cursor: default;position: fixed;color:" +
                    c + ";left:" + x + "px;top:" + y + "px;opacity:" + a + ";transform:scale(" +
                    s + ");";

                y--;
                a -= 0.016;
                s += 0.002;
            }
        }, 15);
    };

    // 随机颜色
    function randomColor() {
        return "rgb(" + (~~(Math.random() * 255)) + "," + (~~(Math.random() * 255)) + "," + (~~(Math.random() * 255)) + ")";
    }
}());
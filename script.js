/* =====================================================
   情侣纪念网站 · 全功能 JS（云端版）
   数据存储: Cloudflare Worker API + D1 数据库
   性能优化: 懒加载、请求合并、事件委托
   ===================================================== */

// ── 配置：API 使用相对路径（Workers） ───────────────────────
const API_BASE = '';

// ── 全局常量 ───────────────────────────────────────────
const LOVE_START = new Date('2025-04-17');

// ── DOMContentLoaded ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // 标记 JS 已加载，启用动画
    document.body.classList.add('js-ready');

    initNav();
    initHero();
    initMusic();
    initDaysCounter();
    initAnniversaries();
    initGallery();
    initMessages();
    // 延迟执行非关键初始化（提升首屏渲染速度）
    requestIdleCallback ? requestIdleCallback(initNonCritical) : setTimeout(initNonCritical, 100);
});

// 非关键功能延迟加载
function initNonCritical() {
    initScrollAnimations();
    initMouseEffects();
    initBackTop();
    showWelcomeModal();
}

// =====================================================
// 导航栏
// =====================================================
function initNav() {
    const nav = document.getElementById('mainNav');
    const toggle = document.getElementById('navToggle');
    const links = document.querySelector('.nav-links');
    const navAnchors = document.querySelectorAll('.nav-links a');

    const onScroll = () => {
        nav.classList.toggle('scrolled', window.scrollY > 60);
        updateActiveNav();
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    toggle && toggle.addEventListener('click', () => {
        links.classList.toggle('open');
        // 切换图标动画（汉堡 ↔ X）
        toggle.classList.toggle('active');
    });

    // 点击导航外部区域关闭移动端菜单
    document.addEventListener('click', e => {
        if (links.classList.contains('open') &&
            !e.target.closest('.nav-links') &&
            !e.target.closest('#navToggle')) {
            links.classList.remove('open');
            toggle && toggle.classList.remove('active');
        }
    });

    navAnchors.forEach(a => {
        a.addEventListener('click', e => {
            e.preventDefault();
            const id = a.getAttribute('href');
            const target = document.querySelector(id);
            if (target) {
                window.scrollTo({ top: target.offsetTop - 64, behavior: 'smooth' });
            }
            links.classList.remove('open');
        });
    });
}

function updateActiveNav() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');
    const scrollY = window.scrollY;

    sections.forEach(section => {
        const top = section.offsetTop - 80;
        const bottom = top + section.offsetHeight;
        if (scrollY >= top && scrollY < bottom) {
            navLinks.forEach(a => {
                a.classList.toggle('active', a.getAttribute('href') === '#' + section.id);
            });
        }
    });
}

// =====================================================
// Hero
// =====================================================
function initHero() {
    const heroBtn = document.querySelector('.hero-btn');
    if (heroBtn) {
        heroBtn.addEventListener('click', e => {
            e.preventDefault();
            const home = document.getElementById('home');
            if (home) window.scrollTo({ top: home.offsetTop - 64, behavior: 'smooth' });
        });
    }
    const navLogo = document.querySelector('.nav-logo');
    if (navLogo) {
        navLogo.addEventListener('click', e => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

// =====================================================
// 恋爱天数
// =====================================================
function initDaysCounter() {
    const calcDays = () => {
        const diff = Math.floor((Date.now() - LOVE_START.getTime()) / 86400000);
        document.querySelectorAll('#days-count, #days-count-2, #footer-days')
            .forEach(el => { if (el) el.textContent = diff; });
    };
    calcDays();
    setInterval(calcDays, 60000);
}

// =====================================================
// 背景音乐 — 自动播放策略
// 浏览器要求用户交互后才能播放音频，所以：
// 1. 页面加载时立即尝试（部分浏览器允许）
// 2. 首次任意点击/触摸时自动播放
// 3. 弹窗关闭后自动播放（用户已交互过）
// 4. 标签页切回时恢复播放
// =====================================================
function initMusic() {
    const audio = document.getElementById('bgMusic');
    const ctrl = document.getElementById('musicControl');
    if (!audio || !ctrl) return;

    const disc = ctrl.querySelector('.music-disc');
    let hasInteracted = false;   // 用户是否有过交互
    let shouldAutoPlay = true;   // 默认自动播放

    // 手动点击音乐按钮：切换播放/暂停
    disc.addEventListener('click', (e) => {
        e.stopPropagation();
        hasInteracted = true;
        if (audio.paused) {
            audio.play().then(() => ctrl.classList.add('playing')).catch(() => {});
            shouldAutoPlay = true;
        } else {
            audio.pause();
            ctrl.classList.remove('playing');
            shouldAutoPlay = false;
        }
    });

    const tryPlay = () => {
        if (!shouldAutoPlay) return;
        if (!audio.paused) return;  // 已经在播放就跳过
        audio.play()
            .then(() => { ctrl.classList.add('playing'); })
            .catch(() => {});
    };

    // 策略1：页面加载时立即尝试（Safari/Chrome 有时会允许）
    tryPlay();

    // 策略2：首次任何用户交互（点击/触摸/键盘/滚轮）时触发播放
    const onFirstInteraction = () => {
        if (hasInteracted) return;
        hasInteracted = true;
        tryPlay();
    };
    // 监听多种交互事件，确保弹窗打开的点击也算
    ['click', 'touchstart', 'keydown', 'wheel', 'scroll'].forEach(evt => {
        document.addEventListener(evt, onFirstInteraction, { once: true, passive: true });
    });

    // 策略3：欢迎弹窗关闭后（用户肯定交互过了）确保播放
    document.addEventListener('closeWelcome', () => {
        setTimeout(tryPlay, 300);
    });

    // 策略4：标签页切回时恢复播放
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && shouldAutoPlay) {
            tryPlay();
        }
    });
}

// =====================================================
// 纪念日（云端版）
// =====================================================
function initAnniversaries() {
    loadAnniversariesFromCloud();
    setInterval(calculateCountdowns, 3600000);

    const form = document.getElementById('add-date-form');
    form && form.addEventListener('submit', async e => {
        e.preventDefault();
        const name = form.querySelector('input[name="name"]').value.trim();
        const date = form.querySelector('input[name="date"]').value;
        if (!name || !date) return;

        // 检查是否登录管理员
        const token = localStorage.getItem('hm_admin_token') || '';
        if (!token) {
            showToast('<i class="fas fa-lock"></i> 请先登录管理后台再添加');
            setTimeout(() => { window.open('admin.html', '_blank'); }, 1200);
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/anniversaries`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, date })
            });
            const data = await res.json();
            if (data.success) {
                addDateCard(name, date);
                form.reset();
                showToast('<i class="fas fa-check-circle"></i> 纪念日添加成功 ♡');
            } else {
                showToast('<i class="fas fa-exclamation-circle"></i> 添加失败：' + (data.error || '未知错误'));
            }
        } catch (err) {
            showToast('<i class="fas fa-exclamation-circle"></i> 网络错误，请稍后重试');
        }
    });
}

async function loadAnniversariesFromCloud() {
    try {
        const res = await fetch(`${API_BASE}/api/anniversaries`);
        if (!res.ok) throw new Error('API 不可用');
        const list = await res.json();
        const container = document.getElementById('anniversary-list');
        if (container) container.innerHTML = '';
        if (Array.isArray(list)) {
            list.forEach(item => addDateCard(item.name, item.date, item.id));
        }
    } catch (e) {
        // 如果 API 未部署，回退到 localStorage
        loadAnniversariesLocal();
    }
}

function loadAnniversariesLocal() {
    const saved = localStorage.getItem('hm_anniversaries');
    if (!saved) return;
    try {
        JSON.parse(saved).forEach(item => addDateCard(item.name, item.date));
    } catch (e) {}
}

function addDateCard(name, date, cloudId) {
    const container = document.getElementById('anniversary-list');
    if (!container) return;

    const card = document.createElement('div');
    card.className = 'date-card visible';
    card.dataset.name = name;
    card.dataset.date = date;
    if (cloudId) card.dataset.cloudId = cloudId;

    var formatted = new Date(date + 'T00:00:00').toLocaleDateString('zh-CN', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    card.innerHTML = '<div class="date-card-icon"><i class="fas fa-heart"></i></div>' +
        '<h3>' + escHtml(name) + '</h3>' +
        '<div class="date-str">' + formatted + '</div>' +
        '<div class="countdown" data-date="' + date + '">' +
        '<span class="days">0</span>' +
        '<span class="days-ago"></span>' +
        '</div>';

    container.appendChild(card);
    requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('visible')));
    calculateCountdowns();
}

function calculateCountdowns() {
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    document.querySelectorAll('.countdown[data-date]').forEach(function(el) {
        var d = new Date(el.dataset.date + 'T00:00:00');
        var thisYear = new Date(d);
        thisYear.setFullYear(today.getFullYear());
        if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1);

        var diff = Math.ceil((thisYear - today) / 86400000);
        var daysEl = el.querySelector('.days');
        var daysAgoEl = el.querySelector('.days-ago');

        if (daysEl) {
            if (diff === 0) {
                daysEl.textContent = '今天';
                daysEl.style.fontSize = '1.2rem';
            } else {
                daysEl.textContent = diff;
                daysEl.style.fontSize = '';
            }
        }
        if (daysAgoEl) {
            daysAgoEl.textContent = diff === 0 ? '🎉 就是今天！' : '天后';
        }
    });
}

// =====================================================
// 照片墙（云端版 + 静态照片保留）
// =====================================================
function initGallery() {
    // 先绑定静态照片灯箱（立即可用）
    setupLightbox();
    // 然后异步加载云端动态照片（加载后追加到前面）
    loadPhotosFromCloud();
}

async function loadPhotosFromCloud() {
    try {
        const res = await fetch(`${API_BASE}/api/photos`);
        if (!res.ok) throw new Error('API 不可用');
        const list = await res.json();
        if (!Array.isArray(list) || list.length === 0) return;

        const grid = document.querySelector('.gallery-grid');
        if (!grid) return;

        // 在现有静态图片前面插入云端图片
        list.forEach(item => {
            var imgSrc = normalizeImgUrl(escHtml(item.url));
            const div = document.createElement('div');
            div.className = 'gallery-item visible';
            div.dataset.caption = item.caption || '';
            div.dataset.cloudId = item.id;
            div.innerHTML = `
                <img src="${imgSrc}" alt="${escHtml(item.caption)}" loading="lazy"
                     onerror="this.style.display='none'; this.nextElementSibling?.style.display='flex'">
                <div class="gallery-overlay" style="display:none;align-items:center;justify-content:center">
                    <span style="color:#fff;font-size:0.8rem">加载失败</span>
                </div>`;
            grid.insertBefore(div, grid.firstChild);
        });

        // 重新绑定灯箱（包含新插入的云端照片）
        setupLightbox();
    } catch (e) {
        console.warn('[Gallery] 云端照片加载失败，仅显示静态照片:', e.message);
    }
}

// 修正 imgbb 等图床的 URL：将页面链接转为图片直链
function normalizeImgUrl(url) {
    if (!url) return url;
    // ibb.co 页面链接 → 尝试转为直链
    // 页面格式: https://ibb.co/xxxxx 或 https://ibb.co/GQm412xQ
    // 直链格式: https://i.ibb.co/xxxxx/image.ext
    var ibbMatch = url.match(/^(https?:\/\/)(www\.)?ibb\.co\/([a-zA-Z0-9]+)$/);
    if (ibbMatch) {
        // 无法从页面链接推导出完整文件名，尝试常见模式
        return 'https://i.ibb.co/' + ibbMatch[3] + '.jpg';
    }
    return url;
}

function setupLightbox() {
    var items = document.querySelectorAll('.gallery-item');
    var lightbox = document.getElementById('lightbox');
    var lbImg = document.getElementById('lightboxImg');
    var lbCaption = document.getElementById('lightboxCaption');
    var lbClose = document.getElementById('lightboxClose');
    var lbPrev = document.getElementById('lightboxPrev');
    var lbNext = document.getElementById('lightboxNext');

    if (!lightbox) return;

    // 收集所有图片信息（含云端+静态）
    var images = [];
    items.forEach(function(item) {
        var img = item.querySelector('img');
        if (!img || !img.src) return;
        var caption = item.dataset.caption || '';
        images.push({ src: img.src, caption: caption });
    });

    if (images.length === 0) return;

    // 清除旧事件监听器：使用 cloneNode 模式
    items.forEach(function(item) {
        var newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
    });

    // 重新查询（clone 后元素已替换）
    var currentItems = document.querySelectorAll('.gallery-item');
    var currentIndex = 0;

    currentItems.forEach(function(item, i) {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            currentIndex = i;
            openLightbox(images[i].src, images[i].caption);
        });
    });

    function openLightbox(src, caption) {
        // ★ 图片切换淡入淡出：避免生硬闪烁
        lbImg.style.opacity = '0';
        lbImg.src = src;
        lbCaption.textContent = caption;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        // 等图片加载完成后再淡入
        if (lbImg.complete) {
            lbImg.style.opacity = '1';
        } else {
            lbImg.onload = function() { lbImg.style.opacity = '1'; };
        }
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    lbClose.onclick = closeLightbox;
    lightbox.onclick = function(e) { if (e.target === lightbox) closeLightbox(); };

    lbPrev.onclick = function() {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        openLightbox(images[currentIndex].src, images[currentIndex].caption);
    };

    lbNext.onclick = function() {
        currentIndex = (currentIndex + 1) % images.length;
        openLightbox(images[currentIndex].src, images[currentIndex].caption);
    };

    document.addEventListener('keydown', function(e) {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') lbPrev.onclick();
        if (e.key === 'ArrowRight') lbNext.onclick();
    });
}

// =====================================================
// 视频墙（云端版）
// =====================================================
async function loadVideosFromCloud() {
    try {
        const res = await fetch(`${API_BASE}/api/videos`);
        if (!res.ok) throw new Error('API 不可用');
        const list = await res.json();
        if (!Array.isArray(list) || list.length === 0) return;

        const grid = document.querySelector('.video-grid');
        if (!grid) return;

        list.forEach(item => {
            const embedUrl = convertToEmbedUrl(item.url);
            const div = document.createElement('div');
            div.className = 'video-card visible';
            div.innerHTML = `
                <div class="video-thumb">
                    <div class="video-wrapper">
                        <iframe src="${escHtml(embedUrl)}" frameborder="0" allowfullscreen class="embedded-video"></iframe>
                    </div>
                </div>
                <div class="video-meta">
                    <h3>${escHtml(item.title)}</h3>
                    <p>${escHtml(item.description || '')}</p>
                    <div class="video-tags">
                        <span><i class="fas fa-play"></i> 视频</span>
                        <span><i class="fas fa-heart"></i> 回忆</span>
                    </div>
                </div>`;
            grid.appendChild(div);
            requestAnimationFrame(() => requestAnimationFrame(() => div.classList.add('visible')));
        });
    } catch (e) {
        // API 未部署时静默失败
    }
}

// 把分享链接转为可嵌入的 iframe src
function convertToEmbedUrl(url) {
    if (!url) return '';
    // B站
    const bvMatch = url.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/);
    if (bvMatch) return `https://player.bilibili.com/player.html?bvid=${bvMatch[1]}&autoplay=0`;
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    // 其他直接使用原链接
    return url;
}

// =====================================================
// 留言板（云端版）
// =====================================================
function initMessages() {
    loadMessagesFromCloud();

    var form = document.getElementById('message-form');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        var name = form.querySelector('input').value.trim();
        var content = form.querySelector('textarea').value.trim();
        if (!name || !content) {
            showToast('<i class="fas fa-exclamation-circle"></i> 请填写姓名和留言内容');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, content })
            });
            const data = await res.json();
            if (data.success) {
                var dateStr = new Date().toLocaleDateString('zh-CN');
                addMessageEl(name, dateStr, content, data.id);
                form.reset();
                showToast('<i class="fas fa-heart"></i> 留言发送成功 ♡');
            } else {
                showToast('<i class="fas fa-exclamation-circle"></i> 发送失败，请稍后重试');
            }
        } catch (err) {
            // 回退到本地存储
            var dateStr = new Date().toLocaleDateString('zh-CN');
            addMessageEl(name, dateStr, content);
            saveMessagesLocal();
            form.reset();
            showToast('<i class="fas fa-heart"></i> 留言发送成功（本地） ♡');
        }
    });
}

async function loadMessagesFromCloud() {
    try {
        const res = await fetch(`${API_BASE}/api/messages`);
        if (!res.ok) throw new Error('API 不可用');
        const list = await res.json();
        const wall = document.getElementById('message-wall');
        if (wall) wall.innerHTML = '';
        if (Array.isArray(list)) {
            list.forEach(item => {
                const d = new Date(item.created_at);
                const dateStr = d.toLocaleDateString('zh-CN');
                addMessageEl(item.name, dateStr, item.content, item.id);
            });
        }
    } catch (e) {
        // 回退到本地存储
        loadMessagesLocal();
    }
}

function loadMessagesLocal() {
    var saved = localStorage.getItem('hm_messages');
    if (!saved) return;
    try {
        JSON.parse(saved).forEach(function(m) { addMessageEl(m.name, m.date, m.content); });
    } catch (e) {}
}

function saveMessagesLocal() {
    var msgs = [];
    document.querySelectorAll('.message').forEach(function(el) {
        msgs.push({
            name: el.querySelector('.name') ? el.querySelector('.name').textContent : '',
            date: el.querySelector('.date') ? el.querySelector('.date').textContent : '',
            content: el.querySelector('p') ? el.querySelector('p').textContent : ''
        });
    });
    localStorage.setItem('hm_messages', JSON.stringify(msgs));
}

function addMessageEl(name, date, content, cloudId) {
    var wall = document.getElementById('message-wall');
    if (!wall) return;

    var avatar = (name || '?').charAt(0).toUpperCase();
    var el = document.createElement('div');
    el.className = 'message visible';
    if (cloudId) el.dataset.cloudId = cloudId;

    el.innerHTML = '<div class="message-header">' +
        '<div class="msg-avatar">' + avatar + '</div>' +
        '<div class="msg-meta">' +
        '<span class="name">' + escHtml(name) + '</span>' +
        '<span class="date">' + escHtml(date) + '</span>' +
        '</div></div>' +
        '<p>' + escHtml(content) + '</p>';

    wall.insertBefore(el, wall.firstChild);
    requestAnimationFrame(function() {
        requestAnimationFrame(function() { el.classList.add('visible'); });
    });
}

// =====================================================
// 滚动入场动画
// =====================================================
function initScrollAnimations() {
    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll(
        '.profile-card, .story-block, .qnav-card, ' +
        '.gallery-item, .video-card, .form-card, .section-header'
    ).forEach(function(el) {
        if (!el.classList.contains('visible')) {
            el.classList.add('fade-in');
        }
        observer.observe(el);
    });
}

// =====================================================
// 鼠标特效（仅在非触屏设备启用）
// =====================================================
function initMouseEffects() {
    // 触屏设备不启用鼠标特效（节省性能+避免触摸问题）
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

    var texts = ['❤爱小梅❤', '❤爱小浩❤', '❤抱抱小浩❤', '❤抱抱小梅❤'];
    var idx = 0;

    window.addEventListener('click', function(e) {
        if (e.target.closest('.welcome-modal') || e.target.closest('.modal-overlay')) return;
        if (e.target.closest('#lightbox')) return;

        var el = document.createElement('span');
        el.className = 'click-text';
        el.textContent = texts[idx % texts.length];
        idx++;

        var colors = ['#e8637a', '#f2a0b0', '#c0475c', '#f7c5cd', '#e08090'];
        el.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;color:${colors[Math.floor(Math.random()*colors.length)]};font-size:15px;opacity:1;transform:translate(-50%,-50%);pointer-events:none;z-index:9999;font-family:Noto Serif SC,serif;font-weight:600;white-space:nowrap;transition:all 1.2s ease-out;`;

        document.body.appendChild(el);
        requestAnimationFrame(() => requestAnimationFrame(() => {
            el.style.top = (e.clientY - 60) + 'px';
            el.style.opacity = '0';
            el.style.fontSize = '18px';
        }));
        setTimeout(() => el.remove(), 1300);
    });

    var lastHeart = 0;
    window.addEventListener('mousemove', function(e) {
        var now = Date.now();
        if (now - lastHeart < 120) return;
        lastHeart = now;
        if (e.target.closest('.welcome-modal') || e.target.closest('.modal-overlay')) return;

        var hearts = ['♡', '♥', '❤', '✿', '❋'];
        var colors = ['#e8637a', '#f2a0b0', '#f7c5cd', '#fdd4dc', '#c0475c'];
        var h = document.createElement('span');
        h.className = 'heart-particle';
        h.textContent = hearts[Math.floor(Math.random() * hearts.length)];
        h.style.cssText = `position:fixed;left:${e.clientX + (Math.random()*20-10)}px;top:${e.clientY + (Math.random()*20-10)}px;color:${colors[Math.floor(Math.random()*colors.length)]};font-size:${12+Math.random()*8}px;pointer-events:none;z-index:9998;`;
        document.body.appendChild(h);
        setTimeout(() => h.remove(), 2600);
    }, { passive: true });
}

// =====================================================
// 回到顶部
// =====================================================
function initBackTop() {
    var btn = document.getElementById('backTop');
    if (!btn) return;
    window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 400), { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// =====================================================
// 欢迎弹窗 - 信封动画
// =====================================================
function showWelcomeModal() {
    var modal = document.getElementById('welcome-modal');
    var overlay = document.getElementById('welcome-overlay');
    var envelope = document.getElementById('envelope');
    var closeBtn = document.getElementById('close-welcome');
    if (!modal || !overlay || !envelope || !closeBtn) return;

    // 弹窗入场（GPU 友好的缩放弹性）
    setTimeout(function() {
        modal.style.display = 'block';
        overlay.style.display = 'block';
        // 初始状态（不可见，略微缩小）
        modal.style.opacity = '0';
        modal.style.transform = 'translate(-50%, -50%) scale(0.88) translateZ(0)';
        overlay.style.opacity = '0';
        // ★ 双 rAF 确保浏览器在下一帧统一应用 transition
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                modal.style.transition = 'opacity 0.55s cubic-bezier(0.25,0.46,0.45,0.94), transform 0.55s cubic-bezier(0.34,1.56,0.64,1)';
                overlay.style.transition = 'opacity 0.5s cubic-bezier(0.25,0.46,0.45,0.94)';
                modal.style.opacity = '1';
                modal.style.transform = 'translate(-50%, -50%) scale(1) translateZ(0)';
                overlay.style.opacity = '1';
            });
        });
    }, 600);

    // 点击信封 → 打开（封盖翻转 + 信纸跳出）
    envelope.addEventListener('click', function openEnvelope() {
        if (envelope.classList.contains('open')) return;
        envelope.classList.add('open');
        // 隐藏提示文字
        var hint = envelope.querySelector('.envelope-hint');
        if (hint) hint.style.opacity = '0';
    });

    // 点击"进入"按钮 → 关闭弹窗
    const close = function() {
        modal.style.transition = 'opacity 0.45s cubic-bezier(0.55, 0, 0, 1), transform 0.45s cubic-bezier(0.55, 0, 0.2, 1)';
        modal.style.opacity = '0';
        modal.style.transform = 'translate(-50%, -50%) scale(0.92) translateY(-10px) translateZ(0)';
        overlay.style.transition = 'opacity 0.4s cubic-bezier(0.25,0.46,0.45,0.94)';
        overlay.style.opacity = '0';
        // 触发自定义事件 → 通知背景音乐可以自动播放了
        document.dispatchEvent(new Event('closeWelcome'));
        setTimeout(function() {
            modal.style.display = 'none';
            overlay.style.display = 'none';
            modal.style.transition = '';
            modal.style.transform = '';
            overlay.style.transition = '';
            loadVideosFromCloud();
        }, 480);
    };

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', close);
}

// =====================================================
// Toast 通知
// =====================================================
var toastTimer = null;
function showToast(html) {
    var toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.innerHTML = html;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// =====================================================
// XSS 防护
// =====================================================
function escHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

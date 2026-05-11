/* =====================================================
   情侣纪念网站 · 全功能 JS（云端版）
   数据存储: Cloudflare Worker API + D1 数据库
   ===================================================== */

// ── 配置：API 使用相对路径（Pages Functions） ───────────────────────
const API_BASE = '';

// ── 全局常量 ───────────────────────────────────────────
const LOVE_START = new Date('2025-04-17');

// ── DOMContentLoaded ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initHero();
    initMusic();
    initDaysCounter();
    initAnniversaries();
    initGallery();
    initMessages();
    initScrollAnimations();
    initMouseEffects();
    initBackTop();
    showWelcomeModal();
});

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
// 背景音乐
// =====================================================
function initMusic() {
    const audio = document.getElementById('bgMusic');
    const ctrl = document.getElementById('musicControl');
    if (!audio || !ctrl) return;

    const disc = ctrl.querySelector('.music-disc');

    disc.addEventListener('click', () => {
        if (audio.paused) {
            audio.play().then(() => ctrl.classList.add('playing')).catch(() => {});
        } else {
            audio.pause();
            ctrl.classList.remove('playing');
        }
    });

    const tryPlay = () => {
        audio.play().then(() => ctrl.classList.add('playing')).catch(() => {});
    };

    document.addEventListener('click', function autoplay() {
        tryPlay();
        document.removeEventListener('click', autoplay);
    }, { once: true });

    tryPlay();

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && ctrl.classList.contains('playing')) {
            audio.play().catch(() => {});
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
    card.className = 'date-card fade-in';
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
    // 先加载云端动态照片
    loadPhotosFromCloud();

    // 静态照片灯箱
    setupLightbox();
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
            const div = document.createElement('div');
            div.className = 'gallery-item fade-in';
            div.dataset.caption = item.caption || '';
            div.dataset.cloudId = item.id;
            div.innerHTML = `
                <img src="${escHtml(item.url)}" alt="${escHtml(item.caption)}" loading="lazy" onerror="this.parentElement.style.display='none'">
                <div class="gallery-overlay">
                    <i class="fas fa-expand-alt"></i>
                    <p>${escHtml(item.caption)}</p>
                </div>`;
            grid.insertBefore(div, grid.firstChild);
            requestAnimationFrame(() => requestAnimationFrame(() => div.classList.add('visible')));
        });

        // 重新绑定灯箱
        setupLightbox();
    } catch (e) {
        // API 未部署时静默失败，只显示静态图片
    }
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

    var currentIndex = 0;
    var images = [];

    items.forEach(function(item, i) {
        var img = item.querySelector('img');
        var caption = item.dataset.caption || '';
        images.push({ src: img ? img.src : '', caption: caption });

        // 清除旧事件（克隆替换）
        var newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        newItem.addEventListener('click', function() {
            currentIndex = i;
            openLightbox(images[i].src, images[i].caption);
        });
    });

    function openLightbox(src, caption) {
        lbImg.src = src;
        lbCaption.textContent = caption;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
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
            div.className = 'video-card fade-in';
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
    el.className = 'message fade-in';
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
        el.classList.add('fade-in');
        observer.observe(el);
    });
}

// =====================================================
// 鼠标特效
// =====================================================
function initMouseEffects() {
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

    // 弹窗入场（带缩放弹性）
    setTimeout(function() {
        modal.style.display = 'block';
        overlay.style.display = 'block';
        modal.style.opacity = '0';
        modal.style.transform = 'translate(-50%, -50%) scale(0.88)';
        overlay.style.opacity = '0';
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                modal.style.transition = 'opacity 0.55s ease, transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)';
                overlay.style.transition = 'opacity 0.5s ease';
                modal.style.opacity = '1';
                modal.style.transform = 'translate(-50%, -50%) scale(1)';
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
        modal.style.transition = 'opacity 0.45s ease, transform 0.45s cubic-bezier(0.55, 0, 0.2, 1)';
        modal.style.opacity = '0';
        modal.style.transform = 'translate(-50%, -50%) scale(0.92) translateY(-10px)';
        overlay.style.transition = 'opacity 0.4s ease';
        overlay.style.opacity = '0';
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

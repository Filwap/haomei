/**
 * 纪念网站 Cloudflare Worker
 * 
 * 这个Worker处理纪念日和留言数据的存储和检索
 * 使用Cloudflare KV作为数据存储
 */

// 定义API路由
const ROUTES = {
  ANNIVERSARIES: '/api/anniversaries',
  MESSAGES: '/api/messages',
  PHOTOS: '/api/photos',
  ADMIN_LOGIN: '/api/admin/login',
  ADMIN_VERIFY: '/api/admin/verify',
  ADMIN_UPLOAD_PHOTO: '/api/admin/upload-photo'
};

// 管理员凭据 - 在实际应用中应该使用环境变量存储
const ADMIN_USERNAME = 'Filwap';
// 这里存储的是密码的哈希值，实际部署时应该替换为真实的哈希值
// 密码为 "010403"
const ADMIN_PASSWORD_HASH = 'd5b9d8b0a2c9c6b8e8f4b6d8b0a2c9c6';

// JWT密钥 - 在实际应用中应该使用环境变量存储
const JWT_SECRET = 'memorial-site-jwt-secret-key';

/**
 * 生成JWT令牌
 * @param {string} username - 用户名
 * @returns {string} - JWT令牌
 */
function generateJWT(username) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: username,
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24小时过期
    iat: Math.floor(Date.now() / 1000)
  };

  const headerBase64 = btoa(JSON.stringify(header));
  const payloadBase64 = btoa(JSON.stringify(payload));
  const signature = hmacSHA256(`${headerBase64}.${payloadBase64}`, JWT_SECRET);

  return `${headerBase64}.${payloadBase64}.${signature}`;
}

/**
 * 验证JWT令牌
 * @param {string} token - JWT令牌
 * @returns {boolean} - 是否有效
 */
function verifyJWT(token) {
  try {
    const [headerBase64, payloadBase64, signature] = token.split('.');
    const expectedSignature = hmacSHA256(`${headerBase64}.${payloadBase64}`, JWT_SECRET);
    
    if (signature !== expectedSignature) {
      return false;
    }

    const payload = JSON.parse(atob(payloadBase64));
    const now = Math.floor(Date.now() / 1000);
    
    return payload.exp > now;
  } catch (error) {
    return false;
  }
}

/**
 * 简单的HMAC-SHA256实现（仅用于演示）
 * 注意：在生产环境中应使用更安全的库
 */
function hmacSHA256(message, key) {
  // 这是一个简化的实现，实际应用中应使用Web Crypto API或其他库
  // 这里仅返回一个基于消息和密钥的哈希值模拟
  const combinedString = message + key;
  let hash = 0;
  for (let i = 0; i < combinedString.length; i++) {
    const char = combinedString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  return Math.abs(hash).toString(16);
}

/**
 * 简单的MD5哈希函数（仅用于演示）
 * 注意：在生产环境中应使用更安全的库
 */
function md5(string) {
  // 这是一个简化的实现，实际应用中应使用Web Crypto API或其他库
  let hash = 0;
  if (string.length === 0) return hash.toString(16);
  
  for (let i = 0; i < string.length; i++) {
    const char = string.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  return Math.abs(hash).toString(16);
}

// 处理请求的主函数
async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // 处理CORS预检请求
  if (request.method === 'OPTIONS') {
    return handleCORS(request);
  }
  
  // 根据路径和方法分发请求
  if (path === ROUTES.ANNIVERSARIES) {
    if (request.method === 'GET') {
      return await getAnniversaries();
    } else if (request.method === 'POST') {
      return await saveAnniversaries(request);
    }
  } else if (path === ROUTES.MESSAGES) {
    if (request.method === 'GET') {
      return await getMessages();
    } else if (request.method === 'POST') {
      return await saveMessages(request);
    } else if (request.method === 'DELETE') {
      return await deleteMessage(request);
    }
  } else if (path === ROUTES.PHOTOS) {
    if (request.method === 'GET') {
      return await getPhotos();
    }
  } else if (path === ROUTES.ADMIN_LOGIN) {
    if (request.method === 'POST') {
      return await handleAdminLogin(request);
    }
  } else if (path === ROUTES.ADMIN_VERIFY) {
    if (request.method === 'GET') {
      return await handleAdminVerify(request);
    }
  } else if (path === ROUTES.ADMIN_UPLOAD_PHOTO) {
    if (request.method === 'POST') {
      return await handlePhotoUpload(request);
    }
  }
  
  // 处理根路径请求
  if (path === '/' || path === '') {
    return new Response('纪念网站 API 服务正在运行', {
      headers: corsHeaders
    });
  }
  
  // 处理未匹配的路由
  return new Response('Not Found', { status: 404, headers: corsHeaders });
}

// CORS头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

// 处理CORS预检请求
function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

// 获取所有纪念日
async function getAnniversaries() {
  try {
    const data = await MEMORIAL_KV.get('anniversaries', { type: 'json' });
    return new Response(JSON.stringify(data || []), {
      headers: corsHeaders
    });
  } catch (error) {
    console.error('获取纪念日失败:', error);
    return new Response(JSON.stringify({ error: '获取纪念日失败' }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// 保存纪念日
async function saveAnniversaries(request) {
  try {
    const anniversaries = await request.json();
    
    // 验证数据格式
    if (!Array.isArray(anniversaries)) {
      return new Response(JSON.stringify({ error: '无效的数据格式' }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // 保存到KV存储
    await MEMORIAL_KV.put('anniversaries', JSON.stringify(anniversaries));
    
    return new Response(JSON.stringify({ success: true }), {
      headers: corsHeaders
    });
  } catch (error) {
    console.error('保存纪念日失败:', error);
    return new Response(JSON.stringify({ error: '保存纪念日失败' }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// 获取所有留言
async function getMessages() {
  try {
    const data = await MEMORIAL_KV.get('messages', { type: 'json' });
    return new Response(JSON.stringify(data || []), {
      headers: corsHeaders
    });
  } catch (error) {
    console.error('获取留言失败:', error);
    return new Response(JSON.stringify({ error: '获取留言失败' }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// 保存留言
async function saveMessages(request) {
  try {
    // 获取请求中的留言数据
    const newMessages = await request.json();
    
    // 验证数据格式
    if (!Array.isArray(newMessages)) {
      return new Response(JSON.stringify({ error: '无效的数据格式' }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // 获取现有留言
    let messages = await MEMORIAL_KV.get('messages', { type: 'json' }) || [];
    
    // 如果是单条新留言，添加到现有留言中
    if (newMessages.length === 1 && newMessages[0].name && newMessages[0].content) {
      messages = [...messages, ...newMessages];
    } else {
      // 否则替换所有留言
      messages = newMessages;
    }
    
    // 保存到KV存储
    await MEMORIAL_KV.put('messages', JSON.stringify(messages));
    
    return new Response(JSON.stringify({ success: true }), {
      headers: corsHeaders
    });
  } catch (error) {
    console.error('保存留言失败:', error);
    return new Response(JSON.stringify({ error: '保存留言失败' }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// 删除留言
async function deleteMessage(request) {
  try {
    // 获取要删除的留言信息
    const messageToDelete = await request.json();
    
    // 验证数据格式
    if (!messageToDelete.name || !messageToDelete.date || !messageToDelete.content) {
      return new Response(JSON.stringify({ error: '无效的数据格式' }), {
        status: 400,
        headers: corsHeaders
      });
    }
    
    // 获取现有留言
    let messages = await MEMORIAL_KV.get('messages', { type: 'json' }) || [];
    
    // 过滤掉要删除的留言
    messages = messages.filter(msg => 
      !(msg.name === messageToDelete.name && 
        msg.date === messageToDelete.date && 
        msg.content === messageToDelete.content)
    );
    
    // 保存更新后的留言列表
    await MEMORIAL_KV.put('messages', JSON.stringify(messages));
    
    return new Response(JSON.stringify({ success: true }), {
      headers: corsHeaders
    });
  } catch (error) {
    console.error('删除留言失败:', error);
    return new Response(JSON.stringify({ error: '删除留言失败' }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

/**
 * 处理管理员登录
 * @param {Request} request - 客户端请求
 * @returns {Response} - 响应对象
 */
async function handleAdminLogin(request) {
  try {
    const { username, password } = await request.json();
    
    // 验证用户名和密码
    if (username === ADMIN_USERNAME && md5(password) === ADMIN_PASSWORD_HASH) {
      const token = generateJWT(username);
      return new Response(JSON.stringify({ token }), {
        headers: corsHeaders
      });
    } else {
      return new Response(JSON.stringify({ error: '用户名或密码错误' }), {
        status: 401,
        headers: corsHeaders
      });
    }
  } catch (error) {
    console.error('登录处理失败:', error);
    return new Response(JSON.stringify({ error: '登录处理失败' }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

/**
 * 验证管理员令牌
 * @param {Request} request - 客户端请求
 * @returns {Response} - 响应对象
 */
async function handleAdminVerify(request) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: '未提供认证令牌' }), {
      status: 401,
      headers: corsHeaders
    });
  }

  const token = authHeader.split(' ')[1];
  if (verifyJWT(token)) {
    return new Response(JSON.stringify({ valid: true }), {
      headers: corsHeaders
    });
  } else {
    return new Response(JSON.stringify({ error: '无效或过期的令牌' }), {
      status: 401,
      headers: corsHeaders
    });
  }
}

/**
 * 处理照片上传
 * @param {Request} request - 客户端请求
 * @returns {Response} - 响应对象
 */
async function handlePhotoUpload(request) {
  // 验证管理员权限
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: '未提供认证令牌' }), {
      status: 401,
      headers: corsHeaders
    });
  }

  const token = authHeader.split(' ')[1];
  if (!verifyJWT(token)) {
    return new Response(JSON.stringify({ error: '无效或过期的令牌' }), {
      status: 401,
      headers: corsHeaders
    });
  }

  try {
    const formData = await request.formData();
    const photoFile = formData.get('photo');
    const description = formData.get('description') || '';
    
    if (!photoFile) {
      return new Response(JSON.stringify({ error: '未提供照片文件' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // 获取现有照片列表
    let photos = await MEMORIAL_KV.get('photos', { type: 'json' }) || [];
    
    // 生成唯一ID和模拟URL
    const photoId = Date.now().toString();
    const photoUrl = `https://example.com/photos/${photoId}.jpg`; // 实际应用中应使用真实的存储服务
    
    // 添加新照片信息
    photos.push({
      id: photoId,
      url: photoUrl,
      description: description,
      uploadedAt: new Date().toISOString()
    });
    
    // 保存更新后的照片列表
    await MEMORIAL_KV.put('photos', JSON.stringify(photos));
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: '照片上传成功',
      photoId: photoId,
      url: photoUrl
    }), {
      headers: corsHeaders
    });
  } catch (error) {
    console.error('照片上传失败:', error);
    return new Response(JSON.stringify({ error: '照片上传失败' }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

/**
 * 获取照片列表
 * @returns {Response} - 响应对象
 */
async function getPhotos() {
  try {
    const photos = await MEMORIAL_KV.get('photos', { type: 'json' }) || [];
    return new Response(JSON.stringify(photos), {
      headers: corsHeaders
    });
  } catch (error) {
    console.error('获取照片列表失败:', error);
    return new Response(JSON.stringify({ error: '获取照片列表失败' }), {
      status: 500,
      headers: corsHeaders
    });
  }
}

// 注册事件监听器
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});
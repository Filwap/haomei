// Cloudflare Worker脚本，用于处理与D1数据库的交互

// JWT密钥生成函数
function generateJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = btoa(
    Array.from(
      new Uint8Array(
        crypto.subtle.sign(
          'HMAC',
          secret,
          new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
        )
      )
    ).map(byte => String.fromCharCode(byte)).join('')
  );
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// JWT验证函数
async function verifyJWT(token, secret) {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    const signatureCheck = await crypto.subtle.verify(
      'HMAC',
      secret,
      new Uint8Array(atob(signature).split('').map(c => c.charCodeAt(0))),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
    );
    
    if (!signatureCheck) return null;
    return JSON.parse(atob(encodedPayload));
  } catch (error) {
    return null;
  }
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      
      // 处理CORS预检请求
      if (request.method === "OPTIONS") {
        return handleCORS();
      }
      
      // 管理员API路由
      if (path.startsWith('/api/admin/')) {
        if (path === '/api/admin/login' && request.method === 'POST') {
          return handleAdminLogin(request, env);
        }
        else if (path === '/api/admin/verify' && request.method === 'GET') {
          return handleAdminVerify(request, env);
        }
      }
      
      // API路由
      if (path.startsWith('/api/')) {
        // 留言板API
        if (path === '/api/messages' && request.method === 'POST') {
          return handleSaveMessage(request, env);
        } 
        else if (path === '/api/messages' && request.method === 'GET') {
          return handleGetMessages(env);
        }
        else if (path === '/api/messages' && request.method === 'DELETE') {
          return handleDeleteMessage(request, env);
        }
        // 纪念日API
        else if (path === '/api/anniversaries' && request.method === 'POST') {
          return handleSaveAnniversary(request, env);
        }
        else if (path === '/api/anniversaries' && request.method === 'GET') {
          return handleGetAnniversaries(env);
        }
        else if (path === '/api/anniversaries' && request.method === 'DELETE') {
          return handleDeleteAnniversary(request, env);
        }
      }
      
      // 如果没有匹配的API路由，返回404
      return new Response("Not Found", { status: 404 });
    } catch (error) {
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  }
};

// 处理CORS
function handleCORS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400"
    }
  });
}

// 处理管理员登录
async function handleAdminLogin(request, env) {
  const data = await request.json();
  
  // 验证管理员密码
  if (!data.password || data.password !== env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: "密码错误" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  
  // 生成JWT令牌
  const token = generateJWT(
    {
      admin: true,
      exp: Date.now() + 24 * 60 * 60 * 1000, // 24小时过期
      githubToken: env.GITHUB_TOKEN // 将GitHub令牌包含在JWT中
    },
    env.JWT_SECRET
  );
  
  return new Response(JSON.stringify({ token }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

// 处理管理员验证
async function handleAdminVerify(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: "未授权" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  
  const token = authHeader.split(' ')[1];
  const payload = await verifyJWT(token, env.JWT_SECRET);
  
  if (!payload || !payload.admin || payload.exp < Date.now()) {
    return new Response(JSON.stringify({ error: "令牌无效或已过期" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  
  return new Response(JSON.stringify({ 
    valid: true,
    token: env.GITHUB_TOKEN // 返回GitHub令牌
  }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

// 处理保存留言
async function handleSaveMessage(request, env) {
  const data = await request.json();
  
  // 验证数据
  if (!data.name || !data.content) {
    return new Response(JSON.stringify({ error: "姓名和内容不能为空" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  
  try {
    // 将留言保存到D1数据库
    await env.DB.prepare(
      "INSERT INTO messages (name, content, timestamp) VALUES (?, ?, ?)"
    ).bind(data.name, data.content, new Date().toISOString()).run();
    
    return new Response(JSON.stringify({ success: true }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}

// 处理获取留言
async function handleGetMessages(env) {
  try {
    // 从D1数据库获取留言
    const messages = await env.DB.prepare(
      "SELECT * FROM messages ORDER BY timestamp DESC"
    ).all();
    
    return new Response(JSON.stringify(messages.results), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}

// 处理保存纪念日
async function handleSaveAnniversary(request, env) {
  const data = await request.json();
  
  // 验证数据
  if (!data.title || !data.date || !data.type) {
    return new Response(JSON.stringify({ error: "标题、日期和类型不能为空" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  
  try {
    // 将纪念日保存到D1数据库
    await env.DB.prepare(
      "INSERT INTO anniversaries (title, date, description, type) VALUES (?, ?, ?, ?)"
    ).bind(data.title, data.date, data.description || '', data.type).run();
    
    return new Response(JSON.stringify({ success: true }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}

// 处理获取纪念日
async function handleGetAnniversaries(env) {
  try {
    // 从D1数据库获取纪念日
    const anniversaries = await env.DB.prepare(
      "SELECT * FROM anniversaries ORDER BY date ASC"
    ).all();
    
    return new Response(JSON.stringify(anniversaries.results), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}

// 处理删除纪念日
async function handleDeleteAnniversary(request, env) {
  const data = await request.json();
  
  // 验证数据
  if (!data.id) {
    return new Response(JSON.stringify({ error: "ID不能为空" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  
  try {
    // 从D1数据库删除纪念日
    await env.DB.prepare(
      "DELETE FROM anniversaries WHERE id = ?"
    ).bind(data.id).run();
    
    return new Response(JSON.stringify({ success: true }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}

// 处理删除留言
async function handleDeleteMessage(request, env) {
  const data = await request.json();
  
  // 验证数据
  if (!data.id) {
    return new Response(JSON.stringify({ error: "ID不能为空" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  
  try {
    // 从D1数据库删除留言
    await env.DB.prepare(
      "DELETE FROM messages WHERE id = ?"
    ).bind(data.id).run();
    
    return new Response(JSON.stringify({ success: true }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}
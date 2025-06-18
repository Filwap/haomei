// Cloudflare Worker脚本，用于处理与D1数据库的交互

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      
      // 处理CORS预检请求
      if (request.method === "OPTIONS") {
        return handleCORS();
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
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
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
// api/suggest.js
export const config = {
  runtime: 'edge', // 使用边缘函数，极速响应
};

export default async function (req) {
  const { searchParams } = new URL(req.url);
  const engine = searchParams.get('engine') || 'baidu';
  const wd = searchParams.get('wd') || '';

  if (!wd.trim()) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'zh-CN,zh;q=0.9'
  };

  try {
    let list = [];

    if (engine === 'google') {
      // 请求 Google 联想接口 (使用更简洁稳定的客户端格式)
      const target = `https://suggestqueries.google.com/complete/search?client=chrome&hl=zh-CN&q=${encodeURIComponent(wd)}`;
      const res = await fetch(target, { headers });
      const data = await res.json();
      // Google Chrome client 返回格式为: [ "关键词", ["建议1", "建议2", ...], ... ]
      list = data[1] || [];

    } else if (engine === 'bing') {
      // 请求 Bing 联想接口
      const target = `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(wd)}`;
      const res = await fetch(target, { headers });
      const data = await res.json();
      // Bing 返回格式与 Google 类似: [ "关键词", ["建议1", "建议2", ... ] ]
      list = data[1] || [];

    } else {
      // 默认/百度兜底
      const target = `https://suggestion.baidu.com/su?prod=pc&wd=${encodeURIComponent(wd)}`;
      const res = await fetch(target, { headers });
      const text = await res.text();
      // 提取百度返回的 jsonp 数据（例如 window.baidu.sug({q:"...", s:["1","2"]})）
      const match = text.match(/s\:\[(.*?)\]/);
      if (match && match[1]) {
        list = JSON.parse(`[${match[1]}]`);
      }
    }

    return new Response(JSON.stringify(list), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300' // 缓存 5 分钟，降低 API 请求频率
      }
    });

  } catch (e) {
    console.error('Suggest Error:', e);
    return new Response(JSON.stringify([]), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

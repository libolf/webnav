// api/icon.js
export const config = {
  runtime: 'edge', // 使用 Edge 运行时提升性能
};

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get('domain');

  if (!domain) {
    return new Response('Domain missing', { status: 400 });
  }

  // 尝试多个源以提高成功率
  const sources = [
    `https://www.google.com/s2/favicons?sz=128&domain=${domain}`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`
  ];

  try {
    // 默认请求第一个源（Google）
    const response = await fetch(sources[0]);

    if (!response.ok) throw new Error('Source failed');

    const newHeaders = new Headers(response.headers);
    // 核心：允许跨域，让你的 Vue 界面能够 fetch
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Cache-Control', 'public, max-age=31536000, immutable'); // 缓存一年

    return new Response(response.body, {
      status: 200,
      headers: newHeaders,
    });
  } catch (e) {
    // 如果失败，可以返回一个占位图或空响应
    return new Response(null, { status: 404 });
  }
}

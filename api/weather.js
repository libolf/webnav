// api/weather.js
export const config = {
  runtime: 'edge',
};

export default async function (req) {
  // 从环境变量读取 Key
  const KEY = process.env.AMAP_WEATHER_KEY;

  if (!KEY) {
    return new Response(JSON.stringify({ error: 'Server key not configured' }), { status: 500 });
  }

  // 1. 获取客户端 IP
  // Vercel 会在 Header 中通过 x-forwarded-for 提供真实用户 IP
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : '';

  try {
    // 2. 调用高德 IP 定位接口获取 adcode
    const ipUrl = `https://restapi.amap.com/v3/ip?ip=${ip}&key=${KEY}`;
    const ipRes = await fetch(ipUrl);
    const ipData = await ipRes.json();
    console.log("weather ip data " + ipData)

    // 默认城市编码（如果定位失败则使用北京 110000）
    let adcode = '110000';
    if (ipData.status === '1' && ipData.adcode) {
      adcode = ipData.adcode;
    }
    console.log("ip " + ip + " adcode " + adcode)

    // 3. 调用高德天气接口
    // type=live 表示实时天气
    const liveWeatherUrl = `https://restapi.amap.com/v3/weather/weatherInfo?city=${adcode}&key=${KEY}&extensions=base`;
    const liveWeatherRes = await fetch(liveWeatherUrl);
    const liveWeatherData = await liveWeatherRes.json();

    const nextWeatherUrl = `https://restapi.amap.com/v3/weather/weatherInfo?city=${adcode}&key=${KEY}&extensions=all`;
    const nextWeatherRes = await fetch(nextWeatherUrl);
    const nextWeatherData = await nextWeatherRes.json();

    // 4. 合并返回给前端
    const result = {
      location: ipData.city || '未知城市',
      liveWeather: liveWeatherData.lives?.[0] || null,
      nextWeather: nextWeatherData.forecasts?.[0].casts?.[1] || null,
      ip: ip // 可选，用于调试
    };

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=1800' // 缓存30分钟
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}

// api/weather.js
export const config = {
  runtime: 'edge'
}

import cityMap from './data/cityMap.json'

export default async function(req) {
  // 从环境变量读取 Key
  const KEY = process.env.AMAP_WEATHER_KEY

  if (!KEY) {
    return new Response(JSON.stringify({ error: 'Server key not configured' }), { status: 500 })
  }

  let cfGeoData = req.headers.get('X-CF-Geo-Data')
  console.log('cf geo data', cfGeoData)

  let ip = req.headers.get('X-Real-User-IP')
  if (!ip) {
    const forwarded = req.headers.get('x-forwarded-for')
    ip = forwarded ? forwarded.split(',')[0] : ''
  }

  let city
  let cityAdCode

  if (cfGeoData) {
    try {
      const cfGeo = JSON.parse(decodeURIComponent(cfGeoData))

      const cfCityPinyin = cfGeo.city ? cfGeo.city.toLowerCase() : ''
      console.log('cf city pinyin', cfCityPinyin)

      if (cfCityPinyin && cityMap[cfCityPinyin]) {
        city = cityMap[cfCityPinyin].name
        cityAdCode = cityMap[cfCityPinyin].adcode
      }
    } catch (err) {
      console.error('解析或匹配 Geo 失败:', err)
    }
  } else {
    // 2. 调用高德 IP 定位接口获取 adcode
    const ipUrl = `https://restapi.amap.com/v3/ip?ip=${ip}&key=${KEY}`
    const ipRes = await fetch(ipUrl)
    const ipData = await ipRes.json()
    console.log('weather ip data ' + JSON.stringify(ipData))

    if (ipData.status === '1' && ipData.adcode) {
      city = ipData.city
      cityAdCode = ipData.adcode
    }
    console.log('ip', ip)
  }
  console.log('city adcode', cityAdCode)

  try {

    // 3. 调用高德天气接口
    // type=live 表示实时天气
    const liveWeatherUrl = `https://restapi.amap.com/v3/weather/weatherInfo?city=${cityAdCode}&key=${KEY}&extensions=base`
    const liveWeatherRes = await fetch(liveWeatherUrl)
    const liveWeatherData = await liveWeatherRes.json()

    const nextWeatherUrl = `https://restapi.amap.com/v3/weather/weatherInfo?city=${cityAdCode}&key=${KEY}&extensions=all`
    const nextWeatherRes = await fetch(nextWeatherUrl)
    const nextWeatherData = await nextWeatherRes.json()

    // 4. 合并返回给前端
    const result = {
      location: city || '未知城市',
      liveWeather: liveWeatherData.lives?.[0] || null,
      nextWeather: nextWeatherData.forecasts?.[0].casts?.[1] || null,
      ip: ip // 可选，用于调试
    }

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
//        'Cache-Control': 'public, s-maxage=1800' // 缓存30分钟
      }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })
  }
}

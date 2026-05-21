import axios from 'axios';

export default async function handler(request, response) {
  try {
    // 1. 请求百度热榜页面
    const res = await axios.get('https://top.baidu.com/board?tab=realtime', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 5000 // 5秒超时
    });

    const html = res.data;

    // 2. 🎯 正则表达式精准提取 <!--s-data:...--> 内的 JSON 字符串
    const match = html.match(/<!--s-data:({[\s\S]*?})-->/);

    if (!match || !match[1]) {
      // 触发报警：一旦正则匹配不到，说明结构彻底变了
      throw new Error('BAIDU_FORMAT_CHANGED: 无法在网页中找到 <!--s-data:...--> 数据块');
    }

    // 3. 将字符串转为 JavaScript 对象
    const rawJson = JSON.parse(match[1]);

    // 4. 根据你提供的结构，层层提取
    const cards = rawJson?.data?.cards || [];

    // 找到 component 为 "hotList" 的那张卡片
    const hotListCard = cards.find(card => card.component === 'hotList');

    if (!hotListCard || !hotListCard.content) {
      throw new Error('BAIDU_LIST_EMPTY: 未能在数据块中定位到 hotList 内容');
    }

    // 5. ✨ 数据清洗：规范化输出给 Vue 前端
    const cleanList = hotListCard.content.map((item, index) => {
      return {
        index: index + 1,                     // 排名
        title: item.word || item.query,       // 标题（中俄迈向更高质量...）
        score: parseInt(item.hotScore) || 0,  // 热度值（7904770）
        desc: item.desc || '',                // 导语简介
        url: item.url || item.rawUrl,         // 搜索链接
        img: item.img || '',                  // 缩略图
        isTop: item.isTop || false            // 是否是置顶霸榜项
      };
    });

    // 6. 成功响应
    response.status(200).json({
      success: true,
      data: cleanList
    });

  } catch (error) {
    console.error('【抓取失败】:', error.message);

    // 完美的错误防腐：不管是网络断了还是百度改版，都给前端返回标准错误格式
    response.status(500).json({
      success: false,
      errorType: error.message.includes('BAIDU_') ? 'STRUCTURE_ERROR' : 'NETWORK_ERROR',
      message: error.message
    });
  }
}

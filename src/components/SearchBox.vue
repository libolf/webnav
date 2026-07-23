<script setup>
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { store } from '@/utils/store.js'

// --- 搜索引擎配置 (保持不变) ---
const engines = {
  baidu: { name: '百度', url: 'https://www.baidu.com/s?wd=' },
  google: { name: 'Google', url: 'https://www.google.com/search?q=' },
  bing: { name: '必应', url: 'https://cn.bing.com/search?q=' }
}

const currentEngine = ref('baidu')
const keyword = ref('')
const keywordInput = ref(null)
const suggestions = ref([])
const showSuggest = ref(false)
const hotNews = ref([])
const isExpanded = ref(false)
const offsetIndex = ref(0)
const searchContainer = ref(null)
let scrollTimer = null

const selectIndex = ref(-1) // 当前键盘选中的建议项索引，-1 表示未选中

const totalGroups = computed(() => Math.ceil(hotNews.value.length / 6))

const fetchHot = async () => {
  try {
    // 1. 改为请求你本地的 Vercel 中转路由（对应你的 hot.js 文件）
    const res = await fetch('/api/hot')
    if (!res.ok) throw new Error('热搜接口响应异常')

    // 2. 此时 hot.js 返回的已经是清洗干净且纯正的 JSON 数据了，直接 .json() 解析
    const data = await res.json()

    // 3. 根据你的 hot.js 返回数据格式进行适配赋值：
    // 如果你的 hot.js 直接返回的是数组 [ {title, url, index}, ... ]
    if (Array.isArray(data)) {
      hotNews.value = data
      startScroll()
    }
    // 如果返回的是 { success: true, data: [...] }
    else if (data && data.success === true && Array.isArray(data.data)) { // ✨ 修改了这里
      hotNews.value = data.data
      startScroll()
    }
    // 保留以前的 code === 1 兼容（可选）
    else if (data && data.code === 1) {
      hotNews.value = data.data
      startScroll()
    }
  } catch (e) {
    // 打印具体错误，方便在控制台排查
    console.error('热搜获取或解析失败:', e)
  }
//  try {
//    const res = await fetch('https://zj.v.api.aa1.cn/api/baidu-rs/')
//    const rawText = await res.text()
//    const fixedText = rawText.replace(/([^\s:{[,])"([^\s:}\],])/g, '$1“$2')
//    const json = JSON.parse(fixedText)
//    if (json.code === 1) {
//      hotNews.value = json.data
//      startScroll()
//    }
//  } catch (e) {
//    console.error('热搜获取失败')
//  }
}

const startScroll = () => {
  stopScroll()
  if (totalGroups.value <= 1) return
  scrollTimer = setInterval(() => {
    offsetIndex.value = (offsetIndex.value + 1) % totalGroups.value
  }, 6000)
}

const stopScroll = () => clearInterval(scrollTimer)

const handleClickOutside = (e) => {
  // 1. 如果点击的是搜索建议项、清空按钮或搜索按钮，直接拦截，不走全局的“点击空白关闭”
  if (
    e.target.closest('.suggest-panel') ||
    e.target.closest('.search-btn') ||
    e.target.closest('.clear-btn')
  ) {
    return
  }

  // 2. 检查点击是否发生在“热搜完整面板”、“展开热搜的箭头按钮”以及“滚动热搜的单元格”内
  const clickedHotModule =
    e.target.closest('.hot-panel-full') ||
    e.target.closest('.hot-trigger') ||
    e.target.closest('.hot-cell'); // ✨ 新增保护热搜滚动条的链接

  // 3. 检查点击是否发生在整个搜索容器内
  const clickedSearchBox = searchContainer.value && searchContainer.value.contains(e.target);

  // 如果点击的既不是热搜面板/按钮/链接，关闭全榜
  if (!clickedHotModule) {
    isExpanded.value = false
  }

  // 如果点击的不在搜索容器内，关闭建议框
  if (!clickedSearchBox) {
    showSuggest.value = false
  }
}


// 监听键盘上下键与回车
const handleKeyDown = (e) => {

  if (e.key === 'Enter') {
    e.preventDefault() // 阻止默认的回车行为

    // 情况 A：选中了下拉列表项，填入关键词并搜索
    if (showSuggest.value && selectIndex.value > -1 && selectIndex.value < suggestions.value.length) {
      keyword.value = suggestions.value[selectIndex.value]
    }

    // 情况 B：无论是否选中下拉项，回车都触发搜索
    handleSearch()
    return
  }

  // 只有当建议框展示且有列表时，才响应上下箭头移动
  if (!showSuggest.value || suggestions.value.length === 0) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectIndex.value = (selectIndex.value + 1) >= suggestions.value.length ? -1 : selectIndex.value + 1
    scrollActiveIntoView()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectIndex.value = selectIndex.value <= -1 ? suggestions.value.length - 1 : selectIndex.value - 1
    scrollActiveIntoView()
  }

//  if (!showSuggest.value || suggestions.value.length === 0) return
//
//  if (e.key === 'ArrowDown') {
//    e.preventDefault() // 阻止光标移到末尾
//    // 往下递增，到末尾后循环回 -1
//    selectIndex.value = (selectIndex.value + 1) >= suggestions.value.length ? -1 : selectIndex.value + 1
//    scrollActiveIntoView()
//  } else if (e.key === 'ArrowUp') {
//    e.preventDefault() // 阻止光标移到开头
//    // 往上递减，到 -1 后循环回末尾
//    selectIndex.value = selectIndex.value <= -1 ? suggestions.value.length - 1 : selectIndex.value - 1
//    scrollActiveIntoView()
//  } else if (e.key === 'Enter') {
//    // 如果有选中的建议项，直接回车搜索该项
//    if (selectIndex.value > -1 && selectIndex.value < suggestions.value.length) {
//      e.preventDefault() // 阻止 input 默认的 enter 事件
//      keyword.value = suggestions.value[selectIndex.value]
//      handleSearch()
//    }
//  }
}

// 确保选中的项在滚动视图内
const scrollActiveIntoView = () => {
  nextTick(() => {
    const activeEl = document.querySelector('.suggest-panel li.active-item')
    if (activeEl) {
      activeEl.scrollIntoView({
        block: 'nearest' // 滚动到最近的边缘，避免剧烈跳动
      })
    }
  })
}

const handleGlobalKeydown = (e) => {
  // 识别 Ctrl + Q (同时支持大写和小写 Q)
  if (e.altKey && (e.key === 'q' || e.key === 'Q')) {
    e.preventDefault() // 阻止浏览器默认行为（如果有的话）

    const engineKeys = Object.keys(engines)
    const currentIndex = engineKeys.indexOf(currentEngine.value)

    // 1. 计算下一个引擎的 key
    const nextIndex = (currentIndex + 1) % engineKeys.length
    currentEngine.value = engineKeys[nextIndex]

    // 2. 自动使输入框获得焦点
    // 使用 nextTick 确保 DOM 更新（虽然 ref 切换通常很快，但这是好习惯）
    nextTick(() => {
      if (keywordInput.value) {
        keywordInput.value.focus()
      }
    })
  }

  if (e.key === '/') {
    // 关键判断：如果当前焦点已经在 input、textarea 或 contenteditable 元素上，则不触发
    const activeEl = document.activeElement;
    const isTyping = activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      activeEl.isContentEditable;

    if (!isTyping) {
      e.preventDefault(); // 阻止在输入框里填入第一个 /
      nextTick(() => {
        if (keywordInput.value) {
          keywordInput.value.focus()
        }
      })
    }
  }
}

onMounted(() => {
  fetchHot()
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  stopScroll()
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleGlobalKeydown)
})

const handleSearch = () => {
  if (!keyword.value.trim()) return
  const engineKeys = Object.keys(engines)
  const currentIndex = engineKeys.indexOf(currentEngine.value)
  let url = engines[currentEngine.value].url + encodeURIComponent(keyword.value)
  if (currentIndex === 2) {
    url = url + '&ensearch=1'
  }
  showSuggest.value = false
  store.saveSearchHistory(keyword.value)
  selectIndex.value = -1
  nextTick(() => {
    window.open(url, '_blank')
    setTimeout(() => {
      keyword.value = ''
      keywordInput.value.blur();
      showSuggest.value = false
    }, 100)
  })
}

const selectSuggest = (text) => {
  keyword.value = text
  handleSearch()
}

const handleInputFocus = () => {
  if (keyword.value.trim().length === 0) {
    const searchHistory = store.getSearchHistory()
    if (searchHistory.length > 0) {
      showSuggest.value = true
      suggestions.value = searchHistory
    }
  } else {
    if (suggestions.value.length > 0) {
      showSuggest.value = true
    }
  }
}

// 跳过显示搜索历史，当切换搜索引擎时
let skipShowSearchHistory = false
let suggestTimer = null
watch(keyword, (newVal) => {
  clearTimeout(suggestTimer)
  if (!document.hasFocus()) {
    return
  }
  if (!newVal.trim() && !skipShowSearchHistory) {
    const searchHistory = store.getSearchHistory()
    if (searchHistory.length > 0) {
      showSuggest.value = true
      suggestions.value = searchHistory
    } else {
      suggestions.value = []
      showSuggest.value = false
    }
    selectIndex.value = -1
    return
  }
  skipShowSearchHistory = false
  suggestTimer = setTimeout(async () => {

    const word = newVal.trim()

    // --- 策略分流：百度和 Bing 直接走前端，不经过 Vercel ---
    if (currentEngine.value === 'baidu') {
      const callbackName = `baidu_cb_${Date.now()}`
      const script = document.createElement('script')
      window[callbackName] = (data) => {
        if (keyword.value.trim() === word) {
          suggestions.value = data.s
          showSuggest.value = suggestions.value.length > 0
        }
        document.body.removeChild(script)
        delete window[callbackName]
      }
      script.src = `https://suggestion.baidu.com/su?wd=${encodeURIComponent(word)}&cb=${callbackName}`
      document.body.appendChild(script)
      return
    }

    if (currentEngine.value === 'bing') {
      const callbackName = `bing_cb_${Date.now()}`
      const script = document.createElement('script')

      window[callbackName] = (data) => {
        // Bing 返回的格式通常是 [ "关键词", ["建议1", "建议2", ...] ]
        if (keyword.value.trim() === word && data && data[1]) {
          suggestions.value = data[1]
          showSuggest.value = suggestions.value.length > 0
        }
        document.body.removeChild(script)
        delete window[callbackName]
      }

      // 注意：增加了 JsonType 和 JsonCallback 参数
      script.src = `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(word)}&JsonType=callback&JsonCallback=${callbackName}`
      document.body.appendChild(script)
      return
    }

    if (currentEngine.value === 'google') {
      try {
        const res = await fetch(`/api/suggest?engine=google&wd=${encodeURIComponent(word)}`)
        if (res.ok) {
          const data = await res.json()
          if (document.hasFocus() && keyword.value.trim() === word) {
            suggestions.value = data
            showSuggest.value = suggestions.value.length > 0
          }
        }
      } catch (e) {
        console.error('Google 联想失败:', e)
      }
    }

//    try {
//      // 调用 Vercel 中转 API，并传入当前所选的引擎 `currentEngine.value`
//      const res = await fetch(`/api/suggest?engine=${currentEngine.value}&wd=${encodeURIComponent(newVal.trim())}`)
//      if (res.ok) {
//        const data = await res.json()
//        // 确保异步返回时，用户输入的内容没有被清空，再更新列表
//        if (document.hasFocus() && keyword.value.trim()) {
//          suggestions.value = data
//          showSuggest.value = suggestions.value.length > 0
//        }
//      }
//    } catch (e) {
//      console.error('获取联想词失败:', e)
//    }
//    const callbackName = `baidu_cb_${Date.now()}`
//    const script = document.createElement('script')
//    window[callbackName] = (data) => {
//      if (keyword.value.trim()) {
//        suggestions.value = data.s
//        showSuggest.value = suggestions.value.length > 0
//      }
//      document.body.removeChild(script)
//      delete window[callbackName]
//    }
//    script.src = `https://suggestion.baidu.com/su?wd=${encodeURIComponent(keyword.value)}&cb=${callbackName}`
//    document.body.appendChild(script)
  }, 150)
})

watch(currentEngine, () => {
  keywordInput.value.focus()
  if (keyword.value.trim()) {
    // 触发更新建议（直接修改一次 keyword 触发上面的 watch，或者直接手动调用 fetch）
    const temp = keyword.value
    skipShowSearchHistory = true
    keyword.value = ''
    nextTick(() => {
      keyword.value = temp
    })
  }
})

const clearKeyword = () => {
  keyword.value = ''
  suggestions.value = []
  showSuggest.value = false
  selectIndex.value = -1

  setTimeout(()=>{
    keywordInput.value.focus()
    handleInputFocus()
  }, 100)
}
</script>

<template>
  <div class="search-container" ref="searchContainer">
    <div class="engine-tabs-wrapper">
      <div class="engine-tabs">
        <div class="active-indicator" :class="currentEngine"></div>
        <span v-for="(info, key) in engines" :key="key" :class="{ active: currentEngine === key }"
              @click="currentEngine = key">
          {{ info.name }}
        </span>
      </div>
    </div>

    <div class="search-bar">
      <div class="input-wrapper">
        <input ref="keywordInput" type="text" v-model="keyword"
               @keydown="handleKeyDown"
               @focus="handleInputFocus"
               placeholder="输入搜索内容..." />

        <button v-if="keyword" class="clear-btn" @click="clearKeyword" title="清空内容">
          &times;
        </button>

        <Transition name="fade">
          <ul v-if="showSuggest" class="suggest-panel">
            <li v-for="(item, index) in suggestions" :key="index"
                :class="{ 'active-item': selectIndex === index }"
                @mousedown="selectSuggest(item)">
              {{ item }}
            </li>
          </ul>
        </Transition>
      </div>
      <button class="search-btn" @click="handleSearch">搜索</button>
    </div>

    <div class="hot-module" v-if="hotNews.length">
      <div class="hot-display-window" @mouseenter="stopScroll" @mouseleave="startScroll">
        <div class="hot-list-canvas">
          <div
            v-for="gIdx in totalGroups"
            :key="gIdx"
            class="hot-grid-group"
            :class="{ 'is-active': offsetIndex === gIdx - 1 }"
          >
            <a v-for="item in hotNews.slice((gIdx-1)*6, gIdx*6)" :key="item.index" :href="item.url"
               target="_blank" class="hot-cell" :title="item.title + '\n' + item.desc" @click="isExpanded = false">
              <span class="h-idx" :class="'idx-' + item.index">{{ item.index }}</span>
              <span class="h-title">{{ item.title }}</span>
            </a>
          </div>
        </div>
      </div>

      <div class="hot-trigger" @click="isExpanded = !isExpanded">
        <i class="arrow-icon" :class="{ 'up': isExpanded }"></i>
      </div>

      <Transition name="fade">
        <div v-if="isExpanded" class="hot-panel-full" @click.stop>
          <div class="p-header">百度热搜榜 <span @click.stop="fetchHot">刷新</span></div>
          <div class="p-list">
            <a v-for="item in hotNews" :key="item.index" :href="item.url" target="_blank"
               class="p-item" :title="item.desc" @click="isExpanded = false">
              <span class="h-idx" :class="'idx-' + item.index">{{ item.index }}</span>
              <span class="p-title">{{ item.title }}</span>
            </a>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.search-container {
  max-width: 800px;
  margin: 10px auto;
  text-align: center;
  position: relative;
}

.engine-tabs-wrapper {
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
}

.engine-tabs {
  position: relative;
  display: flex;
  background-color: #f1f3f8;
  border-radius: 24px;
  padding: 4px;
  width: 270px;
  box-sizing: border-box;
}

.engine-tabs span {
  flex: 1;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  height: 34px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2;
  transition: color 0.3s;
}

.engine-tabs span.active {
  color: #ffffff;
  font-weight: bold;
}

.active-indicator {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc((100% - 8px) / 3);
  height: 34px;
  background: #4e6ef2;
  border-radius: 20px;
  z-index: 1;
  transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1);
}

.active-indicator.baidu {
  transform: translateX(0);
}

.active-indicator.google {
  transform: translateX(100%);
}

.active-indicator.bing {
  transform: translateX(200%);
}

.search-bar {
  display: flex;
  justify-content: center;
  height: 48px;
}

.input-wrapper {
  position: relative;
  width: 500px;
  display: flex;
}

input {
  flex: 1;
  height: 100%;
  padding: 0 45px 0 20px; /* 右侧留出 45px 给清空按钮 */
  font-size: 16px;
  border: 2px solid #4e6ef2;
  border-right: none;
  border-radius: 24px 0 0 24px;
  outline: none;
  box-sizing: border-box;
}

.clear-btn {
  position: absolute;
  right: 20px;             /* 悬浮在 input 右侧内部 */
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #999;
  font-size: 28px;         /* 适当放大 × 号 */
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  transition: all 0.2s ease;
  padding: 0;
  line-height: 1;
  z-index: 5;              /* 确保在输入框上层，但低于建议面板 */
}

.clear-btn:hover {
  background-color: #f1f3f8; /* 悬浮时有个浅灰色圆圈底色 */
  color: #666;
}

.search-btn {
  width: 100px;
  height: 100%;
  flex-shrink: 0;
  background: #4e6ef2;
  color: white;
  border: 2px solid #4e6ef2;
  border-radius: 0 24px 24px 0;
  font-size: 16px;
  cursor: pointer;
  font-weight: bold;
  box-sizing: border-box;
}

/* --- 核心动画部分：原地淡入淡出 --- */
.hot-module {
  width: 600px;
  margin: 15px auto 0;
  position: relative;
}

.hot-display-window {
  height: 56px;
  position: relative;
  overflow: hidden;
}

.hot-list-canvas {
  position: relative;
  width: 100%;
  height: 100%;
}

.hot-grid-group {
  position: absolute; /* 关键：所有组原地重叠 */
  top: 0;
  left: 0;
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 28px);
  gap: 0 12px;
  height: 56px;

  /* 初始状态：完全透明 */
  opacity: 0;
  pointer-events: none; /* 隐藏状态禁止点击 */
  transition: opacity 1s ease; /* 调整时长，让淡入淡出更柔和 */
}

/* 激活状态：透明度变为 1 */
.hot-grid-group.is-active {
  opacity: 1;
  pointer-events: auto; /* 激活状态允许点击链接 */
}

.hot-cell {
  display: flex;
  align-items: center;
  text-decoration: none;
  font-size: 13px;
  color: #666;
  height: 28px;
  white-space: nowrap;
  overflow: hidden;
  text-align: left;
}

.h-idx {
  font-weight: bold;
  width: 18px;
  margin-right: 6px;
  text-align: center;
  color: #bbb;
  flex-shrink: 0;
  font-size: 11px;
}

.idx-1 {
  color: #ff1e3e;
}

.idx-2 {
  color: #ff7701;
}

.idx-3 {
  color: #ffb400;
}

.h-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hot-cell:hover .h-title {
  color: #4e6ef2;
}

/* --- 其他面板和动画 (保持不变) --- */
.hot-trigger {
  width: 100%;
  height: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  margin-top: 2px;
}

.arrow-icon {
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid #999;
  transition: transform 0.3s;
}

.arrow-icon.up {
  transform: rotate(180deg);
}

.hot-panel-full {
  position: absolute;
  top: 80px;
  width: 600px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
  z-index: 120;
  padding: 16px;
  box-sizing: border-box;
  border: 1px solid #eee;
  text-align: left;
}

.p-header {
  display: flex;
  justify-content: space-between;
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 12px;
  border-bottom: 1px solid #f5f5f5;
  padding-bottom: 8px;
}

.p-header span {
  color: #4e6ef2;
  font-size: 12px;
  cursor: pointer;
  font-weight: normal;
}

.p-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 20px;
  max-height: 350px;
  overflow-y: auto;
}

.p-item {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: #444;
  font-size: 13px;
  height: 26px;
}

.suggest-panel {
  position: absolute;
  top: 50px;
  left: 10px;
  width: calc(100% - 20px);
  background: white;
  border-radius: 12px;
  list-style: none;
  padding: 8px 0;
  margin: 0;
  z-index: 1000;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border: 1px solid #eee;
  text-align: left;
  max-height: 400px; /* 你可以根据需要调整这个像素值 */
  overflow-y: auto; /* 内容超出时显示垂直滚动条 */
  overflow-x: hidden; /* 隐藏水平溢出 */
}

.suggest-panel li {
  padding: 10px 20px;
  cursor: pointer;
  font-size: 14px;
}

.suggest-panel li:hover,
.suggest-panel li.active-item {
  background: #f5f7ff;
  color: #4e6ef2;
}

.suggest-panel::-webkit-scrollbar {
  width: 6px;
}

.suggest-panel::-webkit-scrollbar-thumb {
  background: #e0e0e0;
  border-radius: 10px;
}

.suggest-panel::-webkit-scrollbar-thumb:hover {
  background: #ccc;
}

.suggest-panel::-webkit-scrollbar-track {
  background: transparent;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>

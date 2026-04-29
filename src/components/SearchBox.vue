<script setup>
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue'

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

const totalGroups = computed(() => Math.ceil(hotNews.value.length / 6))

const fetchHot = async () => {
  try {
    const res = await fetch('https://zj.v.api.aa1.cn/api/baidu-rs/')
    const rawText = await res.text()
    const fixedText = rawText.replace(/([^\s:{[,])"([^\s:}\],])/g, '$1“$2')
    const json = JSON.parse(fixedText)
    if (json.code === 1) {
      hotNews.value = json.data
      startScroll()
    }
  } catch (e) {
    console.error('热搜获取失败')
  }
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
  if (searchContainer.value && !searchContainer.value.contains(e.target)) {
    isExpanded.value = false
    showSuggest.value = false
  }
}

const handleGlobalKeydown = (e) => {
  // 识别 Ctrl + Q (同时支持大写和小写 Q)
  if (e.altKey && (e.key === 'q' || e.key === 'Q')) {
    e.preventDefault(); // 阻止浏览器默认行为（如果有的话）

    const engineKeys = Object.keys(engines);
    const currentIndex = engineKeys.indexOf(currentEngine.value);

    // 1. 计算下一个引擎的 key
    const nextIndex = (currentIndex + 1) % engineKeys.length;
    currentEngine.value = engineKeys[nextIndex];

    // 2. 自动使输入框获得焦点
    // 使用 nextTick 确保 DOM 更新（虽然 ref 切换通常很快，但这是好习惯）
    nextTick(() => {
      if (keywordInput.value) {
        keywordInput.value.focus();
      }
    });
  }
};

onMounted(() => {
  fetchHot()
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('keydown', handleGlobalKeydown);
})

onUnmounted(() => {
  stopScroll()
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleGlobalKeydown)
})

const handleSearch = () => {
  if (!keyword.value.trim()) return
  window.open(engines[currentEngine.value].url + encodeURIComponent(keyword.value), '_blank')
  showSuggest.value = false
  keyword.value = ""
}

const selectSuggest = (text) => {
  keyword.value = text
  handleSearch()
}

const handleInputFocus = () => {
  if (suggestions.value.length > 0) showSuggest.value = true
}

let suggestTimer = null
watch(keyword, (newVal) => {
  clearTimeout(suggestTimer)
  if (!newVal.trim()) {
    suggestions.value = []
    showSuggest.value = false
    return
  }
  suggestTimer = setTimeout(async () => {
    const callbackName = `baidu_cb_${Date.now()}`
    const script = document.createElement('script')
    window[callbackName] = (data) => {
      if (keyword.value.trim()) {
        suggestions.value = data.s
        showSuggest.value = suggestions.value.length > 0
      }
      document.body.removeChild(script)
      delete window[callbackName]
    }
    script.src = `https://suggestion.baidu.com/su?wd=${encodeURIComponent(keyword.value)}&cb=${callbackName}`
    document.body.appendChild(script)
  }, 150)
})
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
        <input ref="keywordInput" type="text" v-model="keyword" @keyup.enter="handleSearch" @focus="handleInputFocus"
               placeholder="输入搜索内容..." />
        <Transition name="fade">
          <ul v-if="showSuggest" class="suggest-panel">
            <li v-for="(item, index) in suggestions" :key="index" @mousedown="selectSuggest(item)">
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
               target="_blank" class="hot-cell" :title="item.title">
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
        <div v-if="isExpanded" class="hot-panel-full">
          <div class="p-header">百度热搜榜 <span @click.stop="fetchHot">刷新</span></div>
          <div class="p-list">
            <a v-for="item in hotNews" :key="item.index" :href="item.url" target="_blank"
               class="p-item" :title="item.title">
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
  padding: 0 20px;
  font-size: 16px;
  border: 2px solid #4e6ef2;
  border-right: none;
  border-radius: 24px 0 0 24px;
  outline: none;
  box-sizing: border-box;
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
}

.suggest-panel li {
  padding: 10px 20px;
  cursor: pointer;
  font-size: 14px;
}

.suggest-panel li:hover {
  background: #f5f7ff;
  color: #4e6ef2;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>

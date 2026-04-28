<script setup>
import { ref, watch } from 'vue'

const engines = {
  baidu: { name: '百度', url: 'https://www.baidu.com/s?wd=' },
  google: { name: 'Google', url: 'https://www.google.com/search?q=' },
  bing: { name: '必应', url: 'https://cn.bing.com/search?q=' }
}

const currentEngine = ref('baidu')
const keyword = ref('')
const suggestions = ref([])
const showSuggest = ref(false)

const handleSearch = () => {
  if (!keyword.value.trim()) return
  const url = engines[currentEngine.value].url + encodeURIComponent(keyword.value)
  window.open(url, '_blank')
  showSuggest.value = false
}

// 修正获取建议的函数逻辑
const fetchSuggestions = async () => {
  // 二次检查，防止快速删除导致的残余请求
  if (!keyword.value.trim()) return

  const callbackName = `baidu_cb_${Date.now()}`
  const script = document.createElement('script')

  window[callbackName] = (data) => {
    // 只有当输入框还有内容时，才渲染结果
    if (keyword.value.trim()) {
      suggestions.value = data.s
      showSuggest.value = suggestions.value.length > 0
    }
    document.body.removeChild(script)
    delete window[callbackName]
  }

  script.src = `https://suggestion.baidu.com/su?wd=${encodeURIComponent(keyword.value)}&cb=${callbackName}`
  document.body.appendChild(script)
}

const selectSuggest = (text) => {
  keyword.value = text
  handleSearch()
}

let timer = null
watch(keyword, (newVal) => {
  clearTimeout(timer)

  // 核心改进：如果输入框空了，立刻重置所有状态，不走逻辑
  if (!newVal.trim()) {
    suggestions.value = []
    showSuggest.value = false
    return
  }

  // 缩短防抖时间到 150ms，提升响应感
  timer = setTimeout(() => {
    fetchSuggestions()
  }, 150)
})
</script>

<template>
  <div class="search-container">
    <div class="engine-tabs-wrapper">
      <div class="engine-tabs">
        <div class="active-indicator" :class="currentEngine"></div>
        <span
          v-for="(info, key) in engines"
          :key="key"
          :class="{ active: currentEngine === key }"
          @click="currentEngine = key"
        >
          {{ info.name }}
        </span>
      </div>
    </div>

    <div class="search-bar">
      <div class="input-wrapper">
        <input
          type="text"
          v-model="keyword"
          @keyup.enter="handleSearch"
          @focus="showSuggest = suggestions.length > 0"
          @blur="setTimeout(() => showSuggest = false, 200)"
          placeholder="输入搜索内容..."
        />
        <ul v-if="showSuggest" class="suggest-panel">
          <li
            v-for="(item, index) in suggestions"
            :key="index"
            @mousedown="selectSuggest(item)"
          >
            {{ item }}
          </li>
        </ul>
      </div>
      <button class="search-btn" @click="handleSearch">搜索</button>
    </div>
  </div>
</template>

<style scoped>
.search-container {
  max-width: 800px;
  margin: 60px auto; /* 增加一点顶距 */
  text-align: center;
}

/* --- Tab 滑块样式 --- */
.engine-tabs-wrapper {
  margin-bottom: 20px;
  display: flex;
  justify-content: center;
}

.engine-tabs {
  position: relative;
  display: flex;
  background-color: #f1f3f8;
  border-radius: 24px; /* 更圆润 */
  padding: 4px;
  width: 260px; /* 稍微窄一点更精致 */
  box-shadow: inset 0 1px 4px rgba(0,0,0,0.05);
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
  user-select: none;
}

.engine-tabs span.active {
  color: #ffffff;
  font-weight: bold;
}

.active-indicator {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(33.33% - 5.3px); /* 适配 padding 的宽度计算 */
  height: 34px;
  background: #4e6ef2;
  border-radius: 20px;
  z-index: 1;
  transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
  box-shadow: 0 4px 10px rgba(78, 110, 242, 0.3);
}

.active-indicator.baidu { transform: translateX(0); }
.active-indicator.google { transform: translateX(100%); }
.active-indicator.bing { transform: translateX(200%); }

/* --- 搜索框主体样式 --- */
.search-bar {
  display: flex;
  justify-content: center;
  align-items: flex-start; /* 避免联想词撑开高度 */
}

.input-wrapper {
  position: relative;
  width: 500px;
}

input {
  width: 100%;
  height: 48px; /* 稍微加高一点 */
  padding: 0 20px;
  font-size: 16px;
  border: 2px solid #4e6ef2; /* 直接用主题色，更有整体感 */
  border-radius: 24px 0 0 24px; /* 圆角对齐 Tab 风格 */
  outline: none;
  box-sizing: border-box;
}

.search-btn {
  width: 100px;
  height: 48px;
  background: #4e6ef2;
  color: white;
  border: none;
  border-radius: 0 24px 24px 0;
  font-size: 16px;
  cursor: pointer;
  font-weight: bold;
  transition: background 0.2s;
}

.search-btn:hover {
  background: #3b5cf0;
}

/* 联想词面板优化 */
.suggest-panel {
  position: absolute;
  top: 52px;
  left: 10px; /* 稍微缩进，配合圆角 */
  width: calc(100% - 20px);
  background: white;
  border-radius: 12px;
  list-style: none;
  padding: 8px 0;
  margin: 0;
  text-align: left;
  z-index: 100;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border: 1px solid #eee;
}

.suggest-panel li {
  padding: 10px 20px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
}

.suggest-panel li:hover {
  background: #f5f7ff;
  color: #4e6ef2;
}
</style>

<script setup>
import { ref, watch } from 'vue'

// 搜索引擎配置
const engines = {
  baidu: { name: '百度', url: 'https://www.baidu.com/s?wd=' },
  google: { name: 'Google', url: 'https://www.google.com/search?q=' },
  bing: { name: '必应', url: 'https://cn.bing.com/search?q=' }
}

const currentEngine = ref('baidu')
const keyword = ref('')
const suggestions = ref([])
const showSuggest = ref(false)

// 执行搜索
const handleSearch = () => {
  if (!keyword.value.trim()) return
  const url = engines[currentEngine.value].url + encodeURIComponent(keyword.value)
  window.open(url, '_blank')
  showSuggest.value = false
}

// 获取百度搜索建议 (跨域 JSONP 简易版)
const fetchSuggestions = async () => {
  if (!keyword.value.trim()) {
    suggestions.value = []
    return
  }

  // 百度联想词接口
  const script = document.createElement('script')
  const callbackName = `baidu_cb_${Date.now()}`

  window[callbackName] = (data) => {
    suggestions.value = data.s
    showSuggest.value = suggestions.value.length > 0
    document.body.removeChild(script)
    delete window[callbackName]
  }

  script.src = `https://suggestion.baidu.com/su?wd=${encodeURIComponent(keyword.value)}&cb=${callbackName}`
  document.body.appendChild(script)
}

// 选中联想词
const selectSuggest = (text) => {
  keyword.value = text
  handleSearch()
}

// 监听输入，简单防抖
let timer = null
watch(keyword, () => {
  clearTimeout(timer)
  timer = setTimeout(fetchSuggestions, 300)
})
</script>

<template>
  <div class="search-container">
    <div class="engine-tabs">
      <span
        v-for="(info, key) in engines"
        :key="key"
        :class="{ active: currentEngine === key }"
        @click="currentEngine = key"
      >
        {{ info.name }}
      </span>
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
      <button class="search-btn" @click="handleSearch">百度一下</button>
    </div>
  </div>
</template>

<style scoped>
.search-container {
  max-width: 800px;
  margin: 40px auto;
  text-align: center;
}

.engine-tabs {
  margin-bottom: 10px;
  display: flex;
  justify-content: center;
  gap: 20px;
}

.engine-tabs span {
  cursor: pointer;
  font-size: 14px;
  color: #666;
  padding-bottom: 4px;
}

.engine-tabs span.active {
  color: #3388ff;
  font-weight: bold;
  border-bottom: 2px solid #3388ff;
}

.search-bar {
  display: flex;
  justify-content: center;
  position: relative;
}

.input-wrapper {
  position: relative;
  flex: 1;
  max-width: 540px;
}

input {
  width: 100%;
  height: 44px;
  padding: 12px 15px;
  font-size: 16px;
  border: 2px solid #c4c7ce;
  border-radius: 10px 0 0 10px;
  outline: none;
  transition: border-color 0.2s;
}

input:focus {
  border-color: #4e6ef2;
}

.search-btn {
  width: 108px;
  height: 48px;
  background: #4e6ef2;
  color: white;
  border: none;
  border-radius: 0 10px 10px 0;
  font-size: 16px;
  cursor: pointer;
  font-weight: bold;
}

.search-btn:hover {
  background: #3b5cf0;
}

/* 联想词样式 */
.suggest-panel {
  position: absolute;
  top: 46px;
  left: 0;
  width: 100%;
  background: white;
  border: 1px solid #ccc;
  border-top: none;
  list-style: none;
  padding: 0;
  margin: 0;
  text-align: left;
  z-index: 100;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  border-radius: 0 0 8px 8px;
}

.suggest-panel li {
  padding: 10px 15px;
  cursor: pointer;
  font-size: 14px;
}

.suggest-panel li:hover {
  background: #f5f5f5;
}
</style>

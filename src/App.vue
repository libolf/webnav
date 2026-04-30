<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { store } from './utils/store.js'
import { Solar } from 'lunar-javascript' // 需要执行 npm install lunar-javascript
import SearchBox from './components/SearchBox.vue'
import NavGrid from './components/NavGrid.vue'

const isShowLogin = ref(false)
const loginName = ref('')

// --- 日期与天气数据状态 ---
const dateDisplay = ref({ solar: '', lunar: '' })
const weatherData = ref({
  today: { desc: '', tempRange: '', uv: '' },
  tomorrow: { desc: '', tempRange: '' },
  city: '定位中...'
})

// 1. 初始化日期 (阳历 + 农历)
const initDate = () => {
  const now = new Date()
  const weeks = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

  // 阳历：04月28日 星期二
  const solarStr = `${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日 ${weeks[now.getDay()]}`

  // 农历：使用 lunar-javascript
  const lunar = Solar.fromDate(now).getLunar()
  const lunarStr = `农历${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`

  dateDisplay.value = { solar: solarStr, lunar: lunarStr }
}

// 3. 获取 wttr.in 天气数据
const fetchWeather = async () => {
  try {
    const res = await fetch('https://wttr.in/?format=j1&lang=zh')
    if (!res.ok) throw new Error('网络响应异常')
    const data = await res.json()

    // 2. 获取当前实况
    const current = data.current_condition?.[0] || {}
    const todayData = data.weather?.[0] || {}
    const tomorrowData = data.weather?.[1] || {}

    // 3. 辅助函数：安全获取温度区间
    const getTempRange = (dayObj) => {
      if (dayObj && dayObj.mintempC && dayObj.maxtempC) {
        return `${dayObj.mintempC}° / ${dayObj.maxtempC}°C`
      }
      return '-- / --°C'
    }

    // 4. 安全获取天气描述
    const getDesc = (conditionObj) => {
      if (!conditionObj) return '未知'
      return conditionObj.lang_zh?.[0]?.value || conditionObj.weatherDesc?.[0]?.value || '未知'
    }

    weatherData.value = {
      today: {
        desc: getDesc(current),
        tempRange: getTempRange(todayData),
      },
      tomorrow: {
        // 明天中午的时段通常在 hourly 数组的第 4 或第 5 个元素
        desc: getDesc(tomorrowData.hourly?.[4]),
        tempRange: getTempRange(tomorrowData)
      }
    }
  } catch (e) {
    console.error('天气获取失败:', e)
    weatherData.value.city = '定位失败'
  }
}

// 4. 生命周期钩子
onMounted(() => {
  initDate()
  fetchWeather()

  // 登录/同步逻辑
  if (store.nickName) {
    store.loginAndFetch(store.nickName)
  }
})

// --- 原有交互逻辑 ---
const handleHeaderClick = () => {
  if (!store.uid) {
    loginName.value = ''
    isShowLogin.value = true
  } else {
    if (confirm(`当前用户：${store.nickName}\n确定要退出登录吗？`)) {
      store.logout()
    }
  }
}

const submitLogin = async () => {
  if (loginName.value.trim()) {
    await store.loginAndFetch(loginName.value.trim())
    isShowLogin.value = false
  } else {
    alert('请输入昵称')
  }
}

const handleTopToolClick = (type) =>{
  let url
  if (type === 1) {
    url = "https://www.baidu.com/s?wd=" + encodeURIComponent("日历")
  } else if (type === 2) {
    url = "https://www.baidu.com/s?wd=" + encodeURIComponent("天气")
  } else {
    url = "https://map.baidu.com/"
  }
  window.open(url, '_blank')
}
</script>

<template>
  <div class="app-wrapper">
    <header class="main-header" @click="handleTopToolClick(3)">
      <div class="header-left" @click="handleTopToolClick(1)">
        <div class="calendar-card">
          <span class="m-label">{{ new Date().getMonth() + 1 }}月</span>
          <span class="d-label">{{ new Date().getDate() }}</span>
        </div>
        <div class="date-info">
          <div class="solar-text">{{ dateDisplay.solar }}</div>
          <div class="lunar-text">{{ dateDisplay.lunar }}</div>
        </div>
      </div>

      <div class="header-right" @click="handleTopToolClick(2)">
        <div v-if="weatherData.today.desc" class="weather-panel">
          <div class="w-section">
            <span class="w-label">今日</span>
            <span class="w-desc">{{ weatherData.today.desc }}</span>
            <span class="w-temp">{{ weatherData.today.tempRange }}</span>
          </div>

          <div class="v-divider"></div>

          <div class="w-section">
            <span class="w-label">明日</span>
            <span class="w-desc">{{ weatherData.tomorrow.desc }}</span>
            <span class="w-temp">{{ weatherData.tomorrow.tempRange }}</span>
          </div>
        </div>

        <div class="user-area" @click="handleHeaderClick">
          <div v-if="store.uid" class="user-info">
            <span class="status-dot"></span>
            {{ store.nickName }}
          </div>
          <div v-else class="login-btn">同步云端</div>
        </div>
      </div>
    </header>

    <main>
      <SearchBox />
      <NavGrid />
    </main>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isShowLogin" class="dialog-overlay" @click.self="isShowLogin = false">
          <div class="dialog-content">
            <div class="login-icon">👤</div>
            <h3>欢迎回来</h3>
            <p class="subtitle">输入昵称即可同步您的个人导航配置</p>
            <div class="form-item">
              <input v-model="loginName" placeholder="请输入您的昵称" @keyup.enter="submitLogin" autofocus />
            </div>
            <div class="dialog-footer">
              <button @click="isShowLogin = false" class="btn-cancel">先随便看看</button>
              <button @click="submitLogin" class="btn-confirm" :disabled="store.loading">
                {{ store.loading ? '同步中...' : '进入我的导航' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.app-wrapper { min-height: 100vh; background-color: #f6f8fa; }

.main-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 40px; background: white; box-shadow: 0 2px 10px rgba(0,0,0,0.03);
}

/* 左侧日期样式 */
.header-left { display: flex; align-items: center; gap: 15px; cursor: pointer}
.calendar-card {
  width: 42px; height: 42px; border: 2px solid #333; border-radius: 10px;
  display: flex; flex-direction: column; overflow: hidden;
}
.m-label { background: #ff4d4f; color: white; font-size: 10px; text-align: center; line-height: 16px; }
.d-label { flex: 1; display: flex; justify-content: center; align-items: center; font-size: 18px; font-weight: bold; }
.solar-text { font-size: 16px; font-weight: 600; color: #333; }
.lunar-text { font-size: 15px; color: #fa8c16; }

/* 右侧天气与用户 */
.header-right { display: flex; align-items: center; gap: 20px; cursor: pointer}
.weather-panel {
  display: flex; align-items: center; gap: 12px;
  background: #f8f9fa; padding: 6px 16px; border-radius: 20px; border: 1px solid #eee;
}
.w-section { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #555; }
.w-label { color: #999; font-size: 11px; }
.w-temp { font-weight: bold; color: #4e6ef2; }
.v-divider { width: 1px; height: 14px; background: #ddd; }
.env-tag { font-size: 10px; padding: 1px 5px; border-radius: 4px; color: white; background: #52c41a; }
.env-tag.中 { background: #faad14; }
.env-tag.良 { background: #73d13d; }
.city-info { font-size: 12px; color: #bbb; margin-left: 5px; }

.user-area { cursor: pointer; }
.login-btn {
  font-size: 13px; color: #4e6ef2; border: 1px solid #4e6ef2;
  padding: 4px 15px; border-radius: 20px; font-weight: 500;
}
.user-info { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; }
.status-dot { width: 8px; height: 8px; background: #52c41a; border-radius: 50%; }

/* 弹窗及动画 (保持原有) */
.dialog-overlay {
  position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.4); backdrop-filter: blur(8px);
  display: flex; justify-content: center; align-items: center; z-index: 9999;
}
.dialog-content { background: white; padding: 30px; border-radius: 24px; width: 340px; text-align: center; }
.dialog-footer { margin-top: 25px; display: flex; flex-direction: column; gap: 10px; }
.btn-confirm { background: #4e6ef2; color: white; padding: 12px; border-radius: 12px; border: none; cursor: pointer; }
.btn-cancel { background: transparent; color: #999; border: none; cursor: pointer; }
.fade-enter-active, .fade-leave-active { transition: all 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(10px); }
</style>

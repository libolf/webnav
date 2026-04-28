<script setup>
import { ref, onMounted } from 'vue'
import { store } from './utils/store.js'
import SearchBox from './components/SearchBox.vue'
import NavGrid from './components/NavGrid.vue'

const isShowLogin = ref(false)
const loginName = ref('')

// 页面加载逻辑
onMounted(() => {
  // 如果本地有昵称，store 会在初始化时尝试恢复
  if (store.nickName) {
    store.loginAndFetch(store.nickName)
  }
})

// 处理登录点击
const handleHeaderClick = () => {
  if (!store.uid) {
    // 没登录：弹窗
    loginName.value = ''
    isShowLogin.value = true
  } else {
    // 已登录：询问是否退出
    if (confirm(`当前用户：${store.nickName}\n确定要退出登录吗？`)) {
      store.logout()
    }
  }
}

// 提交登录
const submitLogin = async () => {
  if (loginName.value.trim()) {
    await store.loginAndFetch(loginName.value.trim())
    isShowLogin.value = false
  } else {
    alert('请输入昵称')
  }
}
</script>

<template>
  <div class="app-wrapper">
    <header class="main-header">
      <div class="logo">My Nav</div>
      <div class="user-area" @click="handleHeaderClick">
        <div v-if="store.uid" class="user-info">
          <span class="dot"></span>
          {{ store.nickName }}
        </div>
        <div v-else class="login-btn">登录 / 同步</div>
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
              <input
                v-model="loginName"
                placeholder="请输入您的昵称"
                @keyup.enter="submitLogin"
                autofocus
              />
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
.app-wrapper {
  min-height: 100vh;
  background-color: #f6f8fa;
}

.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 40px;
  background: white;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.logo {
  font-size: 20px;
  font-weight: bold;
  background: linear-gradient(45deg, #4e6ef2, #00d2ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.user-area {
  cursor: pointer;
  transition: opacity 0.2s;
}

.user-area:hover {
  opacity: 0.8;
}

.login-btn {
  font-size: 14px;
  color: #666;
  border: 1px solid #ddd;
  padding: 5px 15px;
  border-radius: 20px;
}

.user-info {
  font-size: 14px;
  color: #333;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  width: 8px;
  height: 8px;
  background: #52c41a;
  border-radius: 50%;
}

/* Dialog 样式 (复用 NavGrid 的风格) */
.dialog-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.dialog-content {
  background: white;
  padding: 30px;
  border-radius: 24px;
  width: 340px;
  text-align: center;
  box-shadow: 0 20px 50px rgba(0,0,0,0.15);
}

.login-icon {
  font-size: 40px;
  margin-bottom: 10px;
}

.subtitle {
  font-size: 13px;
  color: #999;
  margin-bottom: 25px;
}

.form-item input {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #eee;
  background: #f9f9f9;
  border-radius: 12px;
  outline: none;
  font-size: 16px;
  text-align: center;
}

.form-item input:focus {
  border-color: #4e6ef2;
  background: white;
}

.dialog-footer {
  margin-top: 25px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dialog-footer button {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-confirm {
  background: #4e6ef2;
  color: white;
}

.btn-confirm:disabled {
  background: #ccc;
}

.btn-cancel {
  background: transparent;
  color: #999;
}

/* 动画 */
.fade-enter-active, .fade-leave-active { transition: all 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(10px); }
</style>

<script setup>
import { store } from '../utils/store.js'
import { ref, reactive, nextTick } from 'vue'
import draggable from 'vuedraggable'

const isEditing = ref(false)
const isShowDialog = ref(false)
const newSite = reactive({ name: '', url: '' })

// 1. 在 script 中定义解析域名的函数，避免模板报错
const getDomain = (url) => {
  try {
    return new URL(url).hostname
  } catch (e) {
    return 'default'
  }
}

const openAddDialog = () => {
  newSite.name = ''
  newSite.url = ''
  isShowDialog.value = true
}

const confirmAdd = async () => {
  if (newSite.name && newSite.url) {
    let formattedUrl = newSite.url.trim()
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`
    }

    // 使用解构确保推入的是新对象，触发 Vue 响应式回显
    store.sites.push({
      name: newSite.name,
      url: formattedUrl
    })

    await store.saveToCloud()
    isShowDialog.value = false
  }
}

const removeSite = (index) => {
  store.sites.splice(index, 1)
  store.saveToCloud()
}

const onDragEnd = () => {
  store.saveToCloud()
}
</script>

<template>
  <div class="nav-section">
    <div class="nav-header">
      <button @click="isEditing = !isEditing" class="edit-btn" :class="{ active: isEditing }">
        {{ isEditing ? '完成' : '排序/编辑' }}
      </button>
    </div>

    <draggable
      v-model="store.sites"
      item-key="url"
      class="nav-grid"
      :disabled="!isEditing"
      ghost-class="ghost"
      @end="onDragEnd"
      :animation="200"
    >
      <template #item="{ element, index }">
        <div class="site-card" :class="{ 'shake': isEditing }">
          <a :href="isEditing ? 'javascript:void(0)' : element.url"
             :target="isEditing ? '' : '_blank'"
             class="site-link">
            <div class="icon-wrapper">
              <img
                :src="store.getIconFromCache(element.url) || `https://unavatar.io/duckduckgo/${getDomain(element.url)}`"
                @error="(e) => e.target.src='https://via.placeholder.com/64?text=?'"
              />
            </div>
            <span class="site-name">{{ element.name }}</span>
          </a>
          <div v-if="isEditing" class="del-tag" @click.stop="removeSite(index)">×</div>
        </div>
      </template>

      <template #footer>
        <div class="site-card add-card" @click="openAddDialog">
          <div class="icon-wrapper plus-icon">+</div>
          <span class="site-name">添加</span>
        </div>
      </template>
    </draggable>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isShowDialog" class="dialog-overlay" @click.self="isShowDialog = false">
          <div class="dialog-content">
            <h3>添加常用网址</h3>
            <div class="form-item">
              <label>名称</label>
              <input v-model="newSite.name" placeholder="如：GitHub" />
            </div>
            <div class="form-item">
              <label>网址</label>
              <input v-model="newSite.url" placeholder="github.com" @keyup.enter="confirmAdd" />
            </div>
            <div class="dialog-footer">
              <button @click="isShowDialog = false" class="btn-cancel">取消</button>
              <button @click="confirmAdd" class="btn-confirm">确定</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.nav-section {
  /* 核心配置 */
  width: 90%;           /* 占据屏幕宽度的 90% */
  max-width: 1400px;    /* 但最大不超过 1400px，防止超大屏下图标太稀疏 */
  margin: 0 auto;       /* 水平居中，两侧自动留空 */

  /* 辅助配置 */
  padding: 20px 0;      /* 上下留 40px 间距，左右边距由 margin 处理 */
}
.nav-header {
  height: 10px;
  display: flex;
  justify-content: flex-end; /* 标题在左，按钮在右 */
  align-items: center;            /* 垂直居中 */
  margin-bottom: 30px;            /* 与下方图标区域拉开距离 */
}

/* 1. 核心：让 <a> 标签本身成为一个居中的 Flex 容器 */
.site-link {
  display: flex;
  flex-direction: column; /* 垂直排列图标和文字 */
  align-items: center;    /* 核心：水平方向居中对齐所有子元素 */
  width: 100%;           /* 占满 site-card 的宽度 */

  /* 保持之前的禁用变色样式 */
  text-decoration: none;
  color: inherit;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

/* 如果你还想让 visited 状态保持不乱 */
.site-link:visited {
  color: inherit;
}

/* 2. 优化：让图标和文字之间有一个固定的微小空隙 */
.icon-wrapper {
  /* 保持你之前的样式 */
  width: 60px;
  height: 60px;
  background: #fff;
  border-radius: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);

  /* 将 margin-bottom 改为 site-link 内部处理 */
  margin-bottom: 8px; /* 标题和文字的间距，这个值可以根据需要微调 */
}

/* 3. 如果为了保险起见，给 site-name 也加一个文字居中 */
.site-name {
  margin-top: 0; /* 既然 icon 有 margin-bottom 了，这里可以为0 */
  font-size: 14px;
  color: #333;
  text-align: center; /* 确保文字多行时也是居中的 */
  display: block;     /* 占满宽度以便 text-align 生效 */
}

.edit-btn {
  width: 80px;
  height: 28px;
  border-radius: 6px;
  background-color: #4d6df0;
  border: none;
  color: #ffffff;
}

/* 保持之前的 grid 样式 */
.nav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 25px 15px;
  min-height: 100px;
}

.site-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.icon-wrapper {
  width: 60px;
  height: 60px;
  background: #fff;
  border-radius: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 8px;
}

.icon-wrapper img {
  width: 32px;
  height: 32px;
}

.plus-icon {
  border: 2px dashed #ccc;
  background: none;
  color: #999;
  font-size: 24px;
  cursor: pointer;
}

/* 拖拽虚影 */
.ghost {
  opacity: 0.3;
  background: #e0e0e0;
  border-radius: 16px;
}

/* 抖动动画 */
.shake {
  animation: shake-move 0.3s infinite;
}

@keyframes shake-move {
  0% {
    transform: rotate(1deg);
  }
  50% {
    transform: rotate(-1deg);
  }
  100% {
    transform: rotate(1deg);
  }
}

.del-tag {
  position: absolute;
  top: -5px;
  right: 10px;
  background: #ff4d4f;
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 14px;
  cursor: pointer;
  border: 2px solid #fff;
}

/* Dialog 样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}

.dialog-content {
  background: white;
  padding: 25px;
  border-radius: 20px;
  width: 320px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.form-item {
  margin-bottom: 15px;
  text-align: left;
}

.form-item label {
  display: block;
  font-size: 12px;
  color: #888;
  margin-bottom: 5px;
}

.form-item input {
  width: 100%;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 8px;
  outline: none;
}

.dialog-footer {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.dialog-footer button {
  flex: 1;
  padding: 10px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
}

.btn-confirm {
  background: #4e6ef2;
  color: white;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>

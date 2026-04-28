// src/store.js
import { reactive } from 'vue'
import { createClient } from '@supabase/supabase-js'

// 初始化 Supabase 客户端
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export const store = reactive({
  // --- 状态数据 ---
  uid: localStorage.getItem('nav_uid') || null,
  nickName: localStorage.getItem('nav_nickname') || '',
  sites: [], // 存放导航链接数组 [{name: '百度', url: '...'}, ...]
  loading: false,

  // --- 操作方法 ---

  // 1. 获取数据 (根据昵称登录)
  async loginAndFetch(name) {
    this.loading = true
    try {
      // A. 先根据昵称找用户
      let { data: user, error: userError } = await supabase
        .from('web_navigation_user')
        .select('uid')
        .eq('nick_name', name)
        .maybeSingle()

      // B. 如果用户不存在，则新建用户和初始配置
      if (!user) {
        const { data: newUser } = await supabase
          .from('web_navigation_user')
          .insert({ nick_name: name })
          .select()
          .single()
        user = newUser

        // 创建初始空配置
        await supabase.from('web_navigation_config').insert({ uid: user.uid, config_json: [] })
      }

      // C. 保存用户信息到本地和 Store
      this.uid = user.uid
      this.nickName = name
      localStorage.setItem('nav_uid', user.uid)
      localStorage.setItem('nav_nickname', name)

      // D. 拉取该用户的配置
      const { data: config } = await supabase
        .from('web_navigation_config')
        .select('config_json')
        .eq('uid', user.uid)
        .single()

      this.sites = config ? config.config_json : []
    } catch (err) {
      console.error('数据获取失败:', err)
    } finally {
      this.loading = false
    }
  },

  // 2. 保存/更新数据到云端
  async saveToCloud() {
    if (!this.uid) return
    this.loading = true
    const { error } = await supabase
      .from('web_navigation_config')
      .update({ config_json: this.sites }) // 直接把响应式的 sites 传过去
      .eq('uid', this.uid)

    if (error) alert('保存失败')
    this.loading = false
  },

  // 3. 退出登录 (清理本地缓存)
  logout() {
    this.uid = null
    this.nickName = ''
    this.sites = []
    localStorage.clear()
  }
})

// src/store.js
import { reactive } from 'vue'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// 缓存 Key
const SITES_CACHE_KEY = 'nav_sites_cache'
const ICONS_CACHE_KEY = 'nav_icons_cache'

export const store = reactive({
  uid: localStorage.getItem('nav_uid') || null,
  nickName: localStorage.getItem('nav_nickname') || '',
  // --- 核心改动：初始化时先从缓存加载 ---
  sites: JSON.parse(localStorage.getItem(SITES_CACHE_KEY) || '[]'),
  loading: false,

  async loginAndFetch(name) {
    this.loading = true
    try {
      let { data: user, error: userError } = await supabase
        .from('web_navigation_user')
        .select('uid')
        .eq('nick_name', name)
        .maybeSingle()

      if (!user) {
        const { data: newUser } = await supabase
          .from('web_navigation_user')
          .insert({ nick_name: name })
          .select()
          .single()
        user = newUser
        await supabase.from('web_navigation_config').insert({ uid: user.uid, config_json: [] })
      }

      this.uid = user.uid
      this.nickName = name
      localStorage.setItem('nav_uid', user.uid)
      localStorage.setItem('nav_nickname', name)

      const { data: config } = await supabase
        .from('web_navigation_config')
        .select('config_json')
        .eq('uid', user.uid)
        .single()

      const cloudSites = config ? config.config_json : []

      // --- 核心改动：只有当云端数据与本地不一致时才替换 ---
      // 这样可以避免页面刷新后，图标已经显示了，还要闪烁一下重新加载
      if (JSON.stringify(this.sites) !== JSON.stringify(cloudSites)) {
        this.sites = cloudSites
        localStorage.setItem(SITES_CACHE_KEY, JSON.stringify(cloudSites))
      }

    } catch (err) {
      console.error('数据获取失败:', err)
    } finally {
      this.loading = false
    }
  },

  async saveToCloud() {
    if (!this.uid) return
    // --- 核心改动：保存到云端的同时，立刻更新本地缓存，防止刷新变回旧数据 ---
    localStorage.setItem(SITES_CACHE_KEY, JSON.stringify(this.sites))

    this.loading = true
    const { error } = await supabase
      .from('web_navigation_config')
      .update({ config_json: this.sites })
      .eq('uid', this.uid)

    if (error) alert('保存失败')
    this.loading = false
  },

  // 辅助方法：从本地图标库获取图标，没有则返回默认图
  getIconFromCache(url) {
    const iconsMap = JSON.parse(localStorage.getItem(ICONS_CACHE_KEY) || '{}')
    console.log("icon from cache " + url + " " + iconsMap[url] == null)
    return iconsMap[url] || null // 返回 null 表示没缓存，需要去拉取
  },

  // 触发抓取并持久化到本地
  async handleImageLoad(url) {
    // 如果缓存里已经有了，就不再重复下载转码
    if (this.getIconFromCache(url)) return

    const base64 = await this.downloadAndCacheIcon(url)
    if (base64) {
      const iconsMap = JSON.parse(localStorage.getItem(ICONS_CACHE_KEY) || '{}')
      iconsMap[url] = base64
      localStorage.setItem(ICONS_CACHE_KEY, JSON.stringify(iconsMap))
      // 注意：这里不需要强制刷新 this.sites，因为图标是按需从缓存读的
    }
  },

  // 核心：抓取并保存图标
  async downloadAndCacheIcon(url) {
    try {
      const domain = new URL(url).hostname
      // 请求你部署在 Vercel 的中转接口
      const res = await fetch(`/api/icon?domain=${domain}`)

      if (!res.ok) return null

      const blob = await res.blob()

      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result) // 返回 Base64
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('图标缓存处理失败:', error)
      return null
    }
  },

  logout() {
    this.uid = null
    this.nickName = ''
    this.sites = []
    localStorage.clear()
  }
})

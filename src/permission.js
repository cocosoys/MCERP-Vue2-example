import router from './router'
import store from './store'
import { Message } from 'element-ui'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { getToken } from '@/utils/auth'
import { isPathMatch } from '@/utils/validate'
import { isRelogin } from '@/utils/request'

NProgress.configure({ showSpinner: false })

const whiteList = ['/login', '/register']

const isWhiteList = (path) => {
  return whiteList.some(pattern => isPathMatch(pattern, path))
}

// 嵌入态（wujie 子应用 / 主应用 iframe）：主应用 MCERP 已统一鉴权，子应用不做自己的登录跳转。
// 必须同时识别 iframe：否则会走 getToken → GetInfo → /api/plugins/ihomepages/getInfo（404）
// → LogOut → 跳 /login 的死循环，配置页永远打不开（spaFallback=false 下本项目用 IFRAME 模式）。
const isEmbedded = typeof window !== 'undefined' &&
  (!!window.__POWERED_BY_WUJIE__ || window.self !== window.top)

router.beforeEach((to, from, next) => {
  NProgress.start()
  if (isEmbedded) {
    // 嵌入态：业务路由已静态注册，主应用统一鉴权，直接放行
    next()
    return
  }
  if (getToken()) {
    to.meta.title && store.dispatch('settings/setTitle', to.meta.title)
    const isLock = store.getters.isLock
    /* has token*/
    if (to.path === '/login') {
      next({ path: '/' })
      NProgress.done()
    } else if (isWhiteList(to.path)) {
      next()
    } else if (isLock && to.path !== '/lock') {
      next({ path: '/lock' })
      NProgress.done()
    } else if (!isLock && to.path === '/lock') {
      next({ path: '/' })
      NProgress.done()
    } else {
      if (store.getters.roles.length === 0) {
        isRelogin.show = true
          store.dispatch('GetInfo').then(() => {
            isRelogin.show = false
            // 从 MCERP getRouters 取后端合成的 RouterVO 树，按 moduleRoot 裁出本插件菜单；
            // 前端只提供 path → component 绑定，展示数据全部以后端为准。
            // GenerateRoutes 内部已 catch 并置空侧边栏，这里再兜一层防呆：
            // 无论如何都必须调用 next()，否则页面会卡在 NProgress。
            store.dispatch('GenerateRoutes').then(() => {
              next({ ...to, replace: true })
            }).catch(() => {
              next({ ...to, replace: true })
            })
          }).catch(err => {
          store.dispatch('LogOut').then(() => {
            Message.error(err)
            next({ path: '/' })
          })
        })
      } else {
        next()
      }
    }
  } else {
    if (isWhiteList(to.path)) {
      next()
    } else {
      next(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
      NProgress.done()
    }
  }
})

router.afterEach(() => {
  NProgress.done()
})

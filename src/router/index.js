import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

/* Layout：wujie 嵌入时主应用 MCERP 提供侧边栏（空 Layout）；直接访问时用完整 Layout（自带侧边栏） */
import RealLayout from '@/layout'
import EmptyLayout from '@/layout/Empty'

// wujie 子应用标记（主应用加载时注入 window.__POWERED_BY_WUJIE__）
export const isWujie = typeof window !== 'undefined' && !!window.__POWERED_BY_WUJIE__
const Layout = isWujie ? EmptyLayout : RealLayout

// 运行时 base：生产 = 契约 pageFullPrefix（/web/plugins/SOYSHTTPOverMC-ERP）；dev = '/'
const ctx = (typeof window !== 'undefined' && window.SOYS_CONTEXT) || {}
const routeBase = process.env.NODE_ENV === 'production'
  ? (ctx.pageFullPrefix || '/web/plugins/SOYSHTTPOverMC-ERP/')
  : '/'

/**
 * 公共路由：所有模式都加载（基础页面 + 首页）。
 * 业务菜单路由不在此列——wujie 模式下用 wujieRoutes 兜底，独立模式下由后端 getRouters 动态下发。
 */
export const constantRoutes = [
  {
    path: '/redirect',
    component: Layout,
    hidden: true,
    children: [
      {
        path: '/redirect/:path(.*)',
        component: () => import('@/views/redirect')
      }
    ]
  },
  {
    path: '/login',
    component: () => import('@/views/login'),
    hidden: true
  },
  {
    path: '/register',
    component: () => import('@/views/register'),
    hidden: true
  },
  {
    path: '/404',
    component: () => import('@/views/error/404'),
    hidden: true
  },
  {
    path: '/401',
    component: () => import('@/views/error/401'),
    hidden: true
  },
  {
    path: '',
    component: Layout,
    redirect: 'index',
    children: [
      {
        path: 'index',
        component: () => import('@/views/index'),
        name: 'Index',
        meta: { title: '首页', icon: 'dashboard', affix: true }
      }
    ]
  },
  {
    // 开发者模板页：本地 mock 数据，开箱即跑（npm run dev 后访问 http://localhost/demo）。
    // 独立模式侧边栏可见；wujie 嵌入时侧边栏由 wujieRoutes 控制，此路由不挂菜单（仅可直达）。
    path: '/demo',
    component: Layout,
    redirect: '/demo/index',
    children: [
      {
        path: 'index',
        component: () => import('@/views/soyshttpovermcerp/demo/index'),
        name: 'ErpDemo',
        meta: { title: '示例页（开发模板）', icon: 'guide' }
      }
    ]
  },
  {
    path: '/lock',
    component: () => import('@/views/lock'),
    hidden: true,
    meta: { title: '锁定屏幕' }
  }
]

/**
 * wujie 模式专用业务路由：主应用未通过 bus 下发路由时的兜底。
 * <p>仅在 isWujie=true 时合并进 router；独立访问时完全不加载，避免与后端动态路由重复。
 * <p>菜单结构严格对齐后端 SoysErpExpansion.menus()。
 */
export const wujieRoutes = isWujie ? [
  {
    path: '/soyshttpovermcerp',
    component: Layout,
    redirect: '/soyshttpovermcerp/user',
    children: [
      { path: 'user', component: () => import('@/views/soyshttpovermcerp/user/index'), name: 'ErpUser', meta: { title: '游戏用户列表' } },
      { path: 'group', component: () => import('@/views/soyshttpovermcerp/group/index'), name: 'ErpGroup', meta: { title: '权限组列表' } },
      { path: 'apikey', component: () => import('@/views/soyshttpovermcerp/apikey/index'), name: 'ErpApiKey', meta: { title: 'APIKEY 管理' } },
      { path: 'lang', component: () => import('@/views/soyshttpovermcerp/lang/index'), name: 'ErpLang', meta: { title: '语言管理' } },
      // 插件配置 dir（config.yml / language.yml / pages.yml / EULA.yml）
      { path: 'config/config', component: () => import('@/views/soyshttpovermcerp/config/config'), name: 'ConfigConfig', meta: { title: '核心配置' } },
      { path: 'config/language', component: () => import('@/views/soyshttpovermcerp/config/language'), name: 'ConfigLanguage', meta: { title: '国际化' } },
      { path: 'config/pages', component: () => import('@/views/soyshttpovermcerp/config/pages'), name: 'ConfigPages', meta: { title: '页面与资源' } },
      { path: 'config/eula', component: () => import('@/views/soyshttpovermcerp/config/eula'), name: 'ConfigEula', meta: { title: '使用协议' } },
      // 网关 dir（gateway/* 8 个文件）
      { path: 'config/gateway/gw-config', component: () => import('@/views/soyshttpovermcerp/config/gateway/gw-config'), name: 'GwConfig', meta: { title: '网关总开关' } },
      { path: 'config/gateway/gw-https', component: () => import('@/views/soyshttpovermcerp/config/gateway/gw-https'), name: 'GwHttps', meta: { title: 'HTTPS 设置' } },
      { path: 'config/gateway/gw-auth', component: () => import('@/views/soyshttpovermcerp/config/gateway/gw-auth'), name: 'GwAuth', meta: { title: '认证鉴权' } },
      { path: 'config/gateway/gw-rate', component: () => import('@/views/soyshttpovermcerp/config/gateway/gw-rate'), name: 'GwRate', meta: { title: '令牌桶限流' } },
      { path: 'config/gateway/gw-access', component: () => import('@/views/soyshttpovermcerp/config/gateway/gw-access'), name: 'GwAccess', meta: { title: '访问限制器' } },
      { path: 'config/gateway/gw-allow', component: () => import('@/views/soyshttpovermcerp/config/gateway/gw-allow'), name: 'GwAllow', meta: { title: 'IP 白名单' } },
      { path: 'config/gateway/gw-tls', component: () => import('@/views/soyshttpovermcerp/config/gateway/gw-tls'), name: 'GwTls', meta: { title: 'TLS 强制' } },
      { path: 'config/gateway/gw-session', component: () => import('@/views/soyshttpovermcerp/config/gateway/gw-session'), name: 'GwSession', meta: { title: '会话令牌' } }
    ]
  }
] : []

// 动态路由（预留）：菜单由后端 getRouters 动态驱动（ERP 模块菜单），此处保持空
export const dynamicRoutes = []

// 防止连续点击多次路由报错
let routerPush = Router.prototype.push
let routerReplace = Router.prototype.replace
// push
Router.prototype.push = function push(location) {
  return routerPush.call(this, location).catch(err => err)
}
// replace
Router.prototype.replace = function push(location) {
  return routerReplace.call(this, location).catch(err => err)
}

export default new Router({
  mode: 'history', // SOYS 1.4.0 已实现 spaFallback，深层 URL 刷新不会 404
  base: routeBase,
  scrollBehavior: () => ({ y: 0 }),
  routes: constantRoutes.concat(wujieRoutes)
})

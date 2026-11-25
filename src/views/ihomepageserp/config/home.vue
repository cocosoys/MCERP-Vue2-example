<template>
  <config-layout title="首页内容" file="home.yml" :help-map="helpMap" :dirty="dirty"
                 :loading="loading" :saving="saving" @reload="reload" @save="save">
    <!-- ready 守卫：Bukkit 不会把新增 key 合并进已存在的 yml，深链节点可能整体缺失 -->
    <div v-if="ready">
      <el-card shadow="never" class="mb" v-for="g in groups" :key="g.key">
        <div slot="header">{{ g.title }}</div>
        <el-form label-width="170px" size="small">
          <el-form-item v-for="f in g.fields" :key="f.k" :label="f.label">
            <el-switch v-if="f.type === 'switch'" :value="model[g.key][f.k]"
                       @input="v => setVal(g.key, f.k, v)" />
            <el-input-number v-else-if="f.type === 'number'" :value="model[g.key][f.k]"
                             :min="0" @input="v => setVal(g.key, f.k, v)" />
            <el-input v-else-if="f.type === 'textarea'" type="textarea" :rows="3"
                      :value="model[g.key][f.k]" @input="v => setVal(g.key, f.k, v)" />
            <el-input v-else :value="model[g.key][f.k]" style="width:420px"
                      @input="v => setVal(g.key, f.k, v)" />
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never" class="mb">
        <div slot="header">公告 (announcements)</div>
        <div v-for="(a, i) in model.announcements" :key="'a' + i" class="row">
          <el-input :value="a" size="small" @input="v => setAnnouncement(i, v)" />
          <el-button type="danger" size="small" icon="el-icon-delete" circle
                     @click="removeAnnouncement(i)" />
        </div>
        <el-button size="small" icon="el-icon-plus" class="mt" @click="addAnnouncement">新增公告</el-button>
      </el-card>

      <el-card shadow="never" class="mb">
        <div slot="header">其他 (rules-link / partners / carousel)</div>
        <el-form label-width="170px" size="small">
          <el-form-item label="规则页面链接">
            <el-input :value="model['rules-link']" style="width:420px"
                      @input="v => setRoot('rules-link', v)" />
          </el-form-item>
        </el-form>
        <el-divider content-position="left">合作伙伴 (partners · JSON 数组)</el-divider>
        <el-input type="textarea" :rows="4" :value="partnersText" @input="onJsonInput('partners', $event)" />
        <div class="hint" :class="{ err: partnersError }">{{ partnersError || '可填写字符串数组或对象数组，例如 [{"name":"伙伴","link":"https://..."}]' }}</div>
        <el-divider content-position="left">轮播图 (theme.carousel · JSON 数组)</el-divider>
        <el-input type="textarea" :rows="4" :value="carouselText" @input="onJsonInput('carousel', $event)" />
        <div class="hint" :class="{ err: carouselError }">{{ carouselError || '留空请填 []，例如 [{"image":"...","title":"..."}]' }}</div>
      </el-card>

      <el-card shadow="never" class="mb">
        <div slot="header">保存后生效方式</div>
        <el-alert type="info" :closable="false" show-icon
                  title="保存仅写入 plugins/ihomepages/home.yml"
                  description="执行 /soyshttp homepage config reload 后刷新首页展示内容（YamlHomeConfigSource.refresh）。" />
      </el-card>
    </div>
    <el-empty v-else description="配置加载中…" />

  </config-layout>
</template>

<script>
import configPage from '@/views/soyshttpovermcerp/mixins/configPage'
import ConfigLayout from '@/views/soyshttpovermcerp/components/ConfigLayout.vue'

/** 数据驱动字段表：与 home.yml 的节 / 键一一对应，新增字段只需在此加一项。 */
const GROUPS = [
  { key: 'page', title: '页面 (page)', fields: [
    { k: 'title', label: '页面标题', type: 'text' },
    { k: 'icon', label: '站点图标 URL', type: 'text' },
    { k: 'background', label: '背景图 URL', type: 'text' }
  ] },
  { key: 'branding', title: '区块落地页品牌 (branding)', fields: [
    { k: 'server-name', label: '服务器名', type: 'text' },
    { k: 'slogan', label: '标语', type: 'text' }
  ] },
  { key: 'chunks', title: '区块墙动画 (chunks)', fields: [
    { k: 'reveal-ms', label: '生长时长(ms)', type: 'number' },
    { k: 'stagger-ms', label: '逐根间隔(ms)', type: 'number' },
    { k: 'show-coordinates', label: '显示坐标', type: 'switch' }
  ] },
  { key: 'server', title: '服务器 (server)', fields: [
    { k: 'ip', label: '服务器地址', type: 'text' },
    { k: 'download', label: '客户端下载链接', type: 'text' },
    { k: 'intro', label: '服务器简介', type: 'textarea' }
  ] },
  { key: 'qq', title: 'QQ 群 (qq)', fields: [
    { k: 'group-number', label: '群号', type: 'text' },
    { k: 'group-link', label: '加群链接', type: 'text' },
    { k: 'group-qrcode', label: '群二维码 URL', type: 'text' }
  ] },
  { key: 'social', title: '社交与赞助 (social)', fields: [
    { k: 'discord', label: 'Discord', type: 'text' },
    { k: 'bilibili', label: '哔哩哔哩', type: 'text' },
    { k: 'weibo', label: '微博', type: 'text' },
    { k: 'donate-link', label: '赞助链接', type: 'text' },
    { k: 'donate-qrcode', label: '收款码 URL', type: 'text' }
  ] },
  { key: 'theme', title: '主题 (theme)', fields: [
    { k: 'primary-color', label: '主色调', type: 'text' },
    { k: 'video-bg', label: '视频背景 URL', type: 'text' },
    { k: 'custom-css', label: '自定义 CSS', type: 'textarea' }
  ] },
  { key: 'seo', title: 'SEO (seo)', fields: [
    { k: 'description', label: '站点描述', type: 'textarea' },
    { k: 'keywords', label: '关键词', type: 'text' }
  ] },
  { key: 'footer', title: '页脚 (footer)', fields: [
    { k: 'copyright', label: '版权信息', type: 'text' },
    { k: 'icp', label: '备案号', type: 'text' }
  ] },
  { key: 'live', title: '实时数据 (live)', fields: [
    { k: 'cache-seconds', label: '缓存秒数', type: 'number' },
    { k: 'show-online-count', label: '显示在线人数', type: 'switch' },
    { k: 'show-status', label: '显示服务器状态', type: 'switch' }
  ] },
  { key: 'ui', title: '展示开关 (ui)', fields: [
    { k: 'show-buttons', label: '显示按钮区', type: 'switch' },
    { k: 'show-text', label: '显示文案区', type: 'switch' },
    { k: 'show-qq', label: '显示 QQ 群', type: 'switch' },
    { k: 'show-download', label: '显示下载入口', type: 'switch' },
    { k: 'show-intro', label: '显示简介', type: 'switch' },
    { k: 'show-gift', label: '显示礼包', type: 'switch' }
  ] }
]

export default {
  name: 'HomepagesHomeEdit',
  mixins: [configPage],
  components: { ConfigLayout },
  data() {
    return {
      ready: false,
      fileId: 'home',
      groups: GROUPS,
      partnersText: '[]',
      carouselText: '[]',
      partnersError: '',
      carouselError: '',
      helpMap: {
        '页面标题': 'home.yml → page.title：浏览器标题与首页大标题。',
        '服务器名': 'home.yml → branding.server-name：区块落地页用原版像素字渲染的服务器名。',
        '标语': 'home.yml → branding.slogan：服务器名下方的标语。',
        '生长时长(ms)': 'home.yml → chunks.reveal-ms：区块柱生长的动画时长。',
        '逐根间隔(ms)': 'home.yml → chunks.stagger-ms：相邻区块柱依次生长的间隔。',
        '显示坐标': 'home.yml → chunks.show-coordinates：区块墙是否显示坐标标注。',
        '服务器地址': 'home.yml → server.ip：展示给玩家的连接地址（host:port）。',
        '服务器简介': 'home.yml → server.intro：首页介绍文案。',
        '主色调': 'home.yml → theme.primary-color：CSS 颜色值，如 #4caf50。',
        '缓存秒数': 'home.yml → live.cache-seconds：实时数据缓存时间，0 关闭。',
        '公告': 'home.yml → announcements：字符串数组，按顺序轮播展示。',
        '合作伙伴': 'home.yml → partners：数组，可为字符串或对象。使用 JSON 编辑避免结构丢失。',
        '轮播图': 'home.yml → theme.carousel：数组，使用 JSON 编辑。',
        '保存后生效方式': '保存只落盘，需 /soyshttp homepage config reload 热重载。'
      }
    }
  },
  watch: {
    model(d) {
      if (d && typeof d === 'object') {
        this.ensureSkeleton(d)
        this.partnersText = JSON.stringify(d.partners || [], null, 2)
        this.carouselText = JSON.stringify((d.theme && d.theme.carousel) || [], null, 2)
        this.partnersError = ''
        this.carouselError = ''
        // ensureSkeleton 原地补齐对象链/容器，同步校准 dirty 基线，避免一加载就误报"未保存"
        this.original = JSON.stringify(d)
        this.ready = true
      }
    }
  },
  methods: {
    /** 只补对象链与容器（数组），不臆造标量值 —— 对应参考文档 §6 白屏修复。 */
    ensureSkeleton(d) {
      const ensureObj = (parent, key) => {
        const v = parent[key]
        if (!v || typeof v !== 'object' || Array.isArray(v)) parent[key] = {}
        return parent[key]
      }
      const ensureArr = (parent, key) => {
        if (!Array.isArray(parent[key])) parent[key] = []
      }
      GROUPS.forEach(g => ensureObj(d, g.key))
      ensureArr(d, 'announcements')
      ensureArr(d, 'partners')
      ensureArr(d.theme, 'carousel')
    },
    setVal(group, key, value) {
      this.$set(this.model[group], key, value)
    },
    setRoot(key, value) {
      this.$set(this.model, key, value)
    },
    setAnnouncement(i, value) {
      this.$set(this.model.announcements, i, value)
    },
    addAnnouncement() {
      this.model.announcements.push('')
    },
    removeAnnouncement(i) {
      this.model.announcements.splice(i, 1)
    },
    /** JSON 文本域：只在可解析时写回 model，避免中间态把数组变成非法字符串。 */
    onJsonInput(which, text) {
      if (which === 'partners') this.partnersText = text
      else this.carouselText = text
      let parsed
      try {
        parsed = JSON.parse(text)
        if (!Array.isArray(parsed)) throw new Error('必须是 JSON 数组')
      } catch (e) {
        const msg = 'JSON 格式错误（未写回，保存前请修正）：' + e.message
        if (which === 'partners') this.partnersError = msg
        else this.carouselError = msg
        return
      }
      if (which === 'partners') {
        this.partnersError = ''
        this.$set(this.model, 'partners', parsed)
      } else {
        this.carouselError = ''
        this.$set(this.model.theme, 'carousel', parsed)
      }
    }
  }
}
</script>

<style scoped>
.mb { margin-bottom: 14px; }
.mt { margin-top: 10px; }
.row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.hint { font-size: 12px; color: #a8abb2; line-height: 1.5; margin-top: 4px; }
.hint.err { color: #f56c6c; }
</style>

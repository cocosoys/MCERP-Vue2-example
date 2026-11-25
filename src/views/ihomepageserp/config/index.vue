<template>
  <config-layout title="核心配置" file="config.yml" :help-map="helpMap" :dirty="dirty"
                 :loading="loading" :saving="saving" @reload="reload" @save="save">
    <!-- ready 守卫：load 异步完成前 model 为空，深链 model.homepage.pages 会 TypeError 白屏 -->
    <div v-if="ready">
      <el-card shadow="never" class="mb">
        <div slot="header">功能开关</div>
        <el-form label-width="170px" size="small">
          <el-form-item label="启用插件">
            <el-switch v-model="model.enabled" />
            <div class="hint">false 时插件在启动阶段跳过注册；运行期改动需重启服务器才生效。</div>
          </el-form-item>
          <el-form-item label="缓存秒数">
            <el-input-number v-model="model['cache-seconds']" :min="0" />
            <div class="hint">0 表示不缓存配置读取结果。</div>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never" class="mb">
        <div slot="header">当前主页 (homepage.current)</div>
        <el-form label-width="170px" size="small">
          <el-form-item label="当前生效的主页">
            <el-select v-model="model.homepage.current" style="width:260px" allow-create filterable>
              <el-option v-for="n in pageNames" :key="n" :label="n" :value="n" />
            </el-select>
            <div class="hint">名称须存在于下方映射中；留空或不存在时服务端自动回退 default。</div>
          </el-form-item>
        </el-form>
        <el-divider content-position="left">主页位置映射 (homepage.pages)</el-divider>
        <el-table :data="pageRows" size="small" border>
          <el-table-column label="主页名称" width="180">
            <template slot-scope="s"><span class="mono">{{ s.row.name }}</span></template>
          </el-table-column>
          <el-table-column label="位置描述（相对路径 / 绝对路径 / URL）">
            <template slot-scope="s">
              <el-input :value="s.row.spec" size="mini" @input="v => setSpec(s.row.name, v)" />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" align="center">
            <template slot-scope="s">
              <el-button type="danger" size="mini" icon="el-icon-delete" circle
                         @click="removePage(s.row.name)" />
            </template>
          </el-table-column>
        </el-table>
        <el-button size="small" icon="el-icon-plus" class="mt" @click="addPage">新增主页映射</el-button>
        <div class="hint mt">相对路径按插件数据目录 plugins/ihomepages/ 解析；绝对路径与 http(s) URL 原样透传。</div>
      </el-card>

      <el-card shadow="never" class="mb">
        <div slot="header">保存后生效方式</div>
        <el-alert type="info" :closable="false" show-icon
                  title="保存仅写入 plugins/ihomepages/config.yml"
                  description="执行 /soyshttp homepage config reload 热重载；enabled 开关、新增/删除主页映射与 dist 静态资源变更需重启服务器才完全生效。" />
      </el-card>
    </div>
    <el-empty v-else description="配置加载中…" />

  </config-layout>
</template>

<script>
import configPage from '@/views/soyshttpovermcerp/mixins/configPage'
import ConfigLayout from '@/views/soyshttpovermcerp/components/ConfigLayout.vue'

export default {
  name: 'HomepagesConfigEdit',
  mixins: [configPage],
  components: { ConfigLayout },
  data() {
    return {
      ready: false,
      fileId: 'config',
      helpMap: {
        '启用插件': 'config.yml → enabled：false 时 onEnable 直接跳过注册。运行期改动需重启。',
        '缓存秒数': 'config.yml → cache-seconds：配置读取结果缓存时间，0 关闭。',
        '当前生效的主页': 'config.yml → homepage.current：必须存在于 homepage.pages，否则回退 default。',
        '主页位置映射': 'config.yml → homepage.pages：name → 位置描述。支持相对路径、绝对路径、http(s) URL。',
        '新增主页映射': '新增一条 name → spec；保存后执行 config reload 写入注册表。',
        '保存后生效方式': '保存只落盘，需 /soyshttp homepage config reload 热重载运行期对象。'
      }
    }
  },
  computed: {
    pageNames() {
      const pages = this.model && this.model.homepage && this.model.homepage.pages
      return pages && typeof pages === 'object' ? Object.keys(pages) : []
    },
    pageRows() {
      const pages = this.model && this.model.homepage && this.model.homepage.pages
      if (!pages || typeof pages !== 'object') return []
      return Object.keys(pages).map(name => ({ name, spec: pages[name] }))
    }
  },
  watch: {
    // mixin 异步 load 完成后整体替换 model：补齐对象链再放行渲染
    model(d) {
      if (d && typeof d === 'object') {
        this.ensureSkeleton(d)
        // ensureSkeleton 原地补齐了对象链，需同步校准 dirty 基线，否则页面一加载就误报"未保存"
        this.original = JSON.stringify(d)
        this.ready = true
      }
    }
  },
  methods: {
    /** 只保证模板深链访问到的对象链存在，不臆造标量值（升级后缺节也能显示并可补录）。 */
    ensureSkeleton(d) {
      const ensure = (parent, key) => {
        const v = parent[key]
        if (!v || typeof v !== 'object' || Array.isArray(v)) parent[key] = {}
        return parent[key]
      }
      ensure(ensure(d, 'homepage'), 'pages')
    },
    setSpec(name, value) {
      this.$set(this.model.homepage.pages, name, value)
    },
    addPage() {
      this.$prompt('请输入主页名称（如 alt / remote）', '新增主页映射', {
        confirmButtonText: '确定', cancelButtonText: '取消',
        inputPattern: /^[A-Za-z0-9_\-]{1,64}$/,
        inputErrorMessage: '仅允许字母、数字、下划线、连字符，长度 1-64'
      }).then(({ value }) => {
        if (Object.prototype.hasOwnProperty.call(this.model.homepage.pages, value)) {
          this.$modal.msgError('该名称已存在')
          return
        }
        this.$set(this.model.homepage.pages, value, 'dist/index.html')
      }).catch(() => {})
    },
    removePage(name) {
      this.$confirm('确定删除主页映射「' + name + '」？', '提示', { type: 'warning' }).then(() => {
        this.$delete(this.model.homepage.pages, name)
        const cur = this.model.homepage.current
        if (cur === name) {
          this.$set(this.model.homepage, 'current', this.pageNames[0] || 'default')
        }
      }).catch(() => {})
    }
  }
}
</script>

<style scoped>
.mb { margin-bottom: 14px; }
.mt { margin-top: 10px; }
.hint { font-size: 12px; color: #a8abb2; line-height: 1.5; }
.mono { font-family: Consolas, Monaco, monospace; }
</style>

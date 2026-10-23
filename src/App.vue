<template>
  <div id="demo-page">
    <!-- 致命错误横幅：全部组件加载失败时置顶显示首个错误 -->
    <div v-if="!status.ok.length && status.failed.length" class="fatal-banner">
      ❌ 所有组件加载失败。首个错误：{{ status.failed[0].err }}
      （完整列表见左下角面板，或按 F12 查看控制台） — 请把这些文字发给协作者
    </div>

    <header class="hero">
      <h1 class="hero-title">SAO-UI <span class="accent">DEMO</span></h1>
      <p class="hero-sub">sao-ui-beta v1.2.21 · Vue 2 · 《刀剑神域》风格 UI 组件库</p>
      <div class="hints">
        <span>⌨ Alt + A 呼出菜单</span>
        <span>🖱 按住鼠标快速下滑 250px 也可呼出菜单</span>
        <span>✋ 卡片 / 看板娘可拖拽</span>
      </div>
    </header>

    <section class="actions">
      <button class="sao-btn" @click="alertVisible = true"><i class="fa fa-commenting-o"></i> Alert 弹窗</button>
      <button class="sao-btn" @click="lsVisible = true"><i class="fa fa-play"></i> Link Start 入场</button>
      <button class="sao-btn" @click="openMenu"><i class="fa fa-bars"></i> 打开菜单</button>
    </section>

    <!-- 拖拽指令演示（v-drag 全方向拖拽） -->
    <div class="drag-card" v-drag="true">
      <i class="fa fa-arrows-alt"></i><br />
      <span>v-drag 拖拽卡片</span>
    </div>

    <!-- HP 血条组件（血量每 2 秒随机变化演示动画） -->
    <hp :position="['10%','36px']" :username="'Yamapink'" :current="hp" :total="1000" :level="10"></hp>

    <!-- Alert 弹窗 -->
    <sao-alert :visible.sync="alertVisible" title="Welcome" :icon="true" @ok="onAlertOk">
      Hello! Welcome to the SAO world<br />欢迎来到刀剑神域的世界～
    </sao-alert>

    <!-- Link Start 3D 入场动画（需用户点击触发音频） -->
    <link-start :visible.sync="lsVisible"></link-start>

    <!-- 菜单联动组：pop-up-menu + menu-bar + left-info + child-bar -->
    <pop-up-menu :slide-down="true" :key-code="65" ref="menu">
      <menu-bar :icon-arr="menuArr"></menu-bar>
      <left-info :username="'Yamapink'" :des="'Welcome to SAO world'">
        <i class="fa fa-user-circle" style="display:block;text-align:center;font-size:68px;color:rgb(243,175,18);padding-top:28px;"></i>
      </left-info>
      <child-bar>
        <ul id="userInfo">
          <li @click="menuClose"><i class="fa fa-arrow-circle-up"></i><span>登录</span></li>
          <li @click="menuClose"><i class="fa fa-arrow-circle-down"></i><span>退出</span></li>
          <li @click="menuClose"><i class="fa fa-info-circle"></i><span>个人信息</span></li>
        </ul>
        <ul id="friendsLink">
          <li><i class="fa fa-link"></i><span>友情链接</span></li>
        </ul>
        <ul id="share">
          <li><i class="fa fa-coffee"></i><span>文章分享</span></li>
          <li><i class="fa fa-gift"></i><span>DEMO 分享</span></li>
        </ul>
        <ul id="search">
          <li><i class="fa fa-search"></i><span>搜索文章</span></li>
        </ul>
      </child-bar>
    </pop-up-menu>

    <!-- Live2D 看板娘（模型原托管域名已失效，仅展示外壳与对话气泡；若引擎在 vite 下加载失败则自动隐藏） -->
    <live2d v-if="l2dOk" v-dragX="true" :textures-id="1" :hitokoto="false" :json="'/waifu-tips.json'" :edge-side="75"></live2d>

    <footer class="foot">
      <p>GitHub：<a href="https://github.com/Cad-noob/SAO-UI" target="_blank">Cad-noob/SAO-UI</a> · npm：sao-ui-beta · 演示工程由 Vite + Vue 2 搭建</p>
      <p class="dim">{{ l2dOk ? 'Live2D 组件已加载（模型需自建服务器，控制台模型报错属预期）' : 'Live2D 组件加载失败已自动跳过，详见下方自诊断面板' }}</p>
    </footer>

    <!-- 自诊断面板：显示组件加载结果与运行期错误（调试用） -->
    <div class="diag">
      <div v-if="status.ok.length">✅ 已加载：{{ status.ok.join('、') }}</div>
      <div v-if="status.failed.length" class="diag-bad">
        ❌ 加载失败：
        <span v-for="f in status.failed" :key="f.name">{{ f.name }} → {{ f.err }}; </span>
      </div>
      <div v-if="errors.length" class="diag-bad">
        ⚠️ 运行期错误：
        <span v-for="(e, i) in errors.slice(0, 5)" :key="i">{{ e }}; </span>
      </div>
      <div v-if="!status.ok.length && !status.failed.length && !errors.length">正在加载组件…</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'demo-app',
  data() {
    return {
      alertVisible: false,
      lsVisible: false,
      hp: 500,
      menuArr: [
        { name: 'userInfo', iClass: 'fa fa-user', canActive: true },
        { name: 'friendsLink', iClass: 'fa fa-users', canActive: true },
        { name: 'share', iClass: 'fa fa-coffee', canActive: true },
        { name: 'search', iClass: 'fa fa-search', canActive: true },
        { name: 'systemMsg', iClass: 'fa fa-cog', canActive: false }
      ],
      timer: null,
      l2dOk: window.__SAO_L2D_OK__ !== false,
      status: window.__SAO_UI_STATUS__ || { ok: [], failed: [] },
      errors: window.__SAO_UI_ERRORS__ || []
    }
  },
  mounted() {
    // 模拟血量变化，观察 HP 组件的数字滚动与变色动画
    this.timer = setInterval(() => {
      this.hp = Math.max(1, Math.min(1000, this.hp + Math.round((Math.random() - 0.5) * 300)))
    }, 2000)
  },
  beforeDestroy() {
    clearInterval(this.timer)
  },
  methods: {
    openMenu() {
      // 通过 ref 调用 pop-up-menu 的 open(x, y) 方法，在屏幕中央呼出菜单
      this.$refs.menu.open(window.innerWidth / 2, window.innerHeight / 2)
    },
    menuClose() {
      this.$refs.menu.close()
    },
    onAlertOk() {
      console.log('[demo] alert ok')
    }
  }
}
</script>

<style>
html,
body {
  margin: 0;
  padding: 0;
  min-height: 100%;
}

body {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  background: radial-gradient(ellipse at 50% 0%, #1c2d4d 0%, #0c1526 55%, #060a12 100%);
  color: #dfe6f2;
  min-height: 100vh;
  overflow-x: hidden;
}

#demo-page {
  position: relative;
  min-height: 100vh;
  padding-bottom: 90px;
}

/* 标题区 */
.hero {
  text-align: center;
  padding: 56px 20px 10px;
}

.hero-title {
  font-size: 48px;
  letter-spacing: 6px;
  margin: 0;
  color: #e8eefb;
  text-shadow: 0 0 18px rgba(33, 171, 220, 0.45);
}

.hero-title .accent {
  color: rgb(243, 175, 18);
}

.hero-sub {
  margin: 10px 0 20px;
  color: #8fa3c4;
  font-size: 14px;
  letter-spacing: 2px;
}

.hints span {
  display: inline-block;
  margin: 4px 8px;
  padding: 4px 12px;
  border: 1px solid rgba(120, 150, 200, 0.35);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  font-size: 12px;
  color: #b9c8e4;
}

/* 操作按钮 */
.actions {
  text-align: center;
  margin: 26px 0 10px;
}

.actions .sao-btn {
  margin: 0 10px;
  padding: 10px 22px;
  font-size: 15px;
  letter-spacing: 1px;
  color: #e8eefb;
  background: linear-gradient(180deg, #2c4a78, #1b3053);
  border: 1px solid rgba(120, 170, 230, 0.5);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.actions .sao-btn:hover {
  border-color: rgb(243, 175, 18);
  box-shadow: 0 0 14px rgba(243, 175, 18, 0.35);
  transform: translateY(-2px);
}

.actions .sao-btn i {
  margin-right: 6px;
  color: rgb(243, 175, 18);
}

/* 拖拽卡片 */
.drag-card {
  position: fixed;
  left: 62%;
  top: 58%;
  width: 150px;
  height: 92px;
  border: 1px dashed rgba(120, 170, 230, 0.55);
  border-radius: 8px;
  background: rgba(30, 50, 85, 0.55);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #b9c8e4;
  cursor: grab;
  z-index: 5;
  user-select: none;
}

.drag-card i {
  font-size: 20px;
  color: rgb(243, 175, 18);
  margin-bottom: 6px;
}

/* 页脚 */
.foot {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 16px;
  text-align: center;
  font-size: 12px;
  color: #6f83a8;
}

.foot a {
  color: #8fc3ff;
}

.foot .dim {
  color: #55688c;
}

/* 自诊断面板 */
.diag {
  position: fixed;
  left: 10px;
  bottom: 10px;
  z-index: 999;
  max-width: 420px;
  font-size: 11px;
  line-height: 1.6;
  color: #9daccc;
  background: rgba(10, 18, 34, 0.85);
  border: 1px solid rgba(120, 170, 230, 0.3);
  border-radius: 6px;
  padding: 6px 10px;
  word-break: break-all;
}

.diag-bad {
  color: #ff9c9c;
}

/* 致命错误横幅 */
.fatal-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: rgba(140, 20, 20, 0.92);
  color: #fff;
  padding: 10px 16px;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-all;
}
</style>
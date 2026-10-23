<template>
  <!-- menu-app 内容区固定 760×600、从窗口 (2,2) 开始：四周 2px 透明边带留给金框
       （.menu-float::before, inset -2px），框线与内容零重叠、不挡任何 UI。
       floatMode（开关开）时整面板走系统级拖动（-webkit-app-region: drag，参考
       BongoCat 边框拖拽：系统 move loop 拖窗零延迟跟手；交互元素在下方
       no-drag 保持可点；JS moveTo 拖动逻辑保留，系统拖动未生效时自动兜底） -->
  <div class="menu-app" :class="{ 'menu-float': floatMode }" :style="floatMode ? { WebkitAppRegion: 'drag' } : null">
    <!-- 全屏氛围背景 -->
    <div class="bg-grid"></div>

    <!-- 主界面：仅非桌宠模式（开发调试）显示 -->
    <div class="center" v-if="!isPet">
      <h1 class="menu-title">SAO <span>MENU</span></h1>
      <p class="menu-sub">刀剑神域 风格悬浮菜单 · 独立桌面程序</p>

      <div class="hints">
        <span>⌨ Alt + A —— 呼出 / 关闭菜单</span>
        <span>🖱 按住鼠标快速下滑 250px —— 呼出菜单</span>
        <span>Esc 或点击空白处 —— 关闭</span>
        <span>滚轮 —— 菜单图标循环切换</span>
      </div>

      <button class="menu-btn" @click="openMenu"><i class="fa fa-bars"></i> 打开菜单</button>
    </div>

    <!-- SAO 菜单联动组（桌宠模式下 key-code 置 0，Alt+A 交给主进程全局热键） -->
    <pop-up-menu :slide-down="true" :key-code="keyCode" ref="menu">
      <menu-bar :icon-arr="menuArr"></menu-bar>
      <!-- 左侧个人信息卡：顶部为长方形角色画像框（上传图铺满；未上传=深蓝底+金色大图标），下方为 9 字段两列等距网格 -->
      <div class="left-card">
        <div class="lc-portrait">
          <img v-if="avatar" :src="avatar" alt="角色画像" />
          <div v-else class="lc-portrait-empty"><i class="fa fa-user-circle"></i></div>
        </div>
        <div class="lc-grid">
          <div class="lc-cell"><span class="lc-k">角色名</span><span class="lc-v" :class="{ muted: !profile.name }">{{ profile.name || '未填写' }}</span></div>
          <div class="lc-cell"><span class="lc-k">大区</span><span class="lc-v" :class="{ muted: !profile.zone }">{{ profile.zone || '未填写' }}</span></div>
          <div class="lc-cell"><span class="lc-k">服务器</span><span class="lc-v" :class="{ muted: !profile.world }">{{ profile.world || '未填写' }}</span></div>
          <div class="lc-cell"><span class="lc-k">职业</span><span class="lc-v" :class="{ muted: !profile.job }">{{ profile.job || '未填写' }}</span></div>
          <div class="lc-cell"><span class="lc-k">等级</span><span class="lc-v" :class="{ muted: !profile.level }">{{ profile.level ? 'Lv.' + profile.level : '未填写' }}</span></div>
          <div class="lc-cell"><span class="lc-k">称号</span><span class="lc-v" :class="{ muted: !profile.title }">{{ profile.title || '未填写' }}</span></div>
          <div class="lc-cell"><span class="lc-k">信仰</span><span class="lc-v" :class="{ muted: !profile.faith }">{{ profile.faith || '未填写' }}</span></div>
          <div class="lc-cell"><span class="lc-k">日期</span><span class="lc-v" :class="{ muted: !profile.date }">{{ profile.date || '未填写' }}</span></div>
          <div class="lc-cell lc-wide"><span class="lc-k">部队</span><span class="lc-v" :class="{ muted: !profile.fc }">{{ profile.fc || '未填写' }}</span></div>
        </div>
      </div>
      <child-bar>
        <ul id="userInfo">
          <li @click="menuClose"><i class="fa fa-arrow-circle-up"></i><span>登录</span></li>
          <li @click="menuClose"><i class="fa fa-arrow-circle-down"></i><span>退出</span></li>
          <li @click="openProfile"><i class="fa fa-info-circle"></i><span>个人信息</span></li>
        </ul>
        <ul id="quests">
          <li @click.stop="toggleQuestSub('accept')">
            <i class="fa fa-plus-circle"></i><span>接取任务</span>
          </li>
          <!-- 接取任务下级框：可接取列表暂为空态；内容统一在任务酒馆登记。
               slot 放在 ul 下而不是 li 内：皮肤有 `.cb_position > ul > li:hover span`
               规则（hover 时把 li 内 span 变白字），slot 若挂在 li 内，鼠标悬停上级行时
               子框文字会变白、白底白字看不见（用户实测反馈「内容被隐藏」） -->
          <div v-if="questSub === 'accept'" class="quest-slot slot-a" @click.stop>
            <div class="qs-empty">暂无可接取任务</div>
            <div class="qs-item qs-go" @click="openTavern('personal')"><i class="fa fa-book"></i><span>前往任务酒馆</span></div>
          </div>
          <li @click.stop="toggleQuestSub('personal')">
            <i class="fa fa-list-ul"></i><span>个人任务</span>
          </li>
          <div v-if="questSub === 'personal'" class="quest-slot slot-b" @click.stop>
            <template v-if="pendingQuests('personal').length">
              <div v-for="(q, i) in pendingQuests('personal')" :key="q.id" class="qs-item" @click="openTavern('personal')" :title="q.text">
                <span class="qs-no">{{ i + 1 }}、</span><span class="qs-text">{{ q.text }}</span>
              </div>
            </template>
            <div v-else class="qs-empty">个人任务暂无内容</div>
            <div class="qs-item qs-go" @click="openTavern('personal')"><i class="fa fa-book"></i><span>前往任务酒馆</span></div>
          </div>
          <li @click.stop="toggleQuestSub('other')">
            <i class="fa fa-ellipsis-h"></i><span>其他任务</span>
          </li>
          <div v-if="questSub === 'other'" class="quest-slot slot-c" @click.stop>
            <template v-if="pendingQuests('other').length">
              <div v-for="(q, i) in pendingQuests('other')" :key="q.id" class="qs-item" @click="openTavern('other')" :title="q.text">
                <span class="qs-no">{{ i + 1 }}、</span><span class="qs-text">{{ q.text }}</span>
              </div>
            </template>
            <div v-else class="qs-empty">其他任务暂无内容</div>
            <div class="qs-item qs-go" @click="openTavern('other')"><i class="fa fa-book"></i><span>前往任务酒馆</span></div>
          </div>
        </ul>
        <ul id="shop">
          <li @click="openShopTip('道具商店')"><i class="fa fa-shopping-cart"></i><span>道具商店</span></li>
          <li @click="openShopTip('交易行')"><i class="fa fa-exchange"></i><span>交易行</span></li>
        </ul>
        <ul id="friendsLink">
          <li @click="menuClose"><i class="fa fa-users"></i><span>好友列表</span></li>
          <li @click="menuClose"><i class="fa fa-shield"></i><span>公会成员</span></li>
        </ul>
        <ul id="systemMsg">
          <li @click="toggleSnd"><i class="fa" :class="sndMuted ? 'fa-volume-off' : 'fa-volume-up'"></i><span>声音:{{ sndMuted ? '关' : '开' }}</span></li>
          <li @click="appQuit"><i class="fa fa-power-off"></i><span>退出应用</span></li>
          <!-- 游戏模式 → 齿轮右键「控制面板」；「游戏中显示猫」开关已删除（游戏模式=全屏游戏时隐藏齿轮） -->
        </ul>
      </child-bar>
    </pop-up-menu>

    <!-- FF14 个人信息编辑器（用户 → 个人信息；数据存本机 settings.json，主进程广播同步左信息） -->
    <div v-if="showEditor" class="profile-mask" @click.self="cancelProfile">
      <div class="profile-editor" @click.stop>
        <h2 class="pe-title">个人信息 · FF14 冒险者手册</h2>

        <label class="pe-full pe-avatar-row">角色画像
          <span class="pe-avatar-box">
            <img v-if="avatar" :src="avatar" alt="角色图标" />
            <i v-else class="fa fa-user-circle"></i>
          </span>
          <span class="pe-avatar-btns">
            <button class="pe-btn pe-mini" type="button" @click="$refs.avatarFile.click()"><i class="fa fa-upload"></i> 上传图片</button>
            <button v-if="avatar" class="pe-btn pe-mini pe-cancel" type="button" @click="clearAvatar">移除</button>
          </span>
          <span class="pe-sub">自动居中裁剪并压缩到 ≤128px · 仅保存在本机</span>
          <input ref="avatarFile" type="file" accept="image/png,image/jpeg,image/webp" style="display:none" @change="onAvatarFile" />
        </label>

        <div class="pe-grid">
          <label>角色名
            <input v-model="draft.name" maxlength="40" placeholder="如：Kirito" />
          </label>
          <label>大区
            <span class="pe-dd">
              <input v-model="draft.zone" @focus="selOpen = 'zone'" @blur="selDown" @wheel="onInputWheel" maxlength="20" placeholder="陆行鸟 / 莫古力 …" />
              <span v-if="selOpen === 'zone'" class="pe-dd-list" @wheel="onListWheel">
                <button v-for="z in filterList(zones, draft.zone)" :key="z" type="button" @mousedown.prevent="pick('zone', z)">{{ z }}</button>
              </span>
            </span>
          </label>
          <label>服务器
            <span class="pe-dd">
              <input v-model="draft.world" @focus="selOpen = 'world'" @blur="selDown" @wheel="onInputWheel" maxlength="20" placeholder="如：红玉海" />
              <span v-if="selOpen === 'world'" class="pe-dd-list" @wheel="onListWheel">
                <button v-for="w in filterList(worlds, draft.world)" :key="w" type="button" @mousedown.prevent="pick('world', w)">{{ w }}</button>
              </span>
            </span>
          </label>
          <label>职业
            <span class="pe-dd">
              <input v-model="draft.job" @focus="selOpen = 'job'" @blur="selDown" @wheel="onInputWheel" maxlength="20" placeholder="如：赤魔法师" />
              <span v-if="selOpen === 'job'" class="pe-dd-list" @wheel="onListWheel">
                <button v-for="j in filterList(jobs, draft.job)" :key="j" type="button" @mousedown.prevent="pick('job', j)">{{ j }}</button>
              </span>
            </span>
          </label>
          <label>等级
            <input type="number" min="0" max="999" v-model.number="draft.level" />
          </label>
          <label>称号
            <input v-model="draft.title" maxlength="40" placeholder="如：被选中的冒险者" />
          </label>
          <label>信仰
            <span class="pe-dd">
              <input v-model="draft.faith" @focus="selOpen = 'faith'" @blur="selDown" @wheel="onInputWheel" maxlength="20" placeholder="十二神，如：哈罗妮" />
              <span v-if="selOpen === 'faith'" class="pe-dd-list" @wheel="onListWheel">
                <button v-for="f in filterList(faiths, draft.faith)" :key="f" type="button" @mousedown.prevent="pick('faith', f)">{{ f }}</button>
              </span>
            </span>
          </label>
          <label>日期
            <input type="date" v-model="draft.date" />
          </label>
          <label class="pe-full">部队
            <input v-model="draft.fc" maxlength="40" placeholder="如：虹之队" />
          </label>
        </div>
        <div class="pe-foot">
          <button class="pe-btn pe-save" @click="saveProfile"><i class="fa fa-check"></i> 保 存</button>
          <button class="pe-btn pe-cancel" @click="cancelProfile">取 消</button>
          <span class="pe-hint">内容仅保存在本机 · Esc 关闭</span>
        </div>
      </div>
    </div>

    <!-- 「道具商店」暂未开放提示（九轮起：SAO Utils 2 推出确认框同款效果；十轮改版：
         直接使用 SAO Utils 2 原版素材 public/sao/dialog.png 面板背景 + ok/cancel 圆钮图标，
         观感与原框一致。素材复制自本机 E:\SAO Utils 2\Packages\com.gpbeta.theme.sao\Images） -->
    <div v-if="showShopTip" class="sao-tip-mask" @click.self="closeShopTip">
      <div class="sao-tip">
        <img class="sao-tip-bg" src="/sao/dialog.png" alt="" />
        <div class="sao-tip-title">提示</div>
        <div class="sao-tip-body">「{{ shopTipName }}」功能暂未开放<br />敬请期待</div>
        <div class="sao-tip-btns">
          <button class="sao-tip-btn sao-tip-btn-ok" @click="closeShopTip" title="确定">
            <img class="sao-tip-ic" src="/sao/ok.png" alt="" />
            <img class="sao-tip-ic sao-tip-ic-hover" src="/sao/ok-hovered.png" alt="" />
          </button>
          <button class="sao-tip-btn sao-tip-btn-cancel" @click="closeShopTip" title="取消">
            <img class="sao-tip-ic" src="/sao/cancel.png" alt="" />
            <img class="sao-tip-ic sao-tip-ic-hover" src="/sao/cancel-hovered.png" alt="" />
          </button>
        </div>
      </div>
    </div>

    <!-- 自诊断面板（调试用，桌宠模式隐藏） -->
    <div class="diag" v-if="!isPet">
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
  name: 'menu-app',
  data() {
    return {
      keyCode: window.__SAO_PET_MODE__ ? 0 : 65,
      isPet: window.__SAO_PET_MODE__ === true,
      menuArr: [
        { name: 'userInfo', iClass: 'fa fa-user', canActive: true },
        { name: 'quests', iClass: 'fa fa-bullseye', canActive: true },
        { name: 'shop', iClass: 'fa fa-shopping-cart', canActive: true },
        { name: 'friendsLink', iClass: 'fa fa-users', canActive: true },
        { name: 'systemMsg', iClass: 'fa fa-cog', canActive: true }
      ],
      status: window.__SAO_UI_STATUS__ || { ok: [], failed: [] },
      errors: window.__SAO_UI_ERRORS__ || [],
      sndMuted: false,
      // ---- FF14 个人信息（用户 → 个人信息编辑器；主进程 settings.json 持久化 + 广播同步）----
      showEditor: false,
      avatar: '',
      // ---- 「道具商店/交易行」暂未开放提示框（SAO Utils 2 推出确认框同款效果）----
      showShopTip: false,
      shopTipName: '',
      profile: { name: '', zone: '', world: '', job: '', level: 0, title: '', faith: '', date: '', fc: '' },
      draft: { name: '', zone: '', world: '', job: '', level: 0, title: '', faith: '', date: '', fc: '' },
      selOpen: '', // 当前展开的下拉候选列表（zone/world/job/faith，空 = 收起）
      zones: ['陆行鸟', '莫古力', '猫小胖', '豆豆柴'],
      worlds: [
        '红玉海', '神意之地', '拉诺西亚', '萌芽池', '潮风亭', '白银乡', '旅人栈桥', '拂晓之间',
        '静谧花园', '梦羽宝境', '天穹街', '月牙湾', '柔风海湾', '龙巢神殿', '白金幻象', '神拳痕',
        '幻影群岛', '宇宙和音', '琥珀原', '黄金谷', '摩杜纳', '妖精领', '太阳海岸', '雪松林', '伊修加德'
      ],
      // FF14 战斗职业（基础+特职）与生产/采集职业（官方译名；均可自由输入任意值）
      jobs: [
        '剑术师', '斧术师', '格斗家', '枪术师', '弓箭手', '幻术师', '咒术师', '秘术师', '双剑师',
        '骑士', '战士', '武僧', '龙骑士', '吟游诗人', '白魔法师', '黑魔法师', '召唤师', '学者', '忍者',
        '机工士', '暗黑骑士', '占星术士', '武士', '赤魔法师', '绝枪战士', '舞者', '钐镰客', '贤者',
        '蝰蛇剑士', '绘图师',
        '刻木匠', '锻铁匠', '铸甲匠', '雕金匠', '制革匠', '裁衣匠', '炼金术士', '烹调师', '采矿工', '园艺工', '捕鱼人'
      ],
      // FF14 十二神（信仰/守护神；可自由输入任意神名）
      faiths: [
        '哈罗妮', '梅恩菲尼', '娜尔扎尔', '欧塞罗斯', '阿尔吉克', '莉姆莱恩',
        '诺菲卡', '阿泽玛', '瑞特拉', '拜克·拉各', '塔利亚克', '尼美雅', '无信仰'
      ],
      // ---- 任务（任务酒馆维护；任务栏「个人任务/其他任务」下级框展示未完成条目；主进程持久化 + 广播）----
      quests: { personal: [], other: [] },
      questSub: '', // 任务栏当前展开的下级框（'' 收起 / accept / personal / other）
      // ---- 浮窗模式（设置开关「菜单浮窗」，主进程 settings 持有）----
      dragD: { on: false, offX: 0, offY: 0 },
      // 开：金框 + 空白处可拖（拖动后位置落盘）；关：锁定当前位置（无框、不可拖）。
      // 由 getMenuFloat + onMenuFloat 广播驱动（不再用窗口尺寸判定——菜单窗口恒为 760×600 面板）
      floatMode: false
    }
  },
  computed: {},
  mounted() {
    // Esc 关闭菜单
    document.addEventListener('keydown', this.onKeyDown)
    // 浮窗拖动监听（capture 阶段拿 mousedown，避免皮肤组件内部 stopPropagation 拦截）
    window.addEventListener('mousedown', this.onMenuDragDown, true)
    window.addEventListener('mousemove', this.onMenuDragMove)
    window.addEventListener('mouseup', this.onMenuDragUp)
    // 浮窗态标记：开关状态（getMenuFloat 初始 + 控制面板切开关时广播同步）
    if (window.petAPI && window.petAPI.getMenuFloat) {
      const cur = window.petAPI.getMenuFloat()
      this.floatMode = !!cur
    }
    if (window.petAPI && window.petAPI.onMenuFloat) {
      window.petAPI.onMenuFloat(v => {
        this.floatMode = !!v
      })
    }
    // 声音开关：与挂件页共用主进程状态（window.__sndMuted 由 menu-main 的全局钩子使用）
    if (window.petAPI && window.petAPI.getMuted) this.sndMuted = window.petAPI.getMuted()
    window.__sndMuted = this.sndMuted
    if (window.petAPI && window.petAPI.onMute) {
      window.petAPI.onMute(v => {
        this.sndMuted = v
        window.__sndMuted = v
      })
    }
    // 个人信息（FF14 角色卡）：主进程持有；编辑器保存后广播回来，左信息实时更新
    if (window.petAPI && window.petAPI.getProfile) {
      this.profile = Object.assign({}, this.profile, window.petAPI.getProfile() || {})
    }
    if (window.petAPI && window.petAPI.onProfile) {
      window.petAPI.onProfile(p => {
        this.profile = Object.assign({}, this.profile, p || {})
      })
    }
    // 角色图标（base64 dataURL）：编辑器上传/移除后广播回来，左信息与编辑器预览实时更新
    if (window.petAPI && window.petAPI.getAvatar) {
      this.avatar = window.petAPI.getAvatar() || ''
    }
    if (window.petAPI && window.petAPI.onAvatar) {
      window.petAPI.onAvatar(v => {
        this.avatar = v || ''
      })
    }
    // 任务（任务酒馆）：主进程持有；酒馆增删改后广播回来，任务栏下级框实时更新
    if (window.petAPI && window.petAPI.getQuests) {
      this.quests = window.petAPI.getQuests() || { personal: [], other: [] }
    }
    if (window.petAPI && window.petAPI.onQuests) {
      window.petAPI.onQuests(q => {
        this.quests = q || { personal: [], other: [] }
      })
    }
    // 游戏模式：已移至齿轮右键「控制面板」窗口（ConfigApp.vue），
    // 主进程广播仍会推送到全部分页（含本页），无需在此订阅。
    // 弹出层关闭时自动隐藏全屏透明窗口（避免空窗口挡住桌面 = 看着像卡死）。
    // 注意：不能靠计算属性 watch —— 首次求值时 $refs.menu 尚未填充，
    // 计算属性会以"无依赖"缓存 false，之后再也不会重新求值（Vue 2 经典坑）。
    // 正确做法：挂载后直接 $watch 子组件响应式数据 visible。
    this.$nextTick(() => {
      const m = this.$refs.menu
      if (m && typeof m.$watch === 'function') {
        this._petUnwatchMenu = m.$watch('visible', v => {
          console.log('[sao-menu] visible -> ' + v)
          if (!v && window.petHideFull) window.petHideFull()
        })
      }
    })
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('mousedown', this.onMenuDragDown, true)
    window.removeEventListener('mousemove', this.onMenuDragMove)
    window.removeEventListener('mouseup', this.onMenuDragUp)
    if (this._petUnwatchMenu) {
      this._petUnwatchMenu()
      this._petUnwatchMenu = null
    }
  },
  methods: {
    // ---- 浮窗拖动：仅「菜单浮窗」开关开启（floatMode）且按下点不在交互元素上 ----
    isMenuInteractive(el) {
      if (!el || !el.closest) return false
      return !!el.closest(
        'li, input, button, textarea, select, .quest-slot, .profile-mask, .profile-editor, .pe-dd, .lc-portrait, .menu-btn, .hints, .qs-item, .qs-empty'
      )
    },
    onMenuDragDown(e) {
      if (!this.floatMode) return
      if (e.button !== 0) return
      if (this.isMenuInteractive(e.target)) return
      this.dragD.on = true
      this.dragD.offX = e.screenX - window.screenX
      this.dragD.offY = e.screenY - window.screenY
      e.preventDefault() // 阻止拖动时的文本选择/默认行为
    },
    onMenuDragMove(e) {
      if (!this.dragD.on) return
      window.moveTo(e.screenX - this.dragD.offX, e.screenY - this.dragD.offY)
    },
    onMenuDragUp() {
      this.dragD.on = false
    },
    onKeyDown(e) {
      if (e.key === 'Escape' || e.keyCode === 27) {
        // 编辑器打开时 Esc 先关编辑器；任务栏下级框展开时先收起；最后关菜单
        if (this.showEditor) {
          this.cancelProfile()
          return
        }
        if (this.questSub) {
          this.questSub = ''
          return
        }
        if (this.$refs.menu) {
          this.$refs.menu.close()
          if (window.petHideFull) window.petHideFull()
        }
      }
    },
    // ---- FF14 个人信息编辑器 ----
    openProfile() {
      this.draft = Object.assign({}, this.profile)
      this.showEditor = true
    },
    saveProfile() {
      if (window.petAPI && window.petAPI.setProfile) window.petAPI.setProfile(this.draft)
      this.profile = Object.assign({}, this.profile, this.draft)
      this.showEditor = false
    },
    cancelProfile() {
      this.showEditor = false
    },
    // ---- 候选下拉（点输入框不滚页面；列表超长在列表内滚动） ----
    pick(field, value) {
      this.draft[field] = value
      this.selOpen = ''
    },
    selDown() {
      // 等一点时间，防止点选项时先触发 blur 收起
      setTimeout(() => {
        this.selOpen = ''
      }, 150)
    },
    filterList(arr, value) {
      const q = (value || '').trim().toLowerCase()
      return q ? arr.filter(x => x.toLowerCase().indexOf(q) >= 0).slice(0, 60) : arr
    },
    /* 滚轮落在候选输入框上时，把滚动交给下方展开的列表（滚轮双向可用，页面不滚动） */
    onInputWheel(e) {
      const list = this.$el.querySelector('.pe-dd-list')
      if (!list || list.scrollHeight <= list.clientHeight) return
      e.preventDefault()
      list.scrollTop += e.deltaY
    },
    /* 滚轮直接落在候选列表上：手动推进 scrollTop（本机环境原生滚动失效，统一走 JS，
       上下双向都可用且不会带动页面） */
    onListWheel(e) {
      const list = e.currentTarget
      if (!list || list.scrollHeight <= list.clientHeight) return
      e.preventDefault()
      list.scrollTop += e.deltaY
    },
    // ---- 任务栏（接取任务/个人任务/其他任务 → 对应条目右侧下级框；点条目进任务酒馆） ----
    toggleQuestSub(k) {
      this.questSub = this.questSub === k ? '' : k
    },
    // 下级框只列未完成（与酒馆「默认仅未完成」一致；完成即从栏上消失）
    pendingQuests(group) {
      return (this.quests[group] || []).filter(q => !q.done)
    },
    openTavern(group) {
      // 打开独立任务酒馆窗口（可选归属分组：personal/other 直达对应分类）
      if (window.petAPI && window.petAPI.openTavern) window.petAPI.openTavern(group)
    },
    // ---- 角色图标上传（canvas 居中裁剪 → JPEG dataURL 交主进程；主进程写盘高清原尺寸） ----
    onAvatarFile(e) {
      const file = e.target.files && e.target.files[0]
      e.target.value = '' // 允许重选同一文件
      if (!file || !window.petAPI || !window.petAPI.setAvatar) return
      const reader = new FileReader()
      reader.onload = () => {
        const img = new Image()
        img.onload = () => {
          try {
            // 八轮（2026-10-22）：输出 128px PNG → 2048px JPEG q0.92（原 128px 在左卡
            // 216×288 cover 放大后明显模糊）；源边 < 2048 时保持原尺寸不放大。
            // JPEG 对照片类足够（左卡/预览均不透明），体积远小于 PNG、清晰度肉眼无损。
            const s = Math.min(img.width, img.height) // 居中裁剪源边长
            const S = Math.min(2048, s) // 输出边长上限 2048
            const c = document.createElement('canvas')
            c.width = S
            c.height = S
            const ctx = c.getContext('2d')
            ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, S, S)
            window.petAPI.setAvatar(c.toDataURL('image/jpeg', 0.92))
          } catch (err) {
            console.log('[sao-menu] avatar compress ERR ' + err)
          }
        }
        img.onerror = () => {
          console.log('[sao-menu] avatar load ERR')
        }
        img.src = reader.result
      }
      reader.readAsDataURL(file)
    },
    clearAvatar() {
      if (window.petAPI && window.petAPI.setAvatar) window.petAPI.setAvatar('')
    },
    openMenu() {
      console.log('[sao-menu] openMenu called')
      if (this.$refs.menu) {
        this.$refs.menu.open(window.innerWidth / 2, window.innerHeight / 2)
      } else {
        window.__SAO_UI_ERRORS__.push('菜单组件尚未加载（pop-up-menu 加载失败）')
      }
    },
    menuClose() {
      if (this.$refs.menu) {
        this.$refs.menu.close()
        if (window.petHideFull) window.petHideFull()
      }
    },
    // ---- 「道具商店/交易行」暂未开放提示（九轮起：弹 SAO 风格提示框，菜单保持打开；
    //      十三轮：交易行复用同一弹窗，正文按点击项动态显示）----
    openShopTip(name) {
      this.shopTipName = name
      this.showShopTip = true
    },
    closeShopTip() {
      this.showShopTip = false
    },
    toggleSnd() {
      const v = !this.sndMuted
      if (window.petAPI && window.petAPI.setMuted) window.petAPI.setMuted(v)
      else this.sndMuted = v
    },
    // toggleGame / toggleShowCat 已移除：游戏模式迁移到「控制面板」（ConfigApp.vue），
    // 「游戏中显示猫」开关与 Alt+C 热键已按用户要求整体删除（游戏模式=全屏游戏时隐藏齿轮）。
    appQuit() {
      if (window.petAPI && window.petAPI.quit) window.petAPI.quit()
    }
  }
}
</script>

<style>
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
}

body {
  /* SAO UI 字体来自本机 SAO Utils 2 安装（Fonts\SAOUI-Regular.otf，打包进应用） */
  font-family: 'SAO UI', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  /* 桌宠模式：整窗透明，SAO 菜单悬浮在桌面上方（遮罩由菜单组件自带的半透明黑提供） */
  background: transparent;
  color: #dfe6f2;
  user-select: none;
}

.menu-app {
  position: fixed;
  left: 2px;
  top: 2px;
  width: 760px;
  height: 600px;
  background: transparent;
}

/* 浮窗模式外框：设置开关「菜单浮窗」开启时（默认关 = 锁定、无框）——
   金框画在 ::before 伪元素（pointer-events:none）：inset:-2px 使框线落在窗口四周
   2px 透明边带内（内容区从 (2,2) 开始），**与内容零重叠、一个像素都不挡 UI**
   （border 直加根元素压缩内容、覆盖式伪元素压边均有用户实测「UI 被挡住」反馈）。
   鼠标在空白处显示 move 光标提示可拖；交互元素（li/输入/按钮/任务下级框等）
   恢复各自光标。开关状态由主进程广播驱动。 */
.menu-app.menu-float {
  cursor: move;
}
.menu-app.menu-float::before {
  content: '';
  position: absolute;
  inset: -2px;
  border: 2px solid rgba(242, 177, 22, 0.85);
  border-radius: 9px;
  box-shadow: 0 10px 28px rgba(51, 51, 51, 0.22);
  pointer-events: none;
  z-index: 9999;
}
.menu-app.menu-float li,
.menu-app.menu-float input,
.menu-app.menu-float button,
.menu-app.menu-float select,
.menu-app.menu-float textarea,
.menu-app.menu-float .quest-slot,
.menu-app.menu-float .qs-item,
.menu-app.menu-float .qs-empty,
.menu-app.menu-float .lc-portrait,
.menu-app.menu-float .sao-tip-mask {
  cursor: auto;
  /* 交互元素脱离系统拖动区（-webkit-app-region: drag 会吞鼠标事件），保持可点击 */
  -webkit-app-region: no-drag;
}

/* SAO 菜单不再有任何遮罩/模糊（透明窗口 + 透明页面，直接悬浮桌面；
   取消 backdrop-filter 避免 AMD 显卡透明合成挂起） */
.menu-app .info {
  background: rgba(0, 0, 0, 0) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* ⚠️ 闪退修复（sao-ui-beta child-bar 缺陷）：
   5 个子菜单 ul 绝对定位重叠在同一区域，非激活 ul 仅 opacity:0 视觉隐藏
   （display:block 仍参与命中），且 #systemMsg 在 DOM 最后=最上层。
   结果：点可见项目（如"登录"）实际命中叠在下面的 systemMsg"退出应用"→ 闪退。
   对策：非激活 ul 一律 pointer-events:none，只有 .ulActive（当前激活面板）可点。 */
.cb_position > ul {
  pointer-events: none !important;
}
.cb_position > ul.ulActive {
  pointer-events: auto !important;
}

/* 任务条目 ul（#quests）：皮肤 top:-100px 悬垂设计 → 浮窗 600 高下视口顶越界被窗口裁
   （li 顶部一行缺口）；禁 breath 后静态链恒定（视口顶 = top + 86.83，CDP 互证）→
   目标 2px = top:-84.8px，ul 高 126 完整入窗（2026-10-21 六轮，与 left-card 顶部
   垂悬修正同源；禁 breath 前多轮校准被呼吸动画噪声污染不可信）。
   ul 无专属皮肤规则，ID 覆盖即可。 */
.cb_position > ul#quests {
  top: -84.8px;
}

/* 网格氛围层 */
.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(90, 130, 200, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(90, 130, 200, 0.06) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: radial-gradient(ellipse at 50% 45%, #000 0%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 45%, #000 0%, transparent 75%);
  pointer-events: none;
}

/* 皮肤 .position「breath」无限动画（8s）使整块菜单内容 ±4px 缓慢「呼吸」漂移：
   浮窗 600 高下 left-card / 任务条目 ul 顶部随动画一会贴窗顶一会被金框/窗口裁
   （用户反馈「把个人信息裁剪一小节」的根因之一）→ 禁掉动画，菜单静止稳定，
   left-card / ul#quests 的顶部校准值才可靠（2026-10-21 六轮）。 */
.menu-app .position {
  animation-name: none !important;
}

/* ===== SAO Utils 2 配色复刻 v2 =====
   实测来源：本机安装 E:\SAO Utils 2\Packages\com.gpbeta.theme.sao（Images/*.png + qml\ItemButton.qml）
   - 面板/按钮底：白 #FFFFFF / 半透白 rgba(255,255,255,.85)（item/btn/panel.png）→ 皮肤本就白底
   - 悬停/选中：金 #F2B116 ~ #FBB717（item-hovered/pressed/selected.png）+ 白色文字 #FFFFFF
   - 空闲图标/文字：深炭灰 #333333（icon/*.png、ItemButton idle #CC333333）
   原则：白底 × 深灰字 × 金高亮，不用描边/辉光 —— 高对比且锐利。
   （v1 的蓝辉光 + text-stroke 已全部移除：白字叠白底更低对比，描边造成未选中模糊） */
@font-face {
  font-family: 'SAO UI';
  src: url('./assets/fonts/SAOUI-Regular.otf') format('opentype');
  font-weight: 400;
  font-style: normal;
}
/* 菜单栏圆徽：空闲深灰图标（白底 .in-circle 由皮肤提供），悬停/激活金底白图标 */
.menu-app .item .in-circle i {
  color: #333333;
}
.menu-app .item:hover .in-circle,
.menu-app .item.active .in-circle {
  background: #f2b116;
}
.menu-app .item:hover .in-circle i,
.menu-app .item.active .in-circle i {
  color: #ffffff;
}
.menu-app .item:hover,
.menu-app .item.active {
  border-color: rgba(242, 177, 22, 0.9);
}
/* 子菜单行：空闲白底 × 深灰字，悬停金底白字 */
.menu-app .cb_position > ul > li {
  color: #333333;
}
.menu-app .cb_position > ul > li span,
.menu-app .cb_position > ul > li i {
  color: #333333;
}
.menu-app .cb_position > ul > li:hover {
  background: #f2b116;
  color: #ffffff;
}
.menu-app .cb_position > ul > li:hover span,
.menu-app .cb_position > ul > li:hover i {
  color: #ffffff;
}
/* 左侧信息面板（皮肤已白底）：文字深灰 */
.menu-app .leftInfoBox .title,
.menu-app .leftInfoBox .des {
  color: #333333;
}

/* 主界面 */
.center {
  position: absolute;
  top: 42%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 2;
}

.menu-title {
  font-size: 52px;
  letter-spacing: 8px;
  margin: 0 0 8px;
  color: #eef4ff;
  text-shadow: 0 0 22px rgba(33, 171, 220, 0.5);
}

.menu-title span {
  color: rgb(243, 175, 18);
}

.menu-sub {
  margin: 0 0 26px;
  color: #55677f;
  font-size: 14px;
  letter-spacing: 3px;
}

.hints {
  margin-bottom: 30px;
}

.hints span {
  display: inline-block;
  margin: 5px 8px;
  padding: 5px 14px;
  border: 1px solid rgba(51, 51, 51, 0.3);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  color: #333333;
}

.menu-btn {
  padding: 12px 34px;
  font-size: 16px;
  letter-spacing: 2px;
  color: #e8eefb;
  background: linear-gradient(180deg, #2c4a78, #1b3053);
  border: 1px solid rgba(120, 170, 230, 0.5);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.menu-btn:hover {
  border-color: rgb(243, 175, 18);
  box-shadow: 0 0 16px rgba(243, 175, 18, 0.4);
  transform: translateY(-2px);
}

.menu-btn i {
  margin-right: 8px;
  color: rgb(243, 175, 18);
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

/* ---- 任务栏下级框（接取任务/个人任务/其他任务 → 对应条目右侧级联展开） ----
   视觉 = 上一级「个人任务」框原样复制（CDP 实测皮肤 li：background rgba(255,255,255,.85)、
   无边框/圆角/阴影、行 40px 高 18px 字 #333）；**槽本身透明，每行各自带 li 同款
   0.85 白底**——行与行之间 3px 完全透明（露出菜单底板），同任务栏 li 之间的
   透明间距（用户反馈：整块背景时看不出上下间距，应有一层透明间隔）；
   左/右间距：文字左右留白 16px（ul 水平 padding 16 实测）、槽与上一级栏之间 3px
   （left:calc(100% + 3px)）；每个 slot 绝对定位在 ul 内，放在 ul 下而非 li 内——
   皮肤 `li:hover span`（悬停白字）会把 li 内 span 变白，slot 挂 li 内时悬停上级行
   子框文字白底白字看不见（用户实测） */
.quest-slot {
  position: absolute;
  left: calc(100% + 3px); /* 与上一级栏之间留 3px（同 li 行间距） */
  min-width: 180px; /* ≥8 汉字单行放下；更长自动换行（qs-text min-width:0 兜底） */
  z-index: 60;
}
.slot-a {
  top: 0;
}
.slot-b {
  top: 43px; /* = 1 行(40) + 行距(3)，与 li 行位一致 */
}
.slot-c {
  top: 86px; /* = 2 行(80) + 2 行距(6) */
}

.qs-item {
  display: flex;
  align-items: center;
  /* 皮肤有更高优先级的 box reset 把 div 的 padding/margin 归零（CDP 实测 .qs-item
     规则在位但计算样式 pad/mb 为 0）→ 与 .qs-text 同款对策，必须 !important */
  padding: 0 16px !important; /* 左右留白与菜单行一致（ul 水平 padding 16，实测） */
  margin-bottom: 3px !important; /* 行间透明间距与 li 一致（实测 li margin-bottom:3px） */
  background: rgba(255, 255, 255, 0.85); /* 行自身 = 皮肤 li 背景，原样（槽是透明的） */
  min-height: 40px; /* = 上级 li 行高 */
  color: #333333;
  cursor: pointer;
  font-size: 18px; /* = 上级 li 字号 */
  line-height: 1.35;
  white-space: normal; /* 完整显示，默认可见，不截断 */
}
.qs-item:last-of-type {
  margin-bottom: 0 !important; /* 末行不留底边距，同第三行 li 的 margin-bottom:0 */
}
.qs-item:hover {
  background: #f2b116;
  color: #ffffff;
}
.qs-item i {
  width: 18px;
  text-align: center;
  margin-right: 6px;
  color: #333333;
  font-size: 16px;
}
.qs-item:hover i {
  color: #ffffff;
}
.qs-no {
  color: #333333;
  margin-right: 2px; /* 序号用「1、」顿号连接，紧贴任务内容（用户要求去掉大间隔） */
  font-size: 16px;
}
.qs-text {
  /* 皮肤对菜单行 span 有 white-space:nowrap + overflow:hidden（防换行截断），
     特异性更高会覆盖本规则（CDP 实测计算样式仍是 nowrap/hidden）→ 必须 !important */
  white-space: normal !important;
  overflow: visible !important;
  min-width: 0; /* flex 子项默认 min-width:auto 会撑开不换行（实测长任务文字 8px 溢出），必须归零才能换行完整显示 */
}
.qs-empty {
  display: flex;
  align-items: center;
  padding: 0 16px !important;
  margin-bottom: 3px !important;
  min-height: 40px;
  color: #333333;
  font-size: 18px;
  /* 七轮（2026-10-21）：用户要求空态行也加底、与其他框风格一致（同 qs-item） */
  background: rgba(255, 255, 255, 0.85);
}

/* ---- 「道具商店」暂未开放提示框（九轮 2026-10-22 起：SAO Utils 2 推出确认框同款效果；
     十轮 2026-10-22 改版：直接使用 SAO Utils 2 原版素材 public/sao/dialog.png（350×253，
     主题包 com.gpbeta.theme.sao Images\background\dialog.png）+ ok/cancel 圆钮图标
     （Images\icon\ok.png/cancel.png 40×40，含 -hovered 变体）。
     十一轮（2026-10-22，用户：「先检索 SAO Utils 2 里是怎么写的，另一个屏幕已打开界面」）：
     找到官方实现源码 win64\qml\com\gpbeta\private\DialogTemplate.qml +
     Packages\com.gpbeta.theme.sao\qml\ThemeDialog.qml —— 全部参数按源码为准：
     按钮 = 纯图片 ImageButton（ok.png/cancel.png 原图 40×40，无胶囊底无文字），
     buttonSpacing 110px、buttonOffset 28px（Row 底部居中）；dialog.png 为 BorderImage
     九宫格（topPadding 74 / bottomPadding 96 / left/right 16 → 正文区 y74-157 居中）；
     标题 titlePadding 30、19px #AA333333（Glow #11333333）；正文 16px #BB333333 +
     白色 1px 下投影；进场动画 scale 0.1→1 OutQuart 200ms + 淡入 250ms（CSS 近似）。
     注：此前按截图像素加的「红装饰竖线/底条」经源码核对为截图背景噪音（dialog.png 无红、
     QML 无此元素），已删除。 ---- */
.sao-tip-mask {
  position: fixed;
  inset: 0;
  z-index: 9500; /* 高于个人信息编辑器（9000） */
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 18, 34, 0.45);
  animation: saoMaskIn 250ms ease both;
}

@keyframes saoMaskIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.sao-tip {
  position: relative;
  width: 350px;
  height: 253px;
  box-shadow: 0 14px 44px rgba(0, 0, 0, 0.45);
  animation: saoDialogIn 260ms cubic-bezier(0.165, 0.84, 0.44, 1) both; /* OutQuart 近似 */
}

@keyframes saoDialogIn {
  from { opacity: 0; transform: scale(0.1); }
  to { opacity: 1; transform: scale(1); }
}

.sao-tip-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  -webkit-user-drag: none;
}

/* 标题：titlePadding 30、19px、#AA333333 + Glow(#11333333, radius 4) */
.sao-tip-title {
  position: absolute;
  left: 0;
  right: 0;
  top: 30px;
  text-align: center;
  font-size: 19px;
  font-family: 'SAO UI', 'Source Han Sans', 'Microsoft YaHei', sans-serif;
  /* 十二轮（2026-10-22）：用户反馈「字体颜色不够明显，和背景重合」——源码 #AA333333 的
     半透明在浅灰面板上对比度偏低；提高字色不透明度 + 补源码同款加粗(weight Medium) +
     白色微下投影（SAO 主题正文同款白影），观感与布局（top 30/19px）不变 */
  color: rgba(51, 51, 51, 0.92);
  font-weight: 500;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.35);
}

/* 正文：BorderImage 内容区（top 74 / bottom 96 / left/right 16）内垂直水平居中，
   16px、#BB333333、白色 1px 下投影 */
.sao-tip-body {
  position: absolute;
  left: 16px;
  right: 16px;
  top: 74px;
  bottom: 96px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 16px;
  line-height: 1.6;
  /* 十二轮（2026-10-22）：同上，正文 #BB333333 半透明提高不透明度增强可读性 */
  color: rgba(51, 51, 51, 0.92);
  font-weight: 500;
  text-shadow: 0 1px 0 #ffffff;
}

/* 按钮：ImageButton = 纯图片（ok.png/cancel.png 原图），Row 底部居中、
   buttonOffset 28、buttonSpacing 110 */
.sao-tip-btns {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 28px;
  display: flex;
  justify-content: center;
  gap: 110px;
}

.sao-tip-btn {
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}

.sao-tip-ic {
  width: 40px;
  height: 40px;
  display: block;
  pointer-events: none;
}

.sao-tip-ic-hover {
  display: none;
}

.sao-tip-btn:hover .sao-tip-ic {
  display: none;
}

.sao-tip-btn:hover .sao-tip-ic-hover {
  display: inline-block;
}

/* ---- FF14 个人信息编辑器（SAO Utils 2 配色复刻 v2：白底/深炭灰 #333/金 #F2B116） ---- */
.profile-mask {
  position: fixed;
  inset: 0;
  z-index: 9000;
  /* 八轮（2026-10-22）：用户反馈「个人信息地方不要阴影」→ 0.35 → 0.15（淡到几乎无，
     保留极淡模态层次；配合编辑器内容压缩后保存/取消完整入窗不再被压暗） */
  background: rgba(10, 18, 34, 0.15);
}

.profile-editor {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 540px;
  max-width: 92vw;
  /* 八轮（2026-10-22）：内容实测 ~626px 超出 604 窗口，保存/取消按钮（y 592-628）
     大半沉到窗口外被遮罩压暗 → max-height 88vh → 100vh + 全卡垂直压缩 ~40px，
     内容完整包进卡片、按钮完整可见（overflow 仍 visible：候选下拉依赖） */
  max-height: 100vh;
  overflow: visible;
  padding: 14px 22px 14px;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid rgba(51, 51, 51, 0.35);
  border-radius: 12px;
  box-shadow: 0 14px 44px rgba(0, 0, 0, 0.5);
  color: #333333;
  user-select: none;
}

.pe-title {
  margin: 0 0 8px;
  padding-bottom: 8px;
  border-bottom: 2px solid #f2b116;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #333333;
}

.pe-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
}

.pe-grid label {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 12.5px;
  color: #555555;
}

.pe-grid label.pe-full {
  grid-column: 1 / -1;
}

.pe-grid input {
  padding: 6px 9px;
  font-size: 13.5px;
  color: #333333;
  background: #ffffff;
  border: 1px solid #c9c9c9;
  border-radius: 6px;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.pe-grid input:focus {
  border-color: #f2b116;
  box-shadow: 0 0 0 2px rgba(242, 177, 22, 0.22);
}

.pe-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.pe-btn {
  padding: 8px 22px;
  font-size: 13.5px;
  letter-spacing: 2px;
  border-radius: 6px;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.15s ease;
}

.pe-btn:active {
  transform: translateY(1px);
}

.pe-save {
  color: #ffffff;
  background: #f2b116;
  border: 1px solid #d89d0d;
}

.pe-save:hover {
  box-shadow: 0 0 12px rgba(242, 177, 22, 0.55);
}

.pe-cancel {
  color: #333333;
  background: #ffffff;
  border: 1px solid #b9b9b9;
}

.pe-hint {
  margin-left: auto;
  font-size: 11px;
  color: #999999;
}

/* ---- 左侧个人信息卡（替换皮肤 left-info；几何对齐皮肤原卡并留出呼吸空间） ----
   box-sizing:border-box 关键：不加的话 width:240 是 content-box，实际占 240+24padding+2border
   =266px，右缘会顶到图标列（实测 gap≈1px，用户反馈"几乎贴近"）；加 border-box 后总宽 240，
   右缘 = 锚点-25px，再左移 10px 让间距 ≈35px，既还原皮肤区间距又更透气。 */
.left-card {
  position: absolute;
  left: calc(-25px - 240px - 10px);
  /* 顶部垂悬修正（2026-10-21 六轮终值）：皮肤 .position 容器的 breath 无限动画已禁
     （见下方 .position 规则）后，left-card 视口顶 = top + 122.833（静态链恒定，CDP
     多轮互证）→ 目标视口顶 2px（内容区起点）= top:-120.8px。卡片 517 高完整入窗
     （顶 2、底 519）。曾 top:-180px（全屏时代悬垂设计）→ 浮窗 600 高下卡片顶部
     -51px 被窗口裁（用户反馈「左上角把个人信息裁剪一小节」）；禁 breath 前多轮
     -127/-117.5/-115.7 校准被 ±4px 呼吸动画噪声污染不可信。窗口恒 764×604，
     数值固定安全。 */
  top: -120.8px;
  width: 240px;
  box-sizing: border-box;
  /* 七轮（2026-10-21）：用户反馈左卡「感觉更白了些」，要求像右边那样带点透明的底 →
     0.92 → 0.85（与任务下级框/菜单行 rgba(255,255,255,0.85) 完全一致） */
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(51, 51, 51, 0.3);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  padding: 12px 12px 10px;
  color: #333333;
  user-select: none;
  z-index: 5;
}

/* 顶部：长方形角色画像框（用户要求的“个人信息角色框”：空白区域并入画像，上传图 cover 铺满整个矩形）。
   比例 3:4 竖版角色卡 —— 主流立绘/角色卡通用比例，FF14 ロドスト冒险者名片 320×440 ≈ 8:11 也接近；
   216 宽 → 288 高，明显长方形、不再像正方形。 */
.lc-portrait {
  position: relative;
  width: 100%;
  height: 288px; /* 3:4 竖版画幅 */
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #22304e 0%, #131d33 55%, #31436b 100%);
  border: 1px solid rgba(51, 51, 51, 0.25);
}

.lc-portrait img {
  width: 100%;
  height: 100%;
  object-fit: cover; /* 上传图铺满整个画像框 */
  display: block;
}

.lc-portrait-empty i {
  font-size: 128px;
  line-height: 1;
  color: rgba(242, 177, 22, 0.9); /* 未上传：金色大图标占满画像框 */
  text-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
}

.lc-grid {
  display: grid;
  grid-template-columns: 1fr 1fr; /* 每排两格，等距 */
  gap: 7px 12px;
}

.lc-cell {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.lc-cell.lc-wide {
  grid-column: 1 / -1;
}

.lc-k {
  font-size: 10.5px;
  letter-spacing: 1px;
  color: #888888;
}

.lc-v {
  font-size: 12.5px;
  color: #333333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lc-v.muted {
  color: #b5b5b5; /* 未填写占位 */
}

/* ---- 编辑器：候选下拉（列表内部滚动，双向滚轮；不裁切，最后一项也要可见） ---- */
/* 注：编辑器卡片不再 overflow:hidden —— 之前会把向下弹出的候选列表底部裁掉，
   导致列表最后一项（如信仰十三神里的「无信仰」）看不到；列表自身 overscroll-behavior:
   contain 让滚轮只在列表内上下滚动，不带动页面。 */
.profile-mask {
  overscroll-behavior: contain;
}

.pe-dd {
  position: relative;
  display: block;
}

.pe-dd-list {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 3px);
  z-index: 40;
  max-height: 190px; /* 过长列表在内部滚动以显示全部（滚轮可上下滚动） */
  overflow-y: auto;
  overscroll-behavior: contain;
  background: #ffffff;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
}

.pe-dd-list button {
  display: block;
  width: 100%;
  padding: 6px 10px;
  font-size: 13px;
  text-align: left;
  color: #333333;
  background: #ffffff;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pe-dd-list button:hover {
  background: #f2b116;
  color: #ffffff;
}

/* ---- 编辑器：角色图标上传 ---- */
.pe-avatar-row {
  flex-direction: row !important;
  align-items: center;
  gap: 10px !important;
}

.pe-avatar-box {
  flex: none;
  width: 57px;
  height: 76px; /* 3:4 竖版预览，与左卡画像框同比例（八轮微缩省高） */
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, #22304e 0%, #131d33 55%, #31436b 100%);
  border: 1px solid rgba(51, 51, 51, 0.25);
}

.pe-avatar-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pe-avatar-box i {
  font-size: 42px;
  color: rgba(242, 177, 22, 0.9);
}

.pe-avatar-btns {
  display: flex;
  gap: 8px;
}

.pe-mini {
  padding: 6px 12px;
  font-size: 12.5px;
  letter-spacing: 0;
}

.pe-sub {
  font-size: 11px;
  color: #999999;
}
</style>
<template>
  <div class="tavern-app">
    <div class="tavern-panel">
      <!-- 顶部栏：标题 + 关闭（仿 SAO Utils 2 设置窗口；整栏可拖动） -->
      <div class="tavern-head">
        <span class="th-title"><i class="fa fa-book"></i> 任务酒馆</span>
        <span class="th-close" @click="close"><i class="fa fa-times"></i></span>
      </div>
      <div class="tavern-body">
        <!-- 左导航：任务大厅 / 个人任务（仿 SAO Utils 2 设置的「用户」页签手感） -->
        <div class="tavern-nav">
          <div class="tn-item" :class="{ active: page === 'hall' }" @click="page = 'hall'">
            <i class="fa fa-university"></i><span>任务大厅</span>
          </div>
          <div class="tn-item" :class="{ active: page === 'personal' }" @click="page = 'personal'">
            <i class="fa fa-list-ul"></i><span>个人任务</span>
          </div>
        </div>

        <!-- 右内容区 -->
        <div class="tavern-main">
          <!-- 任务大厅：暂时空着（用户需求：占位展示，功能后续扩展） -->
          <div v-if="page === 'hall'" class="hall-empty">
            <i class="fa fa-tasks hall-icon"></i>
            <p class="hall-title">任务大厅</p>
            <p class="hall-sub">敬请期待 · 这里将展示可接取与进行中的任务</p>
          </div>

          <!-- 个人任务：Excel 样式表格（序号 / 任务内容 / 是否完成） -->
          <div v-else class="personal-page">
            <div class="pt-toolbar">
              <span class="pt-seg">
                <span class="pt-seg-item" :class="{ on: group === 'personal' }" @click="setGroup('personal')">个人</span>
                <span class="pt-seg-item" :class="{ on: group === 'other' }" @click="setGroup('other')">其他</span>
              </span>
              <span class="pt-seg pt-view">
                <span class="pt-seg-item" :class="{ on: view === 'unfinished' }" @click="setView('unfinished')">仅未完成</span>
                <span class="pt-seg-item" :class="{ on: view === 'all' }" @click="setView('all')">全部</span>
              </span>
            </div>

            <div class="pt-table">
              <div class="pt-row pt-head">
                <span class="pt-c-no">序号</span>
                <span class="pt-c-text">任务内容</span>
                <span class="pt-c-done">是否完成</span>
                <span class="pt-c-op">操作</span>
              </div>

              <div v-if="!visibleList.length" class="pt-row pt-empty-row">
                <span class="pt-empty-text">还没有任务，点击下方「＋ 添加任务」登记</span>
              </div>

              <div
                v-for="(q, i) in visibleList"
                :key="q.id"
                class="pt-row"
                :class="{ done: q.done }"
              >
                <span class="pt-c-no">{{ i + 1 }}</span>
                <span class="pt-c-text">
                  <input
                    v-if="editingId === q.id"
                    class="pt-edit"
                    :value="editText"
                    @input="editText = $event.target.value"
                    @keyup.enter="saveEdit"
                    @keyup.esc="cancelEdit"
                    @blur="saveEdit"
                  />
                  <span v-else class="pt-text" @click="startEdit(q)">{{ q.text }}</span>
                </span>
                <span class="pt-c-done">
                  <span class="pt-check" @click="toggle(q)"><i :class="q.done ? 'fa fa-check' : ''"></i></span>
                </span>
                <span class="pt-c-op">
                  <i class="fa fa-minus pt-op pt-del" title="删除该任务" @click="remove(q)"></i>
                </span>
              </div>

              <div class="pt-row pt-add-row" @click="addBottom">
                <span class="pt-add-text"><i class="fa fa-plus"></i> 添加任务</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// SAO 菜单桌宠 —— 任务酒馆（独立小窗）：仿 SAO Utils 2 设置窗口布局；
// 个人任务 = Excel 样式表格：序号/任务内容/是否完成；默认只显示未完成（顶部可切「全部」）；
// 每行可点 ＋ 在该行后插入新任务，表格底部固定「＋ 添加任务」行（在任意位置插入）；
// 点任务内容单格行内编辑，回车/失焦保存、Esc 取消（空文本保存=删除该行）。
export default {
  name: 'tavern-app',
  data() {
    return {
      page: 'personal', // left nav: hall | personal（默认个人任务，任务栏入口直达）
      group: 'personal', // 表格归属：个人任务 / 其他任务（任务栏两个下级框分别直达）
      view: 'unfinished', // 显示：仅未完成（默认）/ 全部
      quests: { personal: [], other: [] },
      editingId: '',
      editText: '',
      // 注意：Vue 2 不会把下划线/美元前缀的 data 代理到实例上（this._x 恒为 undefined），
      // 自增序号字段不能以 _ 开头（曾实测产出 id 里混入 NaN）
      uidSeq: 0
    }
  },
  computed: {
    activeList() {
      return this.quests[this.group] || []
    },
    visibleList() {
      if (this.view === 'all') return this.activeList
      return this.activeList.filter(q => !q.done)
    }
  },
  mounted() {
    try {
      this.quests = window.petAPI.getQuests() || { personal: [], other: [] }
    } catch (e) {
      /* 环境异常时采用空列表 */
    }
    window.petAPI.onQuests(q => {
      // 主进程广播（本窗口编辑也会回播）；本地直接对齐，避免重复写盘
      this.quests = q || { personal: [], other: [] }
    })
    window.petAPI.onTavern(payload => {
      // 主进程转发「打开请求的归属分组」：窗口已开时再次从任务栏点击直达对应分类
      if (payload && (payload.group === 'personal' || payload.group === 'other')) {
        this.group = payload.group
        this.page = 'personal'
      }
    })
    // Esc：编辑态先取消编辑；非编辑态关闭窗口（主进程不拦 Esc，避免误关）
    this._escHandler = e => {
      if (e.key !== 'Escape') return
      if (this.editingId) {
        e.preventDefault()
        this.cancelEdit()
      } else {
        window.petAPI.closeTavern()
      }
    }
    document.addEventListener('keydown', this._escHandler)
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this._escHandler)
  },
  methods: {
    close() {
      window.petAPI.closeTavern()
    },
    setGroup(g) {
      this.group = g
      this.editingId = '' // 防跨组编辑残留
    },
    setView(v) {
      this.view = v
    },
    uid() {
      this.uidSeq += 1
      return Date.now().toString(36) + '-' + this.uidSeq.toString(36) + '-' + Math.random().toString(36).slice(2, 7)
    },
    persist() {
      window.petAPI.setQuests(this.quests)
    },
    startEdit(q) {
      this.editingId = q.id
      this.editText = q.text
      this.$nextTick(() => {
        const el = document.querySelector('.pt-edit')
        if (el) {
          el.focus()
          try {
            el.select()
          } catch (e) {
            /* 忽略 */
          }
        }
      })
    },
    saveEdit() {
      const base = this.editingId
      if (!base) return
      const q = this.quests[this.group].find(x => x.id === base)
      const text = this.editText.trim()
      this.editingId = ''
      if (!q) return
      if (text === '') {
        this.quests[this.group] = this.quests[this.group].filter(x => x.id !== base)
        this.persist()
        return
      }
      if (text !== q.text) {
        q.text = text.slice(0, 200)
        this.persist()
      }
    },
    cancelEdit() {
      this.editingId = ''
    },
    insertAfter(id, item) {
      const arr = [...this.quests[this.group]]
      const idx = id === null ? arr.length : arr.findIndex(x => x.id === id)
      arr.splice(idx + 1, 0, item)
      this.quests[this.group] = arr
      this.persist()
    },
    addAfter(q) {
      const item = { id: this.uid(), text: '', done: false }
      this.insertAfter(q.id, item)
      this.editingId = item.id
      this.editText = ''
      this.$nextTick(() => {
        const el = document.querySelector('.pt-edit')
        if (el) el.focus()
      })
    },
    addBottom() {
      const item = { id: this.uid(), text: '', done: false }
      this.insertAfter(null, item)
      this.editingId = item.id
      this.editText = ''
      this.$nextTick(() => {
        const el = document.querySelector('.pt-edit')
        if (el) el.focus()
      })
    },
    toggle(q) {
      const item = this.quests[this.group].find(x => x.id === q.id)
      if (!item) return
      item.done = !item.done
      this.persist()
    },
    remove(q) {
      this.quests[this.group] = this.quests[this.group].filter(x => x.id !== q.id)
      this.persist()
    }
  }
}
</script>

<style scoped>
/* 酒馆面板：浅色基调（用户 2026-10-19 定调：与菜单「个人任务」背景框同款——
   白底 rgba(255,255,255,.85) + 深灰 #333 字 + 金色点缀），细边框 + 大圆角；
   警示（2026-10-19 事故）：style 内注释只能用块注释语法，且注释正文里不能出现 * 斜杠
   组合（嵌套注释会提前闭合导致规则被吞）；更不能写 HTML 注释标记 */
.tavern-app {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Arial', 'Microsoft YaHei', sans-serif;
  user-select: none;
}

.tavern-panel {
  width: 600px;
  height: 420px;
  border-radius: 12px;
  overflow: hidden;
  /* 浅色基调（用户定调：与菜单「个人任务」背景框同款——白底 rgba(255,255,255,.85) +
     深灰字 #333 + 金色点缀） */
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(51, 51, 51, 0.14);
  box-shadow: 0 14px 44px rgba(0, 0, 0, 0.28);
  display: flex;
  flex-direction: column;
}

/* 顶部栏（整栏可拖动窗口） */
.tavern-head {
  height: 40px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px 0 16px;
  background: rgba(51, 51, 51, 0.05);
  border-bottom: 1px solid rgba(51, 51, 51, 0.12);
  -webkit-app-region: drag;
}

.th-title {
  color: #333333;
  font-size: 14px;
  letter-spacing: 1px;
}
.th-title i {
  color: #f2b116;
  margin-right: 8px;
}
.th-close {
  -webkit-app-region: no-drag;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666666;
  cursor: pointer;
  border-radius: 6px;
}
.th-close:hover {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.12);
}

.tavern-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

/* 左导航（金色高亮页签：选中项金色底 + 左缘亮条，浅色版） */
.tavern-nav {
  width: 132px;
  flex: none;
  padding: 12px 8px;
  background: rgba(51, 51, 51, 0.04);
  border-right: 1px solid rgba(51, 51, 51, 0.12);
}
.tn-item {
  height: 34px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  margin-bottom: 4px;
  border-radius: 6px;
  color: #555555;
  cursor: pointer;
  position: relative;
  font-size: 13px;
}
.tn-item i {
  width: 18px;
  text-align: center;
  margin-right: 8px;
  font-size: 14px;
}
.tn-item:hover {
  background: rgba(51, 51, 51, 0.06);
  color: #333333;
}
.tn-item.active {
  background: rgba(242, 177, 22, 0.16);
  color: #b9870c;
}
.tn-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: 2px;
  background: #f2b116;
}

/* 右内容区 */
.tavern-main {
  flex: 1;
  min-width: 0;
  padding: 12px 14px;
  overflow: hidden;
}

/* 任务大厅空态 */
.hall-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #333333;
}
.hall-icon {
  font-size: 44px;
  color: rgba(242, 177, 22, 0.8);
  margin-bottom: 12px;
}
.hall-title {
  font-size: 16px;
  letter-spacing: 2px;
  margin: 0 0 6px;
}
.hall-sub {
  font-size: 12px;
  color: #999999;
  margin: 0;
}

/* 个人任务页 */
.personal-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.pt-toolbar {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.pt-seg {
  display: flex;
  gap: 2px;
  background: rgba(51, 51, 51, 0.08);
  border-radius: 6px;
  padding: 2px;
}
.pt-seg-item {
  padding: 3px 12px;
  border-radius: 5px;
  font-size: 12px;
  color: #555555;
  cursor: pointer;
}
.pt-seg-item:hover {
  color: #333333;
}
.pt-seg-item.on {
  background: rgba(242, 177, 22, 0.2);
  color: #b9870c;
}

/* Excel 样式表格：细边框网格 + 隔行底色 + 灰底表头（浅色版） */
.pt-table {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border: 1px solid rgba(51, 51, 51, 0.18);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.55);
}
.pt-row {
  display: flex;
  align-items: center;
  min-height: 33px;
  border-bottom: 1px solid rgba(51, 51, 51, 0.12);
  font-size: 13px;
  color: #333333;
}
.pt-row:nth-child(2n) {
  background: rgba(51, 51, 51, 0.035);
}
.pt-row:hover {
  background: rgba(242, 177, 22, 0.07);
}
.pt-head {
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgba(51, 51, 51, 0.08);
  color: #333333;
  font-weight: 700;
  min-height: 30px;
}
.pt-head:hover {
  background: rgba(51, 51, 51, 0.08);
}

.pt-c-no {
  width: 52px;
  flex: none;
  text-align: center;
  color: #888888;
  border-right: 1px solid rgba(51, 51, 51, 0.12);
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pt-c-text {
  flex: 1;
  min-width: 0;
  padding: 4px 10px;
  border-right: 1px solid rgba(51, 51, 51, 0.12);
  align-self: stretch;
  display: flex;
  align-items: center;
  overflow: hidden;
}
.pt-text {
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: text;
}
.pt-edit {
  width: 100%;
  background: #ffffff;
  border: 1px solid rgba(242, 177, 22, 0.8);
  border-radius: 4px;
  color: #333333;
  font-size: 13px;
  padding: 2px 6px;
  outline: none;
}
.pt-c-done {
  width: 74px;
  flex: none;
  text-align: center;
  border-right: 1px solid rgba(51, 51, 51, 0.12);
  align-self: stretch;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pt-check {
  width: 18px;
  height: 18px;
  border: 1px solid rgba(51, 51, 51, 0.35);
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #b9870c;
  font-size: 12px;
  background: #ffffff;
}
.pt-check:hover {
  border-color: #f2b116;
}
.pt-c-op {
  width: 44px; /* 只放单个 − 删除图标（行尾 ＋ 与底部「添加任务」重复，2026-10-19 已移除） */
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.pt-op {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: #888888;
  cursor: pointer;
  font-size: 12px;
}
.pt-op:hover {
  color: #b9870c;
  background: rgba(242, 177, 22, 0.14);
}
.pt-del:hover {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.12);
}
.pt-row.done .pt-c-text,
.pt-row.done .pt-c-no {
  color: rgba(51, 51, 51, 0.35);
}
.pt-row.done .pt-text {
  text-decoration: line-through;
}
.pt-add-row {
  cursor: pointer;
  justify-content: center;
  color: rgba(185, 135, 12, 0.9);
  min-height: 32px;
}
.pt-add-row:hover {
  background: rgba(242, 177, 22, 0.1);
}
.pt-add-text i {
  margin-right: 6px;
}
.pt-empty-row {
  justify-content: center;
  min-height: 56px;
}
.pt-empty-text {
  color: #999999;
  font-size: 12px;
}
</style>
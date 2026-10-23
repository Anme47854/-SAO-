<template>
  <div class="pet">
    <!-- 单个齿轮：点击直接展开全屏 SAO 菜单；按住可拖动位置 -->
    <button
      class="gear"
      title="左键：展开全屏 SAO 菜单（Alt+A） · 右键：控制面板"
      @mousedown.prevent="dDown"
      @mousemove.prevent="dMove"
      @mouseup.prevent="dUp"
      @contextmenu.prevent.stop="onContext"
    >
      <i class="fa fa-cog"></i>
    </button>
  </div>
</template>

<script>
export default {
  name: 'sao-pet',
  data() {
    return {
      drag: null
    }
  },
  methods: {
    openMenu() {
      if (window.petAPI && window.petAPI.openFull) window.petAPI.openFull()
    },
    // 轻点 = 展开菜单；按住拖动 = 移动挂件位置
    // 拖动信号仅开始/结束两条 IPC：主进程每 16ms 读系统鼠标坐标移动窗口（丝滑无卡顿）
    dDown(e) {
      if (e.button !== 0) return // 仅左键参与点击/拖动；右键走 onContext 开控制面板
      this.drag = {
        sx: e.screenX,
        sy: e.screenY,
        offX: e.screenX - window.screenX,
        offY: e.screenY - window.screenY,
        moved: false,
        lastMsg: 0
      }
    },
    dMove(e) {
      if (!this.drag) return
      const dx = e.screenX - this.drag.sx
      const dy = e.screenY - this.drag.sy
      if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return // 3px 内视为点击抖动
      this.drag.moved = true
      // 拖动信号每 250ms 刷新一次：正常拖动+意外中断后的自动恢复都靠它
      const now = Date.now()
      if (now - this.drag.lastMsg >= 250 && window.petAPI && window.petAPI.dragStart) {
        this.drag.lastMsg = now
        window.petAPI.dragStart(this.drag.offX, this.drag.offY)
      }
    },
    dUp() {
      const d = this.drag
      this.drag = null
      if (!d) return // 非左键链路（右键由 onContext 处理，不触发菜单）
      // 无条件发结束信号（主进程侧还有 1.2s 静止自动结束兜底）
      if (window.petAPI && window.petAPI.dragEnd) window.petAPI.dragEnd()
      if (!d.moved) this.openMenu()
    },
    // 右键：呼出/收起全局控制面板（游戏模式 · 游戏中显示猫）
    onContext() {
      this.drag = null
      if (window.petAPI && window.petAPI.openConfig) window.petAPI.openConfig()
    }
  },
  mounted() {
    console.log('[pet] mounted')
    // 诊断：错误/未处理拒绝落到主进程日志
    window.addEventListener('error', e => console.log('[pet] window-error ' + (e && e.message)))
    window.addEventListener('unhandledrejection', e => console.log('[pet] rejection ' + (e && e.reason)))
    // 心跳：5 秒一次
    setInterval(() => console.log('[pet] hb'), 5000)
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
  background: transparent;
  user-select: none;
}

.pet {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 窗口仅 56px 无边框，全区域都是普通输入（不用系统拖拽区，手动拖动更可控） */
}

.gear {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid rgba(242, 177, 22, 0.75);
  background: rgba(13, 22, 42, 0.88);
  color: rgb(242, 177, 22);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 10px rgba(242, 177, 22, 0.4), 0 2px 12px rgba(0, 0, 0, 0.45);
  transition: all 0.15s ease;
}

.gear:hover {
  border-color: rgba(255, 220, 120, 0.9);
  box-shadow: 0 0 14px rgba(242, 177, 22, 0.5);
  transform: rotate(18deg);
}

.gear:active {
  transform: rotate(60deg) scale(0.94);
}
</style>
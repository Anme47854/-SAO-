<template>
  <div class="config-app">
    <div class="cfg-head">控制面板 · SAO</div>
    <div class="cfg-row" @click="toggleGame">
      <span class="cfg-label">游戏模式</span>
      <span class="cfg-switch" :class="{ on: gameOn }">{{ gameOn ? '开' : '关' }}</span>
    </div>
    <div class="cfg-row" @click="toggleFloat">
      <span class="cfg-label">菜单浮窗</span>
      <span class="cfg-switch" :class="{ on: floatOn }">{{ floatOn ? '开' : '关' }}</span>
    </div>
    <div class="cfg-foot">全屏游戏前台时自动隐藏齿轮 · 菜单浮窗开启后可拖动自由摆放</div>
  </div>
</template>

<script>
export default {
  name: 'sao-config',
  data() {
    return {
      // 初始值同步主进程（sendSync 读取）
      gameOn: !!(window.petAPI && window.petAPI.getGame && window.petAPI.getGame()),
      floatOn: !!(window.petAPI && window.petAPI.getMenuFloat && window.petAPI.getMenuFloat())
    }
  },
  mounted() {
    // 任何来源（设置切换）都实时同步开关状态
    if (window.petAPI && window.petAPI.onGame) {
      window.petAPI.onGame(v => {
        this.gameOn = !!v
      })
    }
    if (window.petAPI && window.petAPI.onMenuFloat) {
      window.petAPI.onMenuFloat(v => {
        this.floatOn = !!v
      })
    }
  },
  methods: {
    toggleGame() {
      if (window.petAPI && window.petAPI.setGame) window.petAPI.setGame(!this.gameOn)
    },
    toggleFloat() {
      if (window.petAPI && window.petAPI.setMenuFloat) window.petAPI.setMenuFloat(!this.floatOn)
    }
  }
}
</script>

<style>
html,
body {
  margin: 0;
  padding: 0;
  background: transparent;
  overflow: hidden;
  user-select: none;
}

/* SAO Utils 2 配色复刻 v2：白底 × 深炭灰字 × 金 #F2B116 高亮（无描边辉光） */
.config-app {
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(51, 51, 51, 0.3);
  border-radius: 10px;
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.38);
  padding: 12px 14px 10px;
  color: #333333;
}

.cfg-head {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #333333;
  border-bottom: 2px solid #f2b116;
  padding-bottom: 6px;
  margin-bottom: 6px;
}

.cfg-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 6px;
  border-radius: 6px;
  cursor: pointer;
}

.cfg-row:hover {
  background: rgba(242, 177, 22, 0.14);
}

.cfg-label {
  font-size: 14px;
  color: #333333;
}

.cfg-switch {
  min-width: 58px;
  height: 26px;
  border-radius: 13px;
  background: #d9d9d9;
  color: #555555;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 2px;
  transition: all 0.15s ease;
}

.cfg-switch.on {
  background: #f2b116;
  color: #ffffff;
}

.cfg-foot {
  margin-top: 4px;
  font-size: 11px;
  color: #8a8a8a;
  border-top: 1px solid rgba(51, 51, 51, 0.15);
  padding-top: 6px;
}
</style>
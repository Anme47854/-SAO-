// SAO 菜单桌宠 —— 菜单组数据（与全屏页菜单同源一致）
export const MENU_GROUPS = [
  {
    id: 'userInfo',
    iClass: 'fa fa-user',
    canActive: true,
    items: [
      { iClass: 'fa fa-arrow-circle-up', text: '登录' },
      { iClass: 'fa fa-arrow-circle-down', text: '退出' },
      { iClass: 'fa fa-info-circle', text: '个人信息' }
    ]
  },
  {
    id: 'quests',
    iClass: 'fa fa-bullseye',
    canActive: true,
    items: [
      { iClass: 'fa fa-plus-circle', text: '接取任务' },
      { iClass: 'fa fa-list-ul', text: '个人任务' },
      { iClass: 'fa fa-ellipsis-h', text: '其他任务' }
    ]
  },
  {
    id: 'shop',
    iClass: 'fa fa-shopping-cart',
    canActive: true,
    items: [
      { iClass: 'fa fa-shopping-cart', text: '道具商店' },
      { iClass: 'fa fa-exchange', text: '交易行' }
    ]
  },
  {
    id: 'friendsLink',
    iClass: 'fa fa-users',
    canActive: true,
    items: [
      { iClass: 'fa fa-users', text: '好友列表' },
      { iClass: 'fa fa-shield', text: '公会成员' }
    ]
  },
  {
    id: 'systemMsg',
    iClass: 'fa fa-cog',
    canActive: true,
    items: [] // 齿轮 = 设置按钮：面板渲染「透明度」滑杆（见 PetApp.vue 的 set-box）
  }
]
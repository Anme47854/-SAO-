// 拖拽指令（取自 sao-ui-beta 源码 lib/sao-ui.common.js，独立成文件以避免引入整个组件链）
function dragDom(ev, el, binding) {
  if (binding.value) {
    let sX = ev.clientX - el.offsetLeft
    let sY = ev.clientY - el.offsetTop
    function move(e) {
      el.style.left = e.clientX - sX + 'px'
      el.style.top = e.clientY - sY + 'px'
    }
    addEventListener('mousemove', move)
    addEventListener('mouseup', function () {
      removeEventListener('mousemove', move)
    })
  }
}

function dragX(ev, el, binding) {
  if (binding.value) {
    let sX = ev.clientX - el.offsetLeft
    function moveX(e) {
      el.style.left = e.clientX - sX + 'px'
    }
    addEventListener('mousemove', moveX)
    addEventListener('mouseup', function () {
      removeEventListener('mousemove', moveX)
    })
  }
}

export const Drag = {
  bind(el, binding) {
    el.addEventListener('mousedown', ev => dragDom(ev, el, binding))
  },
  update(el, binding) {
    el.addEventListener('mousedown', ev => dragDom(ev, el, binding))
  }
}

export const DragX = {
  bind(el, binding) {
    el.addEventListener('mousedown', ev => dragX(ev, el, binding))
  },
  update(el, binding) {
    el.addEventListener('mousedown', ev => dragX(ev, el, binding))
  }
}
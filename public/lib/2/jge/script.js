// jge.js 0.0.1 @ https://freshman.dev/lib/2/jge/script.js https://freshman.dev/copyright.js
{
const names = lists.of('jge javascript_game_engine')
const dependencies = {
  'common.js': '/lib/2/common/script.js',
}
if (names.some(name => !window[name])) {
  Object.entries(dependencies).map(([key,src])=>!window[key]&&document.head.append((x=>Object.assign(x,{innerHTML:(src=>(x=>{x.withCredentials=false;x.open('GET',src,false);x.send();return x.responseText})(new XMLHttpRequest()))(new URL(src,location.port==='3030'/*local testing on port 3030*/?location.origin:'https://freshman.dev').toString())}))(document.createElement('script'))))

  const version = `jge.js v0.0.1`
  const log = named_log(version)
  const definition = {}

  definition.attach = ({
    root,
    width, height,
    loop, fps=undefined,
  }={}) => {
    root = typeof root === 'string' ? Q(root) : root
    if (!root) {
      alert('jge unable to attach')
      return
    }
    const canvas = node(`<canvas width=${width} height=${height} style="background: #000; image-rendering: pixelated;"></canvas>`)
  
    // style root to contain game
    root.style.cssText += `; display: flex; justify-content: center; align-items: center; background: #0002`
    const aspect = width / height
    const resize = () => {
      canvas.style.height = canvas.style.width = 0
      const rect = root.getBoundingClientRect()
      if (rect.width / rect.height > aspect) {
        root.style['flex-direction'] = 'column'
      } else {
        root.style['flex-direction'] = 'row'
      }
      canvas.style.height = (Math.min(rect.height, rect.width / aspect)) + 'px'
      canvas.style.width = (Math.min(rect.width, rect.height * aspect)) + 'px'
    }
    on(window, 'resize', resize)
    resize()

    const ctx = canvas.getContext('2d')

    let last, timeout
    const outer_loop = () => {
      const now = Date.now()
      const delta_s = (now - last) / 1000
      last = now
      if (fps) {
        timeout = setTimeout(outer_loop, 1000/fps)
      } else {
        timeout = requestAnimationFrame(outer_loop)
      }
      loop(delta_s)
    }
    const start = () => {
      if (timeout) return
      last = Date.now()
      timeout = requestAnimationFrame(outer_loop)
    }
    const stop = () => {
      clearTimeout(timeout)
      cancelAnimationFrame(timeout)
      timeout = undefined
    }

    const e_to_v = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width * width
      const y = (e.clientY - rect.top) / rect.height * height
      return V.ne(x, y)
    }

    root.append(canvas)
    return {
      canvas, ctx,
      start, stop,
      e_to_v,
    }
  }

  names.map(name => window[name] = merge(definition, {version, [name]:version, t:Date.now()}))
}}

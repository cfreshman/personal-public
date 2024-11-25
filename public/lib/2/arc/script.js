// arc.js 0.0.1 @ https://freshman.dev/lib/2/arc/script.js https://freshman.dev/copyright.js
Object.entries({
  'common.js': '/lib/2/common/script.js',
}).map(([key,src])=>!window[key]&&document.head.append((x=>Object.assign(x,{innerHTML:(src=>(x=>{x.withCredentials=false;x.open('GET',src,false);x.send();return x.responseText})(new XMLHttpRequest()))(new URL(src,location.port==='3030'/*local testing on port 3030*/?location.origin:'https://freshman.dev').toString())}))(document.createElement('script'))))  

const names = lists.of('arc')
if (names.some(name => !window[name])) {
  const version = `arc.js v0.0.1`
  const log = named_log(version)
  const definition = {}

  definition.debug = false

  definition.a_sheet = async (src, sprites, { scale=1 }) => {
    const image = await new Promise((resolve, reject) => {
      const image = new Image()
      image.src = src
      image.onload = () => resolve(image)
      image.onerror = reject
    })
    const sheet = {}

    // sprite is [name, x, y, width, height, [n, ox, oy]]
    const cutouts = []
    sprites.map(([name, x, y, w, h, n, ox, oy]) => {
      if (n) {
        for (let i = 0; i < n; i++) {
          cutouts.push([`${name}${i}`, x + i*ox, y + i*oy, w, h])
        }
      } else {
        cutouts.push([name, x, y, w, h])
      }
    })
    cutouts.map(([name, x, y, w, h]) => {
      const canvas = node('canvas')
      canvas.width = w * scale
      canvas.height = h * scale
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(image, x, y, w, h, 0, 0, w * scale, h * scale)
      sheet[name] = {image:canvas, x, y, w, h}
    })

    return sheet
  }

  definition.draw_sprite = (ctx, sprite, x, y, { scale=1, flip=false, upside_down=false, angle=0, center=false, anchor=center?'.5 .5':'0 0', debug=definition.debug }) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.scale(flip ? -1 : 1, upside_down ? -1 : 1)
    const [anchor_x, anchor_y] = anchor.split(' ').map(parseFloat)
    const off_x = -anchor_x * sprite.image.width * scale
    const off_y = -anchor_y * sprite.image.height * scale
    ctx.drawImage(sprite.image, 0, 0, sprite.image.width, sprite.image.height, off_x, off_y, sprite.image.width * scale, sprite.image.height * scale)
    if (debug) {
      ctx.strokeStyle = 'red'
      ctx.strokeRect(off_x, off_y, sprite.image.width * scale, sprite.image.height * scale)
    }
    ctx.restore()
  }

  names.map(name => window[name] = merge(definition, {version, [name]:version, t:Date.now()}))
}

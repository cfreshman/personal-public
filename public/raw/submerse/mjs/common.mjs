let sheet = undefined
export const get_sheet = () => sheet
export const set_sheet = x => sheet = x

let engine = undefined
export const get_engine = () => engine
export const set_engine = x => engine = x

export const draw_body = (ctx, body, {
  stroke=undefined,
  fill=undefined,
}) => {
  ctx.save()
  if (fill) {
    ctx.fillStyle = fill === true ? 'red' : fill
  } else {
    ctx.fillStyle = 'transparent'
  }
  if (stroke) {
    ctx.strokeStyle = stroke === true ? 'red' : stroke
    ctx.lineWidth = 1
  } else {
    ctx.strokeStyle = ctx.fillStyle
  }
  ctx.beginPath()
  ctx.moveTo(body.vertices[0].x, body.vertices[0].y)
  for (let i = 1; i < body.vertices.length; i++) {
    const v = body.vertices[i]
    ctx.lineTo(v.x, v.y)
  }
  ctx.closePath()
  ctx.stroke()
  ctx.fill()
  ctx.restore()
}
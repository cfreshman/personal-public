import keys from "src/pages/keys"
import { entries, from, merge, named_log } from "./util"
import { V } from "./ve"

/*

draw(ctx)
.circle({ p:{x, y}, r })
.line({ a:{x, y}, b:{x, y}})

*/
type position = {x:number, y:number} | [number, number] | typeof V

const log = named_log('draw')
export const draw = (ctx:CanvasRenderingContext2D) => {
    const _pathed = f => {
        ctx.beginPath()
        f()
        ctx.closePath()
        return this
    }

    return {
        assign: function(options: {
            fillStyle: string,
            strokeStyle: string,
            [key:string]:any
        }) {
            Object.assign(ctx, options)
            return this
        },
        fill: function(fillStyle:string) {return this.assign({fillStyle})},
        stroke: function(strokeStyle:string) {return this.assign({strokeStyle})},
        color: function(style:string) {return this.fill(style).stroke(style)},

        ellipse: function({
            x, y, d=undefined, w=d, h=d, rx=w/2, ry=h/2,
        }) {return _pathed(() => {
            ctx.ellipse(x, y, rx, ry, 0, 0, 2 * Math.PI)
        })},
        circle: function({
            x, y, r=1, d=r*2,
        }) {return this.ellipse({ x, y, d })},
        rectangle: function({
            x, y, s, w=s, h=s,
        }) {return _pathed(() => {
            ctx.fillRect(x, y, w, h)
        })},
        square: function(o: {
            x, y, s
        }) {return this.rectangle(o)},
    }
}

export {
    // from(keys(draw).map(k => [k, (ctx, ...x)=>draw(ctx)[k](...x)])),
}

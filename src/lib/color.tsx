import { triplet } from "./types"
import { bounds, from, named, node } from "./util"
import { V } from "./ve"

export const hexToRgb = (hex:string):triplet<number> =>
    hex.replace(
        /^#?([a-f\d])([a-f\d])([a-f\d])$/i,
        (m, r, g, b) => '#' + r + r + g + g + b + b)
    .substring(1).match(/.{2}/g)
    .map(x => parseInt(x, 16)) as triplet<number>

export const hexToHsl = (hex:string):triplet<number> => {
    // adapted from https://css-tricks.com/converting-color-spaces-in-javascript/#aa-rgb-to-hsl
    
    const rgb = hexToRgb(hex)
    const rgb01 = rgb.map(x => x/255)
    const [r01, g01, b01] = rgb01

    const { min, max, delta} = named('min max delta', bounds(rgb01))
    let [h, s, l] = V.ze(3)

    console.debug('hex to hsl', {hex, rgb, bounds:bounds(rgb01), min, max, delta, hsl:{h,s,l}})

    if (delta == 0) h = 0
    else if (max === r01) h = ((g01 - b01) / delta) % 6
    else if (max == g01) h = (b01 - r01) / delta + 2
    else h = (r01 - g01) / delta + 4
    h = Math.round(h * 60)
    if (h < 0) h += 360

    l = (max + min) / 2
    s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))      
    s = +(s * 100).toFixed(1)
    l = +(l * 100).toFixed(1)

    console.debug('hex to hsl', {hex, rgb, bounds:bounds(rgb01), min, max, delta, hsl:{h,s,l}})
    return [h, s, l]
}

const _formatHex = x => x?.toString(16).padStart(2, '0')
export const rgbToHex = (r, g, b) => `#${[r, g, b].map(_formatHex).join('')}`
export const hex = window['hex'] = (color) => {
    const rgb = /rgb\((.+)\)/i.exec(color)
    const hsl = /hsl\((.+)\)/i.exec(color)
    if(0){}
    else if (rgb) {
        return rgbToHex(...rgb[1].split(/[, ]+/).map(Number) as triplet<number>) 
    }
    else if (hsl) {
        return (x => {
            document.append(x)
            const rgb = getComputedStyle(x).color
            return hex(rgb)
        })(node(`<div style="color:${color}"></div>`))
    }
    else {
        return rgbToHex(...hexToRgb(color) as triplet<number>)
    }
}


export const readable_text = (background='#fff') => {
    if (typeof(background) !== 'string') return

    const rgb = hexToRgb(hex(background))
    const sum = rgb.reduce((a,v)=>a+v,0)
    const max = Math.max(...rgb)
    const weighted = sum/2 + (max * 3)/2
    console.debug({background,rgb,sum,weighted})
    // const [r, g, b] = sum > 255 * 1.5 ? [0, 0, 0] : [255, 255, 255]//hexToRgb(tally.color).map(x => 63 - Math.floor(x / 4) + 128 + 64)
    const base = ((!weighted && weighted !== 0) || weighted > 255 * 1.65) ? [0, 0, 0] : [255, 255, 255]
    // const [r, g, b] = hexToRgb(tally.color).map((x,i) => .5*base[i] + .5*(255 - x)).map(Math.floor)
    const [r, g, b] = base
    return `rgb(${r}, ${g}, ${b})`
}
export const with_opacity = (color, opacity=.5) => {
    if (typeof(color) !== 'string') return
    
    const [r, g, b] = hexToRgb(hex(color))
    console.debug('with opacity', `rgba(${r}, ${g}, ${b}, ${opacity})`)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
}
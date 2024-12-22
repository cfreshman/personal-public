import React, { Fragment, ReactNode, useState } from 'react';
import ReactDOM from 'react-dom';
import { addStyle, useE, useF, useInline, useM, useR, useS } from '../lib/hooks';
import { trigger } from '../lib/trigger';
import url from '../lib/url';
import { QQ, S, defer, entries, isMobile, is_mobile, list, merge, named_log, node, on, randAlphanum, range, set, toStyle } from '../lib/util';
import { Contact } from './base/old/Contact';
import { Comment, External, InfoBody, InfoStyles } from './Info';
import { message } from '../lib/message';
import { JSX, apply } from '../lib/types';
import { A, V } from 'src/lib/ve';
import css from 'src/lib/css';
import { parsePage } from 'src/lib/page';


const log = named_log('modal')

export const Modal = ({ target, children, full=true, block=true, outerClose=false, resizable, style, id='', className='' }: {
    target?: string, children: any, full?: boolean, block?: boolean, outerClose?: boolean | any, style?:string, id?:string, className?:string, resizable?: boolean
}) => {
    const [l, set_element] = useS()

    /* resizable
    z-index: -1;
    position: absolute;
    content: "";
    display: block;
    left: -0.15em;
    top: -0.15em;
    width: calc(100% + 0.3em);
    height: calc(100% + 0.3em);
    box-sizing: border-box;
    border: 0.15em solid transparent;
    */

    const modal = useM(id, className, block, full, style, () => 
        node(`<div id="${id}" class="${'modal ' + className}" style="${`
        position: ${full ? `fixed; top: 0; left: 0;` : `absolute;`}
        ${block ? '' : 'pointer-events: none;'}
        ${full ? `
        height: 100%; width: 100%;
        ` : `
        height: fit-content; width: fit-content;
        box-shadow: 0px 2.5px 1px var(--id-color-text), 0px 0px 1px var(--id-color-text) !important;
        `}
        min-height: 10em;
        z-index: 100100;
        display: flex;
        flex-direction: column;
        align-items: center; justify-content: center;
        opacity: 1 !important;
        animation: none !important;
        overflow: auto;
        ` + style
        }"></div>`))
    useF(modal, set_element)

    const remove_modal = (parent, modal) => parent.removeChild(modal)
    const [displayAttempts, setDisplayAttempts] = useState(0)
    useInline(displayAttempts, () => {
        const parent = document.querySelector(target || '#index')
        if (!parent) {
            const timeout = setTimeout(
                () => setDisplayAttempts(displayAttempts + 1),
                displayAttempts ? 100 : 0) // re-trigger this effect every 100ms until parent found
            return () => clearTimeout(timeout)
        } else {
            parent.insertAdjacentElement('afterbegin', modal)
            if (outerClose) modal.onclick = e => {
                if (e.target === modal) {
                    if (outerClose !== true) outerClose()
                    else remove_modal(parent, modal)
                }
            }
            return () => remove_modal(parent, modal)
        }
    })

    return l ? ReactDOM.createPortal(children, l as Element) : <></>
}

const _tooltipTrigger = trigger.new()
export const Tooltip = ({ of, position, align='center', justify='center', content, click, linger, focus, tooltipStyle, children, ...props }: {
    of, position?: 'top'|'bottom'|'left'|'right'|'top-left'|'top-right'|'bottom-left'|'bottom-right',
    align?, justify?, tooltipStyle?,
    content?, click?, linger?, focus?, children?, [key:string]: any
}) => {
    const [pos, setPos] = useState<[number, number]>()
    const bounds = document.body.getBoundingClientRect()
    let top, bottom, left, right
    if (position) {
        bottom = position.includes('bottom')
        top = position.includes('top')
        right = position.includes('right')
        left = position.includes('left')
    } else {
        top = pos && pos[1] > bounds.width * 3 / 4 // pos && pos[0] > bounds.height / 4 && pos[0] < bounds.height * 3 / 4
        bottom = !top // pos && pos[1] < bounds.height / 2
        left = pos && pos[0] > bounds.width * 3 / 4
        right = pos && pos[0] < bounds.width / 4
    }
    // console.debug('TOOLTIP', pos, of, bottom, middle, right)
    const closeTimeout = useR()
    const handle = {
        open: (e, i=0) => {
            clearTimeout(closeTimeout.current)
            _tooltipTrigger.trigger()
            setPos([e.pageX, e.pageY])
        },
        close: (e, i=0) => {
            closeTimeout.current = setTimeout(() => setPos(undefined), linger ? 100 : 0)
        },
    }
    // _tooltipTrigger.use(() => handle.close(undefined))
    const ref = useR()
    useF([], () => {
        setTimeout(() => {
            const node = ref.current
            const bounds = document.body.getBoundingClientRect()
            const rect = node?.parentNode.getBoundingClientRect()
            const nodeRect = node?.getBoundingClientRect()
            // console.debug('TOOLTIP', node, rect, [top, bottom, left, right])
            if (node) {
                node.style.top = ''
                node.style.bottom = ''
                const minY = 2
                const maxY = bounds.height - nodeRect.height - 2
                if (top) {
                    // node.style.bottom = rect.y+'px'
                    node.style.top = Math.max(rect.top - nodeRect.height - 2, minY) +'px'
                } else if (bottom) {
                    // node.style.top = (rect.y + rect.height)+'px'
                    node.style.top = Math.min(rect.bottom + 2, maxY) +'px'
                } else {
                    node.style.top = Math.min(Math.max(rect.top + rect.height/2 - nodeRect.height/2, minY), maxY) +'px'
                }
                node.style.left = ''
                node.style.right = ''
                const minX = 2
                const maxX = bounds.width - nodeRect.width - 2
                if (left) {
                    // node.style.right = rect.x+'px'
                    node.style.left = Math.max(rect.left - nodeRect.width - 2, minX) +'px'
                } else if (right) {
                    // node.style.left = (rect.x + rect.width)+'px'
                    node.style.left = Math.min(rect.right + 2, maxX) +'px'
                } else {
                    node.style.left = Math.min(Math.max(rect.left + rect.width/2 - nodeRect.width/2, minX), maxX) +'px'
                }
                node.style.visibility = 'visible'
            }
        })
    })
    return <span {...props} className={'tooltip-target '+(props?.className || '')} 
    onMouseOver={click||focus?undefined:handle.open}
    onMouseOut={click||focus?undefined:handle.close}
    onClick={focus ? undefined : pos ? handle.close : handle.open}
    onFocus={focus?handle.open:undefined} onBlur={focus ? e => {
        let node = e.relatedTarget
        while (node) {
            if (node === e.currentTarget) return
            node = node.parentElement
        }
        handle.close(e)
    } : undefined}
    style={{ ...toStyle(`
    text-decoration: underline;
    cursor: pointer;
    position: relative;
    display: inline-flex;
    align-items: ${align};
    justify-content: ${justify};
    `), ...props.style ?? {} }}>
        {content || children}
        {pos && of
        ?
        <div id='tooltip' ref={ref} tabIndex={0} style={Object.assign(toStyle(`
        position: fixed;
        visibility: hidden;
        width: fit-content;
        white-space: pre-wrap;
        width: max-content;
        max-width: min(50vw, 25rem);
        background: var(--id-color-text-readable); color: var(--id-color-text);
        border: 1px solid black;
        border-radius: 2px;
        padding: .25em .5em;
        font-size: .9em;
        z-index: 100100100100100;
        margin: .25em;
        `), tooltipStyle)}>
            {of}
        </div>
        :''}
    </span>
}

let popupsToClose = []
export const openPopup = (
    children: (close: () => any) => ReactNode,
    style='',
    options:{[key:string]:any}={ block: true, allowFocusLoss: false, outerStyle: '', control:{}, persist:false },
) => {
    const parent = document.querySelector('#main')
    // const parent = document.querySelector('#router')
    const node = document.createElement('div')
    node.setAttribute('style', `
        position: fixed; top: 0; left: 0;
        height: 100%; width: 100%;
        z-index: 100100100100100;
        display: flex;
        flex-direction: column;
        align-items: center; justify-content: center;
        opacity: 1 !important;
        animation: none !important;
        // ${options.block ? '' : 'pointer-events: none;'}
        ${options.allowFocusLoss ? 'pointer-events: none;' : ''}`
        + options.outerStyle
        )
    parent.appendChild(node)

    const container = document.createElement('div')
    container.className = 'modal'
    container.setAttribute('style', `
        --popup-container-height: calc(100% - 6rem); height: var(--popup-container-height); max-height: var(--popup-container-height);
        --popup-container-width: calc(100% - 1rem); width: var(--popup-container-width); max-width: var(--popup-container-width);
        
        overflow-y: auto;
        background: var(--id-color-text-readable);
        color: var(--id-color-text);
        white-space: pre-line;
        // font-family: auto;
        padding: 1rem;
        border: 1px solid black;
        box-shadow: 2px 2px var(--id-color-text), 0px 0px 1px var(--id-color-text) !important;
        box-shadow: 0px 2.5px 1px var(--id-color-text), 0px 0px 1px var(--id-color-text) !important;
        position: relative;
        pointer-events: all;
        ` + style)
    node.appendChild(container)

    let closed = false
    const close = () => {
        console.debug('close', closed)
        if (!closed) {
            closed = true
            parent?.removeChild(node)
            window.removeEventListener('click', close)
            options.control?.closed && options.control?.closed()
        }
    }
    ReactDOM.render(children(close) as any, container)
    options.persist || popupsToClose.push(close)

    container.onclick = e => e.stopImmediatePropagation()
    if (!options.allowFocusLoss) {
        container.addEventListener('pointerdown', e => e.stopImmediatePropagation())
        setTimeout(() => window.addEventListener('pointerdown', close))
    }

    return close
}
export const open_popup = (closer, Style=InfoStyles) => {
    return openPopup(close => <Style>
        <InfoBody>
            {closer(close)}
        </InfoBody>
    </Style>, `
    height: max-content;
    width: max-content;
    min-height: 400px;
    min-width: 300px;
    padding: 0;
    `)
}
export const closePopups = () => {
    popupsToClose.map(x => x())
    popupsToClose = []
}

let existingFrame: { open, clear }
let frame_z = 100100100100101
// const unexpanded_frame_projects = set('coffee')
const unexpanded_frame_projects = set('')
export const openFrame = ({ href, style='', options={}, control }: {
    href, style?, options?: {
        additive?:boolean, force?:boolean, persist?:boolean
        height?:string|number, width?:string|number, x?:number, y?:number, scale?:number
    }, control?: { resized?, closed? },
}) => {
    // TODO resizable, minimize
    href = href[0] === '/' ? location.origin+href : href
    const crossOrigin = !href.includes(location.origin)
    if (crossOrigin && !options.force) return url.external(href)
    if (existingFrame && !options.additive) return existingFrame.open(href)

    const formatHref = href => href.replace(location.origin, '').replace(/\/-?/, '/')

    const eventToFrame = e => {
        let node = e.target
        while (node && node.id !== `modal-frame-${id}`) node = node.parentElement
        while (node && !node.classList.contains('modal')) node = node.parentElement
        return node
    }

    const id = randAlphanum(7)
    let timeoutHandle, moveHandler, cancelHandler
    existingFrame = {
        open: (href) => {
            const L = document.querySelector(`#modal-frame-${id}`)
            if (!L) return existingFrame?.clear()
            const innerWindow = L.querySelector('iframe').contentWindow.window
            if (innerWindow['_url']) innerWindow['_url'].push(href.replace(location.origin, ''))
            else innerWindow.location.href = href
        },
        clear: () => {
            clearTimeout(timeoutHandle)
            window.removeEventListener('pointermove', moveHandler)
            window.removeEventListener('pointercancel', cancelHandler)
            existingFrame = undefined
        },
    }
    timeoutHandle = setInterval(() => {
        const L = document.querySelector(`#modal-frame-${id}`)
        // console.debug(L)
        if (!L) return clearTimeout(timeoutHandle)

        if (crossOrigin) return
        try {
            const inner_window = L.querySelector('iframe').contentWindow.window
            const title_l = L.querySelector('.title')
            const inner_title = inner_window.document.title
            const inner_href = inner_window.location.href.replace(location.origin, '')
            const title_link = formatHref(inner_href)
            title_l.innerHTML = (x => {
                x.querySelector('b').textContent = inner_title.replace(/^\//, '')
                return x.outerHTML
            })(node(`<div style="
            white-space: pre;
            overflow: visible;
            display: block;
            flex-shrink: 1;
            "><b></b>&nbsp;<i style="
            width: 0;
            display: inline-block;
            ">${title_link}</i></div>`))
    
            const footer: any = inner_window.document.querySelector('#footer')
            if (footer) footer.style.display = 'none'
        } catch {}
    }, 500)
    let 
    grab,
    move, 
    resize:{ node, origin:[number,number], anchor:[number,number], reference:[number,number], direction:'nw'|'se' },
    backing,
    targets: {
        key?:string,
        x:number,
        y:number,
        width:number,
        height:number,
        resize:string,
    }[]

    const addBacking = () => {
        document.body.append(backing = node(`<div id=frame-drag-backing style="
        position: fixed; top: 0; left: 0; height: 100%; width: 100%;
        background: #0004;
        z-index: 100;
        user-select: none;
        "></div>`))
        
        targets = []
        range(3).map(i => targets.push({
            key: String(targets.length+1),
            x: i * .5, y: .25 - (i === 1 ? .05 : 0),
            width: 10, height: 20,
            resize: `
            top: 0; left: ${i/3 * window.innerWidth}px;
            height: ${window.innerHeight}px; width: ${window.innerWidth/3}px;
            `,
        }))
        range(2).map(r => range(2).map(c => targets.push({
            key: String(targets.length+1),
            x: c * 1, y: r * 1,
            width: 15, height: 15,
            resize: `
            top: ${r/2 * window.innerHeight}px;
            left: ${c/2 * window.innerWidth}px;
            height: ${window.innerHeight/2}px; width: ${window.innerWidth/2}px;
            `,
        })))
        range(2).map(r => targets.push({
            key: String(targets.length+1),
            x: .5, y: r * 1,
            width: 20, height: 10,
            resize: `
            top: ${r/2 * window.innerHeight}px;
            left: 0;
            height: ${window.innerHeight/2}px; width: ${window.innerWidth}px;
            `,
        }))
        // range(2).map(c => targets.push({
        //     key: String(targets.length+1),
        //     x: c * 1, y: .5,
        //     width: 15, height: 15,
        //     resize: `
        //     top: 0px;
        //     left: ${c/2 * window.innerWidth}px;
        //     height: ${window.innerHeight}px; width: ${window.innerWidth/2}px;
        //     `,
        // }))
        // range(2).map(c => targets.push({
        //     key: '0',
        //     x: .5, y: .5,
        //     width: 15, height: 15,
        //     resize: `
        //     top: 0; left: 0;
        //     height: ${window.innerHeight}px; width: ${window.innerWidth}px;
        //     `,
        // }))
        // range(1).map(() => targets.push({
        //     key: '0',
        //     x: .5, y: .5,
        //     width: 10, height: 15,
        //     resize: `
        //     ${options.x ?? options.y !== undefined ? `
        //     left: ${options.x}px; top: ${options.y}px;
        //     ` : ''}
        //     width: min(calc(100% - 3rem), ${options.width ? typeof(options.width) === 'number' ? options.width+'px' : options.width : '40rem'});
        //     height: min(calc(100% - 3rem), ${options.height ? typeof(options.height) === 'number' ? options.height+'px' : options.height : '40rem'});
        //     `,
        // }))

        targets.map((x, i) => backing.append(node(`<div class=frame-drag-target style="
        position: absolute; top: calc((100% - 2em - ${x.height}%) * ${x.y}); left: calc((100% - 2em - ${x.width}%) * ${x.x});
        height: ${x.height}%; width: ${x.width}%;
        background: #fff2;
        margin: 1em;
        border-radius: .25em;
        display: flex; align-items: center; justify-content: center;
        font-size: 2em; color: #fff3; mix-blend-mode: color-burn;
        font-family: Duospace, monospace, system-ui, sans-serif;
        " data-i=${i}>${x.key || '⌥'}</div>`)))

        return
        targets
        .map(x => {
            const dir_a = V.ne(x.x, x.y).ad(V.ne(.5, .5).sc(-1))
            const offset = V.p(V.an(dir_a, 2), 100 * dir_a.no().ma())
            const center = V.ne(innerWidth/2, innerHeight/2)
            const absolute = V.ad(center, offset)
            backing.append(node(`<div style="
            position: fixed;
            top: ${absolute.y - 25}px; left: ${absolute.x - 25}px;
            height: 50px; width: 50px; border-radius: 50%;
            background: #fff; color: #000;
            ">${x.key}</div>`))
            console.debug(x.x, x.y, absolute)
        })
    }
    const startDrag = e => {
        move = e.target
        const l_rect = move.getBoundingClientRect()
        grab = {
            x: e.clientX - l_rect.x,
            y: e.clientY - l_rect.y,
        }
        const L = document.querySelector(`#modal-frame-${id}`)
        if (!L) return existingFrame?.clear()
        const iframe = L.querySelector('iframe')
        iframe.style.pointerEvents = 'none'
        document.body.style.cursor = 'grabbing'

        if (is_mobile) return

        // addBacking()
    }
    const startResize = (e, dir) => {
        const L = document.querySelector(`#modal-frame-${id}`) as any
        if (!L) return existingFrame?.clear()
        const node = L.parentElement
        const rect = node.getBoundingClientRect()
        resize = {
            node,
            origin: [e.clientX, e.clientY],
            anchor: [
                dir.includes('w') ? rect.x + rect.width : rect.x,
                dir.includes('n') ? rect.y + rect.height : rect.y,
            ],
            reference: [rect.width, rect.height],
            direction: dir
        }
        const iframe = L.querySelector('iframe')
        iframe.style.pointerEvents = 'none'
        node.style.cursor = 'all-scroll'
    }
    const bumpZ = (e) => {
        let node = e.currentTarget
        if (!node?.classList) node = (resize?.node || move)
        while (node && !node?.classList.contains('modal')) node = node.parentNode
        node = node?.parentNode
        if (node) {
            node.style.zIndex = (frame_z += 1)

            // idk I this this is overkill but z-index wasn't working
            if (list(document.body.children).slice(-1)[0] !== node) {
                // document.body.append(node)
            }
        }
    }
    moveHandler = e => {
        bumpZ(e)
        if (resize) {
            const node = resize.node
            const absolute = [e.clientX, e.clientY]
            const MIN_DIM = [250, 100]
            node.style.position = 'fixed'
            if (resize.direction.includes('w')) {
                const width = Math.max(MIN_DIM[0], resize.reference[0] - (absolute[0] - resize.origin[0]))
                node.style.left = resize.anchor[0] - width +'px'
                node.style.width = width +'px'
            } else {
                const width = Math.max(MIN_DIM[0], resize.reference[0] + (absolute[0] - resize.origin[0]))
                node.style.left = resize.anchor[0] +'px'
                node.style.width = width +'px'
            }
            if (resize.direction.includes('n')) {
                const height = Math.max(MIN_DIM[1], resize.reference[1] - (absolute[1] - resize.origin[1]))
                node.style.top = resize.anchor[1] - height +'px'
                node.style.height = height +'px'
            } else {
                const height = Math.max(MIN_DIM[1], resize.reference[1] + (absolute[1] - resize.origin[1]))
                node.style.top = resize.anchor[1] +'px'
                node.style.height = height +'px'
            }
            if (resize.direction === 'nw') {
                // const result = [
                //     resize.reference[0] - (absolute[0] - resize.origin[0]),
                //     resize.reference[1] - (absolute[1] - resize.origin[1])
                // ].map((x, i) => Math.max(MIN_DIM[i], x))
                // node.style.left = resize.anchor[0] - result[0] +'px'
                // node.style.top = resize.anchor[1] - result[1] +'px'
                // node.style.width = result[0] +'px'
                // node.style.height = result[1] +'px'
                // node.style.left = absolute[0] +'px'
                // node.style.top = absolute[1] +'px'
                // node.style.width = Math.max(MIN_DIM[0], resize.anchor[0] - absolute[0]) +'px'
                // node.style.height = Math.max(MIN_DIM[1], resize.anchor[1] - absolute[1]) +'px'
            } else {
                // const result = [
                //     resize.reference[0] + (absolute[0] - resize.origin[0]),
                //     resize.reference[1] + (absolute[1] - resize.origin[1])
                // ].map((x, i) => Math.max(MIN_DIM[i], x))
                // node.style.left = resize.anchor[0] +'px'
                // node.style.top = resize.anchor[1] +'px'
                // node.style.width = result[0] +'px'
                // node.style.height = result[1] +'px'
                // node.style.left = Math.min(resize.anchor[0], absolute[0] - MIN_DIM[0]) +'px'
                // node.style.top = Math.min(resize.anchor[1], absolute[1] - MIN_DIM[1]) +'px'
                // node.style.width = Math.max(MIN_DIM[0], absolute[0] - resize.anchor[0]) +'px'
                // node.style.height = Math.max(MIN_DIM[1], absolute[1] - resize.anchor[1]) +'px'
            }
            return
        } else if (move) {
            const rect = move.getBoundingClientRect()
            const title_rect = move.querySelector('.controls').getBoundingClientRect()
            // console.debug(rect)
            const bounds = [
                [0, document.body.clientWidth - rect.width],
                [0, document.body.clientHeight - title_rect.height],
            ]
            move.style.position = 'fixed'
            const actual = V.ne(e.clientX - grab.x, e.clientY - grab.y)
            move.style.left = //rect.x + e.movementX
                Math.max(
                bounds[0][0], Math.min(
                // rect.x + e.movementX,
                actual.x,
                bounds[0][1]))
                +'px'
            move.style.top = //rect.y + e.movementY
                Math.max(
                bounds[1][0], Math.min(
                actual.y,
                // e.clientY - title_rect.height/2,
                bounds[1][1])
                )
                +'px'


            return
            const center = V.ne(innerWidth/2, innerHeight/2)
            const p = actual.ad(center.sc(-1)).sc(.95).ad(center)
            log(e.clientX, e.clientY, center, p,
                p.x < rect.width/2, p.y < rect.height/2, innerWidth-rect.width/2 < p.x, innerHeight-rect.height/2 < p.y,
                rect.width, rect.height)
            if (p.x < bounds[0][0] || p.y < bounds[0][1] || bounds[1][0] < p.x || bounds[1][1] < p.y) {
                const off = V.ad(p, center.sc(-1))
                const off_an = V.an(off, 2)

                // const nearest = 
                // targets
                // .map<[number, any]>(x => [
                //     A.ua(off_an, V.ne(x.x, x.y).ad(V.ne(.5, .5).sc(-1)).an(2)),
                //     x,
                // ])
                // .sort((a, b) => a[0] - b[0])
                // [0][1]

                // const nearest = 
                // targets
                // .map(x => {
                //     const dir_a = V.ne(x.x, x.y).ad(V.ne(.5, .5).sc(-1))
                //     const offset = V.p(V.an(dir_a, 2), 100 * dir_a.no().ma())
                //     const center = V.ne(innerWidth/2, innerHeight/2)
                //     const absolute = V.ad(center, offset)
                //     backing.append(node(`<div style="
                //     position: fixed;
                //     top: ${absolute.y - 25}px; left: ${absolute.x - 25}px;
                //     height: 50px; width: 50px; border-radius: 50%;
                //     background: #fff; color: #000;
                //     ">${x.key}</div>`))
                //     console.debug(x.x, x.y, absolute)


                //     return [
                //         dir_a.ma() ? A.ua(dir_a.an(2), off_an) : 1e9,
                //         x,
                //     ]
                // })
                // .sort((a, b) => a[0] - b[0])
                // [0][1]

                const nearest = QQ('#frame-drag-backing .frame-drag-target').map(x => {
                    const rect = x.getBoundingClientRect()
                    return [
                        A.ua(off_an, V.ne(rect.x + rect.width/2, rect.y + rect.height/2).ad(V.ne(innerWidth, innerHeight).sc(-.5)).an(2)),
                        targets[Number(x.dataset['i'])]
                    ]
                })
                .sort((a, b) => a[0] - b[0])
                [0][1]

                const l = move
                cancelDrag()
                l.style.cssText += nearest.resize
            }
        }
    }
    window.addEventListener('pointermove', moveHandler)
    window.addEventListener('keydown', e => {
        if (backing) {
            const style = backing.querySelector('style') || (x => {backing.append(x);return x})(node('<style></style>'))
            console.debug(e, backing, style)
            style.innerHTML = `
            .frame-drag-target {
                ${e.altKey ? `
                background: #fff !important;
                `:''}
            }
            `

            const target = targets.find(x => x.key === e.key)
            if (target) {
                const l = move
                cancelDrag()
                l.style.cssText += target.resize
            }
        }
    })

    const cancelDrag = () => {
        if (move || resize) {
            move = resize = undefined
            const L = document.querySelector(`#modal-frame-${id}`) as any
            if (!L) return existingFrame?.clear()
            control?.resized && control?.resized(L.getBoundingClientRect())
            const iframe = L.querySelector('iframe')
            iframe.style.pointerEvents = 'all'
            document.body.style.cursor = 'grab'
            L.style.cursor = 'default'
            backing?.remove()
            backing = targets = undefined
        }
    }
    cancelHandler = cancelDrag
    window.addEventListener('pointercancel', cancelDrag)
    window.addEventListener('pointerup', cancelDrag)

    let collapsed = false
    const toggleCollapse = async () => {
        const L = document.querySelector(`#modal-frame-${id}`) as any
        if (!L) return existingFrame.clear()
        collapsed = !collapsed
        const controls = L.querySelector('.controls') as any
        const node = L.parentNode
        const rect = node.getBoundingClientRect()
        node.style.position = 'fixed'
        node.style.left = rect.left +'px'
        node.style.top = rect.top +'px'
        node.style.maxHeight = collapsed ? controls.clientHeight+2+'px' : ''
        node.style.maxWidth = collapsed ? 'fit-content' : ''
        await Promise.resolve()
        const newRect = node.getBoundingClientRect()
        node.style.left = rect.left + rect.width - newRect.width +'px'
    }

    return openPopup(_close => {
        const close = () => {
            _close()
            backing?.remove()
        }
        return <div id={`modal-frame-${id}`}
        onClickCapture={e => {
            e.stopPropagation()
            cancelDrag()
            bumpZ(e)
        }}
        style={toStyle(`
        height: 100%;
        width: 100%;
        border: 0;
        font-family: Duospace, monospace, system-ui, sans-serif;
        user-select: none;
        overflow: hidden;
        background: var(--id-color-text-readable); color: var(--id-color-text);
        `)}>
            <div style={toStyle(`
            position: absolute;
            z-index: -1;
            cursor: nw-resize;
            width: 50%; height: 50%;
            top: -0.5em; left: -0.5em;
            `)}
            onPointerDown={e => startResize(e, 'nw')} />
            <div style={toStyle(`
            position: absolute;
            z-index: -1;
            cursor: ne-resize;
            width: 50%; height: 50%;
            top: -0.5em; right: -0.5em;
            `)}
            onPointerDown={e => startResize(e, 'ne')} />
            <div style={toStyle(`
            position: absolute;
            z-index: -1;
            cursor: sw-resize;
            width: 50%; height: 50%;
            bottom: -0.5em; left: -0.5em;
            `)}
            onPointerDown={e => startResize(e, 'sw')} />
            <div style={toStyle(`
            position: absolute;
            z-index: -1;
            cursor: se-resize;
            width: 50%; height: 50%;
            bottom: -0.5em; right: -0.5em;
            `)}
            onPointerDown={e => startResize(e, 'se')} />
            <div
            className='controls'
            onPointerDown={(e: any) => {
                let node = e.target
                while (node.id !== `modal-frame-${id}`) node = node.parentElement
                while (!node.classList.contains('modal')) node = node.parentElement
                // console.debug(node)
                e.target = node
                startDrag(e)
            }}
            style={toStyle(`
            padding-left: .25em;
            display: flex;
            font-size: .8em;
            line-height: 1.4;
            cursor: grab;
            
            align-items: center;
            overflow: visible;
            color: var(--id-color-text-readable);
            `)}>
                <div className='position'
                onPointerDownCapture={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    console.debug('position')
                    const L = e.currentTarget
                    const rect = L.getBoundingClientRect()

                    // addBacking()
                    const control = {
                        closed: () => {
                            // backing?.remove()
                            // backing = undefined
                            // move = undefined
                            cancelDrag()
                            backing?.remove()
                        }
                    }
            
                    openPopup(
                        close => <div 
                        onPointerDown={(e: any) => {
                            // let node = e.target
                            // while (node.id !== `modal-frame-${id}`) node = node.parentElement
                            // while (!node.classList.contains('modal')) node = node.parentElement
                            // // console.debug(node)
                            // e.target = node
                            // startDrag(e)
                            cancelDrag()
                            backing?.remove()
                        }}>
                            {entries({
                                'top-bottom': range(2).map(r => ({
                                    x: 0, y: r * .5,
                                    width: 1, height: .5,
                                })),
                                'left-right': range(2).map(c => ({
                                    x: c * .5, y: 0,
                                    width: .5, height: 1,
                                })),
                                'thirds': range(3).map(c => ({
                                    x: c * .333, y: 0,
                                    width: .333, height: 1,
                                })),
                                'fourths': range(4).map(c => ({
                                    x: c * .25, y: 0,
                                    width: .25, height: 1,
                                })),
                                'corners': range(2).flatMap(r => range(2).map(c => ({
                                    x: c * .5, y: r * .5,
                                    width: .5, height: .5,
                                }))),
                                'center': [{
                                    x: .125/2, y: .175/2,
                                    width: 1 - .125, height: 1 - .175,
                                }],
                            }).map(([name, places]) =>
                            <>
                                <div style={S(`
                                font-size: 3em; height: 1em; width: 1em;
                                position: relative;
                                background: #8882; border: 1px solid #8882;
                                `)}>
                                    {places
                                    .map(place => 
                                    <div onClick={e => {
                                        // const L = eventToFrame(e)
                                        const L = document.querySelector(`#modal-frame-${id}`).parentElement
                                        console.debug('style', L, L.style['--popup-width'])
                                        // L.style['--popup-width'] = `calc(100vw * ${place.width})`
                                        // L.style['--popup-height'] = `calc(100vh * ${place.height})`
                                        const height = `calc(100vh * ${place.height})`
                                        const width = `calc(100vw * ${place.width})`
                                        Object.assign(L.style, {
                                            position: 'fixed',
                                            top: `calc(100vh * ${place.y})`,
                                            left: `calc(100vw * ${place.x})`,
                                            height, maxHeight:height,
                                            width, maxWidth:width,
                                        })
                                    }} style={S(`
                                    position: absolute;
                                    left: calc(100% * ${place.x});
                                    top: calc(100% * ${place.y});
                                    width: calc(100% * ${place.width}); max-width: calc(100% * ${place.width});
                                    height: calc(100% * ${place.height}); max-height: calc(100% * ${place.height});
                                    color: inherit; background: currentcolor;
                                    border: 1px solid #0000; box-sizing: border-box; background-clip: content-box;
                                    border-radius: 2px;
                                    cursor: pointer;
                                    `)} onPointerOver={e => {
                                        e.currentTarget.style.opacity = '.67'
                                    }} onPointerOut={e => {
                                        e.currentTarget.style.opacity = '1'
                                    }}></div>)}
                                </div>
                                <span style={S(`
                                font-size: .67em;
                                line-height: 1.3;
                                font-style: italic;
                                opactiy: .5;
                                margin-bottom: .5em;
                                vertical-align: top;
                                `)}>{name}</span>
                            </>)}
                        </div>,
                        `
                        height: fit-content;
                        width: fit-content;
                        position: fixed;
                        left: ${rect.x - 4}px;
                        top: ${rect.y + rect.height + 6}px;
                        height: max-content;
                        width: max-content;
                        ${css.mixin.column}
                        box-shadow: none;
                        border: inherit;
                        border: 0;
                        border-radius: 2px;
                        padding: .25em .25em; padding-right: .5em;
                        font-family: monospace;
                        box-shadow: 0 0 1px .5px currentcolor;
                        background: var(--id-color-text-readable);
                        color: var(--id-color-text);
                        border: 1px solid #000 !important;
                        box-shadow: 0px 2.5px 1px var(--id-color-text), 0px 0px 1px var(--id-color-text) !important;
                        `,
                        {
                            control,
                        })
                }}
                style={toStyle(`
                border: none;
                text-shadow: none;
                width: 1.2rem; height: 1.2rem;
                font-size: .7rem;
                display: flex; align-items: center; justify-content: center;
                padding: .2em;
                cursor: pointer;
                position: relative;
                color: var(--id-color-text);
                `)}>
                    {entries({
                        'corners': range(2).flatMap(r => range(2).map(c => ({
                            x: c * .5, y: r * .5,
                            width: .5, height: .5,
                        }))),
                    }).map(([name, places]) =>
                    <div style={S(`
                    position: relative; display: flex; flex-wrap: wrap;
                    height: 100%; width: 100%;
                    `)}>
                        {places
                        .map(place => 
                        <div style={S(`
                        flex-shrink: 0;
                        width: calc(100% * ${place.width});
                        height: calc(100% * ${place.height});
                        x: calc(100% * ${place.x});
                        y: calc(100% * ${place.y});
                        color: inherit; background: currentcolor;
                        border: 1px solid #0000; box-sizing: border-box; background-clip: content-box;
                        border-radius: 2px;
                        cursor: pointer;
                        `)}></div>)}
                    </div>
                    )}
                </div>

                &nbsp;
                <span className='title' style={S(`
                color: var(--id-color-text);
                `)}>
                    {crossOrigin
                    ? <External to={href} onClick={close} />
                    : formatHref(href)}
                </span>
                <div style={S(`
                flex-grow: 1;
                `)}></div>

                <div className='center-row' style={S(`
                gap: .5em; padding: 0 .5em;
                align-self: stretch;
                `)}>
                    <div
                    onPointerDown={e => {
                        e.stopPropagation()
                        const frame = e.currentTarget.parentNode?.parentNode?.parentNode?.querySelector('iframe')
                        log('reload', { frame })
                        if (frame) frame.src = frame.src
                    }}
                    style={toStyle(`
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                    height: 1em; width: 1em;
                    border-radius: 50%;
                    box-sizing: border-box;
                    border-radius: 10em;
                    text-decoration: none;
                    pointer-events: all;

                    background: var(--id-color-text); color: var(--id-color-text-readable);
                    font-family: monospace;
                    filter: contrast(.9) brightness(.9);
                    `)}>↻</div>
                    <div
                    onPointerDown={e => {
                        e.preventDefault()
                        e.stopPropagation()
                        console.debug('collapse')
                        toggleCollapse()
                    }}
                    style={toStyle(`
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                    height: 1em; width: 1em;
                    border-radius: 50%;
                    box-sizing: border-box;
                    border-radius: 10em;
                    text-decoration: none;
                    pointer-events: all;

                    background: var(--id-color-text);
                    filter: contrast(0.25) brightness(1.75);
                    `)} />
                    <div
                    onPointerDown={e => {
                        e.preventDefault()
                        e.stopPropagation()
                        console.debug('close')
                        close()
                    }}
                    style={toStyle(`
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                    height: 1em; width: 1em;
                    border-radius: 50%;
                    box-sizing: border-box;
                    border-radius: 10em;
                    text-decoration: none;
                    pointer-events: all;

                    background: #f17a7a;
                    `)} />
                </div>
            </div>
            <iframe
            src={href.replace(location.origin, '').replace(/^\/-?/, (unexpanded_frame_projects.has(parsePage(href.replace(location.origin, '')))) ? '/' : '/-')}
            style={toStyle(`
            height: calc(100% - 1.2em);
            width: 100%;
            border: 0;
            user-select: none;
            
            ${options.scale ? `
            scale: ${options.scale};
            transform-origin: 0 0;
            width: calc(100% / ${options.scale});
            height: calc((100% - 1.2em) / ${options.scale});
            `:''}
            `)}
            referrerPolicy='same-origin'
            />
        </div>
    }, `
    padding: 0;
    border-radius: 0.2em;
    ${options.x ?? options.y !== undefined ? `
    position: fixed;
    left: ${options.x}px; top: ${options.y}px;
    ` : ''}
    --popup-width: min(calc(100% - 3rem), ${options.width ? typeof(options.width) === 'number' ? options.width+'px' : options.width : '40rem'});
    --popup-height: min(calc(100% - 3rem), ${options.height ? typeof(options.height) === 'number' ? options.height+'px' : options.height : '40rem'});
    width: var(--popup-width); max-width: var(--popup-width);
    height: var(--popup-height); max-height: var(--popup-height);
    overflow: visible;
    `+style, {
        allowFocusLoss: true,
        persist: options.persist,
        control,
    })
}

const resolveCssDimension = (x:string|number) => typeof(x)==='number'?x+'px':x
export const openFloat = (
    el, {x='10%', y='10%', height='fit-content', width='fit-content'}={}as{[key:string]:string|number}
) => {
    const container = node(`<div style="
    position: fixed;
    top: ${resolveCssDimension(y)}; left: ${resolveCssDimension(x)};
    height: ${resolveCssDimension(height)};
    width: ${resolveCssDimension(width)};
    z-index: 100100100;
    "></div>`)
    container.append(el)
    document.body.append(container)
    const close = () => container.remove()
    return close
}


const X = ({ size='1em', fill, ...props }: {
    size?: string, fill?: string, [key:string]: any,
}) => {
    return <svg className='X'
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img"
    width={size} height={size} preserveAspectRatio="xMidYMid meet"
    viewBox="0 0 460.775 460.775" fill={fill || 'currentColor'} {...props}>
        <Comment text='https://www.svgrepo.com/svg/12848/x-symbol' />
        <path d="M285.08,230.397L456.218,59.27c6.076-6.077,6.076-15.911,0-21.986L423.511,4.565c-2.913-2.911-6.866-4.55-10.992-4.55
            c-4.127,0-8.08,1.639-10.993,4.55l-171.138,171.14L59.25,4.565c-2.913-2.911-6.866-4.55-10.993-4.55
            c-4.126,0-8.08,1.639-10.992,4.55L4.558,37.284c-6.077,6.075-6.077,15.909,0,21.986l171.138,171.128L4.575,401.505
            c-6.074,6.077-6.074,15.911,0,21.986l32.709,32.719c2.911,2.911,6.865,4.55,10.992,4.55c4.127,0,8.08-1.639,10.994-4.55
            l171.117-171.12l171.118,171.12c2.913,2.911,6.866,4.55,10.993,4.55c4.128,0,8.081-1.639,10.992-4.55l32.709-32.719
            c6.074-6.075,6.074-15.909,0-21.986L285.08,230.397z"/>
    </svg>
}

addStyle(`
#feedback {
    font-family: 'Duospace', monospace;
    color: var(--id-color-text);
}
#feedback #contact-container a, #feedback #contact-container button {
    color: var(--id-color-text);
    border-bottom: 1px solid currentColor;
    text-decoration: none !important;
}
#feedback #contact-container a:hover, #feedback #contact-container a:active {
    text-decoration: none;
    border-color: transparent;
    box-shadow: none;
}
#feedback #contact-container .content, #feedback #contact-container .contact, #feedback #contact-container .send:not(:hover), #feedback #contact-container .confirmation {
    background: #fff1 !important;
    color: var(--id-color-text) !important;
}
#feedback #contact-container .send:not(:hover) {
    background: none !important;
}
#feedback #contact-container * {
    text-shadow: none !important;
}
#feedback #contact-container :is(textarea, input) {
    // color: #000d !important;
    color: black !important;
    border: 1px solid var(--id-color-text);
    outline-color: #000d !important;
    background: #eee !important;
    border-radius: 2px;
}
#feedback #contact-container textarea {
    min-height: 20em;
}
#feedback #contact-container a {
    align-self: flex-end;
    border-radius: 0;
    font-size: 1.25em;
    text-transform: uppercase;
}
`)
export const openFeedback = ({ style='', title=undefined, prefill=undefined }={}) => {
    !isMobile && setTimeout(() => (document.querySelector('#feedback .content') as HTMLElement)?.focus())
    message.trigger({
        text: <div id='feedback' style={{minWidth:'min(20em, calc(100vw - 1em))'}}>
            {title
            ? title
            : <>
                {/* ENTER FEEDBACK <i style={{fontSize:'.9em'}}><a href='https://github.com/cfreshman/cfreshman/issues/new/choose'>or open an issue on GitHub</a></i>{location.host + location.pathname + location.search + location.hash} feedback */}
                QUICK FEEDBACK
            </>}
            <style>
                {`
                #feedback #contact-container {
                    margin-right: -2.5em;
                    * {
                        color: inherit;
                    }
                }
                #feedback #contact-container :is(.content) {
                    margin-top: .5em;
                }
                #feedback #contact-container :is(.content)::placeholder {
                    opacity: 0;
                }
                #feedback #contact-container :is(.content, .contact) {
                    border-width: 1px !important;
                    border-radius: 0 !important;
                }
                `}
            </style>
            <Contact newStyles prefill={prefill} />
        </div>,
        id: 'feedback',
    })
    return () => message.trigger({
        delete: 'feedback'
    })
    // return openPopup(close => <div id='feedback'>
    //     ENTER FEEDBACK <i style={{fontSize:'.9em'}}><a href='https://github.com/cfreshman/cfreshman/issues/new/choose'>or open an issue on GitHub</a></i>{/* {location.host + location.pathname + location.search + location.hash} feedback */}
    //     <Contact newStyles />
    // </div>, `
    // max-width: 40rem;
    // color: black;
    // // background: #222;
    // `, {
    //     outerStyle: `
    //     background: #fff8;
    //     `,
    // })
}
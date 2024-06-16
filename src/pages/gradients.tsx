import React, { Fragment, useEffect, useState } from 'react';
import { useE, useEventListener, useF, useSkip } from '../lib/hooks';
import styled from 'styled-components';
import { array, randi } from '../lib/util';
import { copy } from '../lib/copy';
import { store } from '../lib/store';
import { usePageSettings } from 'src/lib/hooks_ext';
import { triplet } from 'src/lib/types';
import url from 'src/lib/url';

const { named_log, lists } = window as any
const log = named_log('gradients')

const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
}).join('')

const hexToRgb = (hex:string):triplet<number> => lists.group(lists.of(hex.slice(1), ''), 2).map(x => x.join('')).map(x => parseInt(x, 16))


class Color {
    rgb: number[]
    hex: string

    constructor(r, g, b) {
        [r, g, b] = [r, g, b].map(Math.round)
        this.rgb = [r, g, b]
        this.hex = rgbToHex(r, g, b)
    }
    static random() {
        return new Color(randi(256), randi(256), randi(256))
    }
    static gradient(start: Color, end: Color, steps: number): Color[] {
        if (steps < 1) return [start, end]
        return [
            start,
            ...array(steps, i => {
                const percent = (i + 1)/(steps + 2)
                return start.lerp(end, percent)
            }),
            end,
        ]
    }

    lerp(other: Color, percent: number): Color {
        percent = Math.max(0, Math.min(percent, 1))
        const remain = 1 - percent
        const [r, g, b] = this.rgb
        const [R, G, B] = other.rgb
        return new Color(remain * r + percent * R, remain * g + percent * G, remain * b + percent * B)
    }
    inverse(): Color {
        const [r, g, b] = this.rgb
        return new Color(255 - r, 255 - g, 255 - b)
    }
}

const gradientHistory = 'gradientHistory'
export default () => {
    const [history, setHistory] = useState(store.get(gradientHistory)||[])
    const [index, setIndex] = useState(-1)
    const [all, setAll] = useState(true)
    const [shift, setShift] = useState(false)
    const [explain, setExplain] = useState(false)

    const handle = {
        add: (gradient: Color[], oldHistory?: Color[][]) => {
            oldHistory = oldHistory ?? (history || [])
            setCopied(-1)
            setHistory([...oldHistory, gradient])
            setIndex(oldHistory.length)
            setAll(false)
        },
        generate: (oldHistory?: Color[][]) => {
            const start = Color.random()
            const end = Color.random()
            const steps = 1 + randi(5)
            const newGradient = Color.gradient(start, end, steps)
            handle.add(newGradient, oldHistory)
        },
        delete: (i?: number) => {
            i = i ?? index
            const newHistory = history.slice()
            newHistory.splice(i, 1)
            setHistory(newHistory)
            if (index === newHistory.length) {
                if (all) {
                    setIndex(index - 1)
                } else {
                    handle.generate(newHistory)
                }
            }
        },
        next: () => {
            if (index < 0) {
                setIndex(history.length - 1)
                return
            }
            const newIndex = index + 1
            if (newIndex >= history.length) {
                // handle.generate()
            } else {
                setIndex(newIndex)
            }
        },
        previous: () => {
            index < 0 ? setIndex(0) : setIndex(Math.max(0, index - 1))
        },
    }

    useF(() => {
        let slug_gradient = false
        const slug = location.hash.slice(1)
        log(slug)
        if (slug) {
            const hexes = slug.split('-').filter(x => /[a-f0-9]{6}/i.test(x))
            log(hexes, history)
            if (hexes.length) {
                slug_gradient = true
                setAll(false)
                const index_gradient = history.findIndex(x => x.every((y, i) => hexes[i] === y.hex.slice(1)))
                if (index_gradient > -1) {
                    setIndex(index_gradient)
                } else {
                    const gradient = hexes.map(raw_hex => {
                        const hex = '#' + raw_hex
                        const rgb = hexToRgb(hex)
                        return new Color(...rgb)
                    })
                    log(gradient)
                    handle.add(gradient, history)
                    // setTimeout(() => {
                    //     url.replace(location.pathname + '#' + slug)
                    //     location.reload()
                    // })
                }
            }
        }
        
        if (!slug_gradient) {
            if (history?.length) {
                setIndex(index < 0 ? index : history.length - 1)
            } else {
                handle.generate()
            }
        }
    })
    useSkip(useF, history, () => {
        history && store.set(gradientHistory, history)
        if (history?.length === 0) {
            handle.generate()
        }
    })
    useSkip(useF, history, index, all, () => {
        if (history && !all) {
            const gradient = history[index]
            const hexes = gradient.map(x => x.hex)
            const slug = hexes.map(x => x.slice(1)).join('-')
            location.hash = slug
        } else {
            location.hash = ''
        }
    })
    useEventListener(window, 'keydown', (e: KeyboardEvent) => {
        setShift(e.key === 'Delete' ? true : shift)
        if (e.key === ' ') handle.generate()
        if (e.key === 'ArrowLeft') handle.previous()
        if (e.key === 'ArrowRight') handle.next()
        if (e.key === 'ArrowUp') {
            if (index === history.length - 1) {
                handle.generate()
            } else {
                setIndex(history.length - 1)
            }
        }
        if (e.key === 'ArrowDown') setIndex(0)
        if (index < 0) return
        if (e.key === 'Backspace') handle.delete()
        if (e.key === 'Escape') all ? setIndex(-1) : setAll(true)
        if (e.key === 'Enter') setAll(!all)
    })
    useEventListener(window, 'keyup', (e: KeyboardEvent) => {
        setShift(e.key === 'Delete' ? false : shift)
    })

    const [copied, setCopied] = useState(-1)

    usePageSettings({
        professional: true,
    })
    return <Style>
        <div className="controls">
            {explain
            ? <a onClick={e => setExplain(false)}>oh alrighty then</a>
            : all ? <a onClick={e => setExplain(true)}>hmm?</a> : null}
            {explain || all ? null : <>
                <a onClick={e => { setAll(true) }}>view all</a>
                <a onClick={e => { handle.previous() }}>previous</a>
                <a onClick={e => { handle.next() }}>next</a>
            </>}
            <div className="spacer" />
            {all && index < 0 ? null : <a onClick={e => { handle.delete() }}>delete</a>}
            {explain ? null : <a onClick={e => { handle.generate() }}>generate</a>}
        </div>
        {explain
        ? <div className='explain'>
{`
a gradient curation tool - for inspiration purposes
simply generates two random colors and a gradient between them

directions:
1. generate some gradients
2. delete the ones you don't like
3. back to step 1

double-click on a gradient to view & copy color codes

you can navigate with keys as well:
left      - previous
right     - next
up        - last, then generate
down      - first
backspace - delete
enter     - open selected, or close
escape    - close, then deselect
`}
        </div>
        :
        all && history
        ?
        <div className={`all shift-${shift}`} onClick={e => { setIndex(-1) }}>
            {history.map((gradient, g_i) =>
                <div key={g_i} className={`gradient select-${index === g_i}`} onClick={e => {
                    e.stopPropagation()
                    if (false && shift) {
                        handle.delete(g_i)
                    } else if (index === g_i) {
                        setAll(false)
                    } else {
                        setIndex(g_i)
                    }
                }}>
                    {gradient.map((color, i) =>
                    <div className="color" key={i} style={{background: color.hex, flexGrow: 2 + i}} />)}
                </div>
            )}
        </div>
        :
        <div className="gradient">
            {!history ? '' : (history[index] || []).map((color, i) =>
            <div className="color" key={i}
            style={{background: color.hex, flexGrow: 1 + i}}
            onClick={e => {
                copy(color.hex)
                setCopied(i)
                setTimeout(() => setCopied(-1), 2000)
            }}>
                <span className="text">{copied === i ? 'copied!' : color.hex}</span>
                </div>)}
        </div>
        }
    </Style>
}

const Style = styled.div`
height: 100%;
width: 100%;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
background: black;
border: 1px solid #fff;

.controls {
    width: 100%;
    display: flex;
    // background: var(--dark-l);
    font-size: .8rem;
    padding: .2rem .5rem;
    gap: .5rem;
    flex-shrink: 0;

    > * {
        cursor: pointer;
        opacity: .8;

        &.true, &:hover {
            opacity: 1;
            text-decoration: underline;
        }
    }
    .spacer {
        flex-grow: 1;
    }

    a {
        text-decoration: underline;
        &:hover {
            text-decoration: none;
        }
    }
}

.all {
    user-select: none;
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
    align-content: flex-start;
    justify-content: flex-start;
    overflow-y: auto;

    background: black;
    padding: 1rem;
    padding-top: 0;

    .gradient {
        height: 5rem;
        width: 5rem;
        padding: 0;
        margin: 1rem;

        margin: .5rem;
        border: .25rem solid transparent;
        &.select-true {
            border-color: white;
            // padding: .25rem;
            background: white;
            // border-radius: .1rem;
        }
    }
    .color {
        min-width: 0rem;
        width: 100%;
        padding: 0;
    }
}
.all.shift-true .gradient .color {
    cursor: not-allowed;
}

.gradient {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: black;

    padding: 1rem;
}

.color {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    cursor: pointer;

    color: transparent;
    min-width: 10rem;
    text-shadow: none;
    padding: .25rem;
    height: 0;

    color: #ffffff44;
    // text-shadow: 1px 2px 4px #00000020;
    .text {
        // background-color: #ffffff22;
        // border: .1rem solid #ffffff22;
    }

    .text {
        width: fit-content;
        padding: 0 .25rem;
        border-radius: .25rem;
        cursor: pointer;
    }
    &:hover {
        // color: #ffffffbb;
        color: white;
        text-shadow: 1px 2px 4px #00000020;
        .text {
            background-color: #ffffff22;
        }
    }
}

.explain {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
    align-content: flex-start;
    justify-content: flex-start;
    overflow-y: auto;

    background: #000; color: #fff;
    padding: 1rem;
    padding-top: 0;
    white-space: pre;
}
`
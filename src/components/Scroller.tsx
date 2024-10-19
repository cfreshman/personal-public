/**
 * Use page scrollbar for inner element
 * (prev: Scrollbar placed next to element instead of inside)
 */

import React from 'react';
import { cleanListener, useE, useEventListener, useF, useM, useR, useStyle, useTimeout } from '../lib/hooks';
import { JSX } from '../lib/types';
import { isMobile } from '../lib/util';

let i = 0
export const Scroller = ({ deps=[], scrollBarSelector='#main' }) => {
    if (isMobile) return <></>

    const ref = useR()
    const scrollerRef = useR()
    const resize = () => {
        const node = scrollerRef.current
        const inner = node.firstChild

        const scrolled = ref.current?.parentElement
        if (!scrolled) return
        const scrolledRect = scrolled.getBoundingClientRect()
        const nodeRect = node.getBoundingClientRect()

        // console.debug(scrolled, scrolled.scrollHeight, node, inner)

        // want to model node as scrolled, so need same amout of overflow
        // inner.height = node.height + (scrolled.scrollHeight - scrolled.height)

        node.classList.add('scroller')
        node.setAttribute('style', `
            position: fixed;
            // top: ${scrolledRect.y}px;
            // left: ${scrolledRect.x + scrolledRect.width}px;
            // height: ${scrolledRect.height}px;
            // width: .5rem;
            // z-index: 9999;
            top: 0;
            right: 0;
            height: 100%;
            width: 100%;
            z-index: -1;
            overflow-y: auto;
            overflow-x: hidden;
            `)
        inner.setAttribute('style', `
            height: ${scrolled.scrollHeight}px;
            height: ${nodeRect.height + (scrolled.scrollHeight - scrolledRect.height)}px;
            width: .5rem;
            // z-index: 1;
            `)
    }

    const scrolledClass = useM(() => `scroller-${i++}`)
    useStyle(`
    .${scrolledClass}::-webkit-scrollbar { display: none } `)
    useE(() => {
        const scrolled = ref.current.parentElement
        scrolled.classList.add(scrolledClass)
        scrolled.style.overflowY = 'scroll'

        const node = document.createElement('div')
        const inner = document.createElement('div')
        node.append(inner)

        scrollerRef.current = node
        resize()

        let scrollBarNode
        setTimeout(() => {
            scrollBarNode = document.querySelector(scrollBarSelector)
            scrollBarNode.insertAdjacentElement('afterbegin', node)
            console.debug(scrollBarNode)
        })
        let assigned = false
        return [
            () => scrollBarNode.removeChild(node),
            cleanListener(scrolled, 'scroll', () => {
                // if (inner.scrollHeight !== scrolled.scrollHeight) {
                //     inner.style.height = scrolled.scrollHeight+'px'
                // }
                if (!assigned) {
                    node.scrollTop = scrolled.scrollTop
                    assigned = true
                } else {
                    assigned = false
                }
            }),
            cleanListener(node, 'scroll', () => {
                // if (inner.scrollHeight !== scrolled.scrollHeight) {
                //     inner.style.height = scrolled.scrollHeight+'px'
                // }
                if (!assigned) {
                    scrolled.scrollTop = node.scrollTop
                    assigned = true
                } else {
                    assigned = false
                }
            }),
        ]
    })
    useEventListener(window, 'resize pointerup', () => setTimeout(resize))
    useF(...deps, resize)
    useTimeout(resize, 500)
    return <span ref={ref} style={{display:'none'}} />
}
import { useState } from "react"
import { useE, useEventListener, useI, useInterval, useR, useTimeout } from "./hooks"


// with multiple useShrinks, use innermost element
const _shrink = {
  inners: [] as [number, HTMLElement][],
  innermost: undefined,
  timeout: undefined,
  previousStyleWidth: undefined,
  previousStyleHeight: undefined,
  ms: 100,
}
const shrink = (inner, outer) => {
  if (!_shrink.innermost && _shrink.inners.length) {
    const minPriority = Math.min(..._shrink.inners.map(x => x[0]))
    _shrink.innermost = (_shrink.inners.find(x => x[0] === minPriority) || [])[1]
    // TODO actually sort within priority
  }
  // console.debug('SHRINK', outer, inner, _shrink.innermost, _shrink.inners)
  if (inner !== _shrink.innermost) return
  clearTimeout(_shrink.timeout)

  // if (outer) {
  //   const prevWidth = outer.style.width
  //   outer.classList.remove('shrink')
  //   outer.style.width = ''
  //   if (inner) {
  //     const contentWidth = (outer.clientWidth/2 - inner.offsetLeft) * 2
  //     outer.style.width = prevWidth
  //     setTimeout(() => {
  //       outer.classList.add('shrink')
  //       outer.style.width = contentWidth+'px'
  //     })
  //   }
  // }
  if (outer) {
    const previous = outer.clientWidth
    const previousStyle = outer.style.width
    outer.style.width = outer.style.transition = ''

    // determine content width by mirroring left side of inner
    // this allows for content to move left while loading right
    let contentWidth
    if (inner && inner.parentElement) {
      const saveJustify = inner.parentElement.style.justifyContent
      inner.parentElement.style.justifyContent = 'center'
      contentWidth = inner ? (outer.clientWidth/2 - inner.offsetLeft) * 2 : outer.clientWidth
      // console.debug(inner.parentElement, inner.parentElement.style.justifyContent, contentWidth)
      inner.parentElement.style.justifyContent = saveJustify
    } else {
      contentWidth = outer.clientWidth
    }
    setOuterWidth(outer, contentWidth, previous, previousStyle)
  }
}
export const setOuterWidth = (outer, width, previous?, previousStyle?) => {
  if (!outer) return
  if (!previous) {
    previous = outer.clientWidth
    previousStyle = outer.style.width
  }
  outer.style.width = outer.style.transition = ''

  // ignore small changes
  if (Math.abs(width - previous) < 32) {
    outer.style.width = previousStyle
    return
  }

  const isShrunk = width < outer.clientWidth
  const newStyleWidth = width+'px'
  const isImmediate = !_shrink.previousStyleWidth || width < previous

  if (isShrunk) outer.classList.add('shrink') // round corners from or to shrink
  const dispatchResize = () => window.dispatchEvent(new Event('resize'))
  if (isImmediate) {
    outer.style.width = _shrink.previousStyleWidth = newStyleWidth
    if (width !== previous) dispatchResize()
  } else {
    outer.style.width = `${previous}px`
    if (newStyleWidth !== _shrink.previousStyleWidth) {
      setTimeout(() => {
        outer.style.width = newStyleWidth
        // setTimeout(() => {
          // outer.style.transition = `width ${_shrink.ms}ms`
          _shrink.timeout = setTimeout(() => {
            _shrink.previousStyleWidth = newStyleWidth
            dispatchResize()
            if (!isShrunk) outer.classList.remove('shrink') // no longer shrink
          }, _shrink.ms)
        // }, 10)
      })
    }
  }
}
export const setOuterHeight = (outer, height, previous?, previousStyle?) => {
  if (!outer) return
  if (!previous) {
    previous = outer.clientHeight
    previousStyle = outer.style.height
  }
  outer.style.height = outer.style.transition = ''

  // ignore small changes
  if (Math.abs(height - previous) < 32) {
    outer.style.height = previousStyle
    return
  }

  const isShrunk = height < outer.clientHeight
  const newStyleHeight = height+'px'
  const isImmediate = !_shrink.previousStyleHeight || height < previous

  if (isShrunk) outer.classList.add('shrink') // round corners from or to shrink
  const dispatchResize = () => window.dispatchEvent(new Event('resize'))
  if (isImmediate) {
    outer.style.height = _shrink.previousStyleHeight = newStyleHeight
    if (height !== previous) dispatchResize()
  } else {
    outer.style.height = _shrink.previousStyleHeight
    if (newStyleHeight !== _shrink.previousStyleHeight) {
      setTimeout(() => {
        outer.style.transition = `width ${_shrink.ms}ms`
        outer.style.height = newStyleHeight
        _shrink.timeout = setTimeout(() => {
          _shrink.previousStyleHeight = newStyleHeight
          dispatchResize()
          if (!isShrunk) outer.classList.remove('shrink') // no longer shrink
        }, _shrink.ms)
      })
    }
  }
}

const query = (el: HTMLElement | string): HTMLElement =>
  typeof(el) === 'string' ? document.querySelector(el) : el

export const clearShrink = (outer: HTMLElement | string = '#inner-index') => {
  const outerL = query(outer)
  outerL.style.width = outerL.style.height = outerL.style.transition = ''
}

export const useShrink = (priority=0, outer: HTMLElement | string = '#inner-index') => {
  const outerL = query(outer)
  const [innerL, _setInnerL] = useState<HTMLElement>()
  const innerRef = useR([priority, innerL])
  const setInnerL = innerL => { // immediately assign to ref for sensitive event listeners
    if (innerL !== innerRef.current[1]) {
      _shrink.inners.remove(innerRef.current)
      innerRef.current = [priority, innerL]
      _setInnerL(innerL)

      // console.debug('SET SHRINK INNER', innerL)
      _shrink.inners.push(innerRef.current)
      _shrink.innermost = undefined
    }
    innerL && shrink(innerL, outerL)
  }
  useI(innerL, () => {
    return () => {
      _shrink.inners.remove(innerRef.current)
      if (_shrink.innermost === innerL) _shrink.innermost = undefined
      shrink(false, outerL)
    }
  })
  useEventListener(window, 'resize', () => innerRef.current && shrink(innerRef.current, outerL))
  // useInterval(innerL, () => shrink(innerL, outerL), 500)

  return (inner: HTMLElement | string | number, height?: number) => {
    // console.debug('shrink', inner, height)
    if (typeof(inner) === 'number') {
      setInnerL(undefined)
      setOuterWidth(outerL, inner)
      height && setOuterHeight(outerL, height)
    } else {
      const innerL = query(inner)
      setInnerL(innerL)
      // shrink immediately if empty or already added
      if (!innerL || _shrink.inners.some(x => x[1] === innerL)) shrink(innerL, outerL)
    }
  }
}

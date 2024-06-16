import React, { Dispatch, MutableRefObject, SetStateAction, useEffect, useMemo, useRef, useState } from 'react';
import { anyFields, consumer, pass } from './types';
import { dev, list, merge, named_log, node } from './util';
import api from './api';

export const useF = (...props) => {
    const func = props.pop()
    useEffect(() => {
        try {
            func(...props)
        } catch (e) {
            console.debug(...props, func)
            console.error(e)
        }
    }, props)
}
// export const useE = (...props) => useEffect(props.pop(), props)
export const useE = (...props) => {
    const func = props.pop()
    useEffect(() => {
        try {
            const cleanup = func(...props)
            return Array.isArray(cleanup)
                ? () => cleanup.map(x => (typeof x === 'function') && x())
                : cleanup
        } catch {
            console.debug(...props, func)
        }
    }, props)
}
export const useM = (...props): any => {
    const factory = useR()
    factory.current = props.pop()
    return useMemo(() => factory.current(), props)
}

// call without value to reset to initial
export const useS = <T,>(initial?:T): [T, (value?:T)=>void] => {
    initial = useM(() => initial)
    const [value, _setValue] = useState<T>(initial)
    return [value, (...value:[T?]) => value.length ? _setValue(value[0]) : _setValue(initial)]
}

// return ref without warning that ref might be empty
export type InputL = HTMLInputElement | HTMLTextAreaElement
export type CanvasL = HTMLCanvasElement
export type ContentL = HTMLDivElement | HTMLSpanElement | InputL | CanvasL
export const useR = <T,>(initial?: T): { current: T & any } => initial ? useRef(initial) : useRef() as MutableRefObject<any>
export const useRs = <T,>(n:number, initial?: T[]): { current: T & any }[] => {
    const N = useM(() => n)
    return Array.from({ length: N }).map((_, i) => useR(initial[i]))
}
export const withRef = <T,>(render: (props: T)=>any) => React.forwardRef((props, ref=useR) => render({ ...props, ref } as T)) as (props: T)=>any
export const useOnce = <T extends any>(value?: T): { current: T | any } => {
    const ref = useR(value)
    return useM(() => ({
        get current() {
            const value = ref.current
            ref.current = undefined
            return value
        }
    }))
}

// run code immediately whenever props change (useEffect runs after render)
export const useInline = (...props_and_func) => {
    const func = props_and_func.pop()
    const props = props_and_func
    const prev = useR()
    const cleanup = useR()
    if (!prev.current || props.length !== prev.current.length || props.some((p, i) => p !== prev.current[i])) {
        // cleanup prev invocation
        if (typeof cleanup.current === 'function') cleanup.current()

        // invoke
        cleanup.current = func()
        prev.current = props
    }
    useE(() => () => {
        // final cleanup
        if (typeof cleanup.current === 'function') cleanup.current()
    })
}
export const useI = useInline // TODO un-flip base useInline

// skip the initial invocation of handler
export const useSkip = (hook: (...props_and_func)=>unknown, ...props_and_func) => {
    const func = props_and_func.pop()
    const props = props_and_func
    const initial = useR(props)
    if (!initial.current
        || props.length !== initial.current.length || props.some((x, i) => x !== initial.current[i])) {
        initial.current = false
        return hook(...props, func)
    }
    return hook(...props, pass)
}

export const useRenderCount = (value=undefined) => {
    const counter = useR(0)
    useInline(value, () => counter.current = 0)
    counter.current += 1
    return counter.current
}

export const asToggle = ([value, setValue]) => [value, () => setValue(!value)]
export const useToggle = initial => asToggle(useState(initial))

export const asList = <T,>([list=[], _set]: [T[], consumer<T[]>]): [T[], consumer<T[]>, consumer<T[]>] => {
    const add = items => {
        list.push(...items)
        _set(list.slice())
    }
    const set = new_list => {
        const _o = list.slice()
        const _n = new_list.slice()
        while (_o.length && _n.length && _o[0] === _n[0]) {
            _o.shift()
            _n.shift()
        }
        if (!_o.length) add(_n)
        else _set(new_list)
    }
    return [list, set, add]
}
export const useList = <T,>(initial=[]) => asList<T>(useState(initial))

// useState but always revert the value to undefined after some timeout
export const useTimed = (timeoutMs, initial_and_reset=undefined) => {
    const [value, setValue] = useState(initial_and_reset)
    const timeoutHandle = useR()
    useF(value, () => {
        if (value !== undefined) {
            clearTimeout(timeoutHandle.current)
            timeoutHandle.current = setTimeout(
                () => timeoutHandle.current && setValue(initial_and_reset),
                timeoutMs)
        }
    })
    useE(() => timeoutHandle.current = undefined)
    return [value, setValue]
}

export const useError = (clearMs?):[any, any, (reason: any) => void | PromiseLike<void>, any] => {
    const [error, setError] = useState('')
    const [timeout, setErrorTimeout] = useState(undefined)
    const handle = e => setError(e.error || e)
    useF(error, () => {
        if (clearMs) {
            clearTimeout(timeout)
            setErrorTimeout(setTimeout(() => setError(''), clearMs))
        }
    })
    const render = error
        ? <div className='error' style={{
            color: 'red', textShadow: 'none', fontSize: '.8rem'
        }}>{error}</div>
        : ''
    return [error, setError, handle, render]
}

export const useRerender = () => {
    const [_, setValue] = useState({})
    return useM(_, () => () => setValue({}))
}

/*
Cache value across multiple components to only fetch once
Value is stored with timeout & list of callbacks to trigger
*/
const _useCached = {} // { value: any, t: number, set: func[] }
export const cached = async (name, fetcher, timeout=-1) => {
    const curr = _useCached[name]

    if (curr && (timeout < 0 || Date.now() - curr.t < timeout)) {
        // we already have a fresh value
        return curr
    } else {
        // need to fetch
        _useCached[name] = { set: [], t: Date.now() } // prevent others from fetching too
        const value = await fetcher()
        _useCached[name].value = value
        _useCached[name].set.map(func => func(value))
        return value
    }
}
export const useCached = <T,>(name, fetcher:()=>Promise<T>=()=>api.get(name), timeout=-1): [T, ()=>Promise<T>] => {
    const [value, setValue] = useState<T>()

    const load = async () => {
        _useCached[name] = _useCached[name] || { set: [] }
        _useCached[name].t = Date.now() // prevent others from fetching too
        try {
            console.debug('useCached', name, fetcher)
            const value = await fetcher()
            _useCached[name].value = value
            _useCached[name].set.map(func => func(value))
            return value
        } catch (e) {
            console.error(e)
            return value
        }
    }

    useE(async () => {
        const curr = _useCached[name]
        if (curr && (timeout < 0 || Date.now() - curr.t < timeout)) {
            // we already have a fresh value
            setValue(curr.value)
            // add this useCached instance to triggered callbacks
            _useCached[name].set.push(setValue)
        } else {
            // need to fetch
            _useCached[name] = { set: [setValue] }
            await load()
        }
        return () => _useCached[name].set.remove(setValue)
    })

    return [value, load]
}
export const useCachedSetter = <T,U>({
    name, fetcher=()=>api.get(name), setter=(value)=>api.post(name,value), timeout=-1
}: {
    name, fetcher?: ()=>Promise<T>, setter: (x?:U)=>Promise<T>, timeout?
}): [T, (x?:U)=>Promise<T>, ()=>Promise<T>] => {
    const log = useM(() => named_log('cached setter'))
    const [value, setValue] = useState()

    const _set = value => {
        _useCached[name] = _useCached[name] ?? { set: [] }
        _useCached[name].value = value
        log('set', value)
        _useCached[name].set.map(func => {
            try {
                func(value)
            } catch (e) {
                console.error(e)
            }
        })
    }
    const load = async () => {
        log('load', name)
        _useCached[name].t = Date.now() // prevent others from fetching too
        try {
            const value = await fetcher()
            log('loaded', name, value)
            _set(value)
            return value
        } catch (e) {
            log('load error', name)
            console.error(e)
            return value
        }
    }
    const set = async (value) => {
        const result = await setter(value)
        _set(result)
        return result
    }

    useE(async () => {
        log('new', name)
        const curr = _useCached[name]
        if (curr) {
            log('cached', name)
            if ((timeout < 0 || Date.now() - curr.t < timeout)) {
                // cached value
                setValue(curr.value)
            } else {
                // wait for load
            }
            // add this useCached instance to triggered callbacks
            _useCached[name].set.push(setValue)
        } else {
            // need to fetch
            _useCached[name] = { set: [setValue] }
            await load()
        }
        return () => _useCached[name].set.remove(setValue)
    })

    return [value, set, load]
}


class SharedState {
    callbacks: any[]
    value: any

    constructor() {
        this.callbacks = []
        this.value = undefined
    }

    useState() {
        const [value, setValue] = useState(this.value)

        useE(() => {
            const callback = newValue => setValue(newValue)
            this.callbacks.push(callback)
            return () => this.callbacks.remove(callback)
        })

        const setSharedValue = newValue => {
            this.value = newValue
            this.callbacks.map(callback => callback(newValue))
        }

        return [value, setSharedValue]
    }
}
export const useSharedState = () => {
    return useM(() => new SharedState())
}

export const asInput = ([value, setValue], handle_enter=undefined) => {
    const inputFill = {
        value, setValue,
        onChange: e => setValue(value ? value?.constructor(e.target.value) : e.target.value),
        ...(handle_enter ? {onKeyDown: e => e.key === 'Enter' && handle_enter(e)} : {}),
    }
    return [value, setValue, inputFill]
}
export const useInput = (initial=undefined) => {
    return asInput(useState(initial))
}

export const asObject = <T extends anyFields,>(
    [value, setValue]:[T, Dispatch<SetStateAction<T>>]
): [T, Dispatch<SetStateAction<T>>, consumer<any>] => {
    return [value, setValue, update => setValue(merge(value, update) as T)]
}
export const useObject = <T extends anyFields,>(initial:T=undefined): [T, Dispatch<SetStateAction<T>>, consumer<any>] => {
    return asObject(useState(initial))
}

export const useScript = (src, is_text=false) => {
    const script = useR()
    useE(src, () => {
        script.current = (x => {
            if (is_text) x.append(document.createTextNode(src))
            else x.src = src
            document.body.append(x)
            return x
        })(document.createElement('script'))
        return () => script.current.remove()
    })
    return script
}

export const useLink = (href, rel) => {
    useE(href, rel, () => {
        const link = document.createElement('link');
        link.href = href;
        link.rel = rel;
        document.body.appendChild(link);
        return () => {
            document.body.removeChild(link);
        }
    });
}

export const addStyle = (style) => {
    const L = node(`<style>${style}</style>`)
    document.body.append(L)
    return () => L.remove()
}
export const useStyle = (...deps_style) => {
    (dev ? useE : useInline)(...deps_style.slice(0, deps_style.length > 1 ? -1 : 1), () => addStyle(deps_style.at(-1)))
}
export const useStyleE = (...deps_style) => {
    useE(...deps_style.slice(0, deps_style.length > 1 ? -1 : 1), () => addStyle(deps_style.at(-1)))
}

export const cleanTimeout = (handler: TimerHandler, ms?: number, ...rest: any[]) => {
    const timeout = setTimeout(handler, ms, ...rest)
    return () => clearTimeout(timeout)
}

export const cleanupId = (id, callback) => () => callback(id);

export const useTimeout = (...triggers_callback_ms) => {
    useE(...triggers_callback_ms, () => cleanupId(
        setTimeout(triggers_callback_ms.at(-2), triggers_callback_ms.at(-1)),
        id => clearTimeout(id)))
}

export const useInterval = (...triggers_callback_ms_offset) => {
    const arr = triggers_callback_ms_offset
    const hasOffset = typeof(arr.at(-2)) === 'number'
    const offset = hasOffset ? arr.pop() : undefined
    const ms = arr.pop()
    const callback = useR()
    callback.current = arr.pop()
    // console.debug('INTERVAL ms', ms, 'offset', offset)
    useE(...triggers_callback_ms_offset, () => {
        let id = offset !== undefined
            ? setTimeout(() => {
                callback.current()
                id = setInterval(() => callback.current(), ms)
            }, offset)
            : setInterval(() => callback.current(), ms)
        return () => clearInterval(id) // clears timeout too
    })
}
// export const useInterval = (callback, ms, initialOffset=0) =>
//     useE(callback, ms, () => cleanupId(setInterval(callback, ms), id => clearInterval(id)))


export const cleanListener = (target, type, callback, useCapture?) => {
    target?.addEventListener(type, callback, useCapture)
    return () => target?.removeEventListener(type, callback, useCapture)
}
export const useEventListener = (target, type, callback, useCapture?) =>
    useE(target, type, callback, useCapture,
        () => type.split(' ').map(t => cleanListener(target, t, callback, useCapture)))

export const useAnimate = (animate) =>
    useE(animate, () => {
        let id;
        const wrappedAnimate = (timestamp) => {
            animate(timestamp);
            id = requestAnimationFrame(wrappedAnimate);
        }
        wrappedAnimate(performance.now());
        return () => cancelAnimationFrame(id);
    });


export const useDomains = (domains=[]) => {
    const domain = location.host
    useE(() => {
        if (domains.length && !domains.includes(domain) && !dev) {
            window.open(location.href.replace(domain, domains[0]), '_self')
        }
    })
}

export const useHideFooter = (hide=true) => {
    useStyle(hide ? `
    #footer {
        display: none;
    }
    ` : '')
}

export const useGrab = (grab) => useStyle(grab ? `
* {
  cursor: grabbing !important;
}
`:'')


export const asMode = <T,>([value, setValue]:[T, consumer<T>], options:T[], strict=false): [T, consumer<T>, T[]] => {
    return [value ?? (strict ? options[0] : undefined), setValue, options]
}
export const useMode = <T,>(options:T[], initial:T=undefined): [T, consumer<T>, T[]] => {
    return asMode(useS(initial), options, true)
}


export const uF = useF



export const renderFunction = func => {
    const FunctionComponent = () => {
        useE(func)
        return <></>
    }
    return <FunctionComponent />
}
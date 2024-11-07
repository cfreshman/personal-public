// interface into cookies/local/session storage

import { trigger, TriggerCache, TriggerValue } from "./trigger";
import { pass } from "./types";

export type TriggerPersist<T> = TriggerValue<T> & {
    clear: ()=>void
}
export type TriggerStorage = TriggerCache<any> & {
    clear: (key: any)=>void,
    persist: <T,>(key: any, options?: {
        default?: T, defaulter?: ()=>T, extract?: (raw: unknown)=>T, save?: (value: T)=>unknown,
    })=>TriggerPersist<T>,
}
const triggerStorage = (storage: Storage): TriggerStorage => {
    const cache = trigger.cache<any>() // use cache but override get/set
    return Object.assign({}, cache, {
        storage,
        get: key => {
            const str = storage.getItem(key as string)
            return str ? JSON.parse(str) : fetchCookie(key)
        },
        _set: function(key, value) {
            console.debug('INNER SET', key, value)
            if (value === undefined) {
                storage.removeItem(key)
            } else {
                const stringified = JSON.stringify(value)
                try {
                    storage.setItem(key, stringified)
                } catch (e) {
                    // bad but nothing to do about it :)
                }
                // try {
                //     storage.setItem(key, stringified)
                // } catch (e) {
                //     // alert('ran out of browser storage')
                // }
            }
        },
        set: function(key, value=undefined) {
            const previous = this.get(key)
            // console.debug('STORE SET', key, value, previous)
            if (previous !== value) {
                this._set(key, value)
                // @ts-ignore
                cache._.keyed.trigger(key, value, previous)
            }
            // return () => this.set(key, previous)
        },
        clear: function(key) {
            return this.set(key, undefined)
        },
        persist: function <T,>(key, options={}) {
            // create in-memory trigger value which persists data to storage
            // @ts-ignore
            const { default: _default, defaulter=pass, extract=pass, save=pass } = options
            const initial = this.get(key)
            const triggerValue = cache.single(key, initial ? extract(initial) : _default ?? defaulter()) as TriggerValue<T>
            triggerValue.add(value => this._set(key, save(value), true))
            return Object.assign(triggerValue, {
                clear: () => this.clear(key),
            })
        },
    })
}

// no longer using actual cookies, but still keeping these around
function fetchCookie(name) {
    const namedCookie = document.cookie
        .split(';').reverse()
        .find(cookie => cookie.startsWith(name));
    const cookieJson = namedCookie?.split('=')[1]
    return cookieJson ? JSON.parse(cookieJson) : undefined;
}
function saveCookie(name, value, str=false) {
    // save cookie for ten years
    document.cookie = `${name}=${str ? value : JSON.stringify(value)};expires=${60*60*24*365*10};domain=${location.host.split('.').slice(-2).join('.')}`;
}
function clearCookie(name) {
    document.cookie = `${name}=;expires=0`;
}

const local = triggerStorage(localStorage)
export const store = Object.assign(local, {
    local,
    session: triggerStorage(sessionStorage),
    cookie: {
        clear: clearCookie,
    },
    memo: trigger.store(),
})

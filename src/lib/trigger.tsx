import { useState } from "react"
import console from "./console"
import { cleanTimeout, useE, useI, useR } from "./hooks"
import { anyFields, fields, functionOrOther, key, pass, transform } from './types'

type callback<T> = (value: T, oldValue?: T)=> unknown
type cleanup = () => void
type indicator = unknown

type _baseOptions<T> = { value?: T, add?: callback<T> }
type useOptions<T> = functionOrOther<callback<T>, _baseOptions<T>>
type _useValueOptions<T,U> = _baseOptions<T> & { default?: T, defaulter?: transform<[],T>, as?: (value: T)=>U }
type useValueOptions<T> = functionOrOther<callback<T>, _useValueOptions<T,T>>
type useValueAsOptions<T,U> = functionOrOther<transform<T,U>, _useValueOptions<T,U>>

interface _Trigger<T> {
  name?: string
  add: (trigger: callback<T>) => cleanup
  remove: (trigger: callback<T>) => void
  trigger: (value?: T, oldValue?: T) => void
  use: (options?: useOptions<T>) => void,
}
export interface Trigger<T> extends _Trigger<T> {
  once: (trigger: callback<T>) => cleanup
}

interface _KeyedTrigger<T> {
  add: (key: key, trigger: callback<T>) => cleanup
  remove: (key: key, trigger: callback<T>) => void
  trigger: (key: key, value?: T, oldValue?: T) => void
  single: (key: key) => Trigger<T>,
  use: (key: key, options?: useOptions<T>) => void,
}
export interface KeyedTrigger<T> extends _KeyedTrigger<T> {
  once: (key: key, trigger: callback<T>) => cleanup
}

interface _TriggerValue<T> extends _Trigger<T> {
  value: T
  get: () => T,
  set: (value?: T) => cleanup,
  add: (trigger: callback<T>, initialize?: indicator) => cleanup,
  use: (options?: useValueOptions<T>) => [T, (value?: T)=>void],
  as: <U,>(options?: useValueAsOptions<T,U>) => [U, (value?: T)=>void],
}
export interface TriggerValue<T> extends _TriggerValue<T> {
  once: (trigger: callback<T>) => cleanup
}

interface _TriggerCache<T> extends _KeyedTrigger<T> {
  get: (key: key, defaulter?: (key: key)=>T) => T,
  set: (key: key, value?: T) => cleanup,
  add: (key: key, trigger: callback<T>, initialize?: indicator) => cleanup,
  single: (key: key, initialValue?: T) => TriggerValue<T>,
  use: (key: key, options?: useValueOptions<T>) => [T, (value?: T)=>void],
  as: <U,>(key: key, options?: useValueAsOptions<T,U>) => [U, (value?: T)=>void],
}
export interface TriggerCache<T> extends _TriggerCache<T> {
  once: (key: key, trigger: callback<T>) => cleanup
}

export interface TriggerStore extends TriggerCache<any> {
  get: <T>(key: key, defaulter?: (key: key)=>T) => T,
  single: <T>(key: key, initialValue?: T) => TriggerValue<T>,
}

function _add<T>(triggers: callback<T>[], trigger: callback<T>) {
  // triggers are always queued asynchronously
  // clean up includes both removing from trigger list AND clean up returned from trigger
  let cleanup
  // console.debug('ADD TRIGGER', trigger)
  const asyncTriggerWithCleanup = (value, old?) => {
    // console.debug('TRIGGER W CLEANUP', cleanup, value)
    cleanup?.apply && cleanup()
    // cleanup = cleanTimeout(() => {
      try{cleanup = trigger(value, old)}catch{cleanup = undefined}
    // })
  }
  triggers.push(asyncTriggerWithCleanup)
  return () => {
    // console.debug('CLEANUP', cleanup, trigger)
    triggers.remove(asyncTriggerWithCleanup)
    cleanup?.apply && cleanup()
  }
}
function _trigger<T>(triggers: callback<T>[], value: T, oldValue?: T) {
  console.debug('TRIGGER', oldValue, value, triggers)
  triggers?.forEach(trigger => trigger(value, oldValue))
}
function _use<T>(trigger: Trigger<T> & TriggerValue<T>, options?: useOptions<T>) {
  // call function when trigger is triggered
  
  const callback = useR()
  callback.current = typeof options === 'function' ? options : options?.add
  const optionsValueSet = options && Object.hasOwn(options, 'value')
  useI(() => {
    // only trigger immediately if no options.value
    return callback.current && trigger.add((v, o) => {
      console.debug('trigger use', options)
      try{callback.current(v, o)}catch{}
    }, !optionsValueSet)
  })
  // trigger when options value changes, including immediately after first render
  useE(options?.value, () => optionsValueSet && trigger.trigger(options.value))
}
function _useValue<T,U>(triggerValue: TriggerValue<T>, options?: _useValueOptions<T,U>): [U, (value: T)=>void] {
  // in addition to _use, also maintain state, and allow an 'as' transformation on the returned value
  const as = options?.as || pass
  const [value, setValue] = useState(as(triggerValue.get() ?? options?.default ?? options?.defaulter?.call(this)))
  useE(() => triggerValue.add(value => {
    setValue(as(value ?? options?.default))
  }))
  _use(triggerValue, options)
  return [value, value => triggerValue.set(value)]
}
function _clean<T>(implicitValue: fields<T>) {
  if (typeof(implicitValue) !== 'object') return implicitValue
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { value, add, remove, trigger, use, get, set, single, current, _, ...cleaned } = implicitValue as anyFields
  return cleaned
}

const _generateSyntacticMethods = <T,U>(partialClass: T): T & { once: (trigger: callback<U>) => cleanup } => {
  const _tempClass = partialClass as any
  return Object.assign(_tempClass, {
    once: trigger => _tempClass.add((...args) => {
      trigger(...args)
      _tempClass.remove(trigger)
    })
  })
}
const _generateKeyedSyntacticMethods = <T,U>(partialClass: T): T & { once: (key: key, trigger: callback<U>) => cleanup } => {
  const _tempClass = partialClass as any
  return Object.assign(_tempClass, {
    once: (key, trigger) => _tempClass.add(key, (...args) => {
      trigger(...args)
      _tempClass.remove(trigger)
    })
  })
}

const _simple = <T,>({ name }:{ name?: string }={}): Trigger<T> => {
  const triggers: callback<T>[] = []
  return _generateSyntacticMethods<_Trigger<T>, T>({
    name,
    add: (trigger: callback<T>) => _add(triggers, trigger),
    remove: (trigger: callback<T>) => triggers.remove(trigger),
    trigger: (value: T, oldValue?: T) => _trigger(triggers, value, oldValue),
    use: function (options) { _use(this, options) },
  })
}

const _keyed: <T>()=>KeyedTrigger<T> = <T,>() => {
  const triggerDict: fields<callback<T>[]> = {}
  const empty = () => []
  const singles = {}
  return _generateKeyedSyntacticMethods<_KeyedTrigger<T>, T>({
    add: (key, trigger: callback<T>) => _add(Object.load(triggerDict, key, empty), trigger),
    remove: (key, trigger: callback<T>) => Object.load(triggerDict, key)?.remove(trigger),
    trigger: (key, value: T, oldValue?: T) => {
      console.debug('trigger', key, Object.load(triggerDict, key, empty))
      _trigger(Object.load(triggerDict, key), value, oldValue)
    },
    use: function (key, options) { _use(this.single(key), options) },
    single: function (key) {
      return Object.load(singles, key, () => _generateSyntacticMethods<_Trigger<T>, T>({
        add: (...rest) => this.add(key, ...rest),
        remove: (...rest) => this.remove(key, ...rest),
        trigger: (...rest) => this.trigger(key, ...rest),
        use: (...rest) => this.use(key, ...rest),
      }))
    },
  })
}

const _cached = <T,>(defaulter?: (key:key)=>T) => {
  const _ = {
    defaulter,
    keyed: _keyed<T>(),
    values: {},
    singles: {},
  }
  return _generateKeyedSyntacticMethods<_TriggerCache<T>, T>(Object.assign({}, _.keyed, {
    _,
    current: _.values,
    get: function (key, defaulter=_.defaulter) {
      return Object.load(this._.values, key, defaulter)
    },
    set: function (key, value) {
      value = value ?? (defaulter && defaulter(key))
      const previous = this.get(key)
      if (previous !== value) {
        this._.values[key] = value
        this._.keyed.trigger(key, value, previous)
      }
      return () => {
        // only revert on cleanup if another value isn't immediately set
        // TODO design better way of chaining sets which allows complete ordered undo
        let triggered = false
        this.add(key, () => triggered = true)
        setTimeout(() => {
          if (!triggered) this.set(key, previous)
        })
      }
    },
    trigger: function (key, value) {
      // intercept KeyedTrigger<T>.trigger to set value instead
      this.set(key, value)
    },
    add: function (key, callback, initialize=false) {
      if (initialize) callback(this.get(key))
      return this._.keyed.add(key, callback)
    },
    single: function (key, initialValue=undefined) {
      if (initialValue !== undefined) this.set(key, initialValue)
      return Object.load(this._.singles, key, () => Object.assign({}, this._.keyed.single(key), {
        get: (...rest) => this.get(key, ...rest),
        set: (...rest) => this.set(key, ...rest),
        trigger: (...rest) => this.trigger(key, ...rest),
        add: (...rest) => this.add(key, ...rest),
        use: (...rest) => this.use(key, ...rest),
        as: (...rest) => this.as(key, ...rest),
      }))
    },
    use: function (key, options) { return _useValue<T,T>(this.single(key), options) },
    as: function <U>(key, options) {
      if (typeof options === 'function') options = { as: options }
      return _useValue<T,U>(this.single(key), options)
    },
  }))
}

export const trigger: KeyedTrigger<unknown> & {
  new: <T>() => Trigger<T>,
  keyed: <T>() => KeyedTrigger<T>,
  value: <T>(initialValue?: T, options?: { name?: string }) => TriggerValue<T>,
  implicitOf: <T extends fields<any>, U extends TriggerValue<T>>(triggerValue: U) => T & U,
  implicit: <T extends fields<any>>(initialValue?: T) => T & TriggerValue<T>,
  cache: <T>(defaulter?: (key:key)=>T) => TriggerCache<T>,
  store: (defaulter?: (key:key)=>any) => TriggerStore,
} = Object.assign(_keyed<unknown>(), {
  new: _simple,
  keyed: _keyed,
  value: <T,>(initialValue?: T, options:{ name?: string }={}): TriggerValue<T> => {
    const _ = {
      trigger: _simple<T>(options),
      current: initialValue,
    }
    return _generateSyntacticMethods<_TriggerValue<T>, T>(Object.assign({
      get value() { return this.get() },
      
      _,
      get current() {
        return this._.current
      },
      set current(value) {
        if (this._.current !== value) {
          const previous = this._.current
          this._.current = value
          // console.debug(this._.current, value)
          this._.trigger.trigger(value, previous)
        }
      },
    }, _.trigger, {
      get: function () {
        return this.current
      },
      set: function (value) {
        // console.debug('SET TRIGGER VALUE', this.name, this.current, value)
        const previous = this.current
        this.current = value ?? initialValue
        return () => {
          // only revert on cleanup if another value isn't immediately set
          let triggered = false
          this.add(() => triggered = true)
          setTimeout(() => {
            if (!triggered) this.current = previous
          }, 10)
        }
      },
      trigger: function (value) {
        // intercept Trigger<T>.trigger to set value instead, then setter will trigger
        this.set(value)
      },
      add: function (callback, initialize=false) {
        // console.debug('ADD', this.name, initialize, callback)
        if (initialize) callback(this.get())
        return this._.trigger.add(callback)
      },
      use: function (options) { return _useValue<T,T>(this, options) },
      as: function <U>(options) {
        if (typeof options === 'function') options = { as: options }
        return _useValue<T,U>(this, options)
      },
    }))
  },
  implicitOf: triggerValue => {
    triggerValue.add(value => Object.assign(triggerValue, _clean(value)), true)
    return triggerValue
  },
  implicit: function (initialValue?) {
    return this.implicitOf(this.value(initialValue))
  },
  cache: _cached,
  store: _cached,
})
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { Fragment } from "react"

// values
export type key = string | number // | symbol
export type fields<T> = {
  [key: string]: T,
  [key: number]: T,
  // [key: symbol]: T, // compilation wasn't happy with this
}
export type anyFields = any // fields<any> was causing issues
export type printable = string | number | boolean
export const printable_types = new Set('string number boolean'.split(' '))
export type stringable = printable | { toString }
export type any_func = (...args: any[]) => any
export type functionOrOther<F, O> = (F & O) | (O & { apply? }) // resolves type issues with F | O

export type single<T> = [T]
export type pair<T, U> = [T, U]

export type couple<T> = pair<T, T>
export type triplet<T> = [T, T, T]

// functions
export type transform<T, U> = (...inputs: T[]) => U
export type supplier<T> = transform<[],T>
export type consumer<T> = transform<T,unknown>
export type many<T> = transform<T[],unknown>
export type action = transform<[],unknown>

// eslint-disable-next-line @typescript-eslint/no-empty-function
export const none = ()=>{}
export const pass = (x?) => x
export const apply = (f?) => f && f()
export const compose = <T,U>(
  f: (...args: T[])=>any,
  ...rest: ((x: any)=>U)[]
  ): transform<T,U> => (...args) => rest.reduce((x, f) => f(x), f(...args))
export const pipe = <T,U>(
  x: T,
  f: (x: T)=> any,
  ...rest: ((x: any) => U)[]
  ): U => rest.reduce((x, f) => f(x), f(x))

type _fs<T,> = { value: T, then: (f:(x:T)=>any)=>_fs<any>, with: (f:(x:T)=>void)=>_fs<T> }
export const fs = globalThis['fs'] = <T,>(x: T): _fs<T> => {
  const object = ({
    value: x,
    then: f => fs(f(x)),
    with: f => {
      f(x)
      return object
    },
  })
  return object
}
// export const fs = window['fs'] = {
//   of: <T,>(x: T): _fs<T> => {
//     const object = ({
//       value: x,
//       then: f => fs.of(f(x)),
//       with: f => {
//         f(x)
//         return object
//       },
//     })
//     return object
//   }
// }

// filters
export const exists = <T,>(x: T | undefined): x is T => x !== undefined
export const truthy = <T,>(x: T | boolean): x is T => !!x

// React
export type legacyRef = React.LegacyRef<any>
export type jsx = React.ReactElement<any, any>
export type props = anyFields & {
  children?: string | jsx | jsx[],
  className?: string,
} & React.AllHTMLAttributes<HTMLElement>
export const JSX = Fragment

// promises
export const Thenable = (value?) => {
  return {
    then: func => Thenable(func(value))
  }
}
export type ThenableType<T> = Promise<T> | { then: transform<supplier<any>, any> }

export const once = <T,>(value: T): supplier<T> => {
  return () => {
    const value_return = value
    value = undefined
    return value_return
  }
}
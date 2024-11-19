import { trigger } from "./trigger";

export const message = trigger.new<string | { text?:any, html?:any, id?:string, ms?:number, delay?:number, once?:boolean, style?:string, replace?:string, delete?:string, to?:string, clear?:boolean, receive?:string }>()

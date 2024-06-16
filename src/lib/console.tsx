import { auth } from "./api"
import { pass } from "./types"
import { dev, pick } from "./util"


let prev = Date.now()
const save = pick(window.console, 'trace debug log warn error') as {
  trace: (...rest)=>undefined,
  debug: (...rest)=>undefined,
  log: (...rest)=>undefined,
  warn: (...rest)=>undefined,
  error: (...rest)=>undefined,
}
const console = window.console as {
  trace: (...rest)=>undefined,
  debug: (...rest)=>undefined,
  log: (...rest)=>undefined,
  warn: (...rest)=>undefined,
  error: (...rest)=>undefined,
}
const stamped = {}
const silent = {}
Object.keys(console).map(method => {
  stamped[method] = (...args) => {
    const now = Date.now()
    const elapsed = now - prev
    console[method](`${elapsed > 9_999 ? '>9999' : (' '+elapsed).padStart(5)}ms`, ...args)
    prev = now
  }
  silent[method] = pass
})

export default console

window.console['_dev'] = () => Object.assign(window.console, save)
window.console['_stamped'] = () => Object.assign(window.console, stamped)
window.console['_silent'] = () => Object.assign(window.console, silent)

if (dev) {
  window.console['_dev']()
} else {
  window.console['_silent']()
}
console.debug('DEV', dev)

setTimeout(() => {
  auth.add(() => {
    if (auth.user === 'cyrus') window.console['_dev']()
  }, true)
})

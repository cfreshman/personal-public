import React from "react"
import { projects } from "./projects"
import { store } from "./store"
import { trigger } from "./trigger"
import { pass, Thenable, truthy } from "./types"
import { dev, getPath, set, transpose, Q } from "./util"

const nonExpandedPathname = () => location.pathname.replace(/^\/-/, '/')

const subdomains = transpose({
  wordbase: 'w',
  ly: 'l',
  contact: 'cyrus wiggin',
})
const pagedomains = {
  'wordbase.app': 'wordbase',
  'dinder.social': 'dinder',
  'pico-repo.com': 'pico-repo',
  'tr.ink': 'et',
  'tally.gallery': 'tally',
  'crowdmeal.app': 'crowdmeal',
  'cyrusfre.sh': '',
  'matchbox.app': 'matchbox',
  'spo.tu.fo': 'spot',
  'grtr.xyz': 'greeter',
  'grtr.app': 'greeter',
  'greeter.social': 'greeter',
  'web-app-store.com': 'web-app-store',
  'vibe.photos': 'vibe',
  'localhost:3030': 'greeter',
}
const ignore = set('www')
export const parseSubdomain = () => {
  // return reversed subdomain tokens as path, ignore www, translate special bases, no exterior slashes
  // : c.b.a.freshman.dev => a/b/c : b.a.tld => a/b
  // : somehow.www.blah.freshman.dev => blah/somehow : freshman.dev => ''
  // : about.freshman.dev / w.freshman.dev / wordbase.app => about / wordbase / wordbase
  // this is needed to treat sub & alt domains as projects

  return store.memo.get('subdomain', () => {
    // replace ip:port with freshman.dev
    let host = location.host.replace(/(\d+\.){3,3}\d+:\d+/, 'freshman.dev')
    // host = dev ? 'wordbase.app' : host
    // const host = dev ? 'freshman.dev' : location.host

    const parts = host.split('.').filter(part => !ignore.has(part))
    const domain = parts.slice(-2).join('.')
    const path = parts.slice(0, -2)
      .concat(pagedomains[location.host] ?? [])
      .map(part => subdomains[part] || part)
      .reverse()
      .join('/')

    // console.debug(host, path)

    // return window.location.hostname === 'localhost' ? 'wordbase' : path
    return path
  })
}
console.debug('SUBDOMAIN', parseSubdomain() || '<empty>')
export const parseSubpath = (path=nonExpandedPathname(), prefix='') => {
  // return path adjusted for subdomain, then prefix
  // freshman.dev/test/page prefix=test => /page
  // : a.freshman.dev/a/b => /b : wordbase.app/wordbase/ => /
  // : b.a.freshman.dev/a/c => /a/c (still treat the second a as path under b)
  // this is needed for directing routes within a subdomain

  const subdomain = parseSubdomain()
  path = path.replace(RegExp(`^(https?://)?${location.host}`), '') // remove duplicated subdomain in path
  // path = path.replace(/^\/-/, '/') // remove '-' (used to expand page)
  // const fullSubpath = path // subdomain ? path.replace(RegExp(`^/${subdomain}`), '') || '/' : path
  let fullSubpath = path // .replace(/^\/-/, '/')
  if (subdomain) {
    fullSubpath = (path.slice(1) ? path.replace(RegExp(`^/${subdomain}`), '/:') || '/' : '/')
    if (fullSubpath === '/:') {
      fullSubpath = '/'
    }
  }
  // const fullSubpath = subdomain ? (path.slice(1) ? path.replace(RegExp(`^/${subdomain}`), '/:') || '/' : '/') : path
  // remove requested prefix
  return fullSubpath.replace(RegExp(`^${prefix}`), '')
}
console.debug('SUBPATH', parseSubpath() || '<empty>')
export const parseLogicalPath = (path=nonExpandedPathname(), prefix='') => {
  // return path as if served from default domain, including subdomain & subpath parsing
  // strip trailing slash, return at least a slash
  // : freshman.dev/about => /about : wordbase.app => /wordbase : wordbase.app/settings => /settings : a.freshman.dev/a/b => /a/b
  // this is needed for UI and APIs
  // TODO:
  // this depends on the routes under a subdomain, so these must be manually registered
  // as a rule, disallow projects or subdomains which would cause overlap, e.g. u.<>/wordbase
  // so todo, for subdomain b.a, parse things under /a/b first, then under root
  // essentially, need to insert 'base' path for subdomain urls like wordbase.app/~/settings
  // if /a/b/c and /d/c and /c are valid, b.a.<>/c => /a/b/c, b.a.<>/d/c => /d/c, b.a.<>/~/c => /c
  // OR insert /~ for all subdomain links
  // OR link from subdomain l.<> (no probably not, we'd have to leave the page)

  const subdomain = parseSubdomain()
  path = subdomain && !path.slice(1) ? '/'+subdomain : path.replace(/^\/-/, '/').replace('/:', '/'+subdomain).replace(/\/+/g, '/')
  // const subpath = parseSubpath(path)
  // const first = subpath.split('/').filter(truthy)[0]
  // path = projects[first]
  //   ? subpath
  //   : ('/' + subdomain + subpath).replace(/\/+/g, '/')
  // path = first === ':' ? ('/' + subdomain + subpath).replace(/\/+/g, '/') : subpath
  return path.replace(RegExp(`^${prefix}`), '').replace(/\/$/, '') || '/'
}
console.debug('LOGICAL PATH', parseLogicalPath() || '<empty>')
export const parseParts = (n: number=undefined, path=nonExpandedPathname(), prefix='') => {
  const logicalPath = parseLogicalPath(path, prefix)
  return logicalPath.split('/').filter(truthy).slice(0, n)
}
console.debug('PARTS', parseParts() || '<empty>')
export const parsePage = (path=nonExpandedPathname(), prefix='') => {
  // return just the top-level page (under an optional prefix), whether subdomain or path token
  // : wordbase.app/new/user => wordbase : wordbase.app/settings => settings

  const parts = parseParts(2, path, prefix)
  return parts[parts[0] === 'misc' ? 1 : 0]
}
console.debug('PAGE', parsePage() || '<empty>')
export const parseSubpage = (path=nonExpandedPathname(), prefix='') => {
  // return the secondary levels (under an optional prefix), whether subdomain or path token
  // : wordbase.app/new/user => wordbase : wordbase.app/settings => settings

  const parts = parseParts(undefined, path, prefix)
  return parts.slice(parts[0] === 'misc' ? 2 : 1).join('/')
}
console.debug('SUBPAGE', parseSubpage() || '<empty>')


let _loaded
const _cached = {}
const page = {
  loadTriggerValue: trigger.value(parseLogicalPath()),
  heavy: trigger.new(),
  loaded: () => _loaded || parsePage(),
  loading: () => (_loaded === parsePage()) ? parsePage() || true : false,
  load: (path?) => {
    page.loadTriggerValue.set(parseLogicalPath(path))

    // intercept URL changes to load project pages
    const parts = parseParts(2, path?.replace(/#.*/, ''))
    const id = parts[0] === 'misc' ? parts.join('/') : parts[0] ?? ''

    if (id && !_cached[id]) {
      console.debug('PAGE LOAD', id)
      return new Promise<void>(resolve => {
        try {
          // load meta info (if it exists)
          // trigger interstitial for 'heavy' pages (wordbase)
          const meta = { heavy: false }
          import('../pages/' + id + '/meta')
            .then(({ default: data }) => {
              Object.assign(meta, data)
              const isHeavy = meta.heavy && !_cached[id]
              console.debug('HEAVY?', isHeavy, meta)
              if (isHeavy) page.heavy.trigger()
              return meta
            })
            .catch(pass) // ignore if no meta info
            .finally(() => console.debug('LOAD', id, meta.heavy ? 'HEAVY' : 'LIGHT', meta))

          // import('../pages/' + id)
          // .finally(() => {
          //     // finally - even if page is not a project, nav to URL
          //     _cached[id] = true
          //     _to(push, path)
          // })
          import('../pages/' + id)
          .then(() => {
            _loaded = id
            _cached[id] = true
            console.debug('CACHED', id)
          })
          .catch(() => _cached[id] = -1)
          .finally(() => {
            // finally - even if page is not a project, nav to URL
            console.debug('PAGE LOAD COMPLETE', id)
            resolve()
            setTimeout(() => Q('#root').scrollTop = 0)
          })
        } catch {
          if (_cached[id] === true) _loaded = true
          resolve()
        }
      })

    } else {
      _loaded = id
      setTimeout(() => Q('#root').scrollTop = 0)
      return Thenable()
    }
  }
}

// initialize - load page
page.load()
export default page

// cyrus freshman > 2013
console.debug('copyright cyrus freshman > 2013')

window.xhr = src => {
    return (x => {
        x.withCredentials = false
        x.open('GET', src, false)
        x.send()
        console.debug('[xhr]', src, x.responseText)
        return x.responseText
    })(new XMLHttpRequest())
}
window.dependency = src => document.head.append((x => Object.assign(x, { innerHTML:xhr(src) }))(document.createElement('script')))
;[
    '/lib/2/css/script.js',
    '/lib/2/common/script.js',
    '/lib/2/hydrate-components/script.js',
    '/lib/2/store/script.js',
].map(x => dependency(new URL(x, (location.port === '3030') ? location.origin : 'https://freshman.dev').toString()))

window.manifest = (def={}) => 
    (x => { document.head.append(x); return x })
    (
        (x => Object.assign(x, { rel: 'manifest' }, def))
        (Q('head [rel=manifest]') || document.createElement('link'))
    )
window.generate_manifest = async () => {
    const name = location.pathname.replace(/^\/-?(raw)?/, '').replace(/\/$/,'') || location.host.split('.').reverse()[2]?.replace(/$/, '.') || location.host
    const color = Q('[name=theme_color]')?.content || getComputedStyle(document.documentElement).backgroundColor || getComputedStyle(document.body).backgroundColor || '#fdfcfa'
    const text_color = getComputedStyle(document.documentElement).color || getComputedStyle(document.body).color || '#111'

    const preserved_manifest = Q(`[rel=manifest][data-keep]`)
    // console.debug({preserved_manifest})
    if (preserved_manifest) return undefined

    // ;!Q('[rel=manifest]')?.href && 
    let icon_href = Q(`[rel=icon]:not([data-keep], [href="${location.href.replace(':3030', ':5050')}"])`)?.href
    if (icon_href === `${location.origin}/icon.png`) icon_href = false
    return JSON.stringify({
        name,
        display: `standalone`,
        start_url: location.href,
        theme_color: Q('[name=theme_color]')?.content || getComputedStyle(document.documentElement).backgroundColor || getComputedStyle(document.body).backgroundColor || '#fdfcfa',
        icons: [{
            src: icon_href || icon({ color, text:name, text_color, update:true }), // `${origin}/icon.png`,
            sizes: `256x256`,
            type: `image/png`,
        }]
    })
}

window._replace_manifest = async () => {
    const new_manifest = await generate_manifest()
    const old_manifest = -1 // undefined // await fetch(manifest().href).then(r=>r.text())
    if (new_manifest !== old_manifest) {
        const l = manifest({
            href: URL.createObjectURL(new Blob([new_manifest], { type: 'application/json' })),
        })
        // window.top === window && console.debug({new_manifest, manifest:l})
    }
}
window['icon'] && setInterval(_replace_manifest, 1_000)

import React from 'react';
import api from 'src/lib/api';
import { useF, useM, useS } from 'src/lib/hooks';
import { store } from 'src/lib/store';
import { S, dev } from 'src/lib/util';

const { datetime, rand } = window as any

const cached_or_fetch = async (key, fetcher) => {
    let value = store.get(key)
    if (!value || Date.now() - value.t > datetime.duration({ d: dev ? 0 : 1 })) {
        value = {
            href: await fetcher(),
            t: Date.now(),
        }
        store.set(key, value)
    }
    return value.href
}

export const use_is_website = ({ href }) => {
    const [title, set_title] = useS(href)
    useF(href, async () => {
        set_title(await cached_or_fetch(`website-title-cache-${href}`, async () => await api.post('/title', { href })))
    })
    return !!title
}

export const WebsiteTitle = ({ href }) => {
    const [title, setTitle] = useS(href)
    useF(href, async () => {
        setTitle(await cached_or_fetch(`website-title-cache-${href}`, async () => await api.post('/title', { href })))
    })
    return (title || href).replace(/^(https?:\/\/)?(www\.)?/, '')
}
export const RawWebsiteIcon = ({ href, style={}, fallback=null }: { href:string, style?:any, fallback?:any }) => {
    const [_icon, setIcon] = useS('')
    const icon = _icon === href ? '' : /data:image/.test(_icon) ? '' : _icon
    const [fetched, set_fetched] = useS(false)
    useF(href, async () => {
        setIcon(await cached_or_fetch(`website-icon-cache-${href}`, async () => {
            const result = await api.post('/icon', { href })
            set_fetched(true)
            return result
        }))
    })
    const id = useM(() => `website-icon-${rand.alphanum(8)}`)
    return icon || fallback ? <a id={id} href={href.replace(/^(https?:\/\/)?/, 'https://')} className='website-icon center-row' style={{ ...S(`height:1.3em;aspect-ratio:1/1`), ...style }}>
        <img src={icon || fallback} style={S(`height:100%;width:100%;object-fit:cover`)} />
    </a> : null
}

export const WebsiteIcon = ({ href }) => {
    const [_icon, setIcon] = useS('')
    const icon = _icon === href ? '' : /data:image/.test(_icon) ? '' : _icon
    useF(href, async () => {
        setIcon(await cached_or_fetch(`website-icon-cache-${href}`, async () => await api.post('/icon', { href })))
    })
    const id = useM(() => `website-icon-${rand.alphanum(8)}`)
    return icon ? <a id={id} href={href.replace(/^(https?:\/\/)?/, 'https://')} className='website-icon center-row'>
        <img src={icon} style={S(`height:1.3em;aspect-ratio:1/1;object-fit:cover;`)} />
        <style>{`
        #${id}#${id} {
            background: #000;
            border-radius: 3px;
            padding: .1em;
            cursor: pointer !important;
        
            border-left: .85em solid transparent !important;
            margin-left: -.85em;
        }
        #${id}#${id} img {
            border-radius: 1px !important;
        }
        `}</style>
    </a> : null
}

export const WebsiteTitleAndIcon = ({ href }) => {
    return <a href={href.replace(/^(https?:\/\/)?/, 'http://')} className='website-title-and-icon center-row gap'>
        <span><WebsiteTitle href={href} /></span>
        <WebsiteIcon href={href} />
        <style>{`
        .website-title-and-icon > :first-child {
            overflow: hidden;
            text-overflow: ellipses;
        }
        `}</style>
    </a>
}
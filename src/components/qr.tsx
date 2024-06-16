import React from 'react'
import { useF, useM, useR, useS, useTimed } from "src/lib/hooks"
import { useCachedScript } from 'src/lib/hooks_ext'
import { action } from 'src/lib/types'
import { S } from 'src/lib/util'
import styled from 'styled-components'

const { named_log, Q, copy, defer } = window as any
const log = named_log('qr')


export const QR = ({ href, size=128, full=false, on_click=undefined, do_copy=false, do_scroll_on_full=true, qr_options={} }: {
    href: string,
    size: string | number,
    full?: boolean,
    on_click?: action,
    do_copy?: boolean,
    do_scroll_on_full?: boolean,
    qr_options?: any,
}) => {
    useCachedScript('/lib/2/external/qrcode.min.js', () => generate_code())
    const ref_qr = useR()
    const create_qr = useR()
    const generate_code = () => {
        if (window['QRCode'] && (!create_qr.current || !Q(ref_qr.current, 'img'))) {
            const { QRCode } = window as any
            const qr_instance = new QRCode(ref_qr.current, {
                width: 256,
                height: 256,
                colorDark: '#ffffff',
                colorLight: '#000000',
                ...qr_options,
            })
            create_qr.current = (url) => qr_instance.makeCode(url)
        }
        if (!href || !create_qr.current) return
        create_qr.current(href)
    }
    useF(href, () => generate_code())

    useF(full, () => full && do_scroll_on_full && defer(() => {
        ref_qr.current.scrollIntoView({ block:'center' })
        Q('#root').scrollTop = 0
    }))
    
    const size_css = useM(size, () => typeof(size) === 'number' ? `${size}px` : size)
    return <StyleQR className='freshman-qr' style={S(`
    color: ${qr_options.colorLight ?? '#000'};
    border-width: ${qr_options.border_width ?? '1em'};
    ${full ? `
    width: 100%;
    aspect-ratio: 1 / 1;
    height: auto;
    ` : `
    height: ${size_css};
    width: ${size_css};
    `}
    `)} onClick={async e => {
        if (do_copy) {
            await copy(href)
        }
        on_click && await on_click()
    }}>
      <div ref={ref_qr} />
    </StyleQR>
}
const StyleQR = styled.div`&{
    // filter: invert();
    background: currentcolor;
    border: 1em solid currentcolor;
    cursor: pointer;

    > div, img {
        height: 100%;
        width: 100%;
    }
}`

export const useQr = ({ href, size=128 }: {
    href: string,
    size: string | number,
}) => {
    const [copied, set_copied] = useTimed(3_000, false)
    const [expanded, set_expanded] = useS(false)
    const ref_qr = useR()
    const handle = {
        copy: async () => {
            await copy(href)
            set_copied(true)
        },
        toggle_expand: async () => {
            set_expanded(!expanded)
        },
    }
    return [
        href ? <QR {...{
            href, size,
            full: expanded,
            on_click: handle.copy,
            ref: ref_qr,
        }} /> : null,
        copied ? 'copied!' : { copy: async () => await handle.copy(), },
        { [expanded ? 'shrink' : 'expand']: async () => await handle.toggle_expand() },
    ]
}
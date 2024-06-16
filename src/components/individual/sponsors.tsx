import React from 'react'
import styled from 'styled-components'
import { useF, useM, useR, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { useUserSocket } from 'src/lib/socket'
import { A } from '../A'

const { named_log, strings, maths } = window as any
const log = named_log('donoboard')

type sponsor = {
    slots: number,
    source: 'github.com'|'freshman.dev',
    name?: string,
    url?: string,
    u?: string,
    display?: string,
}

export const TARGET = 6000
export const RATE = 2
export const SLOTS = Math.ceil(TARGET / RATE)

export const use_sponsors = () => {
    const [sponsors, set_sponsors] = useS<sponsor[]>(undefined)
    useF(async () => {
        set_sponsors(await api.get('/donoboard'))
    })
    useUserSocket(null, {
        'sponsors': (sponsors) => {
            log('socket', { sponsors })
            set_sponsors(sponsors)
        },
    })
    return sponsors
}

export const use_sponsor_slots = () => {
    const [sponsors, set_sponsors] = useS<sponsor[]>(undefined)
    useF(async () => {
        set_sponsors(await api.get('/donoboard'))
    })
    const taken_slots = useM(sponsors, () => sponsors && maths.sum(sponsors.map(x => x.name === 'cyrus' ? 0 : x.slots)))
    const total_slots = SLOTS
    return sponsors && {
        taken: taken_slots,
        total: total_slots,
        unclaimed: Math.floor(total_slots - taken_slots),
    }
}

export const Sponsor = ({ sponsor, anon=false, bold=false }: { sponsor:sponsor, anon?:boolean, bold?:boolean }) => {
    let jsx = sponsor.u ? <A href={`/u/${sponsor.u}`}>@{sponsor.u}</A> : sponsor.display || (anon ? 'anon' : 'anonymous')
    if (bold) jsx = <b>{jsx}</b>
    return jsx
}

export const SponsorList = ({ }) => {
    const sponsors = use_sponsors()
    const anons = sponsors?.filter(x => !x.name)||[]
    return sponsors ? sponsors.filter(x => x.name && x.name !== 'cyrus').map(x => <Sponsor sponsor={x} anon /> as any).concat(anons.length ? [`anon x${anons.length}`] : []).map((x, i) => <>{i ? ', ' : ''}{x}</>) : '(loading sponsors)'
}

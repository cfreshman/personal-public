import React, { useState } from 'react';
import styled from 'styled-components';
import api from '../lib/api';
import { useEventListener, useF } from '../lib/hooks';
import { useHashState, usePageSettings } from '../lib/hooks_ext';
import { useSocket } from '../lib/socket';

let lastRefresh = Date.now()
export default () => {
    usePageSettings({
        background: '#000', text_color: '#fff',
    })

    const [data, setData] = useState({})
    const [lapse, setLapse] = useHashState({
        to: lapse => lapse && '24',
    })
    const handle = {
        load: () => {
            lastRefresh = Date.now()
            setData({})
            api.get(lapse ? '/cityhall/lapse' : '/cityhall').then(data => {
                console.debug(data)
                if (lapse) delete data.t
                setData(data)
            });
        }
    }
    useF(handle.load)
    useEventListener(window, 'focus', () => {
        if (Date.now() - lastRefresh > 1000 * 60 * 5) handle.load()
    })
    useSocket({
        room: 'cityhall',
        on: {
            'cityhall:update': type => {
                console.debug(type, lapse ? 'lapse' : 'still', type === (lapse ? 'lapse' : 'still'))
                if (type === (lapse ? 'lapse' : 'still')) {
                    handle.load()
                }
            },
        },
    })
    useF(lapse, handle.load)

    return <Style>
        {data.dataUrl
        ? <img src={data.dataUrl} />
        : <div className='placeholder'>loading</div>}
        <div className={`lapse lapse-${lapse}`}>
            <span className={`now ${!lapse}`} onClick={() => setLapse(false)}>now</span>
            &nbsp;/&nbsp;
            <span className={`timelapse ${lapse}`} onClick={() => setLapse(true)}>24hr lapse</span>
        </div>
        {lapse || !data.t ? '' : <div id="t">{data.t}</div>}
        {/* <div id="t">{data.t}</div> */}
    </Style>
}

const Style = styled.div`
height: 100%;
width: 100%;
background: black;

img, .placeholder {
    height: 100%;
    width: 100%;
    object-fit: contain;
    object-position: center;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
}
#t {
    position: absolute;
    bottom: 0;
    right: 0;
    padding: .3rem .5rem;
    background: #0002;
}
.lapse {
    position: absolute;
    top: 0;
    left: 0;
    padding: .3rem .5rem;
    background: #0002;
    font-size: .9rem;
    > span {
        cursor: pointer;
        &.true {
            // text-decoration: underline;
        }
        &.false {
            opacity: .5;
        }
    }
}
`
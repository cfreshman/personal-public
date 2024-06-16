import React from 'react';
import styled from 'styled-components';
import { useF, useR } from '../../lib/hooks';

export default () => {
    useF(() => {
        const script = document.createElement('script')
        script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest'
        script.onload = handle.init
        document.body.appendChild(script)
    })
    const handle = {
        init: () => {
            console.log('init')
            const video = videoRef.current
            const src = 'http://p1:8000/seg/test.m3u8'
            video.src = src
            video.addEventListener('loadedmetadata', () => video.play())
            // if(window.Hls && Hls.isSupported()) {
            //     console.log('option 1')
            //     var hls = new Hls();
            //     hls.loadSource(src);
            //     hls.attachMedia(video);
            //     hls.on(Hls.Events.MANIFEST_PARSED, () => {
            //         video.play();
            //     });
            // } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            //     console.log('option 2')
            //     video.src = src;
            //     video.addEventListener('loadedmetadata', () => {
            //         video.play();
            //     });
            // }
            // if(window.Hls && Hls.isSupported()) {
            //     console.log('option 1')
            //     var hls = new Hls();
            //     // hls.loadSource('https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8');
            //     hls.attachMedia(video);
            //     hls.on(Hls.Events.MANIFEST_PARSED, () => {
            //         video.play();
            //     });
            // } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            //     console.log('option 2')
            //     // video.src = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
            //     video.addEventListener('loadedmetadata', () => {
            //         video.play();
            //     });
            // }
        },
    }

    const videoRef = useR()
    return <Style>
        <video ref={videoRef} id="video"></video>
    </Style>
}

const Style = styled.div`
height: 100%;
width: 100%;
background: black;

video {
    height: 100%;
    width: 100%;
    object-fit: contain;
    object-position: center;
}
#t {
    position: absolute;
    bottom: 0;
    right: 0;
    padding: .3rem .5rem;
    background: #0004;
}
.lapse {
    position: absolute;
    top: 0;
    left: 0;
    padding: .3rem .5rem;
    background: #0004;
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
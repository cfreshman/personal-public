import React from 'react';
import styled from 'styled-components';

export const Footer = () => (
    null && <Style id="footer">
        <span>
            © 2024 <a href='https://freshman.dev'>FRESHMAN.DEV</a>
            <span>LLC</span>
            {/* <div><span>L</span>/<span>C</span></div> */}
        </span>
    </Style>
)

const Style = styled.div`
z-index: 1000000000;
position: fixed;
bottom: 0; right: 0;
opacity: .5;
color: var(--id-color-text);
text-shadow: 1px 1px #000;
opacity: .7;
opacity: .3;
font-size: 0.7rem;
// padding: 0 .25rem;
padding: .5rem;
pointer-events: none;
display: flex;
align-items: flex-start;
align-items: center;
line-height: 1;

> span {
    position: relative;
    line-height: 1;
    > span {
        opacity: .7;
        font-size: .7em;
        align-self: flex-start;
        position: absolute;
        line-height: 1;
        bottom: calc(100% + 0px);
        right: 0;
    }
    > div {
        position: relative;
        font-size: .8em;
        height: 100%;
    }
    > div > span {
        font-size: .5em;
        position: absolute;
        &:first-child {
            top: 0; left: 0;
        }
        &:last-child {
            bottom: 0; right: 0;
        }
    }
}

font-size: .4rem;
padding: 0 .5rem;
padding: 0 .33rem;
opacity: 1;
> span, a {
    text-shadow: 1px 1px #fff4;
    text-shadow: none;
    color: inherit !important;
    a {
        pointer-events: all;
        text-decoration: none;
    }
    > span { display: none }
}
`

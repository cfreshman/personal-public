import React, { Fragment, useState } from 'react';
import styled from 'styled-components';
import { useEventListener, useF, useInterval, useR, useRerender } from '../../lib/hooks';
import { useAuth } from '../../lib/hooks_ext';
import { formatDuration } from '../../lib/util';
import { Player } from './board';
import { theme } from './common';
import { local } from './data';
import { infoToAction } from './result';
import { Info } from './save';

const Style = styled.div`
&.game-progress {
    width: 100%;
    height: 100%;
    color: white;
    color: ${theme.tile};

    // border-left: .5rem solid ${theme.orange};
    // border-right: .5rem solid ${theme.blue};

    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 0 .3rem;
    font-family: Ubuntu, sans-serif;
    position: relative;
    overflow: hidden;

    * {
        display: flex;
        align-items: center;
        user-select: none;
    }

    .progress-background {
        display: flex; align-items: stretch;
        position: absolute;
        top: 0; left: 0; width: 100%; height: 100%;
    }

    > .side {
        z-index: 10;
        height: 100%;
        display: flex;
        align-items: center;
        &.left {
            > * { margin-right: .25rem }
        }
        &.right {
            flex-direction: row-reverse;
            > * { margin-left: .25rem }
        }
        .clock-icon {
            margin: .125em 0 !important; // reduce space b/n icon & text
            // height: calc(100% - 1rem);
            height: 1.2rem;
            aspect-ratio: 1/1;
            svg {
                width: 100%;
            }
        }
        > *:not(.player-name) {
            text-shadow: none;
        }
    }

    .chiclet {
        white-space: pre;
        // background: #00000088;
        background: #ffffff22;
        background: ${theme.tile_2};
        padding: 0 .3rem;
        border-radius: .2rem;
        line-height: 1.5rem;
        user-select: none;

        &.action {
            background: #00000088 !important;
            background: ${theme.bomb_5} !important;
        }
        a {
            pointer-events: all;
            color: inherit;
            text-shadow: none;
            text-decoration: none;
            :hover { text-decoration: underline; }
        }
    }
    .game-status {
        z-index: 11;
        &.side-false {
            position: absolute;
            width: 100%;
        }
        &.right-true {
            margin-left: auto;
        }
        top: 0; left: 0;
        height: 100%;
        z-index: 10;
        pointer-events: none;
        display: flex;
        align-items: center;
        justify-content: center;
        span {
          background: #00000088;
          background: ${theme.bomb_5} !important;
        }
    }
    .player-name {
        cursor: pointer;
        z-index: 100;
        white-space: pre;
        :hover:not(.local) span { text-decoration: underline; }
        &.hide { display: none }
    }
    .p1 .turn::before {
        content: "> ";
    }
    .p2 .turn::after {
        content: " <";
    }
    .side.empty:not(.over) {
        &.p1 .player-name {
            background: ${theme.blue};
        }
        &.p2 .player-name {
            background: ${theme.orange};
        }
        &.ignore .chiclet { background: #0000 }
    }
    &.change-true .side.empty {
        &.won .chiclet { background: ${theme.green} }
        &.lost .chiclet { background: ${theme.red} }
    }

    position: relative;
    &.done::after {
        content: ""; width: 100%; height: 100%;
        position: absolute; left: 0;
        z-index: 1;
        pointer-events: none;
        background: repeating-linear-gradient(
            -45deg,
            transparent,
            transparent .5rem,
            ${theme.tile_2} .5rem,
            ${theme.tile_2} 1rem
        );
    }

    &.local .player-name {
        pointer-events: none;
    }

    .lang {
        position: absolute;
        width: 100%;
        left: 0;
        display: flex;
        justify-content: center;
        text-transform: uppercase;
        font-size: 1rem;
    }

    .time {
        padding: 0 0.25rem !important;
        justify-content: center;

        &.time.chiclet > span:not(:last-child) {
            margin-right: 0.1rem !important;
        }
    }
    &.clock-false .time {
        display: none;
    }
    &.solid-true {
        .game-status span {
            background: ${theme.bomb} !important;
        }
        .side {
            color: ${theme.bomb} !important;
        }
        .chiclet {
            background: ${theme.tile} !important;
        }
    }
}
`

export const GameProgress = ({info, open, options={}}: {
    info: Info, open: any, options?: {
        changeOnOver?: boolean, showLang?: boolean, action?: boolean, toSide?: boolean, progressRenderTarget?,
        altBackground?: boolean
    }
}) => {
    const auth = useAuth();
    const { changeOnOver, showLang, altBackground } = options
    const isLocal = info.id === local.info.id
    // const openUser = user => isLocal || history.push(`/u/${user}`)
    // const openUser = (user, e) => {
    //     e.stopPropagation()
    //     isLocal || history.push(`/wordbase#stats/${user}`)
    // }
    const openUser = (user, e) => {
        e.stopPropagation()
        isLocal || open(undefined, user)
    }

    const rerender = useRerender()
    useEventListener(options.progressRenderTarget, 'rerender complete', rerender)

    info.p1 = info.p1 || 'invite'
    const pCurr = [info.p1, info.p2][info.turn % 2]
    const isOver = info.status !== Player.none
    const isTurn = isOver
        ? [1, 0, 0]
        : [0, (info.turn + 1)%2, info.turn%2];

    const isDraw = info.status === Player.draw
    const isWon = isOver && auth.user == [info.p1, info.p2][[Player.p1, Player.p2].indexOf(info.status)]
    const isViewed = isOver && !(info.unseen === true || (info.unseen && info.unseen.includes(auth.user)))

    // console.log(info.lastWord)
    const longSide = (info.turn || info.status > -1 || options.toSide) && options.action && options.toSide
    const ifLongHidePlayer = info.turn > 0 || info.status > -1
    const ifHidePlayerHideP1 =
        ['.resign', '.timeout'].includes(info.lastWord)
        ? info.status === Player.p2
        : isOver
        ? info.status === Player.p1
        : !!(info.turn%2)
    const activeP1 = info.p1 === auth.user && !isWon
    const activeP2 = info.p2 === auth.user && !isWon
    const hideP1 = longSide && ((ifLongHidePlayer && ifHidePlayerHideP1) || activeP1)
    const hideP2 = longSide && ((ifLongHidePlayer && !ifHidePlayerHideP1) || activeP2)

    // const colors = (info.status === Player.none || !auth.user)
    //     ? [theme.orange, theme.blue]
    //     : (auth.user === (info.status === Player.p1 ? info.p1 : info.p2))
    //     ? ['green', 'gray'] : ['red', 'gray']

    const useOverColors = isViewed && changeOnOver && !isLocal && !theme.uniform
    const [win, lose] =
        !theme.uniform
        ? [theme.green, theme.red]
        : info.status === Player.p1
        ? [theme.orange, theme.blue]
        : [theme.blue, theme.orange]
    const dark = (x=undefined) => theme[(altBackground ? 'dual_feed' : 'backing') + (x ? '_'+x : '')]
    const colors = useOverColors
        ?
            isDraw
            ? [dark(3), dark(), dark(3)]
            : isWon
            ?
                info.status === Player.p2
                ? [win, dark(), dark(2)]
                : [dark(2), dark(), win]
            :
                info.status === Player.p2
                ? [lose, dark(), dark(2)]
                : [dark(2), dark(), lose]
        // ? info.status === Player.p2 ? [theme.green, theme.red] : [theme.red, theme.green]
        : [theme.orange, dark(), theme.blue]

    const { timePerMove, timePerPlayer: startingTimePerPlayer } = info.settings?.options || {}
    const timePerPlayer = info.timePerPlayer || (startingTimePerPlayer && [startingTimePerPlayer, startingTimePerPlayer])
    // console.debug('TIME PER PLAYER', timePerPlayer)
    // const showPlayClock = (timePerMove || timePerPlayer) && !options.toSide && (!isOver || timePerPlayer)
    const showPlayClock = (timePerMove || timePerPlayer) && (!options.toSide || !isOver) && (!isOver || timePerPlayer)
    const playClock = useR()
    const playClockBasis = useR()
    useF(info.id, info.turn, () => {
        playClockBasis.current = {
            ...Info.getRemainingTime(info),
            remainingTimeStartMs: Date.now(),
        }
        // console.debug('PLAY CLOCK', info.turn, info.settings?.options, playClockBasis.current)
    })
    // const { remainingTime, remainingTimeStartMs, timeForMove } = useM(info, info.id, info.turn, () => {
    //     return {
    //         ...Info.getRemainingTime(info),
    //         remainingTimeStartMs: Date.now(),
    //     }
    // })
    const moveTimeToDisplay = (timeForMove, remainingTime?) =>
        formatDuration(Math.max(0, Math.min(timeForMove, remainingTime || 1e9)), { short: !!options.action })

    useInterval(() => {
        if (playClock.current && playClockBasis.current) {
            const {
                remainingTime, remainingTimeStartMs, timeForMove
            } = playClockBasis.current
            const elapsedTime = info.unseen && info.turn < 2 ? 0 : (Date.now() - remainingTimeStartMs)/1000
            // console.debug(remainingTime - elapsedTime, info.unseen, info.seen, remainingTimeStartMs - info.lastUpdate, timeForMove, remainingTime, elapsedTime)
            // console.debug(remainingTime, elapsedTime)
            playClock.current.textContent = moveTimeToDisplay(timeForMove, remainingTime - elapsedTime)
            // const timeSinceLastPlay = Math.max(0, Date.now() - info.lastUpdate) / 1000
            // playClock.current.textContent = formatDuration(
            //     Math.max(0, Math.min(
            //         timePerMove,
            //         !timePerPlayer ? 1e9 : timePerPlayer[info.turn % 2],
            //         ) - timeSinceLastPlay))
        }
    }, 100)
    // console.log(timePerMove, timePerPlayer, timeSinceLastPlay, timeRemaining)

    // const colors = [theme.orange, theme.blue]

    // const progressGradient = isOver
    //     ? (isWon ? '#1ed71e' : '#ff1c1c')
    //     : `${colors[0]} ${info.progress[0]}%, #2d2d2d ${info.progress[0]}% ${info.progress[1]}%, ${colors[1]} ${info.progress[1]}%`
    // const progressBackground = isViewed && false
    //     // ? (isWon ? '#1ed71e' : '#ff1c1c')
    //     ? (isWon ? 'rgb(78 211 78)' : 'rgb(255 76 76)') // rgb(255 90 90)
    //     : `linear-gradient(90deg, ${colors[0]} ${info.progress[0]}%, ${colors[1]} ${info.progress[0]}% ${info.progress[1]}%, ${colors[2]} ${info.progress[1]}%)`
    const progressBackground = isViewed && false
        // ? (isWon ? '#1ed71e' : '#ff1c1c')
        ? [[100, (isWon ? 'rgb(78 211 78)' : 'rgb(255 76 76)')]] // rgb(255 90 90)
        : [[info.progress[0], colors[0]], [info.progress[1] - info.progress[0], colors[1]], [100 - info.progress[1], colors[2]]]
    const isP1 = auth.user === info.p1
    const winP1 = info.status === Player.p1
    const isP2 = auth.user === info.p2
    const winP2 = info.status === Player.p2

    const [statusP1, statusP2, statusAction] = [
        longSide && isP1 ? winP1 ? 'you win!' : 'you' : info.p1 + (winP1 ?' wins!':''),
        longSide && isP2 ? winP2 ? 'you win!' : 'you' : info.p2 + (winP2 ?' wins!':''),
        infoToAction(info, auth.user, longSide),
    ].map(text => text.replace(
        new RegExp(`(${info.p1}|${info.p2})`),
        // `<a href="/wordbase/#/stats/$1" onclick="event.stopPropagation()">$1</a>`))
        `<a>$1</a>`))

    return (
    <Style className={'game-progress'
    + (info.status !== Player.none ?' done':'')
    + (isLocal ?' local':'')
    + ` viewed-${isViewed}`
    + ` clock-${showPlayClock || true}`
    + ` change-${!theme.uniform}`
    + ` solid-${theme.solid}`
    // + `hide-${hideP1 ? 'right' : 'left'}`
    }
        // style={{ background: progressBackground }}
        >
        <div className='progress-background'>{progressBackground.map(([percent, color]) => percent ? <div style={{flexGrow:percent, background:color}} /> : '')}</div>

        {info.turn < 0 ? '' : <>
        {hideP2 ? '' : <span className={`left side p2`
            + (info.progress[0] === 0 ?' empty':'')
            + (changeOnOver && isViewed
                ?
                    info.status === Player.p2
                    ?
                        isWon
                        ?' won'
                        :' lost'
                    :' over'
                :'')}>
            <span className={'player-name chiclet'
            + (hideP2 ? ' hide' : '')
            + (isTurn[2] ?' turn': '')
            // + (!hideP1 && longSide ? ' action':'')
            // highlight user if empty & won, oppo if empty & lost
            // + (!isViewed && info.progress[0] === 0 ?' empty':'')
            + (!isLocal && auth.user === info.p2 ? ' player-name-user' : '')}
                onClick={e => openUser(info.p2, e)}
                // dangerouslySetInnerHTML={{ __html: (!hideP2 && longSide
                //     ? infoToAction(info, auth.user, true)//.replace(info.p1, `<span>${info.p1}</span`)
                //     // : longSide && isOver && !isWon && info.p2 === auth.user // hide user when lost to play
                //     // ? ''
                //     : info.p2 + (info.status === Player.p2 ? ' wins!' : ''))
                //     .replace(new RegExp(`(${info.p2}|you|they)`), `<span>$1</span>`) }} />
                dangerouslySetInnerHTML={{ __html: statusP2 }} />
                {/*
                <span dangerouslySetInnerHTML={{ __html: (
                    info.p2 + (info.status === Player.p2 ? ' wins!' : ''))
                    .replace(new RegExp(`(${info.p2}|you|they)`), `<span>$1</span>`) }} />
                {(isTurn[2] && timePerMove) || (timePerPlayer && showPlayClock) ? <span>&nbsp;</span>:''}
                {isTurn[2] && timePerMove
                ? <>
                    <ClockIcon />
                    <span className='time' ref={playClock} />
                </>
                : timePerPlayer && showPlayClock
                ? <span className='time'>{moveTimeToDisplay(timePerPlayer[Player.p2])}</span>
                : ''}
                </span> */}
            {/* {isTurn[2] && timePerMove
            ? <>
                <ClockIcon />
                <span className='time' ref={playClock} />
            </>
            : timePerPlayer && showPlayClock
            ? <span className='time'>{moveTimeToDisplay(timePerPlayer[Player.p2])}</span>
            : ''} */}
            {isTurn[2] && (timePerMove || timePerPlayer)
            ? <span className='time chiclet'>
                <ClockIcon />
                &nbsp;
                <span ref={playClock} />
            </span>
            : timePerPlayer && showPlayClock
            ? <span className='time chiclet'>{moveTimeToDisplay(timePerPlayer[Player.p2])}</span>
            : ''}
        </span>}
            {/* <span onClick={e => openUser(info.p2, e)}>{info.p2}</span>
            {(info.status === Player.p2 ? ' wins!':'')} */}

            {/* {(!hideP1 && longSide
                ? infoToAction(info, auth.user)//.replace(info.p1, `<span>${info.p1}</span`)
                : longSide && isOver && !isWon && info.p2 === auth.user // hide user when lost to play
                ? ''
                : info.p2 + (info.status === Player.p2 ? ' wins!' : ''))} */}
            {/* </div> */}
        {/* <div className='game-status'>{(() => {
            switch (info.status) {
                case Player.none: return '';
                case Player.p1: return `${info.p1} wins!`;
                case Player.p2: return `${info.p2} wins!`;
            }
        })()}</div> */}

        {showLang && !isOver
        ? <span className='lang'>{info.lang}</span>
        // : options.action && !longSide
        // ? <span className={'game-status action'}>
        //     <span>{infoToAction(info, auth.user)}</span>
        // </span>
        // : ''}
        : options.action
        ? <span className={`game-status action side-${!!longSide} right-${ifHidePlayerHideP1}`}>
            <span className='chiclet' onClick={e => {
                const player = !statusAction
                    ? false
                    : statusAction.includes(info.p1)
                    ? info.p1
                    : statusAction.includes(info.p2)
                    ? info.p2
                    : false
                player && openUser(player, e)
            }}
            dangerouslySetInnerHTML={{ __html: statusAction }} />
        </span>
        : ''}

        {hideP1 ? '' : <span className={`right side p1`
            + (info.progress[1] === 100 ?' empty':'')
            + (changeOnOver && isViewed
                ?
                    info.status === Player.p1
                    ?
                        isWon
                        ?' won'
                        :' lost'
                    :' over'
                :'')}>
            <span className={'player-name chiclet'
            + (isTurn[1] ?' turn': '')
            // + (hideP1 && longSide ? ' action':'')
            // highlight user if empty & won, oppo if empty & lost
            // + (!isViewed && info.progress[1] === 100 ?' empty':'')
            + (!isLocal && isP1 ? ' player-name-user' : '')}
                onClick={e => info.p1 && openUser(info.p1, e)}
                // dangerouslySetInnerHTML={{ __html: (hideP1 && longSide
                //     ? infoToAction(info, auth.user, true)//.replace(info.p1, `<span>${info.p1}</span`)
                //     // : longSide && isOver && !isWon && info.p1 === auth.user
                //     // ? ''
                //     : info.p1 + (info.status === Player.p1 ? ' wins!' : ''))
                //     .replace(new RegExp(`(${info.p1}|you|they)`), `<span>$1</span>`) }} />
                dangerouslySetInnerHTML={{ __html: statusP1 }} />
                {/* <span onClick={e => openUser(info.p1, e)}>{info.p1}</span>
                {(info.p1 ? '' : 'invite') + (info.status === Player.p1 ? ' wins!':'')} */}
                {/* {hideP1 && longSide
                    ? infoToAction(info, auth.user)//.replace(info.p1, `<span>${info.p1}</span`)
                    : longSide && isOver && !isWon && info.p1 === auth.user
                    ? ''
                    : info.p1 + (info.status === Player.p1 ? ' wins!' : '')} */}
                {/* </div> */}
            {/* {isTurn[1] && timePerMove
            ? <>
                <ClockIcon />
                <span className='time' ref={playClock} />
            </>
            : timePerPlayer && showPlayClock
            ? <span className='time'>{moveTimeToDisplay(timePerPlayer[Player.p1])}</span>
            : ''} */}
            {isTurn[1] && (timePerMove || timePerPlayer)
            ? <span className='time chiclet'>
                <span ref={playClock} />
                &nbsp;
                <ClockIcon />
            </span>
            : timePerPlayer && showPlayClock
            ? <span className='time chiclet'>{moveTimeToDisplay(timePerPlayer[Player.p1])}</span>
            : ''}
        </span>}
        </>}
    </Style>
    )
}

export const ClockIcon = () => <span className='clock-icon'>
    {/* https://www.svgrepo.com/svg/127372/timer */}
    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 296.228 310" xmlnsXlink="http://www.w3.org/1999/xlink" fill='currentColor' width='1em'>
        <path d="m167.364,48.003v-23.003h10.5c6.903,0 12.5-5.597 12.5-12.5s-5.596-12.5-12.5-12.5h-59.5c-6.903,0-12.5,5.597-12.5,12.5s5.597,12.5 12.5,12.5h10.5v23.003c-59.738,9.285-105.604,61.071-105.604,123.37-3.55271e-15,68.845 56.01,124.855 124.854,124.855 68.845,0 124.854-56.01 124.854-124.855 0-62.299-45.866-114.086-105.604-123.37zm23.148,165.589c-2.442,2.452-5.65,3.68-8.857,3.68-3.19,0-6.381-1.214-8.82-3.643l-33.54-33.398c-2.355-2.346-3.68-5.533-3.68-8.857v-64.082c0-6.903 5.597-12.5 12.5-12.5 6.903,0 12.5,5.597 12.5,12.5v58.889l29.86,29.734c4.891,4.87 4.908,12.785 0.037,17.677z"/>
    </svg>
</span>
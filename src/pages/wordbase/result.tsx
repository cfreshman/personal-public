import React, { useState } from 'react';
import { Sponsor } from '../../components/Info';
import styled from 'styled-components';
import api from '../../lib/api';
import { copy, copyPath } from '../../lib/copy';
import { cleanTimeout, useE, useM, useStyle, useTimeout } from '../../lib/hooks';
import { useAuth } from '../../lib/hooks_ext';
import { meta } from '../../lib/meta';
import { JSX, pass } from '../../lib/types';
import url from '../../lib/url';
import { layerBackground, toStyle } from '../../lib/util';
import { Player, Tile } from './board';
import { theme, themes } from './common';
import { local } from './data';
import { drawReplay } from './draw';
import { GameProgress } from './progress';
import { Info, Save } from './save';

export const infoToAction = (info: Info, viewer: string, side=false) => {
    const isLocal = info.id === local.info.id
    const isP1 = info.p1 === viewer
    const pViewer: Player = Player[isP1 ? 'p1' : 'p2']
    const oppo = isP1 ? info.p2 : info.p1 || 'invite'
    const isTurn = info.turn%2 === (isP1 ? 0 : 1)
    const resigned = info.lastWord === '.resign'
    const timeout = info.lastWord === '.timeout'
    const skip = info.lastWord === '.skip'
    const draw = info.lastWord === '.draw'
    const confirm = info.lastWord === '.confirm' ? info.confirm[0] : false
    const isOver = info.status > -1

    // short = true // disable long 'won with !' for now
    const word = info?.lastWord?.toLocaleUpperCase()
    const isViewerAction =
        resigned || timeout
        ? info.status !== pViewer
        : isOver
        ? info.status === pViewer
        : !isTurn

    const user =
        isLocal
        ? info[info.turn%2 ? 'p1' : 'p2']
        : isViewerAction
        ? 'you'
        : side
        ? oppo
        : 'they'
    const action =
        resigned ? 'resigned'
        : timeout ? 'timed out'
        : skip ? 'skipped'
        : draw ? 'agreed to a draw'
        : `played ${word}`
        // : `${isOver && side && false ? 'won with' : 'played'} ${word}${isOver && side && false ? '!':''}`

    return !info.lastWord
        ? ''
        : confirm
            ? confirm.type === Info.ConfirmType.CONTEST
            ? `${user} requested ${confirm.value.letters.toLocaleUpperCase()}`
            : confirm.type === Info.ConfirmType.DRAW
            ? `${user} requested a draw`
            : [Info.ConfirmType.REJECT, Info.ConfirmType.ACCEPT].includes(confirm.type)
            ? confirm.value
            : `${confirm.type}ed`
        : side && isViewerAction
        ?
            resigned ? `resigned`
            : timeout ? 'timed out'
            : skip ? 'skipped'
            : draw ? 'draw'
            : word
        : `${user} ${action}`
}

export const Result = ({ user, info, save, close, menu, rematch, stats, open }: {
    user: string, info: Info, save: Save, close: any, menu: any, rematch: any, stats: any, open: any,
}) => {
    const auth = useAuth()
    const isLocal = info.id === local.info.id
    const isHuman = isLocal && info.p1 === 'blue'
    let isWinner, plays
    if (isHuman) {
        isWinner = false
        plays = save.history.slice().reverse()
    } else {
        user = isLocal ? 'human' : auth.user
        isWinner = info[info.status === Player.p1 ? 'p1' : 'p2'] === user
        const index = user === info.p1 ? 0 : 1
        plays = save.history.slice().reverse()
            .filter((_, i) => index === i%2)
    }
    const bombs = plays.filter(tiles => tiles.some(tile => tile.isBomb)).length
    const words = plays.map(tiles => tiles.map(tile => tile.letter).join(''))
    const longest = words.sort((a, b) => b.length - a.length)[0] ?? ' '
    const total = words.reduce((sum, word) => sum + word.length, 0)

    const [copied, setCopied] = useState('')
    useTimeout(copied, () => setCopied(''), 4000)

    const DISPLAY = {
        none: `A⃞B⃞C⃞D⃞E⃞F⃞G⃞H⃞I⃞J⃞K⃞L⃞M⃞N⃞O⃞P⃞Q⃞R⃞S⃞T⃞U⃞V⃞W⃞X⃞Y⃞Z⃞`,
        winner: `A⃞■B⃞■C⃞■D⃞■E⃞■F⃞■G⃞■H⃞■I⃞■J⃞■K⃞■L⃞■M⃞■N⃞■O⃞■P⃞■Q⃞■R⃞■S⃞■T⃞■U⃞■V⃞■W⃞■X⃞■Y⃞■Z⃞■`,
        loser: `🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩`,
    }
    const resultDisplay = useM(save, () => {
        const blue = '🟦'
        const orange = '🟧'
        const none = '⬜'
        const resultBoard = save.board
            .rows()
            .map(row => row.map(tile => [none, blue, orange][tile.owner + 1]).join(''))
            .join('\n')
        return (
`wordbase.app
${info.p1} vs ${info.p2}
${['BLUE', 'ORANGE'][info.status]} wins!
${resultBoard}`
        )
//         return (
// `${['BLUE', 'ORANGE'][info.status]} wins!
// ${info.p1}
// ${resultBoard}
// ${info.p2}

// wordbase.app`
//         )
    })

    useStyle(theme.dark, theme.dark ? `
    .wordbase-result .stats {
        background: ${theme.tile} !important;
        color: ${theme.bomb} !important;
    }
    .wordbase-result .control {
        background: ${theme.bomb} !important;
        color: ${theme.tile} !important;
    }
    .wordbase-result .controls.below .control.control {
        background: ${theme.tile} !important;
        color: ${theme.bomb} !important;
        border: 0 !important;
        padding-top: 2px !important;
        padding-bottom: 2px !important;
    }` : '')

    return <Style
    className='wordbase-result'
    style={{background: info.status === Player.p1 ? theme.blue_7 : theme.orange_7}}
    onClick={close}>
        <div className='main' onClick={e => e.stopPropagation()}>
            <div className='title'>
                {isWinner ? 'You Won!' : info.lastWord==='.draw' ? 'Draw!' : 'Game Over!'}
                <div className='action'>{infoToAction(info, auth.user)}</div>
            </div>
            <GameProgress info={info} open={open} />
            <div className='stats'>
                <div className='item'>
                    <label>Longest word</label>
                    <span className='stat'>{longest.toUpperCase()}</span>
                </div>
                <div className='item'>
                    <label>Average length</label>
                    <span className='stat'>{Math.round(total / (words.length || 1) * 10)/10}</span>
                </div>
                <div className='item'>
                    <label>Explosions</label>
                    <span className='stat'>{bombs}</span>
                </div>
                <div className='item'>
                    <label>Total words</label>
                    <span className='stat'>{words.length}</span>
                </div>
                {/* <div className='item'>
                    <label>Words played</label>
                    <span className='stat'>{words.length}</span>
                </div>
                <div className='item'>
                    <label>Letters played</label>
                    <span className='stat'>{words.join('').length}</span>
                </div> */}
                <div className={`controls controls-3`}>
                    <div className='control' onClick={menu}>menu</div>
                    <div className='control' onClick={rematch}>{info.rematch ? 'rematched' : 'rematch'}</div>
                    {/* <div className='control' onClick={menu}>share</div>
                    <div className='control' onClick={menu}>replay</div>
                    <div className='control' onClick={rematch}>{info.rematch ? 'rematched' : 'rematch'}</div> */}
                    <div className='control' onClick={close}>close</div>
                </div>
            </div>
            {isLocal ? null : <div className='controls below'>
                {
                    !copied ?
                    <>
                        <div className={'control'} onClick={e => {
                            setCopied('replay')
                            copyPath(`/wordbase/replay/${info.id}`)
                            // api.get(`/wordbase/games/${info.id}/replay`)
                            drawReplay(info, save)
                            .then(img => api.post(`/wordbase/games/${info.id}/replay`, { img }))
                        }}>share replay</div>
                        {/* <div className={'control'} onClick={e => {
                            setCopied(resultDisplay)
                            // api.get(`/wordbase/games/${info.id}/replay`)
                            console.debug(`https://freshman.dev/api/wordbase/games/${info.id}/twitter`)
                            // console.debug(`https://freshman.dev/api/integrations/twitter/card/${encodeURIComponent(
                            //     JSON.stringify({
                            //         'twitter:card': 'summary_large_image',
                            //         'twitter:url': location.origin+`/wordbase/replay#${info.id}`,
                            //         'twitter:title': `${info.p1} vs ${info.p2}`,
                            //         'twitter:site': '@wordbase_app',
                            //         'twitter:creator': '@freshman_dev',
                            //         'twitter:description': `${['BLUE', 'ORANGE'][info.status]} wins!`,
                            //         'twitter:image': 'https://wordbase.app/raw/wordbase/favicon256.png',
                            //     })
                            // )}`)
                        }}>share result</div> */}
                    </>
                    : copied === 'replay' ?
                    <>
                        <div className='control' onClick={e => {
                            url.push(`/wordbase/replay/${info.id}`)
                            close()
                        }}>watch</div>
                        <div className={'control message'}>link copied</div>
                        <div className='control' onClick={e => {
                            const [winner, loser] =
                                [[info.p1, info.p2], [info.p2, info.p1]][info.status]
                            const [player, other] =
                                [auth.user, [info.p1, info.p2].filter(x => x !== auth.user)]
                            const isWinner = winner === auth.user
                            url.new(`http://twitter.com/intent/tweet?text=${encodeURIComponent(
`${isWinner ? `I beat ${other} at wordbase.app!` : `I lost to ${other} at wordbase.app!`}

wordbase.app/replay/${info.id}`)}`)
                        }}>tweet</div>
                    </>
                    : copied === 'result' ?
                    <>
                        <div className={'control message'} onClick={e => {
                            copy('')
                        }}>result copied</div>
                        <div className={'control'} onClick={e => {
                            console.debug(resultDisplay)
                            // url.new(`http://twitter.com/intent/tweet?text=${encodeURIComponent(resultDisplay)}`)
                            url.new(`http://twitter.com/intent/tweet?text=${encodeURIComponent(`wordbase.app/replay/${info.id}`)}`)
                            // url.external(`http://twitter.com/intent/tweet?text=${encodeURIComponent(`https://freshman.dev/api/integrations/twitter/card/${encodeURIComponent(
                            //     JSON.stringify({
                            //         'twitter:card': 'summary_large_image',
                            //         'twitter:url': location.origin+`/wordbase/replay#${info.id}`,
                            //         'twitter:title': `${info.p1} vs ${info.p2}`,
                            //         'twitter:site': '@wordbase_app',
                            //         'twitter:creator': '@freshman_dev',
                            //         'twitter:description': `${['BLUE', 'ORANGE'][info.status]} wins!`,
                            //         // 'twitter:image': 'https://wordbase.app/raw/wordbase/favicon256.png',
                            //     })
                            // )}`)}`)
                        }}>tweet</div>
                    </>
                    : ''
                }
            </div>}
            {/* {JSON.stringify(info, null, 2)} */}
        </div>

        {/* <div id='result-sponsor-button' style={toStyle(`
            position: fixed;
            bottom: 1em;
            left: 0;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2;
            `)}>
            <Sponsor hideForSupporter dark />
        </div> */}
    </Style>
}

const Style = styled.div`
position: fixed; top: 0; left: 0;
height: 100%; width: 100%;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
background: #fff8;
font-family: Ubuntu;
// border-radius: 0.2rem;
border-radius: inherit;

// position: relative;
overflow: hidden;
&:after {
    content: ""; width: 200%; height: 200%;
    position: absolute; left: -50%; top: -50%;
    z-index: 1;
    pointer-events: none;
    background: repeating-linear-gradient(
        -45deg,
        transparent,
        transparent 2rem,
        #ffffff29 2rem,
        #ffffff29 4rem
    );
    animation: 2s infinite scroll linear;
    @keyframes scroll {
        from { background-position: 0; }
        to { background-position: 5.625rem; }
    }
}

.main {
    z-index: 2;
    white-space: pre-wrap;
    // height: 50%;
    width: 24.4rem;
    background: ${theme.tile};
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 0.2rem;

    animation: .5s appear; // cubic-bezier(0.34, 1.56, 0.64, 1);
    @keyframes appear {
        from { transform: scale(0); }
        to { transform: scale(1); }
    }

    .title {
        height: 4rem;
        font-size: 2rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        line-height: 2rem;
        color: ${theme.bomb};
        .action {
            font-size: .9rem;
            line-height: .9rem;
            color: ${theme.bomb_5};
            text-shadow: none;
        }
    }
    .game-progress {
        height: 2rem;
    }
    .stats {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        padding: 1rem;
        // background: var(--dark);
        // background: rgb(45, 45, 45);
        // background: ${theme.bomb};
        // background: #131125;
        // background: ${layerBackground('#fff', theme.bomb_9)};
        // background: ${theme.bomb};
        background: ${layerBackground('#fff', theme.bomb_9, theme.bomb_9)};
        color: ${theme.tile};
        text-shadow: none;
        .item {
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            label {
                margin: 0;
            }
            .stat {
                font-size: 1.5rem;
            }
        }
        .controls {
            margin-top: 1rem;
            display: flex;
            flex-direction: row;
            &.controls-3 {
                justify-content: center;
                position: relative;
                > * + .control {
                    margin-left: .75rem;
                }
                > :first-child {
                    position: absolute;
                    left: 0;
                }
                > :last-child {
                    position: absolute;
                    right: 0;
                }
                // justify-content: space-between;
            }
            &.controls-2 {
                justify-content: space-between;
            }
        }
    }

    .control {
        cursor: pointer; user-select: none;
        background: ${theme.tile};
        color: ${theme.bomb};
        text-shadow: none;
        font-size: 1.2rem;
        padding: 0 .3rem;
        border-radius: .3rem;
        text-transform: uppercase;
        margin: 0;

        &.message {
            color: ${theme.bomb_3};
            cursor: default;
        }
    }

    overflow: visible;
    position: relative;
    .controls.below {
        position: absolute;
        top: 100%;
        margin-top: 0.75rem;
        align-self: center;
        justify-self: center;

        display: flex;
        .control {
            color: ${theme.tile};
            background: ${theme.bomb};
            border: 2px solid ${theme.bomb};
            & + .control {
                margin-left: .75rem;
            }
            &.message {
                color: ${theme.tile_5};
            }
        }
    }
}
`
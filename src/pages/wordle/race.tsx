import React, { Fragment, useState } from 'react';
import styled from 'styled-components';
import { useHistory, Link } from 'react-router-dom';
import { useF } from '../../lib/hooks';
import { useAuth } from '../../lib/hooks_ext';
import { Modal } from '../../components/Modal';
import api from '../../lib/api';
import { compactToTree, Guess, GuessBoard, GuessElem, Loader, randomWordle, sim, wordToGuess } from '.';
import { InfoBody, InfoStyles } from '../../components/Info';
import { SettingStyles } from '../settings';
import { pass } from '../../lib/types';
import { S } from 'src/lib/util';

const Bot = ({ id, word, search }: {
    id: string, word: string, search: any
}) => {
    const [bot, setBot]: any[] = useState(undefined)
    const [guesses, setGuesses]: [Guess[], any] = useState([{
        word: '',
        tiles: ['', '', ' ', '', ''].map(letter => ({ letter, result: 0 })),
        left: [],
    }])
    const [openLeft, setOpenLeft] = useState(undefined)

    const handle = {
        load: () => [
            api.get(`/wordle/${id}/tree`)
            .then(bot => {
                bot.tree = compactToTree(bot.compact)
                setBot(bot)
            })
        ],
    }

    useF(id, handle.load)
    useF(word, bot, () => {
        if (bot) setGuesses(sim(word, false, [], bot.tree, false))
        // if (bot) {
        //     const guesses = sim(word, false, [], bot.tree, false)
        //     guesses.map((_, i) => setTimeout(
        //         () => setGuesses(guesses.slice(0, i+1)),
        //         i * 500))
        // }
    })

    return <div className='bot'>
        {bot ? <div className='details'>
            {bot.name} {bot.starter} {bot.total} {bot.mode === 'hard' ? 'hard' : ''}
        </div> : <div className='details'>
            loading <Loader />
        </div>}
        <div className='board'>
            <GuessBoard {...{
                guesses, setGuesses: pass, openLeft, setOpenLeft, handle: { search } }} />
        </div>
    </div>
}

export const Race = ({ ids, close }: {
    ids: string[], close: any
}) => {
    const [word, setWord] = useState(randomWordle())

    return <Modal><Style
    // style={{background: `${info.status === Player.p1 ? theme.blue : theme.orange}bb`}}
    onClick={close}>
        <div className='main' onClick={e => e.stopPropagation()}>
            <InfoBody>
                <div style={S(`
                width: 100%;
                display: flex;
                justify-content: space-between;
                `)} >
                    <input className='action inline' type='text' maxLength={5}
                    placeholder='enter puzzle'
                    onKeyDown={e => {
                        if (e.key === 'Enter' && (e.target as any).value.length === 5) {
                        setWord((e.target as any).value.toLowerCase());
                        (e.target as any).value = ''
                        }
                    }} />
                    <div className='action inline' onClick={close}>close</div>
                </div>
                <div className='action inline'
                onClick={() => setWord(randomWordle())}>random puzzle</div>
                <br />
                <div className='bots'>
                    {ids.map(id => <Bot key={id} {...{ id, word, search: setWord }} />)}
                </div>
            </InfoBody>
        </div>
    </Style></Modal>
}

// TODO consolidate with index.tsx (this was added quickly)
const Style = styled(SettingStyles)`
height: 100%; width: 100%;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
// background: #fffe;
background: transparent;
background: #fff8;
border-radius: 0.2rem;

position: relative;
overflow: hidden;
// &:after {
//     content: ""; width: 200%; height: 200%;
//     position: absolute; left: -50%; top: -50%;
//     z-index: 1;
//     pointer-events: none;
//     background: repeating-linear-gradient(
//         -45deg,
//         transparent,
//         transparent 32px,
//         #ffffff29 32px,
//         #ffffff29 64px
//     );
//     animation: 2s infinite scroll linear;
//     @keyframes scroll {
//         from { background-position: 0; }
//         to { background-position: 90px; }
//     }
// }

.main {
    z-index: 2;
    white-space: pre-wrap;
    // height: 50%;
    // width: 24rem;
    // width: 95%;
    max-width: fit-content;
    // min-height: 95%;
    height: calc(100% - 2rem);
    width: calc(100% - 2rem);
    background: white;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 0.2rem;
    border: 1px solid black;

    animation: .5s appear; // cubic-bezier(0.34, 1.56, 0.64, 1);
    @keyframes appear {
        from { transform: scale(0); }
        to { transform: scale(1); }
    }

    .bots {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        color: black;
        margin: -1.5rem;
        padding: .75rem;
        padding-bottom: 0;
        .bot { margin: .75rem; }
        .bot:last-child { margin-bottom: 0; }
        .board { display: flex; flex-direction: column; }
        .board > * { margin-bottom: .25rem; &:last-child { margin-bottom: 0; } }
        // .board { margin-bottom: 1rem; }
    }

    white-space: pre-wrap;
    .body { display: flex; flex-direction: column; }
    .body > * { margin-bottom: .25rem; &:last-child { margin-bottom: 0; } }
    .guess {
        display: flex;
        flex-direction: row;

        .word {
            display: flex;
            flex-direction: row;
            border-radius: .2rem;
            margin-right: .25rem;
            &.word-empty {
            background: #eee6;
            .tile { background: none; }
            }
        }

        .tile {
            display: flex; align-items: center; justify-content: center;
            height: 3rem; width: 3rem;
            background: #eee;
            font-size: 1.8rem;
            border-radius: .2rem;
            text-transform: uppercase;
            margin-right: .25rem;
            &:last-child { margin-right: 0; }
            cursor: pointer;
            user-select: none;
            &.tile-1 {
            background: #ffe619;
            }
            &.tile-2 {
            background: #56be56;
            }
        }
        .left {
            font-size: .8rem;
            // opacity: .8;
            margin-left: .5rem;
            white-space: pre;
            position: relative;
            text-shadow: none;
        }

        // position: relative;
        .left-list {
            position: absolute;
            // top: 100%;
            // background: #fffd;
            // background: white;
            min-width: 100%;
            // padding: .2rem .4rem;
            z-index: 1;
            // min-height: fit-content;
            max-height: 26.4rem;
            // height: 26.4rem;
            overflow-y: auto;
            padding-right: 1rem;
            // pointer-events: none;
            // > * { pointer-events: all; }

            background: #fff;
            width: 10em;
            border: 1px solid #000;
            border-radius: .2rem;
            overflow-x: hidden;
            padding-left: .25em;
        }
        .left-toggle {
            text-decoration: underline;
            cursor: pointer;
            user-select: none;
        }

        .left-entry {
            background: white;
            display: flex;
            .results {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            .result {
                display: inline-block;
                width: 0.5rem;
                height: 0.5rem;
                margin: 0.05rem;
                border-radius: 0.1rem;
                color: transparent;
            }
            .result-0 { background: #eee; }
            .result-1 { background: #ffe619; }
            .result-2 { background: #55be56; }
            }
        }
        .groups, .bucket { display: none; }
    }

    #progress {
        // opacity: .5;
        opacity: .8;
        display: flex;
        align-items: center;
    }

    .detailed {
        .groups, .bucket { display: inline-block; !important }
        // .bucket { opacity: .5 !important; }
    }
}
`
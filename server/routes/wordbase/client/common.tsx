import { trigger } from "../../lib/trigger";
import { keyOf, range, setCssVars } from "../../lib/util";

const slow = 1//00
export const globals = {
    wordCheck: true,
    flipMs: 600 * slow,
    shockMs: 600 * slow,
    delayMs: 500,
}

export const SkipTypes = {
    '.skip': 'SKIPPED',
    '.resign': 'RESIGNED',
    '.timeout': 'TIMED OUT',
}

const scrabbleTileTexture = `data:image/png;base64,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`


const fire = {
    orange: '#ffbf00',
    blue: '#ff5434',
    superbomb: '#00ffb6',
    // background: 'linear-gradient(15deg, #ff9191, #ffe372) fixed',
    // single_feed: 'transparent',
    // background: '#ece9e1',
    background: '#e6ede4',
}
const blue = {
    orange: '#9ebfdd',
    blue: '#7189e1',
    uniform: true,
    superbomb: '#f4af9f',
    background: '#e6ede4',
}
const orange = {
    orange: '#ffaa26',
    blue: '#ff8f00',
    superbomb: '#ff8f00',
    uniform: true,
    background: '#ece9e1',
    feed: 'transparent',
}
const faded_orange = {
    // orange: "#ffbb7f",
    orange: '#ffc469',
    // blue: "#e17171",
    blue: '#e86d6d',
    tile: "#ffffff",
    bomb: "#000000",
    superbomb: "#a4b9e9",
    uniform: true,
    feed: "#fbfbfb88",
    dual_feed: "#fbfbfb88",
    background: "#e6ede4",
}
const green_thumb = {
    orange: '#b7d28f',
    blue: '#47a96b',
    tile: "#ffffff",
    bomb: "#000000",
    superbomb: "#fe8585",
    uniform: true,
    feed: "#fbfbfb88",
    dual_feed: "#fbfbfb88",
    background: "#e6ede4",
}
const forest = {
    // orange: '#a8b594',
    // orange: '#fdaea3',
    // orange: '#e4aea7',
    // orange: '#fe8585',
    // orange: '#a1ab9c',
    // orange: '#8a8f87',
    // orange: '#acb9a4',
    orange: '#a8b89e',
    // blue: '#5da477',
    // blue: '#689e7c',
    blue: '#95ae9f',
    // tile: "#efede5",
    tile: '#eeece1',
    bomb: "#272727",
    // superbomb: "#fe8585",
    // superbomb: '#a59f9f',
    // superbomb: '#e4aea7',
    superbomb: '#b3a495',
    uniform: true,
    options: true,
    // solid: true,
    feed: "#ffffff22",
    dual_feed: "#ffffff22",
    background: "#ffffff00",
    css: `
    #index::after, :is(.wordbase-menu, .wordbase-game, .board)::after {
        top: 0; height: 100%;
        left: 0; width: 100%;
        content: "";
        display: block;
        background: url('/raw/wordbase/trees.jpg') fixed;
        background-size: max(110vw, 146.7vh) max(82.5vw, 110vh);
        background-position: center;
        image-rendering: pixelated;
    }
    #index::after {
        position: fixed;
        // filter: blur(3px);
        // filter: hue-rotate(30deg) saturate(70%) brightness(80%);
        filter: hue-rotate(15deg) saturate(60%) brightness(80%);
    }
    :is(.wordbase-menu, .wordbase-game, .board)::after {
        position: absolute;
        filter: blur(10px);
        z-index: -1;
        // filter: hue-rotate(20deg) saturate(80%) brightness(85%);
        // filter: hue-rotate(10deg) saturate(70%) brightness(85%);
        // filter: blur(10px) hue-rotate(10deg) saturate(50%) brightness(70%);
        // filter: blur(10px) hue-rotate(10deg) saturate(70%) brightness(85%);
        filter: blur(10px) hue-rotate(10deg) saturate(70%) brightness(25%);
    }
    .board::after {
        z-index: 0;
    }
    .board-container {
        background: var(--wb-tile_9) !important;
    }
    .board {
        position: relative;
        overflow: hidden;
    }
    .dual-false :is(.wordbase-game, .board)::after {
        display: none !important;
    }
    .game-list .top > span:first-child {
        color: var(--wb-tile) !important;
    }
    .modal {
        position: fixed !important;
        height: calc(100% + 0.6rem) !important;
        width: calc(100% + 0.6rem) !important;
    }
    `,
}

const great_wave = {
    orange: '#577ca3',
    blue: '#43587a',
    // tile: "#f8f4e2",
    bomb: "#272727",
    // superbomb: "#e3d2ab",
    uniform: true,
    options: true,
    simple: true,
    // solid: true,
    feed: "#fcf4d7",
    dual_feed: "#fcf4d7",
    background: "#ffffff00",

    tile: '#faf9e9',
    // superbomb: '#ebd3aa',
    // superbomb: '#e7bca7',
    // superbomb: '#f4c8b2',
    superbomb: '#f1c0aa',
    // superbomb: '#e4c4a7',

    // superbomb: '#eacba8',
    // superbomb: '#e4c4a7',
    // superbomb: '#cddbd6',
    // superbomb: '#e4baa7', // #e1a090
    // superbomb: '#e1a090',
    // dark: '#efe2c3',
    // dark: '#faf9e9',
    // dark: '#ebe1ce',
    // dark: '#e5dfc8',
    // dark: '#ecdebb',

    // dark: '#f4e8c9',
    // dark: '#e4c4a7',

    icon: {
        orange: '#faf9e9',
        blue: '#faf9e9',
        tile: '#577ca3',
    },
    css: `
    #index#index::after {
        position: fixed;
        top: 0; height: 100%;
        left: 0; width: 100%;
        content: "";
        display: block;
        background: url('/raw/wordbase/great_wave.jpg') fixed;
        background-size: cover;
        background-position: center;
    }
    #inner-index {
        border: 2px solid var(--wb-bomb) !important;
        // min-width: max-content;
    }
    .dual-true.full-false .divider {
        width: 2px !important;
    }
    .dual-true.full-true :is(.wordbase-menu, .wordbase-game, .wordbase-stats) {
        border: 2px solid var(--wb-bomb) !important;
        border-top: none !important; border-bottom: none !important;
    }
    .wordbase-game {
        background: none !important;
    }
    .board-container, .overlay {
        background: var(--wb-feed) !important;
    }
    // .side .chiclet {
    //     border: 1px solid var(--wb-bomb_7);
    //     border-radius: 0px !important;
    // }
    // .player-name {
    //     background: var(--wb-superbomb) !important;
    //     border: 1px solid var(--wb-bomb_7);
    //     color: var(--wb-bomb_7) !important;
    //     border-radius: 0px !important;
    // }
    .game-entry .main {
        background: var(--wb-dark) !important;
    }
    .upper.new, .game-list .top:first-child::after {
        // border: 1px solid var(--wb-bomb);
        border-left: 0; border-right: 0;
    }
    .upper.new {
        border-top: 0;
    }
    .game-list {
        // top: 1px;
    }
    .game-list .top.top.top:first-child::after {
        // background: #cddbd6 !important;
        // background: #f1cea7 !important;
    }
    .game-list .top > span:first-child {
        color: #c99880 !important;
    }
    :is(.tile, .last):is(.p1, .p2), :is(.color-1, .color-0) .tile-letter, #longest-word .stat {
        // color: #cddbd6 !important;
        // color: #c3dcda !important;
        color: #d2e1e3 !important;
    }
    .last.skip.skip.skip {
        background: var(--wb-tile) !important;
        color: #cddbd6 !important;
        border: 1px solid var(--wb-bomb);
        border-width: 1.5px;
        border-color: #3d4457;
    }
    .chat textarea {
        // background: #f3e4c0 !important;
        // background: #f6e7cc !important;
        background: ##fdfcf2 !important;
        // border: 0 !important;
        border: 1px solid var(--wb-bomb_5) !important;
        border: 1.5px solid #3d4457 !important;
    }
    .chat .chat-input-container::after {
        display: none !important;
    }
    .game-list .top.top.top:first-child::before {
        // position: absolute;
        // top: 0; height: 100%;
        // left: 0; width: 100%;
        // content: "";
        // display: block;
        // background: url(${scrabbleTileTexture});
        // background-size: auto 100%;
        // pointer-events: none;
    }
    .modal {
        position: fixed !important;
        height: calc(100% + 0.6rem) !important;
        width: calc(100% + 0.6rem) !important;
    }
    `,
}

const dusk = {
    // orange: '#b7d28f',
    // blue: '#47a96b',
    // orange: '#937e70',
    orange: '#6a5151',
    blue: '#956565',
    tile: "#262626",
    // bomb: "#f2ede0",
    bomb: '#be8282',
    // superbomb: "#aaf4e4",
    // superbomb: '#c1eee4',
    superbomb: '#ffdfc2',
    uniform: true,
    solid: true,
    feed: "#000000",
    dual_feed: "#000000",
    background: "#3c3a3f",
    dark: '#262626',
}

// slime #e1fd71

// const dark = {
//     orange: '#ffbf00',
//     blue: '#ff5434',
//     tile: '#434343',
//     bomb: '#f0f0f0',
//     superbomb: '#00ffb6',
//     background: '#000000',
//     upper: '#434343',
// }
const _retro = {
    orange: '#de9f43',
    blue: '#90c6af',
    tile: '#faecba',
    bomb: '#543e2e',
    superbomb: '#d07c36',
    uniform: true,
    feed: '#d5ceb5',
    dual_feed: '#d5ceb5',
    background: '#62605e',

    // tile: '#f9f1d6',
    // feed: "#eae2c7",
    // single_feed: '#eae2c7',
    // background: '#fff6d5',
    // background: '#aaa696',
    // background: '#b5b4b3',
    // background: '#333',
}
const retro = {
    orange: '#de9f43',
    blue: '#90c6af',
    tile: '#f7f3e6',
    bomb: '#62605e',
    superbomb: '#d07c36',
    uniform: true,
    // solid: true,
    feed: '#ddd9ca',
    dual_feed: '#ddd9ca',
    background: '#8c8a89',
}
const pastel = {
    orange: '#ffbb9a', // #ffce9a
    blue: '#7eb0ff',
    bomb: '#404040',
    superbomb: '#a7dfd0',
    uniform: true,
    background: '#d9dfd7',
}

export const themes = {
    default: {
        // orange: '#ff9900',
        // orange: '#fe8802',
        // orange: '#ffa000',
        orange: '#ff9b00',
        // blue: '#4bdbff',
        // blue: '#00c8e9',
        // blue: '#4bc8ff',
        // blue: '#4cc8ff',
        // blue: '#26aaff',
        // blue: '#34cfff',
        blue: '#2acdf5',
        tile: '#ffffff',
        bomb: '#000000',
        // superbomb: '#ff00ff', // #d43ad4
        // superbomb: '#d43ad4',
        superbomb: '#c74bd3',
        // green: '#16d438',
        uniform: true, // (don't) show red/green for ended?
        solid: false, // solid game progress names?
        options: false, // colored game list header?
        simple: false, // simple game list items by default?
        green: '#16d438',
        // red: '#ff4b4b',
        red: '#ff4b4b',
        dark: '#2d2d2d',
        feed: '#fbfbfb88',
        dual_feed: '#fbfbfb88',
        background: 'linear-gradient(15deg,#609e98,#e2d291) fixed',
        // orangeSelected: '#feb443',
        // orangeActive: '#ffc166',
        // blueSelected: '#7ae5ff',
        // blueActive: '#93e9ff',
        icon: undefined,
        css: '',
        name: 'default',
    },
    bold: {
        orange: '#ff9900',
        blue: '#26aaff',
        green: '#2dd24d',
        background: '#ece9e1',
        feed: 'transparent',
        uniform: false, // bold has red/green for ended
    },
    'dusk (dark)': dusk,
    // pastel,
    // blue,
    // orange,
    // 'red orange': fire,
    // 'dark red orange': dark,
    'red orange': faded_orange,
    green: green_thumb,
    // 'green thumb': green_thumb,
    retro,
    scrabble: {
        // orange: '#de8c88',
        orange: '#d3a3ac',
        // blue: '#8dcff3',
        blue: '#b7c7d7',
        // tile: '#d8d0bd',
        tile: '#e4dccb',
        bomb: '#231303',
        superbomb: '#c52124',
        uniform: true,
        solid: true,
        background: '#ece9e1',
        feed: '#fbfbfb88',
        dual_feed: '#fbfbfb88',
        icon: {
            orange: '#e2d6b2',
            blue: '#e2d6b2',
            tile: '#231303',
        },
        css: `
        .board {
            border: .07em solid #ece9e1;
            box-sizing: content-box;
        }
        .tile:not(:is(.flip-on, .selected, .played-true)) {
            border: .07em solid #ece9e1;
        }
        .tile:is(.flip-on, .selected, .played-true) {
            background: #e1ddd3 !important;
        }
        .tile.tile.tile.shock .flip-box-inner {
            animation: shock ${globals.shockMs}ms !important;
        }
        .tile.tile.tile:is(.flip-on, .selected, .played-true) .flip-box-inner,
        .tile.tile.tile:is(.flip-on, .selected, .played-true) .flip-box-inner > * {
            transform: none !important;
        }
        .tile.tile.tile:is(.flip-on, .selected, .played-true) .flip-box-inner .flip-box-front {
            display: none !important;
        }
        .tile:is(.selected, .played-true) > .color.color.color,
        .tile:is(.flip-on, .selected, .played-true) .flip-box-inner .color.color.color
        {
            background: #e5d6ac !important;
            filter: none !important;
            border-bottom: 0.25rem solid #aa976d;
            box-sizing: content-box;
            top: -0.25rem;
            border-radius: 2px;
            border-top-left-radius: 0;
            border-top-right-radius: 0;
        }
        .tile:is(.selected, .played-true) > .tile-letter {
            position: relative;
            top: -0.25rem !important;
        }
        @keyframes tile-drop {
            from {
                top: -1rem;
            }
        }
        .tile.tile.tile:is(.flip-on, .selected, .played-true) .flip-box-back {
            position: relative !important;
            z-index: 9999;
            animation: tile-drop ${globals.flipMs}ms !important;
        }
        .tile.tile.tile:is(.flip-on, .selected, .played-true) .flip-box-back .tile-value {
            bottom: calc(5% - .25rem);
        }
        .tile:not(:is(.p1, .p2, .bomb, .flip-on, .selected, .played-true)) .tile-letter {
            color: #9f9787 !important;
        }
        .tile-value {
            font-size: .5em;
            position: absolute;
            bottom: 5%; right: 5%;
            text-transform: uppercase;
        }
        .tile:not(:is(.flip-on, .selected, .played-true)) .tile-value {
            display: none;
        }
        :is(.flip-on, .selected, .played-true) .color::after {
            content: "";
            position: absolute;
            left: 0; top: 0;
            width: 100%;
            height: 100%;
            background: url(${scrabbleTileTexture});
            background-size: cover;
            // background-clip: content-box;
            // border: .5px solid #aa976d44;
            border-radius: 1px;
        }
        .tile.tile.tile.selected.bomb :is(.tile-letter, .tile-value) {
            color: #fffd !important;
        }
        ${range(1, 4).map(i => `.selected .color.color-rotate-${i*90}::after { transform: rotate(${i*90}deg) }`).join('\n')}
        `,
        name: 'scrabble',
        letterValues: [
            'eaionrtlsu', 'dg', 'bcmp', 'fhvwy', 'k', '', '', 'jx', '', 'qz'
        ].map((l, i):[string, number] => [l, i+1]).reduce((o, [letters, points]) => {
            letters.split('').map(l => o[l] = points)
            return o
        }, {}),
    },
    forest,
    'great wave': great_wave,
}
const nonColorKeys = new Set('css,uniform,solid,name,icon,letterValues,options,simple,alt'.split(','))
Object.keys(themes).map(k =>
    themes[k] = Object.assign({}, themes.default, themes[k], { alt: k !== 'default' }))
const _theme = Object.assign({}, themes.default)

export const theme = trigger.implicit<any>(_theme)
theme.add(newTheme => {
    console.debug('WB THEME', newTheme, keyOf(themes, newTheme) || 'custom')
    if (!newTheme) return setTimeout(() => theme.set(themes.default))

    Object.entries(newTheme).map(([k, v]) => {
        _theme[k] = v
        if (!nonColorKeys.has(k)) {
            v[0] === '#' && range(1, 10).map(i => {
                _theme[k+'_'+i] = v+Math.round(i * 256 / 10).toString(16)
            })
        }
    })

    Object.assign(theme, setCssVars(_theme, 'wb'))
    theme._theme = _theme
    nonColorKeys.forEach(k => theme[k] = _theme[k])
}, true)

export const isTheme = (a, b) => {
    const { orange: aO, blue: aB } = a._theme || a
    const { orange: bO, blue: bB } = b._theme || b
    // console.debug('IS THEME', aO === bO && aB === bB, a, b)
    return aO === bO && aB === bB
}

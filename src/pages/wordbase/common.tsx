import { trigger } from "../../lib/trigger";
import { getCssVar, keyOf, range, setCssVars } from "../../lib/util";

const { keys, unpick } = window as any

const slow = 1//00
export const globals = {
    wordCheck: true,
    flipMs: 600 * slow,
    shockMs: 300 * slow,
    delayMs: 500,
}

export const SkipTypes = {
    '.skip': 'SKIPPED',
    '.resign': 'RESIGNED',
    '.timeout': 'TIMED OUT',
    '.accept': 'CONFIRMED',
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
    // orange: '#a8b89e',
    orange: '#ff9f00',
    // blue: '#5da477',
    // blue: '#689e7c',
    // blue: '#95ae9f',
    blue: '#26c3ff',
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
    feed: "var(--wb-tile_1)",
    dual_feed: "var(--wb-tile_1)",
    background: "#ffffff00",
    css: `
    .wordbase-menu, .wordbase-game {
        position: relative !important;
        z-index: 100 !important;
        background: unset !important;
    }
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
        filter: hue-rotate(10deg) saturate(80%) brightness(90%);
    }
    :is(.wordbase-menu, .wordbase-game, .board)::after {
        position: absolute;
        z-index: -1;
        filter: contrast(.5) hue-rotate(15deg) saturate(60%) brightness(80%);
    }
    #menu-empty {
        color: var(--wb-tile) !important;
        // color: transparent !important;
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
    .dual-true .wordbase-menu::after {
        // background: unset !important;
        display: none;
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
    solid: true,
    feed: "#fcf4d7",
    dual_feed: "#fcf4d7",
    background: "#ffffff00",

    tile: '#faf9e9',
    // superbomb: '#ebd3aa',
    // superbomb: '#e7bca7',
    // superbomb: '#f4c8b2',
    // superbomb: '#f1c0aa',
    // superbomb: '#e4c4a7',
    superbomb: '#ffcdb5',

    // superbomb: '#eacba8',
    // superbomb: '#e4c4a7',
    // superbomb: '#cddbd6',
    // superbomb: '#e4baa7', // #e1a090
    // superbomb: '#e1a090',
    // backing: '#efe2c3',
    // backing: '#faf9e9',
    // backing: '#ebe1ce',
    // backing: '#e5dfc8',
    // backing: '#ecdebb',

    // backing: '#f4e8c9',
    // backing: '#e4c4a7',

    icon: {
        orange: '#faf9e9',
        blue: '#faf9e9',
        tile: '#577ca3',
    },
    css: `
    :root {
        --great-wave-border: 1.5px solid black
    }
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
    #index#index :is(#header, .wordbase-menu, .wordbase-game) {
        background: url('/raw/wordbase/great_wave.jpg') fixed !important;
        background-size: cover;
        background-position: center;
    }
    #inner-index {
        border: 2px solid var(--wb-bomb) !important;
        // min-width: max-content;
    }
    .dual-true.full-false .divider {
        width: 1.5px !important;
    }
    #header {
        border-bottom: var(--great-wave-border);
    }
    #header #home {
        border: var(--great-wave-border) !important;
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
    .side .chiclet {
        background: var(--wb-superbomb) !important;
        // border: 1px solid var(--wb-blue_9);
        color: var(--wb-blue_9) !important;
        border-radius: 2px !important;
    }
    .dual-true.full-false .wordbase-game {
        border-radius: 2px !important;
    }
    .game-entry .main {
        background: var(--wb-backing) !important;
    }
    .upper.new, .game-list .top:first-child::after {
        // border: 1px solid var(--wb-bomb);
        border-left: 0; border-right: 0;
    }
    .upper.new {
        border-top: 0;
        border-bottom: var(--great-wave-border) !important;
    }
    .upper {
        // border-bottom: var(--great-wave-border) !important;
        // border-color: transparent;
        border-bottom: 1.5px solid transparent;
    }
    .game-list {
        // border-top: var(--great-wave-border);
    }
    .game-list .top.top.top {
        top: 1.5px;
    }
    .game-list .top.top.top:first-child::after {
        border-bottom: var(--great-wave-border);
        border-top: var(--great-wave-border);
        top: -1.5px;
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
    .modal {
        position: fixed !important;
        height: calc(100% + 0.6rem) !important;
        width: calc(100% + 0.6rem) !important;
    }
    .wordbase-game > .game-progress {
        border-bottom: var(--great-wave-border);
    }
    .wordbase-game .board-container {
        border-top: var(--great-wave-border);
    }
    .wordbase.wordbase.wordbase .game-progress :is(.chiclet, .time) {
        border-radius: 1e6px !important;
        padding: 0 .5em !important;
    }
    .dual-true.full-false .wordbase-game > .game-progress {
        border: var(--great-wave-border);
        border-radius: 1e6px;
        padding: 0 calc(.25em - 1.5px);
    }
    .dual-true.full-false .wordbase-game > .board-container {
        border: var(--great-wave-border) !important;
        border-radius: .5em;
    }

    .wordbase-menu, .upper:not(.new), .overlay .info-inner {
        background: none !important;
    }
    .wordbase {
        background: linear-gradient(var(--wb-tile_8) 0 0) #fff !important;
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
    feed: "#111",
    dual_feed: "#111",
    background: "#3c3a3f",
    backing: '#262626',

    invert: true,
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
    css: `
    .board-row:is(:first-child, :last-child)::after {
        background: repeating-linear-gradient(-45deg, transparent, transparent .5rem, var(--wb-bomb_1) .5rem, var(--wb-bomb_1) 1rem) !important;
    }
    `,
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
        // blue: '#2acdf5',
        blue: '#26ccff',

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
        dark: false, // style certain element differently, such as results popup background
        green: '#16d438',
        // red: '#ff4b4b',
        red: '#ff4b4b',
        backing: '#2d2d2d',
        feed: '#fbfbfb88',
        dual_feed: '#fbfbfb88',
        background: 'var(--background)',
        // background: 'linear-gradient(15deg,#609e98,#e2d291) fixed',
        // background: '#eae2d7',
        // orangeSelected: '#feb443',
        // orangeActive: '#ffc166',
        // blueSelected: '#7ae5ff',
        // blueActive: '#93e9ff',
        icon: undefined,
        css: '',
        name: 'default',
        invert: false,
    },
    'dark': dusk,
    'black and white': {
        orange: '#dddddd',
        blue: '#bbbbbb',
        backing: '#f2f2f2',
        bomb: '#111111',
        superbomb: 'var(--wb-background)',
        uniform: true,
        solid: true,
        colorShift: false,
        // background: '#f44',
        background: '#4490ff',
        feed: 'var(--wb-tile)',
        dual_feed: 'var(--wb-tile)',
        css: `
        .wordbase-menu .upper {
            border-bottom: 1px solid black;
        }
        .game-entry .main {
            background: #eee;
        }
        .dual-false .wordbase-game .game-progress {
            border-bottom: 1px solid black;
        }
        .dual-false .board-container {
            border-top: 1px solid black !important;
        }`
    },
    bold: {
        orange: '#ff9900',
        blue: '#26aaff',
        green: '#2dd24d',
        background: '#ece9e1',
        feed: 'transparent',
        uniform: false, // bold has red/green for ended
    },
    // pastel,
    // blue,
    // orange,
    // 'red orange': fire,
    // 'dark red orange': dark,
    'red orange': faded_orange,
    green: green_thumb,
    // 'green thumb': green_thumb,
    retro,
    nodes: {
        orange: '#ff4444',
        blue: '#0088ff',
        tile: '#fffbf8',
        bomb: '#000000',
        backing: '#000000',
        superbomb: '#ff00ff',
        uniform: true,
        solid: true,
        pieces: true,
        background: '#fff8ee',
        feed: 'var(--wb-tile)',
        dual_feed: 'var(--wb-tile)',
        css: `
        .wordbase-menu .upper {
            border-bottom: 1px solid black;
        }
        .dual-false .wordbase-game .game-progress {
            border-bottom: 1px solid black;
        }
        .dual-false .board-container {
            border-top: 1px solid black !important;
        }
        .board-container, .board {
            overflow: visible !important;
            background: var(--wb-tile) !important;
        }
        .board-row:not(:first-child, :last-child) .tile .color.color.color {
            border-radius: 50% !important;
            padding: 5% !important;
            background-clip: content-box !important;
        }
        .tile.tile.tile .tile-letter {
            // font-size: 1.75rem !important;
        }
        .board-row:not(:first-child, :last-child) .tile.tile.tile .tile-letter {
            // font-size: 1.5rem !important;
        }
        // .tile.bomb-play-true.from-bomb.last-false.bomb-flip-true.bomb-wait-false .color {
        //     background-color: var(--wb-bomb) !important;
        // }
        // .tile.bomb-play-true.from-bomb.last-false.bomb-flip-true.bomb-wait-false .tile-letter {
        //     color: var(--wb-tile) !important;
        // }
        // .tile.bomb-play-true.from-bomb.last-false.bomb-flip-true.bomb-wait-false .color {
        //     background-color: var(--wb-superbomb) !important;
        // }
        // .tile.bomb-play-true.bomb-flip-true.p1 .color {
        //     background-color: var(--wb-blue) !important;
        // }
        // .tile.bomb-play-true.bomb-flip-true.p2 .color {
        //     background-color: var(--wb-orange) !important;
        // }
        // .tile.bomb-play-true .tile-letter {
        //     color: var(--wb-bomb) !important;
        // }

        .tile:is(.bomb, .bomb-play-true.from-bomb.bomb-wait-true) .color {
            background-color: var(--wb-bomb) !important;
            opacity: 1 !important;
        }
        .tile:is(.superbomb, .bomb-play-true.from-superbomb.bomb-wait-true) .color {
            background-color: var(--wb-superbomb) !important;
        }
        .tile:is(.bomb, .bomb-play-true.from-bomb.bomb-wait-true).p1 .tile-letter { color: var(--wb-blue) }
        .tile:is(.bomb, .bomb-play-true.from-bomb.bomb-wait-true).p2 .tile-letter { color: var(--wb-orange) }
        .tile:is(.superbomb, .bomb-play-true.from-superbomb.bomb-wait-true):is(.p1, .p2) .color {
            background-color: var(--wb-bomb) !important;
        }
        .tile:is(.superbomb, .bomb-play-true.from-superbomb.bomb-wait-true):is(.p1, .p2) .tile-letter {
            color: var(--wb-superbomb) !important;
        }

        .tile.tile.tile.disconnected-true:not(.selected) .color {
            background-color: var(--wb-tile) !important;
        }
        .tile.tile.tile.disconnected-true:not(.selected) .tile-letter {
            color: var(--wb-bomb) !important;
        }
        .tile.tile.tile.disconnected-true .color::after {
            display: none;
        }

        .board-row {
            overflow: visible !important;
        }
        .tile {
            z-index: unset !important;
        }
        .tile .tile-letter {
            z-index: 100 !important;
        }
        .tile .color {
            z-index: 10 !important;
        }
        .tile.edge {
            overflow: visible !important;
        }
        .tile.edge .color::after {
            content: '';
            position: absolute;
            top: 45%; left: 50%; height: 10%;
            padding-left: 44%; background-clip: content-box !important;
        }
        .tile.p1 .color::after { background: var(--wb-blue) }
        .tile.p2 .color::after { background: var(--wb-orange) }
        ${range(8).map(i => `
        .tile.edge-${45 * i} .color::after {
            transform: none !important;
            rotate: ${45 * i }deg;
            transform-origin: left;
            width: ${i % 2 ? 54 : 12}%;
        }
        `).join('\n')}
        .flip-box-front {
            display: none !important;
        }
        .board-row::after {
            background: none !important;
        }
        .board-row {
            border-radius: 1em !important;
            overflow: hidden;
        }
        .tile.tile.tile.tile.tile.tile * {
            animation: none !important;
            transform: none !important;
            transition: none !important;
        }
        .flip-box-front {
            display: none !important;
        }
        .tile.bomb-flip-true.bomb-flip-true.none .flip-box-inner .color {
            background: none !important;
        }
        .tile.tile.tile.tile.tile.tile.shock .color {
            // opacity: 1 !important;
        }
        ${range(1, 4).map(i => `.selected .color.color-rotate-${i*90}::after { transform: rotate(${i*90}deg) }`).join('\n')}
        `,
    },
    'danish': {
        tile: '#ffffff',
        orange: '#d13b4c',
        blue: '#C8102E',
        // orange: '#C8102E',
        // blue: '#C8102E',
        backing: '#C8102E22',
        // bomb: '#222222',
        bomb: '#C8102E',
        superbomb: '#C8102E',
        uniform: true,
        solid: true,
        dark: true,
        // background: '#C8102E',
        background: '#C8102E',
        feed: 'var(--wb-tile)',
        dual_feed: 'var(--wb-tile)',
        icon: {
            tile: '#C8102E',
            orange: '#fdfdfd',
            blue: '#fdfdfd',
        },
        css: `
        #index#index *:not(.label) {
            border-color: var(--wb-backing) !important;
        }
        .divider {
            background: var(--wb-backing) !important;
        }
        .wordbase-menu .upper {
            border-bottom: 1px solid black;
        }
        .game-entry .main .info span {
            background: var(--wb-bomb) !important;
            color: var(--wb-tile) !important;
        }
        .dual-false .wordbase-game .game-progress {
            border-bottom: 1px solid black;
        }
        .dual-false .board-container {
            border-top: 1px solid black !important;
        }
        .progress-background > :not(:last-child) {
            border-right: 2px solid white;
        }
        .game-progress.done::after {
            // background: linear-gradient(180deg, #0000 0 calc(33% - 1px), white calc(33% - 1px) calc(33% + 1px), #0000 calc(33% + 1px)), linear-gradient(90deg, #0000 0 calc(50% - 1px), white calc(50% - 1px) calc(50% + 1px), #0000 calc(50% + 1px)) !important;
            background: transparent !important;
        }

        #index .last {
            color: var(--wb-tile) !important;
        }
        .board-row:first-child::after {
            // background: linear-gradient(180deg, #0000 0 calc(33% - 1px), white calc(33% - 1px) calc(33% + 1px), #0000 calc(33% + 1px)), linear-gradient(90deg, #0000 0 calc(50% - 1px), white calc(50% - 1px) calc(50% + 1px), #0000 calc(50% + 1px)) !important;
            background: transparent !important;
        }
        .board-row:last-child::after {
            // background: linear-gradient(0deg, #0000 0 calc(33% - 1px), white calc(33% - 1px) calc(33% + 1px), #0000 calc(33% + 1px)), linear-gradient(90deg, #0000 0 calc(50% - 1px), white calc(50% - 1px) calc(50% + 1px), #0000 calc(50% + 1px)) !important;
            background: transparent !important;
        }
        .tile:is(.p1, .p2) {
            color: var(--wb-tile) !important;
        }
        #index#index .tile .color {
            filter: none !important;
        }

        #index#index .bomb:not(.selected) .color {
            background: linear-gradient(var(--wb-bomb_3) 0 0), var(--wb-tile) !important;
        }
        #index#index .superbomb:not(.selected) .color {
            background: linear-gradient(var(--wb-bomb_6) 0 0), var(--wb-tile) !important;
        }
        `
    },
    scrabble: {
        // orange: '#de8c88',
        // orange: '#d3a3ac',
        // blue: '#8dcff3',
        // blue: '#b7c7d7',
        // orange: '#e299a7',
        // blue: '#9fbcd9',
        // orange: '#f7bac6',
        // blue: '#bfd9f2',
        orange: '#edafbc',
        // blue: '#b0ceec',
        blue: '#bbe6fb',
        // tile: '#d8d0bd',
        // tile: '#e4dccb',
        // tile: '#e3dfd6',
        // tile: '#dfd8c2',
        // tile: '#e2dccb',
        // tile: '#d4c8ae',
        tile: '#d3c5a5',
        // bomb: '#231303',
        bomb: '#1c1004',
        // superbomb: '#c52124',
        superbomb: '#ffffff',
        uniform: true,
        solid: true,
        pieces: true,
        background: '#ece9e1',
        feed: 'var(--wb-tile)',
        dual_feed: 'var(--wb-tile)',
        backing: 'var(--wb-tile)',
        icon: {
            orange: '#e2d6b2',
            blue: '#e2d6b2',
            tile: '#231303',
        },
        css: `
        :root {
            --wb-scrabble-border: #f8f8f8;
            --wb-scrabble-border-width: 3px;
        }
        .board-row:is(:first-child, :last-child), .wordbase-menu .game-progress.done {
            --wb-orange: #eb5d6a;
            --wb-blue: #579ce2;
            --wb-blue: #51c4f5;
        }
        .chiclet {
            --wb-orange: transparent;
            --wb-blue: transparent;
        }
        .modal {
            // --wb-tile: var(--wb-background);
        }

        .game-progress.done::after {
            display: none !important;
        }

        .game-list .section {
            background: var(--wb-scrabble-border) !important;
            padding: calc(var(--wb-scrabble-border-width) * (1 + .67));
            position: relative;
        }
        .game-list .section::before {
            pointer-events: none;
            content: "";
            position: absolute;
            top: 0; left: 0; width: calc(100% - var(--wb-scrabble-border-width) * 2); height: calc(100% - var(--wb-scrabble-border-width) * 2);
            margin: var(--wb-scrabble-border-width);
            border: calc(var(--wb-scrabble-border-width) * .67) solid var(--wb-bomb);
            box-sizing: border-box;
        }
        .game-list .game-entry {
            border-radius: 0 !important;
            background: var(--wb-tile) !important;
            border: var(--wb-scrabble-border-width) solid var(--wb-scrabble-border);
        }
        .game-list .progress-background > :not(:last-child) {
            // border-right: var(--wb-scrabble-border-width) solid var(--wb-scrabble-border);
        }
        .game-list .game-entry {
            margin: 0 !important;
        }
        .game-list .game-entry + .game-entry {
            margin-top: calc(var(--wb-scrabble-border-width) * -1) !important;
        }
        .game-list .main {
            background: none !important;
        }
        .game-progress .side.left .chiclet {
            background: var(--wb-orange) !important;
        }
        .game-progress .side.right .chiclet {
            background: var(--wb-blue) !important;
        }
        
        .wordbase-game {
            background: var(--wb-tile) !important;
        }
        .dual-false .wordbase-game > .game-progress {
            border-bottom: 1px solid black;
        }
        .modal .game-progress {
            border: 2px solid var(--wb-scrabble-border);
            border-left: 0; border-right: 0;
        }
        .wordbase-game .overlay {
            background: var(--wb-tile) !important;
        }
        .board-container {
            overflow: visible !important;
            background: var(--wb-tile) !important;
            margin: 1.5em !important;
            width: calc(100% - 3em) !important;
            flex-direction: column;
        }
        .overlay {
            top: -1.5em !important;
            left: -1.5em !important;
            width: calc(100% + 3em) !important;
            height: calc(100% + 3em) !important;
        }
        .board-container::before, .board-container::after {
            content: "w   o   r   d   b   a   s   e.";
            white-space: pre;
            text-transform: uppercase;
            // letter-spacing: .8em;
            letter-spacing: -.01em;
            font-weight: bold;
            line-height: 1.1;
            color: var(--wb-bomb);
            display: flex; align-items: center;
            flex-direction: column;
            justify-content: end;
        }
        .board-container::before {
            transform: rotate(180deg)
        }
        .board {
            background: var(--wb-scrabble-border) !important;
            padding: calc(var(--wb-scrabble-border-width) * (1 + .5 + .67));
            position: relative;
        }
        .board::before {
            content: "";
            position: absolute;
            top: 0; left: 0; width: calc(100% - var(--wb-scrabble-border-width) * 2); height: calc(100% - var(--wb-scrabble-border-width) * 2);
            margin: var(--wb-scrabble-border-width);
            border: calc(var(--wb-scrabble-border-width) * .67) solid var(--wb-bomb);
            box-sizing: border-box;
        }
        .board-row:is(:first-child, :last-child)::after {
            display: none !important;
        }
        .tile:not(:is(.flip-on, .selected, .last-true, .bomb-flip-true.shock)) {
            border: calc(var(--wb-scrabble-border-width) * .5) solid var(--wb-scrabble-border) !important;
            font-size: .55em;
        }
        .tile:is(.flip-on, .selected, .last-true, .bomb-flip-true.shock) {
            background: #000c !important; // #e1ddd3 !important;
            color: var(--wb-bomb) !important;
            z-index: 1001 !important;
            border-radius: 2px;
            border: .005rem solid transparent !important;
            background-clip: content-box !important;
        }
        .tile:is(.flip-on, .selected, .last-true).p1 {
            background: var(--wb-orange) !important;
        }
        .tile:is(.flip-on, .selected, .last-true).p1 {
            background: var(--wb-blue) !important;
        }
        .tile.tile.tile.shock * {
            animation: none !important;
        }
        .tile.tile.tile.shock:not(:is(.from-p1, .from-p2, .flip-on, .bomb, .selected, .last-true, .bomb-flip-true.shock)) * {
            color: #9f9787 !important;
            color: #8b8477 !important;
        }
        .tile.tile.tile:is(.flip-on, .selected, .last-true, .bomb-flip-true.shock):not(.to-none) .flip-box-inner,
        .tile.tile.tile:is(.flip-on, .selected, .last-true, .bomb-flip-true.shock):not(.to-none) .flip-box-inner > * {
            transform: none !important;
        }
        .tile.tile.tile:is(.flip-on, .selected, .last-true, .bomb-flip-true.shock):not(.to-none) .flip-box-inner .flip-box-front {
            display: none !important;
        }
        .tile:is(.selected, .last-true) > .color.color.color,
        .tile:is(.flip-on, .selected, .last-true, .bomb-flip-true.shock) .flip-box-inner .color.color.color
        {
            // background: #e9daae !important;
            filter: none !important;
            background: rgb(176 162 139) !important; // #a4a39f !important;
            border: 0.01rem solid transparent;
            border-bottom-width: 0.25rem;
            border-top: 0; border-left: 0;
            box-sizing: content-box;
            top: 0;
            border-radius: 2px;
            border-top-left-radius: 0;
            border-top-right-radius: 0;
            margin-top: -.125em !important;
        }
        .tile:is(.selected, .last-true, .flip-on, .bomb-flip-true.shock) :is(.tile-letter, .tile-value) {
            margin-bottom: .25em !important;
        }
        @keyframes tile-drop {
            from {
                top: -1rem;
            }
        }
        .tile.tile.tile:is(.flip-on, .selected, .last-true, .bomb-flip-true.shock):not(.to-none) .flip-box-back {
            position: relative !important;
            z-index: 9999;
            animation: tile-drop ${globals.flipMs}ms !important;
        }
        :is(.flip-on, .selected, .last-true, .bomb-flip-true.shock) .color::after {
            content: "";
            position: absolute;
            left: 0; top: 0;
            width: 100%;
            height: 100%;
            background: url(${scrabbleTileTexture});
            background-color: rgb(255 227 182); // rgb(241, 221, 189); // #e9daae; //rgb(255, 230, 193);
            image-rendering: pixelated;
            background-size: cover;
            border-radius: 2px;
        }
        :is(.last, .preview) .letter {
            filter: none !important;
            background: var(--wb-scrabble-border);
            box-sizing: content-box;
            border: calc(var(--wb-scrabble-border-width) * .5) solid var(--wb-bomb);
            margin-right: calc(var(--wb-scrabble-border-width) * -.5);
            font-size: .9em;
        }
        .tile:not(:is(.p1, .p2, .bomb, .selected, .bomb-flip-true.shock)):not(.flip.swapped-false) .color.color.color {
            background: var(--wb-tile) !important;
        }
        .tile:not(:is(.p1, .p2, .bomb, .selected, .bomb-flip-true.shock)):not(.flip.swapped-false) .tile-letter {
            color: #9f9787 !important;
        }
        .tile-value {
            font-size: .5em;
            position: absolute;
            bottom: 5%; right: 5%;
            height: 1em;
            text-transform: uppercase;
            display: flex; align-items: center;
        }
        :is(.last, .preview) .tile-value {
            font-size: .4em;
        }
        .tile:not(:is(.flip-on, .selected, .last-true, .bomb-flip-true.shock)) .tile-value {
            display: none;
        }
        .ui :is(.last.last.last.last, .preview.preview.preview.preview) {
            background: none !important;
            padding: 0 !important;
            border-radius: 0 !important;
            display: inline-flex;
        }
        :is(.last, .preview) .letter {
            position: relative;
            display: block;
            width: 1.4em;
            flex-shrink: 0;
            aspect-ratio: 1/1;
            display: flex !important;
            align-items: center;
            justify-content: center;
            font-size: .8em;
        }
        .tile-letter, .tile-value {
            z-index: 1;
        }
        .tile.tile.tile.selected.bomb :is(.tile-letter, .tile-value) {
            color: var(--wb-bomb) !important;
        }
        ${range(1, 4).map(i => `.selected .color.color-rotate-${i*90}::after { transform: rotate(${i*90}deg) }`).join('\n')}
        
        .modal .stats {
            background: var(--wb-tile) !important;
            color: var(--wb-bomb) !important;
        }
        .modal .stats .control {
            background: var(--wb-bomb) !important;
            color: var(--wb-tile) !important;
        }
        `,
        letterValues: [
            'eaionrtlsu', 'dg', 'bcmp', 'fhvwy', 'k', '', '', 'jx', '', 'qz'
        ].map((l, i):[string, number] => [l, i+1]).reduce((o, [letters, points]) => {
            letters.split('').map(l => o[l] = points)
            return o
        }, {}),
    },
    bananagrams: {
        // orange: '#ddd',
        // blue: '#bbb',
        // backing: 'transparent',
        orange: '#c5beb8',
        blue: '#938d89',
        backing: '#ecebea',
        bomb: '#1c1004',
        superbomb: 'var(--wb-background)',
        uniform: true,
        solid: true,
        colorShift: false,
        pieces: true,
        background: '#ffe569',
        feed: 'var(--wb-tile)',
        dual_feed: 'var(--wb-tile)',
        icon: {
            orange: '#ffe569',
            blue: '#ffe569',
        },
        css: `
        .wordbase-menu .upper {
            border-bottom: 1px solid black;
        }
        .dual-false .wordbase-game .game-progress {
            border-bottom: 1px solid black;
        }
        .dual-false .board-container {
            border-top: 1px solid black !important;
        }
        .board-container, .board {
            overflow: visible !important;
            background: var(--wb-tile) !important;
        }
        .tile.p1 {
            background: var(--wb-blue) !important;
        }
        .tile.p2 {
            background: var(--wb-orange) !important;
        }
        .board:not(.play) .tile:is(.flip-on, .active-p1 .to-p2, .active-p2 .to-p1).to-p1 {
            background: var(--wb-blue) !important;
        }
        .board:not(.play) .tile:is(.flip-on, .active-p1 .to-p2, .active-p2 .to-p1).to-p2 {
            background: var(--wb-orange) !important;
        }
        .board-row::after {
            z-index: 99 !important;
        }
        .tile.tile.tile.shock * {
            animation: none !important;
        }
        .tile.tile.tile:is(.flip-on, .bomb-flip, .active-p1 .p1, .active-p2 .p2):not(.to-none) :is(.flip-box-inner, .flip-box-inner > *) {
            transform: none !important;
        }
        .tile.tile.tile:is(.flip-on, .bomb-flip, .active-p1 .p1, .active-p2 .p2):not(.to-none) .flip-box-inner .flip-box-front {
            display: none !important;
        }
        .tile:is(.flip-on, .bomb-flip, .active-p1 .p1, .active-p2 .p2) {
            z-index: 100 !important;
            overflow: visible;
        }
        .tile.tile.tile:is(.active-p1 .p1, .active-p2 .p2) > .color,
        .tile.tile.tile:is(.flip-on, .bomb-flip, .active-p1 .p1, .active-p2 .p2) .flip-box-inner .color
        {
            filter: none !important;
            background: rgb(215 206 186) !important; // #a4a39f !important;
            border: 0.01rem solid transparent;
            border-bottom-width: 0.33rem;
            margin-top: -0.33rem;
            border-top-width: 0.0033rem;
            border-left: 0;
            box-sizing: content-box;
            top: 0;
            border-radius: 5%;
            scale: .98;
        }
        .tile.tile.tile:is(.active-p1 .p1, .active-p2 .p2) > .color::after,
        .tile.tile.tile:is(.flip-on, .bomb-flip, .active-p1 .p1, .active-p2 .p2) .flip-box-inner .color::after {
            content: "";
            position: absolute;
            left: 0; top: 0;
            width: 100%;
            height: 100%;
            background-color: rgb(255 236 206);
            image-rendering: pixelated;
            background-size: cover;
            border-radius: 5%;
        }
        .tile.tile.tile:is(.active-p1 .p1, .active-p2 .p2) .tile-letter,
        .tile.tile.tile:is(.flip-on, .bomb-flip, .active-p1 .p1, .active-p2 .p2) .flip-box-inner .tile-letter {
            font-size: 1.15em !important;
            font-weight: 100 !important;
            transform: none;
            z-index: 1;
            color: var(--wb-bomb) !important;
        }
        .tile.tile.tile:is(.active-p1 .p1, .active-p2 .p2) .tile-letter {
            margin-bottom: .33em !important;
        }
        @keyframes tile-drop {
            from {
                top: -1rem;
            }
        }
        .tile.tile.tile:is(.flip-on, .active-p1 .p1, .active-p2 .p2):not(.to-none) .flip-box-back {
            position: relative !important;
            z-index: 9999;
            animation: tile-drop ${globals.flipMs}ms !important;
        }
        .tile.tile.tile:not(:is(.p1, .p2)) > .tile-letter,
        .tile.tile.tile:not(:is(.flip-on, .bomb-flip, .p1, .p2)) .flip-box-inner .tile-letter {
            // font-size: .8em !important;
            // font-weight: bold;
            // text-shadow: 0 0 1px currentColor;
            font-weight: normal;
        }
        .tile.tile.tile:not(:is(.p1, .p2, .bomb)) > .tile-letter,
        .tile.tile.tile:not(:is(.flip-on, .bomb-flip, .p1, .p2, .bomb, .from-p1.swapped-false, .from-p2.swapped-false)) .flip-box-inner .tile-letter {
            color: var(--wb-bomb) !important;
            opacity: .4;
            font-size: .9em !important;
        }
        .superbomb .tile-letter {
            // color: var(--wb-bomb) !important;
        }
        ${range(1, 4).map(i => `.selected .color.color-rotate-${i*90}::after { transform: rotate(${i*90}deg) }`).join('\n')}
        `,
    },
    forest,
    'great wave': great_wave,
}
export const visible_theme_names = keys(unpick(themes, 'danish nodes'))

const nonColorKeys = new Set('css,uniform,solid,pieces,name,icon,letterValues,options,simple,alt,invert,dark,colorShift'.split(','))
Object.keys(themes).map(k =>
    themes[k] = Object.assign({}, themes.default, themes[k], { alt: k !== 'default' }))
const _theme = Object.assign({}, themes.default)

export const theme = trigger.implicit<any>(_theme)
theme.add(newTheme => {
    console.debug('WB THEME', newTheme, keyOf(themes, newTheme) || 'custom')
    if (!newTheme) return setTimeout(() => theme.set(themes.default))

    setCssVars(newTheme, 'wb')
    Object.entries(newTheme).map(([k, v]) => {
        _theme[k] = (typeof(v) === 'string' && getCssVar(v)) || v
        if (!nonColorKeys.has(k)) {
            v[0] === '#' && range(11).map(i => {
                if (i > 0) _theme[k+'_'+i] = v+Math.round(i * 256 / 10).toString(16)
                _theme[k+'_'+i+'_5'] = v+Math.round((i + .5) * 256 / 10).toString(16)
            })
        }
    })

    Object.assign(theme, setCssVars(_theme, 'wb'))
    theme._theme = _theme
    theme[`_`+(keyOf(themes, newTheme) || 'custom')] = _theme
    nonColorKeys.forEach(k => theme[k] = _theme[k])
}, true)

Object.entries(themes).map(([name, theme]) => {
    const _theme = Object.assign({}, themes.default)
    setCssVars(theme, 'wb')
    Object.entries(theme).map(([k, v]) => {
        _theme[k] = (typeof(v) === 'string' && getCssVar(v)) || v
        if (!nonColorKeys.has(k)) {
            _theme[k][0] === '#' && range(1, 10).map(i => {
                _theme[k+'_'+i] = _theme[k]+Math.round(i * 256 / 10).toString(16)
            })
        }
    })
    theme[`_`] = _theme
    theme['name'] = name
})

export const isTheme = (a, b) => {
    const { orange: aO, blue: aB } = a._theme || a
    const { orange: bO, blue: bB } = b._theme || b
    // console.debug('IS THEME', aO === bO && aB === bB, a, b)
    return aO === bO && aB === bB
}

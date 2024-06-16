import { track_lists } from "src/lib/track_player"
import { profile_colors } from "./data"
import { dev } from "src/lib/util"
import { store } from "src/lib/store"

const { named_log, keys, merge, unpick, colors, rand } = window as any
const log = named_log('capitals theme')


// export const music_options = [track_lists.APORIA, track_lists.CHOSIC_FREE, track_lists.NONE].filter(x=>x)
export const music_options = [store.get('capitals-debug-aporia') && track_lists.APORIA, track_lists.CHOSIC_FREE, track_lists.NONE].filter(x=>x)
window['enable_aporia'] = () => {
    if (!store.get('capitals-debug-aporia')) {
        store.set('capitals-debug-aporia', true)
        location.reload()
    }
}

export const themes = {
    default: {
        tile: {
            off: '#eee',
            letter: '#222',
            tentative: '#888',
        },
    },
    'dark': {
        background: '#222', color: '#888',
        tile: {
            off: '#333',
            letter: '#888',
            tentative: '#888',
        },
        filter: 'brightness(.67) sepia(.33)',
    },
    // 'frappuccino': {
    //     profiles: [{
    //         color: '#0c8e4d',
    //     }, {
    //         // color: '#e27c1a',
    //         // color: '#b8560f',
    //         color: '#d77731',
    //     }],
    //     tile: {
    //         // letter: '#ad885d',
    //         // tentative: '#f1d2a6',
    //         // letter: '#994914',
    //         // tentative: '#ad885d',
    //         letter: '#f7d4a4',
    //         tentative: '#f7d4a488',
    //     }
    // },
    'frappuccino': {
        background: '#e9d3b7',
        profiles: [{
            color: '#4e291e',
        }, {
            color: '#cfb77f',
        }],
        tile: {
            // letter: '#e9d3b7',
            // tentative: '#e9d3b788',
            letter: '#4c4e4b88',
            tentative: '#4c4e4b44',
        },
    },
    'wordbase': {
        profiles: [{
            color: '#26ccff',
        }, {
            color: '#ff9b00',
        }],
    },
    'black and white': {
        profiles: [{
            color: '#bbbbbb',
        }, {
            color: '#dddddd',
        }],
        // background: '#4490ff',
    },
    'high contrast': {
        profiles: [{
            color: '#00f',
        }, {
            color: '#f00',
        }],
        tile: {
            letter: '#000',
        },
    },
    'retro': {
        background: '#8c8a89',
        profiles: [{
            color: '#de9f43',
        }, {
            color: '#90c6af',
        }],
        tile: {
            off: '#f7f3e6',
            letter: '#62605e',
            tentative: '#62605e88',
        },
    },
    'jazz cup': {
        // background: '#8c8a89',
        profiles: [{
            color: '#08c4c7',
        }, {
            color: '#9d2cac',
        }],
        tile: {
            // off: '#f7f3e6',
            // letter: '#62605e',
            // tentative: '#62605e88',

            // off: '#0002',
            letter: '#392485',
            tentative: '#392485aa',

            off: '#39248522',
        },
        css: `
        #inner-index, #main {
            background: url('/raw/capitals/jazz_cup.webp') fixed !important;
            background-size: cover !important;
            background-position: center !important;
        }
        #inner-index :is(#main .info:not(.chat), #header, .expand-false #main) {
            background: transparent !important;
        }
        #svg {
            --id-color: #fff;
        }
        #chat-container {
            --id-color: #fffa;
            --id-color-text: #000;
            background: var(--id-color);
            padding: .25em;
            border-radius: .25em; 
            border: 1px solid var(--id-color-text);
        }
        .expand-true #main > * {
            box-shadow: 0 0 0 .25em var(--id-color-text) !important;
        }
        #game-controls-word {
            box-shadow: 0 0 0 2px var(--id-color);
            background: var(--id-color);
            border-radius: .25em;
            padding: 0 .25em;
        }
        `,
    },
    // 'zaddy': {
    //     // background: '#83aaf3', color: '#222',
    //     background: '#222', color: '#83aaf3',
    //     profiles: [{
    //         color: '#00a163',
    //     }, {
    //         // color: '#f03a96',
    //         color: '#ff45a3',
    //     }],
    //     tile: {
    //         // off: '#f7f3e6',
    //         // letter: '#62605e',
    //         // off: '#222',
    //         // off: '#83aaf3',
    //         off: '#000',
    //         letter: '#ffb900',
    //         tentative: '#ffb90088',
    //         // tentative: '#62605e88',
    //     },
    // },
    'zaddy': {
        background: '#000', color: '#eeece1',
        profiles: [{
            color: '#00a163',
            // color: '#2aa83b',
        }, {
            color: '#ff45a3',
        }],
        tile: {
            // off: '#0000',
            // letter: '#272727',
            // tentative: '#27272788',
            off: '#0000',
            // letter: '#ffb900',
            // tentative: '#ffb90088',
            // letter: '#83aaf3',
            // tentative: '#83aaf388',
            letter: '#5f8eed',
            tentative: '#5f8eed88',
        },
        // filter: 'contrast(.5) hue-rotate(15deg) saturate(60%) brightness(80%)',
        css: `
        #inner-index, #main {
            background: url('/raw/capitals/gold.jpg') fixed !important;
            background-size: cover !important;
            background-position: center !important;
        }
        #inner-index :is(#main .info:not(.chat), #header, .expand-false #main) {
            background: transparent !important;
        }
        #svg {
            --id-color: #eeece1;
        }
        #chat-container {
            --id-color: #eeece1;
            --id-color-text: #000;
            background: var(--id-color);
            padding: .25em;
            border-radius: .25em; 
        }
        .expand-true #main > * {
            box-shadow: 0 0 0 .25em var(--id-color-text) !important;
        }
        #game-controls-word {
            box-shadow: 0 0 0 2px var(--id-color);
            background: var(--id-color);
            border-radius: .25em;
            padding: 0 .25em;
        }
        `,
    },
    'dunking donuts': {
        profiles: [{
            color: '#ec4299',
        }, {
            color: '#f58328',
        }],
        tile: {
            off: '#0002',
            letter: '#653601',
            tentative: '#653601aa',
        },
        css: `
        #inner-index, #main {
            background: url('/raw/capitals/dd.jpg') fixed !important;
            background-size: cover !important;
            background-position: center !important;
        }
        #inner-index :is(#main .info:not(.chat), #header, .expand-false #main) {
            background: transparent !important;
        }
        .expand-true #main > * {
            box-shadow: 0 0 0 .25em var(--id-color-text) !important;
        }
        #game-controls-word {
            box-shadow: 0 0 0 2px var(--id-color);
            background: var(--id-color);
            border-radius: .25em;
            padding: 0 .25em;
        }
        `,
    },
    'costco': {
        profiles: [{
            color: '#0360aa',
        }, {
            color: '#e41a37',
        }],
        tile: {
            off: '#0002',
            tentative: '#0008',
        },
        css: `
        #inner-index, #main {
            background: url('/raw/capitals/costco.jpg') fixed !important;
            background-size: cover !important;
            background-position: center !important;
        }
        #inner-index :is(#main .info:not(.chat), #header, .expand-false #main) {
            background: transparent !important;
        }
        .expand-true #main > * {
            box-shadow: 0 0 0 .25em var(--id-color-text) !important;
        }
        #game-controls-word {
            box-shadow: 0 0 0 2px var(--id-color);
            background: var(--id-color);
            border-radius: .25em;
            padding: 0 .25em;
        }
        `,
    },
    'forest': {
        background: '#000', color: '#eeece1',
        // profiles: [{
        //     color: '#26c3ff',
        // }, {
        //     color: '#ff9f00',
        // }],
        tile: {
            // off: '#eeece1',
            off: '#0000',
            letter: '#272727',
            tentative: '#27272788',
        },
        // filter: 'contrast(.5) hue-rotate(15deg) saturate(60%) brightness(80%)',
        css: `
        #inner-index, #main {
            background: url('/raw/capitals/forest.webp') fixed !important;
            background-size: cover !important;
            background-position: center !important;
            // image-rendering: pixelated !important;
        }
        #inner-index :is(#main .info:not(.chat), #header, .expand-false #main) {
            background: transparent !important;
        }
        #svg {
            --id-color: #eeece1;
        }
        #chat-container {
            --id-color: #eeece1;
            --id-color-text: #000;
            background: var(--id-color);
            padding: .25em;
            border-radius: .25em; 
        }
        .expand-true #main > * {
            box-shadow: 0 0 0 .25em var(--id-color-text) !important;
        }
        #game-controls-word {
            box-shadow: 0 0 0 2px var(--id-color);
            background: var(--id-color);
            border-radius: .25em;
            padding: 0 .25em;
        }
        `,
    },
    'water': {
        background: '#000', color: '#eeece1',
        // profiles: [{
        //     color: '#26c3ff',
        // }, {
        //     color: '#ff9f00',
        // }],
        tile: {
            // off: '#eeece1',
            off: '#0000',
            letter: '#272727',
            tentative: '#27272788',
        },
        // filter: 'contrast(.5) hue-rotate(15deg) saturate(60%) brightness(80%)',
        css: `
        #inner-index, .expand-true #main {
            background: url('/raw/capitals/water.jpg') !important;
            background-size: cover !important;
            background-position: center !important;
        }
        #inner-index :is(#main .info:not(.chat), #header, .expand-false #main) {
            background: transparent !important;
        }
        #svg {
            --id-color: #eeece1;
        }
        #chat-container {
            --id-color: #eeece1;
            --id-color-text: #000;
            background: var(--id-color);
            padding: .25em;
            border-radius: .25em; 
        }
        .expand-true #main > * {
            box-shadow: 0 0 0 .25em var(--id-color-text) !important;
        }
        #game-controls-word {
            box-shadow: 0 0 0 2px var(--id-color);
            background: var(--id-color);
            border-radius: .25em;
            padding: 0 .25em;
        }
        `,
    },
    'great wave': {
        background: '#fff', color: '#000',
        profiles: [{
            color: '#43587a',
        }, {
            color: '#577ca3',
        }],
        tile: {
            // off: '#faf9e9',
            off: '#0000',
            letter: '#272727',
            tentative: '#27272788',
        },
        // filter: 'contrast(.5) hue-rotate(15deg) saturate(60%) brightness(80%)',
        css: `
        #inner-index, #main {
            background: url('/raw/wordbase/great_wave.jpg') fixed !important;
            background-size: cover !important;
            background-position: center !important;
        }
        #inner-index :is(#main .info:not(.chat), #header, .expand-false #main) {
            background: transparent !important;
        }
        #svg {
            --id-color: #faf9e9;
        }
        #chat-container {
            --id-color: #faf9e9;
            --id-color-text: #000;
            background: var(--id-color);
            padding: .25em;
            border-radius: .25em; 
        }
        .expand-true #main > * {
            box-shadow: 0 0 0 .25em var(--id-color-text) !important;
        }
        #game-controls-word {
            box-shadow: 0 0 0 2px var(--id-color);
            background: var(--id-color);
            border-radius: .25em;
            padding: 0 .25em;
        }
        `,
    },
    'planet': {
        background: '#222', color: '#eeece1',
        tile: {
            off: '#0000',
            letter: '#272727',
            tentative: '#27272788',
        },
        css: `
        #inner-index :is(#main .info:not(.chat), #header, .expand-false #main) {
            background: transparent !important;
        }
        #svg {
            --id-color: #eeece1;
        }
        #chat-container {
            --id-color: #eeece1;
            --id-color-text: #000;
            background: var(--id-color);
            padding: .25em;
            border-radius: .25em; 
        }
        .expand-true #main > * {
            box-shadow: 0 0 0 .25em var(--id-color-text) !important;
        }
        #game-controls-word {
            box-shadow: 0 0 0 2px var(--id-color);
            background: var(--id-color);
            border-radius: .25em;
            padding: 0 .25em;
        }
        `,
        // iframe: ({profiles=undefined}=undefined) => {
        //     log({profiles})
        //     const base_url = '/raw/glob_disco/?no-controls=true'
        //     if (!profiles) return base_url
        //     const start_hex = profiles[0].color
        //     const end_hex = profiles[1].color
        //     return `${base_url}&colors=${colors.gradient_hsl_hex(start_hex, end_hex, 5).map(x => x.slice(1)).join('-')}`
        // },
        iframe: () => {
            return `/raw/glob_disco/?slow=true&no-controls=true&colors=${rand.shuffle(profile_colors).map(x=>x.slice(1)).join('-')}`
        },
    },
}
export const visible_theme_names = keys(unpick(themes, 'frappuccino'))

export const resolve_iframe = (value, args=undefined) => typeof(value) === 'string' ? value : value(args)

keys(themes).map(key => themes[key] = merge(themes.default, themes[key]))
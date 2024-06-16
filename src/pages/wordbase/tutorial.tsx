import { message } from "../../components/Messages"
import url from "../../lib/url"
import { Q } from "../../lib/util"
import { Board, GameSettings, Player } from "./board"
import { fetchGame, local, updateGame } from "./data"
import { Info, Save } from "./save"

export const tutorial = () => {
    const start_hash = (location.hash || location.pathname.replace(/\/?(wordbase)?\/?/, ''))
    console.debug('TUTORIAL FROM', start_hash, location.href)

    const info = Object.assign(Info.local(3), { p1: 'blue', p2: 'orange', _tutorial: true })
    const save = new Save(Board.demo({
        dimensions: [7, Board.COLS],
        demo: [
            '.....e..al',
            '.....s.hp.',
            '......a...',
            '.....b.b..',
            '....rds.e.',
            '...o...t..',
            '...w......',
        ],
        demoBombs: [[4, 5]],
        ...new GameSettings(),
    }), 0, [])
    updateGame(info, save)
    url.push('wordbase/local')

    const dismissMessageOnInteraction = (selector='.board', id='wbt') => {
        const element = document.querySelector(selector)
        const dismissMessage = () => {
            message.trigger({ delete: id })
            element?.removeEventListener('pointerdown', dismissMessage)
        }
        element?.addEventListener('pointerdown', dismissMessage)
        return element
    }
    const reattemptDismissInteraction = (dismissInteraction, timeout=5000) => {
        if (!dismissInteraction() && timeout > 0) {
            setTimeout(() => reattemptDismissInteraction(dismissInteraction, timeout - 250), 250)
        }
    }
    let turn = -1
    const runner = ({ info, save }: { info:Info, save:Save }) => {
        if (turn == info.turn) return
        
        message.trigger({ delete: 'wbt wbt2' })
        if (info.turn < turn) {
            local.remove(runner)
            return
        }
        dismissMessageOnInteraction()
        dismissMessageOnInteraction('#menu-button', 'wbt')
        dismissMessageOnInteraction('#online-game', 'wbt')

        if (save.history[0]?.some(t => t.isBomb)) {
            message.trigger({
                text: `<b>Bomb tiles flip adjacent tiles, too</b>`,
                id: 'wbt-bomb',
            })
            return
        } else message.trigger({ delete: 'wbt-bomb' })
        if (info.status !== Player.none) {
            message.trigger({
                text: 
`<b>That's it!</b>
${start_hash
? `<a href="/wordbase/${start_hash}">Back to #${start_hash}</a>`
: `Head back to the menu and select <b>online game</b> → <b>join random</b> to start playing`}`,
                id: 'wbt',
            })
            reattemptDismissInteraction(() => dismissMessageOnInteraction('.wordbase-result'))
            return
        }
        switch (turn = info.turn) {
            case 0: return message.trigger({
                text: 
`<b>Blue goes first</b>
Drag from the bottom row to spell 'WORD'
Then click <b>submit</b>`,
                id: 'wbt',
            })
            case 2:
                message.trigger({
                    text: 
`<b>Reach the other player's base first to win</b>
Cut off tiles to set them back
But don't miss out on a winning move`,
                    id: 'wbt',
                })
                // message.trigger({
                //     text: `<b>Click the last word to replay</b>`,
                //     id: 'wbt2',
                // })
                dismissMessageOnInteraction('.last', 'wbt2')
                return
        }
    }
    local.add(runner, true)
}
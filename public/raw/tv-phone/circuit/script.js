// requires common.js
(() => {
    const log = named_log('circuit-script')

    const tv_id = location.hash.slice(1)
    const tv_room = `circuit-script:${tv_id}`
    const tv_emit = `emit:${tv_room}`

    // from TV
    //
    const id = store.load('circuit-id', () => rand.alphanum(12))
    const room = `circuit-script:${id}`
    const target_emit = `emit:${room}`

    const games = {
        'matchbox': '/raw/matchbox/tv.html',
        'bumperships': '/raw/tv-phone/bumperships/tv.html',
        'tron': '/raw/tv-phone/tron/tv.html',
        'doodle': '/raw/tv-phone/doodle/tv.html',
    }
    
    const round_options = [4, 8, 16, 32]
    
    const definition = {
        games,
        round_options,
    }
    // circuit/tv.html
    definition.create = ({ games:game_list, shuffle=true, rounds=round_options[1] }) => {
        // if shuffle, first shuffle games used to construct list of length n, then shuffle that list
        game_list = shuffle ? rand.shuffle(game_list) : game_list
        let order = range(rounds).map(i => game_list[i % game_list.length])
        if (shuffle) order = rand.shuffle(order)
        const state = {
            order,
            round: -1,
            wins: {},
            complete: false,
            shuffled: shuffle,
        }
        store.set('circuit-script-state', state)
        return state
    }

    definition.is_active = () => {
        return store.get('circuit-script-state') !== undefined
    }

    // */tv.html
    definition.execute = () => {
        state = store.get('circuit-script-state')
        if (!state) return
        state.round += 1
        if (state.round >= state.order.length) {
            state.complete = true
        }
        store.set('circuit-script-state', state)
        return state
    }
    // */tv.html
    definition.navigate = (socket) => {
        state = store.get('circuit-script-state')
        if (!state) return
        const fast = location.href.includes('/circuit/tv.html')
        const game_name = state.complete ? 'circuit' : state.order[state.round]
        const wait_s = 5
        const popup_label = state.complete ? `ending circuit - don't touch anything!` : `${game_name} coming next (${wait_s}s) - don't touch anything!`
        const tv_target = state.complete ? '/raw/tv-phone/circuit/tv.html' : games[game_name]
        const phone_target = tv_target.replace('/tv.html', '/phone.html') + '#' + id
        const popup = node(`<div class="cover center-column">
            <br/>
            <!-- make #circuit-popup-next flash once per second -->
            <style>
                @keyframes flash {
                    80%, 100% { opacity: 1; }
                    90% { opacity: 0; }
                }
                #circuit-popup-next {
                    animation: flash 1s infinite;
                }
            </style>
            <div id="circuit-popup-next" style="
            background: #fff;
            color: #000;
            border: 1px solid currentcolor;
            border-radius: .25em;
            padding: .25em .67em;
            "><i>${popup_label}</i></div>
        </div>`)
        if (!fast) document.body.appendChild(popup)
        defer(() => {
            socket.emit('emit', room, { id, navigate: phone_target })
            location.href = tv_target
        }, fast ? 0 : wait_s * 1000)
    }
    // */tv.html
    definition.gameover = (scores) => {
        state = store.get('circuit-script-state')
        if (!state) return
        const max_score = maths.max(values(scores))
        entries(scores).map(([player, score]) => {
            if (score === max_score) {
                state.wins[player] = (state.wins[player] || 0) + 1
            }
        })
        store.set('circuit-script-state', state)
        return state
    }

    definition.is_complete = () => {
        const state = store.get('circuit-script-state')
        return state && state.complete
    }

    definition.get = () => {
        return store.get('circuit-script-state')
    }

    definition.reset = () => {
        const state = store.get('circuit-script-state')
        if (state) {
            if (state.shuffled) state.order = rand.shuffle(state.order)
            state.round = -1
            state.wins = {}
            state.complete = false
            store.set('circuit-script-state', state)
        }
    }
    
    definition.clear = () => {
        store.clear('circuit-script-state')
    }

    // circuit/tv.html
    definition.prep_tv = () => {
        keys(games).concat('circuit').map(game => {
            store.set(`${game}-id`, id)
        })
    }


    // from phone
    //

    // circuit/phone.html
    definition.prep_phone = () => {
        keys(games).concat('circuit').map(game => {
            store.set(`${game}-player`, id)
        })
    }

    // */phone.html
    definition.handle_phone = (socket) => {
        socket.emit('emit', tv_room)
        socket.on(tv_emit, (data) => {
            log(tv_emit, data)
            const { navigate } = data
            if (navigate) {
                location.href = navigate
            }
        })
    }

    window.circuit = definition
})()
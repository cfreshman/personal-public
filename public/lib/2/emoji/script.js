// emoji.js 1.0.0 @ https://freshman.dev/lib/2/emoji/script.js https://freshman.dev/copyright.js
if (!window['emoji.js']) (_=>{window['emoji.js']=Date.now()
    const log = named_log('emoji.js')
    
    const _alerts = []
    const definition = {
        loaded: false,
        alert: (f) => {
            if (definition.loaded) {
                setTimeout(f, 0)
            } else {
                _alerts.push(f)
            }
        }
    }
    
    fetch('/lib/2/emoji/emoji.json').then(r=>r.json()).then(raw_data => {
        const data = raw_data.map(({ e:emoji, d:description, g:group, p:points, r:primary }) => ({ emoji, description, group, primary }))
        definition.emojis = data

        const groups = {}
        data.forEach(x => {
            if (!groups[x.group]) groups[x.group] = []
            groups[x.group].push(x)
        })
        definition.groups = groups

        const sets = []
        let curr_set
        data.forEach(x => {
            if (x.primary) {
                curr_set = []
                sets.push(curr_set)
            }
            curr_set.push(x)
        })
        definition.sets = sets

        const list = data.map(x => x.emoji)
        definition.list = list

        definition.loaded = true
        _alerts.map(f => f())
    })

    window.emoji = definition
})()

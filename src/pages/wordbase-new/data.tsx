import api from '../../lib/api';
import { store } from '../../lib/store';
import { trigger } from '../../lib/trigger';
import { fields } from '../../lib/types';
import { AI } from './ai';
import { GameSettings, Player } from './board';
import { globals } from './common';
import { loadLang } from './dict';
import { drawProgress } from './draw';
import { Info, Save } from './save';


// migrate old local info/save
if (store.get('info')) {
    store.set('wordbase-local', [store.get('info'), store.get('save')])
    store.clear('info')
    store.clear('save')
}

const emptyInfo = Info.empty()
const emptySave = Save.empty(emptyInfo)

export const local = trigger.implicitOf(store.persist<{ info: Info, save: Save }>('wordbase-local', {
    defaulter: () => ({ info: Info.local(), save: undefined }),
    extract: raw => ({ info: Info.of(raw[0]), save: Save.deserialize(raw[1]) }),
    save: value => value && !value.info._tutorial && [value.info, value.save?.serialize()] || undefined,
}))
local.add(value => console.debug('SET LOCAL', value), true)

export async function fetchInfo(gameId: string): Promise<{info: Info}> {
    return new Promise(resolve => {
        if (gameId === local.info.id) resolve({ info: local.info });
        else api.get(`/wordbase/g/${gameId}`).then(data => {
            resolve({
                info: Info.of(data.info)
            })
        }).catch(err => console.debug(err, err.error));
    });
}

const _cachedSave: fields<Save> = {}
export const cachedSave = (info: Info) => Object.load(_cachedSave, (info ?? emptyInfo).id, () => Save.blank(info))

const updateProgress = (info, save: Save) => {
    if (info.id !== local.info.id && !info.id.includes('new/')) {
        setTimeout(() => {
            drawProgress(info, save).then(img => api.post(`wordbase/g/${info.id}/image`, { img }))
        }, Math.max(...save.board.tiles().flatMap(
            x => [].concat(x.swap ? [x.swap.ms] : [], ...x.shocks?.map(y => y[1]) || []))) + 3_000)
    }
}

export async function fetchGame(gameId: string): Promise<{
    info?: Info, save?: Save, redirect?: string
}> {
    return new Promise(resolve => {
        const cachedResolve = ({ info, save, redirect=undefined }) => {
            _cachedSave[info.id] = save
            // url.replace(`/wordbase/#${info.id}`)
            // location.hash = info.id
            resolve({ info, save, redirect })
            if (!info.img) 
                updateProgress(info, save)
        }
        if (gameId === local.info.id) {
            console.debug('FETCH LOCAL', local.info, local.save)
            if (!local.info || !local.save) resolve(createLocal())
            else resolve({ info: local.info, save: Save.deserialize(local.save.serialize()) });
        } else if (!gameId || gameId === 'empty' || gameId === 'unloaded') {
            resolve({ info: emptyInfo, save: emptySave })
        } else if (/new\/.+/.test(gameId)) {
            // create game with user-specific challenge settings
            api.get(`/wordbase/challenge/hash/user/${gameId.replace('new/', '')}`).then(({ user, challengeSettings }) => {
                console.debug('challenge settings', challengeSettings)
                const save = Save.new(challengeSettings)
                api.post(`/wordbase/i/${gameId}`, { state: save.serialize() })
                .then(data => {
                    console.debug('WORDBASE NEW', data)
                    const { info, state } = data
                    // location.hash = info.id
                    cachedResolve({
                        info: Info.of(info),
                        save: Save.deserialize(state)
                    })
                })
                .catch(err => {
                    console.debug(err)
                    cachedResolve({ info: Info.empty(gameId), save: Save.blank() })
                })
            })
        } else api.get(`/wordbase/g/${gameId}/board`).then(data => {
            const save = Save.deserialize(data.state);
            cachedResolve({
                info: Info.of(data.info),
                save,
            });
        }).catch(err => {
            console.debug(err)
            cachedResolve({ info: Info.empty(gameId), save: Save.blank() })
        });
    });
}

export function updateGame(info: Info, save: Save): Promise<{info?: Info, save?: Save}> {
    _cachedSave[info.id] = save
    return new Promise(resolve => {
        // some confirm types have post-update actions
        const after = () => setTimeout(() => {
            const confirm = info.lastWord === '.confirm' && info.confirm[0]
            if (confirm) {
                if (confirm.type === Info.ConfirmType.ACCEPT) {
                    const accepted = info.confirm[1]
                    if (accepted.type === Info.ConfirmType.CONTEST) {
                        // play word
                        save = save.play(accepted.value.word)
                        info = Info.play(info, save)
                        updateGame(info, save)
                        resolve({ info, save })
                        return
                    }
                }
            }
            updateProgress(info, save)
        }, 1000)

        if (info.id === local.info.id) {
            // perform certain confirm actions normally handled by the server
            const confirm = info.confirm && info.confirm[0]
            if (confirm && confirm.type === 'accept') {
                const accepted = info.confirm[1]
                if (accepted.type === 'draw') {
                    if (info.status === -1) {
                        info.status = 2
                        info.lastWord = '.draw'
                    }
                }
            }
            info.lastUpdate = Date.now() // add 1s buffer for switching players

            local.set({ info, save })

            console.debug(info.ai, info.status, Player.none, save.player)
            if (info.ai && info.status === Player.none && save.player === 1) {
                setTimeout(() => {
                    const play = new AI(info.ai).play(save.board, save.player, save.history)
                    const newSave = save.play(play)
                    const newInfo = Info.play(info, newSave)
                    updateGame(newInfo, newSave)
                    resolve({ info: newInfo , save: newSave })
                }, 1000 + globals.flipMs + Math.max(...save.board.tiles().map(tile => tile.swap?.ms || 0)))
            } else after()
        } else {
            api.post(`/wordbase/g/${info.id}`, { info, state: save.serialize() }).then(after)
        }
    })
}

export function rematchGame(info: Info): Promise<{info: Info}> {
    return new Promise(resolve => {
        const save = Save.new(info.settings)
        if (info.id === local.info.id) {
            local.set({
                info: Info.local(info.ai, info.settings),
                save: save
            })
            resolve({ info: local.info });
        } else {
            _cachedSave[info.id] = save
            api.post(`/wordbase/g/${info.id}/rematch`, {
                settings: info.settings,
                state: save.serialize()
            }).then(data => {
                console.debug(data);
                resolve({ info: data.info });
            });
        }
    });
}

export function deleteGame(info: Info) {
    if (info.id === local.info.id) {
        local.set({ info: Info.local(), save: undefined })
        return new Promise(resolve => setTimeout(resolve))
    } else {
        return api.post(`/wordbase/g/${info.id}/delete`)
    }
}

export function createLocal(difficulty?: number, settings?: GameSettings, lang?: string): Promise<{info: Info, save: Save}> {
    console.debug('CREATE LOCAL', difficulty, settings, lang)
    return loadLang(lang).then(() => {
        if (!local.info || local.info.turn < 1 || local.info.status !== Player.none) {
            local.set({ info: Info.local(difficulty, settings), save: Save.new(settings) })
            console.debug('CREATED LOCAL', local.info, local.save)
            return { info: local.info, save: local.save }
        }
    })
}



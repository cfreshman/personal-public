import { store } from "src/lib/store"
import { dict, rand_alpha } from "./dict"
import api from "src/lib/api"
import { create_tile_bag, named_colors, named_icons } from "./util"
import { truthy } from "src/lib/types"
import { message } from "src/lib/message"
import { is_ai } from "./ai"

const { named_log, node, svg_node, V, range, set, rand, Q, QQ, on, list, strings, keys, values, from, lists } = window as any
const log = named_log('petals data')


export const local_players = {
  FIRST: 'first',
  SECOND: 'second',
  THIRD: 'third',
}
export const is_local_player = (name) => !!local_players[name?.toUpperCase()]

export const profile_colors = Object.values(named_colors)
export const profile_icons = Object.values(named_icons)

export class Profile {
  user: string
  ids?: []
  color?: string
  icon?: string
}
export const fetch_profile = async (name) => {
  const local_profiles = {
    [local_players.FIRST]: {
      color: named_colors.dark_blue,
      icon: `🐶`,
    },
    [local_players.SECOND]: {
      color: named_colors.red,
      icon: `🐱`,
    },
    easy: {
      color: named_colors.green,
      icon: `😀`,
    },
    medium: {
      color: named_colors.yellow,
      icon: `😏`,
    },
    strategist: {
      color: named_colors.orange,
      icon: `🕵️‍♂️`,
    },
    wordsmith: {
      color: named_colors.red,
      icon: `👩‍🏫`,
    },
    beast: {
      color: named_colors.red,
      icon: `🐺`,
    },
    speedy: {
      color: named_colors.blue,
      icon: `🏎️`,
    },
  }
  if (local_profiles[name]) return local_profiles[name]

  const { profile } = await api.get(`/petals/profile/${name}`)
  return profile
}

export class Tile {
  i: number
  pos: any // ve.js vector
  letter: string
  owner: number
  group: number
}
export class Info {
  id: string
  p0: string
  p1: string
  turn: number
  owner: number
  start_t: number
  last_t: number
  turns: {
    owner: number
    t: number
    tiles: Tile[]
    word: string
  }[]
  scores: number[]
  status: number
  tries: number
  words: string[]
  public: boolean
  chat: boolean
  rematch?: string
  previous?: string
  thread?: {
    id: string
    index: number
  }
}
export const user_ids = (info) => 'p2' in info ? [info.p0, info.p1, info.p2] : [info.p0, info.p1]
export const user_id_range = (info) => range(user_ids(info).length)
export const user_ids_to_map = (ids) => Object.fromEntries(ids.map((id, i) => [`p${i}`, id]))
export const unique_ids = (ids) => lists.unique(ids)

export class State {
  id: string
  tiles: Tile[]
  deltas?: Tile[][]
  score: number[]
  scores?: number[][]
}
export const BOARD_SIZE = 5
export const co_to_i = ({ x, y }) => x > -1 && x < BOARD_SIZE && y > -1 && y < BOARD_SIZE ? y * BOARD_SIZE + x : -1
export const get_adj = ({ x, y }) => {
  const DIRS = [[0,-1],[1,0],[0,1],[-1,0]].map<any>(V.ne)
  return DIRS.map(o => {
    const pos = V.ne(x, y).ad(o)
    const i = co_to_i(pos)
    if (i > -1) {
      return pos
    }
  }).filter(truthy)
}
export const is_adj = ({ x, y }, positions) => {
  return positions.some(x => x.eq(V.ne(x, y)))
}
const TILE_OUT = [V.ne(2, 0), V.ne(2, 1), V.ne(2, 3), V.ne(2, 4), V.ne(0, 2), V.ne(1, 2), V.ne(3, 2), V.ne(4, 2)]
const TILE_OUT_SET = set(TILE_OUT.map(x => x.st()))
const TILE_FIRST_OUT = V.ne(2, 2)
const TILE_FIRST_OUT_SET = set([...TILE_OUT, TILE_FIRST_OUT].map(x => x.st()))

export const next_owner = (info, state=undefined) => {
  return (info.owner + 1) % user_ids(info).length
  // const display_state = construct_state(state)
  // let owner = info.owner
  // do {
  //   owner = (owner + 1) % user_ids(info).length
  // } while (display_state.tiles.every(tile => tile.locked && tile.owner !== owner))
}

export const COOKIES_PETALS = {
  PROFILES: 'petals-profiles',
  INFO: 'petals-info',
  STATE: 'petals-state',
}
const hydrate_info = (info_raw) => {
  const info = strings.json.clone(info_raw)
  info.turns.map(turn => turn.tiles.map(tile => tile.pos = V.ne(tile.pos)))
  return info
}
const hydrate_state = (state_raw) => {
  const state = strings.json.clone(state_raw)
  state.tiles.map(tile => tile.pos = V.ne(tile.pos))
  state.deltas?.map(delta => delta.map(tile => tile.pos = V.ne(tile.pos)))
  return state
}
export const clone_info = (info: Info): Info => hydrate_info(info)
export const clone_state = (state: State): State => hydrate_state(state)
export const fetch_game = async (id: string, hf: any): Promise<{ info: Info, state: State }> => {
  if (id === 'local') {
    const info = store.get(COOKIES_PETALS.INFO)
    const state = store.get(COOKIES_PETALS.STATE)
    if (!info) return create_game(hf, ['bottom', 'top'], true)
    return { info:hydrate_info(info), state:hydrate_state(state) }
  } else {
    const { info=undefined, state=undefined } = await api.get(`/petals/game/${id}`)
    return { info:hydrate_info(info), state:hydrate_state(state) }
  }
}
const tutorial_messages = [
  'find some words! tap to select tiles\n<b>start with PETALS in the top left</b>',
  'tap a letter at the top to deselect\ndrag to rearrange',
  `keep going! play words that <b>lock tiles</b>\ntiles lock when surrounded by tile color\navoid spelling with locked tiles - you won't keep them!`,
  `<b>don't let speedy beat you!</b>`,
]
export const update_game = async (info: Info, state: State) => {
  const { id } = info
  if (id === 'local') {
    info.last_t = Date.now()
    store.set(COOKIES_PETALS.INFO, info)
    store.set(COOKIES_PETALS.STATE, state)

    message.trigger({ delete:'tutorial-hint' })
    if (info.turn % 2 === 0 && store.get('petals-tutorial-run')) {
      const index = store.get('petals-tutorial-index')
      // alert(`tutorial ${index}`)
      if (index >= tutorial_messages.length) {
        store.set('petals-tutorial-run', undefined)
      } else {
        message.trigger({
          text: tutorial_messages[index],
          id: 'tutorial-hint',
        })
        store.set('petals-tutorial-index', index + 1)
      }
    }
  } else {
    await api.post(`/petals/game/${id}`, { info, state })
  }
}
const new_info = (users=[], local=false): Info => {
  return {
    id: undefined,
    ...(user_ids_to_map(users.map((user, i) => user || (local ? values(local_players)[i] : undefined)))),
    turn: 0, owner: 0,
    start_t: Date.now(),
    last_t: Date.now(),
    turns: [],
    scores: users.map(_ => 0),
    status: -1,
    tries: 0,
    words: [],
    public: false,
    chat: false,
  } as Info
}
const new_state = (hf, info): State => {
  const size = user_ids(info).length + 3
  
  const is_tutorial = store.get('petals-tutorial-start')
  store.set('petals-tutorial-start', undefined)
  store.set('petals-tutorial-index', 0)
  store.set('petals-tutorial-run', is_tutorial)

  log('create state', {size, is_tutorial})
  
  let tries = 100
  let state
  while ((tries -= 1) + 1) {
    const tile_bag = create_tile_bag()
    state = {
      id: undefined,
      tiles: range(Math.pow(size, 2)).map((i) => {
        const pos = V.ne(i % size, Math.floor(i / size))
        return {
          i,
          pos,
          owner: -1,
          letter: TILE_FIRST_OUT_SET.has(pos.st()) ? '' : tile_bag.pick(),
          locked: false,
        }
      }),
      deltas: [],
      score: user_ids(info).map(_ => 0),
      scores: [],
    }

    return state
    // TODO stuff below

    if (is_tutorial) {
      const get_tile = (x, y) => {
        log('get tile', { x, y })
        return state.tiles.find(tile => V.eq(tile.pos, V.ne(x, y)))
      }
      get_tile(0, 0).letter = 'l'
      get_tile(1, 0).letter = 'e'
      get_tile(2, 0).letter = 't'
      get_tile(3, 0).letter = 't'
      get_tile(0, 1).letter = 'e'
      get_tile(1, 1).letter = 'r'
      get_tile(2, 1).letter = 'p'
      get_tile(0, 2).letter = 'r'
      get_tile(1, 2).letter = 'e'
      get_tile(2, 2).letter = 's'
      get_tile(0, 3).letter = 's'
    }
    log({tile_bag})

    const anagrams = find_anagrams(state).sort((a, b) => b.length - a.length)
    const letter_to_unplayed_tiles = construct_letter_to_tiles(state)
    let played = 0
    for (let i = 0; i < anagrams.length; i++) {
      const anagram = anagrams[i]
      for (let a_i = 0; a_i < anagram.length; a_i++) {
        const letter = anagram[a_i]
        const unplayed_tiles = letter_to_unplayed_tiles[letter]
        if (unplayed_tiles.length) {
          unplayed_tiles.pop()
          played += 1
          if (played === state.tiles.length) {
            return state
          }
        }
      }
    }
  }
  return state
}
export const create_game = async (hf: any, users: string[], local:boolean=false): Promise<{ info: Info, state: State }> => {
  const info = new_info(users, local)
  const state = new_state(hf, info)
  log('create', {info,state})

  if (local) {
    info.id = state.id = 'local'
    await update_game(info, state)
    return { info, state }
  } else {
    const { info:server_info=undefined, state:server_state=undefined } = await api.post(`/petals/game`, { info, state })
    return { info:hydrate_info(server_info), state:hydrate_state(server_state) }
  }
}

const GROUPS = [
  [V.ne(0,0),V.ne(1,0),V.ne(0,1),V.ne(1,1)],
  [V.ne(3,0),V.ne(4,0),V.ne(3,1),V.ne(4,1)],
  [V.ne(0,3),V.ne(1,3),V.ne(0,4),V.ne(1,4)],
  [V.ne(3,3),V.ne(4,3),V.ne(3,4),V.ne(4,4)],
  [V.ne(2,2)],
]
export const score_turn = (tiles:Tile[], owner:number): number => {
  const group_sets = GROUPS.map(group => set(group.map(pos => pos.st())))
  tiles.filter(tile => tile.owner === owner).map(tile => {
    group_sets.map((group_set) => {
      if (group_set.has(tile.pos.st())) {
        group_set.delete(tile.pos.st())
      }
    })
  })
  const n_groups = group_sets.filter(group_set => !group_set.size).length
  return n_groups
}

export const construct_state = (state: State, turn_delta:number=undefined) => {
  // log({state:clone_state(state),turn_delta})
  if (!state.deltas) return state
  if (turn_delta === undefined) turn_delta = state.deltas.length
  const new_state = clone_state(state) as State
  const new_state_tile_map = {}
  new_state.tiles.map(tile => new_state_tile_map[tile.pos.st()] = tile)
  range(turn_delta).map(() => {
    if (new_state.deltas.length === 0) {
      console.error('mismatched construct state turn deltas')
      return
    }
    const delta = new_state.deltas.shift()
    delta.map(tile => {
      const state_tile = new_state_tile_map[tile.pos.st()]
      Object.assign(state_tile, tile)
    })

    if (new_state.scores) {
      const score = new_state.scores.shift()
      new_state.score = new_state.score.map((x, i) => x + score[i])
    }
  })
  return hydrate_state(new_state)
}

export const play_state = (
  state:State, new_info:Info, hf, turn=undefined, play_turn=undefined, actual_state=undefined
): { new_state:State, new_owner:number, new_scores:number[], new_status:number } => {
  const prior_turn = (turn ?? new_info.turn) - 1
  const selection = new_info.turns.at(prior_turn).tiles.slice(play_turn !== undefined ? 0 : undefined, play_turn)
  const turn_owner = prior_turn % 2 // new_info.turns[prior_turn]?.owner || (new_info.owner - 1 + user_ids(new_info).length) % user_ids(new_info).length
  const next_turn_owner = next_owner({...new_info,owner:turn_owner})
  const locked_owner_set = set(range(user_ids(new_info).length).filter(i => i !== turn_owner && i !== next_turn_owner))
  log({locked_owner_set,turn_owner,next_turn_owner})

  const new_state = clone_state(state)
  const final_state = construct_state(new_state, prior_turn)

  const final_state_tile_map = {}
  final_state.tiles.map(tile => final_state_tile_map[tile.pos.st()] = tile)

  // unlock tiles
  final_state.tiles.map(tile => {
    tile.locked = false
  })
  
  // reassign tiles
  selection.map(({ pos }) => {
    const tile = final_state_tile_map[pos.st()]
    tile.owner = turn_owner
    tile.locked = true
  })

  // score turn & detect game end
  // const GROUPS = [
  //   [V.ne(0,0),V.ne(1,0),V.ne(0,1),V.ne(1,1)],
  //   [V.ne(3,0),V.ne(4,0),V.ne(3,1),V.ne(4,1)],
  //   [V.ne(0,3),V.ne(1,3),V.ne(0,4),V.ne(1,4)],
  //   [V.ne(3,3),V.ne(4,3),V.ne(3,4),V.ne(4,4)],
  //   [V.ne(2,2)],
  // ]
  // const GROUP_SETS = GROUPS.map(group => set(group.map(pos => pos.st())))
  // final_state.tiles.filter(tile => tile.owner === turn_owner).map(tile => {
  //   log('check tile group', tile)
  //   GROUP_SETS.map((group_set) => {
  //     if (group_set.has(tile.pos.st())) {
  //       group_set.delete(tile.pos.st())
  //     }
  //   })
  // })
  // const n_groups = GROUP_SETS.filter(group_set => !group_set.size).length
  const n_groups = score_turn(final_state.tiles, turn_owner)
  let { scores:last_scores, status:new_status, owner:new_owner } = new_info
  let new_scores = last_scores.slice()
  new_scores[turn_owner] += n_groups
  if (new_scores[turn_owner] > 11) {
    new_scores[turn_owner] = 5
  } else if (new_scores[turn_owner] === 11) {
    new_status = turn_owner
  }

  // spawn new letters
  if (!actual_state) {
    let tries = 0
    const selection_set = set(selection.map(x => x.pos.st()))
    const change_tiles = final_state.tiles.filter(tile => !selection_set.has(tile.pos.st()) && !TILE_OUT_SET.has(tile.pos.st()))
    do {
      const tile_bag = create_tile_bag(final_state)
      window['tile_bag'] = tile_bag
      change_tiles.map(x => final_state_tile_map[x.pos.st()]).map(tile => {
        tile.letter = tile_bag.pick()
      })
    } while (!game_has_word(new_info, state) && (tries += 1) < 100)
  }

  // compute state delta
  if (new_state.deltas) {
    const changes = []
    const prior_state = construct_state(state, prior_turn)
    final_state.tiles.map((new_tile, i) => {
      const old_tile = prior_state.tiles[i]
      if (strings.json.stringify(new_tile) !== strings.json.stringify(old_tile)) {
        changes.push({...new_tile,from:old_tile})
      }
    })
    const order = from(selection.map((tile, i) => [tile.pos.st(), i]))
    changes.sort((a, b) => (order[a.pos.st()]??100) - (order[b.pos.st()]??100))
    new_state.deltas.push(changes)
    new_state.tiles = state.tiles
    
    if (new_state.scores) {
      const score_delta = user_ids(new_info).map((_, i) => i === turn_owner ? n_groups : 0)
      new_state.scores.push(score_delta)
    }
  }

  return { new_state, new_owner, new_scores, new_status }
}
export const play_turn = (info:Info, state:State, tiles:Tile[], hf):{ new_info:Info, new_state:State } => {
  if (tiles.length && !('st' in tiles[0].pos)) {
    tiles.map(tile => tile.pos = V.ne(tile.pos)) // TODO figure out why the tiles aren't already hydrated
  }
  const word = tiles.map(x=>x.letter).join('')

  
  const new_info = clone_info(info)
  new_info.turn += 1
  new_info.owner = next_owner(info)
  new_info.turns.push({
    owner: info.owner,
    t: Date.now(),
    tiles,
    word,
  })
  new_info.tries = 0
  new_info.words.push(word)

  // log('play turn', {new_info,turn:new_info.turns.at(-1)})

  const {
    new_state,
    new_owner,
    new_scores,
    new_status,
  } = play_state(state, new_info, hf)
  new_info.owner = new_owner
  new_info.scores = new_scores
  new_info.status = new_status

  return { new_info, new_state }
}

export const has_word = (letters:string|string[], lang='english') => {
  letters = list(letters,'').sort().join('')
  // log({letters,anagrams:dict.anagrams})
  return keys(dict.anagrams).some(anagram => {
    let letters_i = 0
    for (let i = 0; i < anagram.length; i++) {
      const anagram_letter = anagram[i]
      while (letters[letters_i] && letters[letters_i] < anagram_letter) {
        letters_i += 1
      }
      if (!letters[letters_i] || letters[letters_i] > anagram_letter) {
        return false
      }
      letters_i += 1
    }
    return true
  })
}
export const state_to_letters = (state:State): string => construct_state(state).tiles.filter(tile => !TILE_OUT_SET.has(tile.pos.st())).map(tile => tile.letter).sort().join('')
export const game_has_word = (info:Info, state:State): boolean => {
  return has_word(state_to_letters(state))
}
window['has_word'] = has_word

export const construct_tile_map = (display_state) => {
  const tile_map = {}
  construct_state(display_state).tiles.map((tile,i) => tile_map[tile.pos.st()] = {i,...tile})
  return tile_map
}

export const construct_letter_to_tiles = (state: State): {[key:string]:Tile[]} => {
  const display_state = construct_state(state)
  const letter_to_tiles = {}
  display_state.tiles.filter(x=>x.letter).map(tile => {
    // log(tile.letter, tile)
    if (!letter_to_tiles[tile.letter]) letter_to_tiles[tile.letter] = []
    letter_to_tiles[tile.letter].push(tile)
  })
  return letter_to_tiles
}

export const find_anagrams = (state: State, unplayable_set:Set<string>=new Set()): string[] => {
  const display_state = construct_state(state)
  const letters = state_to_letters(display_state)
  // log({letters})
  return keys(dict.anagrams).filter(anagram => {
    let letters_i = 0
    const matches = []
    for (let i = 0; i < anagram.length; i++) {
      const anagram_letter = anagram[i]
      while (letters[letters_i] && letters[letters_i] < anagram_letter) {
        letters_i += 1
      }
      if (!letters[letters_i] || letters[letters_i] > anagram_letter) {
        return false
      }
      matches.push(`${letters_i} ${letters[letters_i]} ${anagram_letter} ${anagram.slice(0, letters_i + 1)}`)
      letters_i += 1
    }
    // log(matches, dict.anagrams[anagram], letters)

    const playable_words = dict.anagrams[anagram].filter(word => !unplayable_set.has(word))
    return playable_words.length
  })
}

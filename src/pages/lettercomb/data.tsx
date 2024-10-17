import { store } from "src/lib/store"
import { dict, rand_alpha } from "./dict"
import api from "src/lib/api"
import { create_tile_bag, default_player_profiles, named_colors, named_icons } from "./util"
import { truthy } from "src/lib/types"
import { message } from "src/lib/message"

const { named_log, node, svg_node, V, range, set, rand, Q, QQ, on, list, strings, keys, from, entries, values } = window as any
const log = named_log('capitals data')


export const local_players = {
  TOP: 'top',
  BOTTOM: 'bottom',

  RIGHT: 'right',
  LEFT: 'left',

  SE: 'se',
  S: 's',
  NE: 'ne',
  SW: 'sw',
  N: 'n',
  NW: 'nw',

  FIRST: 'first',
  SECOND: 'second',
  THIRD: 'third',
  FOURTH: 'fourth',
  FIFTH: 'fifth',
  SIXTH: 'sixth',
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
    bottom: default_player_profiles[0],
    top: default_player_profiles[1],
    
    right: default_player_profiles[0],
    left: default_player_profiles[2],

    SE: default_player_profiles[0],
    S: default_player_profiles[1],
    NE: default_player_profiles[2],
    SW: default_player_profiles[3],
    N: default_player_profiles[4],
    NW: default_player_profiles[5],

    first: default_player_profiles[0],
    second: default_player_profiles[1],
    third: default_player_profiles[2],
    fourth: default_player_profiles[3],
    fifth: default_player_profiles[4],
    sixth: default_player_profiles[5],

    easy: {
      color: named_colors.green,
      // icon: `AI`,
      icon: `😀`,
    },
    medium: {
      color: named_colors.yellow,
      // icon: `AI`,
      icon: `😏`,
    },
    hard: {
      color: named_colors.orange,
      // icon: `AI`,
    },
    impossible: {
      color: named_colors.red,
      icon: `🧙‍♂️`,
    },
    strategist: {
      color: named_colors.orange,
      icon: `🕵️‍♂️`,
    },
    wordsmith: {
      color: named_colors.orange,
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

  const { profile } = await api.get(`/capitals/profile/${name}`)
  return profile
}

export class Tile {
  pos: any // ve.js vector
  letter: string
  owner: number
  capital: boolean
}
export class Info {
  id: string
  p0: string
  p1: string
  p2?: string
  p3?: string
  p4?: string
  p5?: string
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
  status: number
  out?: { [key:string]: number }
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
export const get_n_users = (info) => 'p5' in info ? 6 : 'p2' in info ? 3 : 2
export const user_ids = (info) => {
  const value = [info.p0, info.p1]
  const n_users = get_n_users(info)
  if (n_users >= 3) {
    value.push(info.p2)
    if (n_users >= 6) {
      value.push(info.p3, info.p4, info.p5)
    }
  }
  return value
}
export const user_ids_to_map = (ids) => {
  const value = { p0:ids[0], p1:ids[1] } as any
  const n_users = ids.length
  if (n_users >= 3) {
    value.p2 = ids[2]
    if (n_users >= 6) {
      value.p3 = ids[3]
      value.p4 = ids[4]
      value.p5 = ids[5]
    }
  }
  return value
}
export const new_turn = (info, turn=info.turn) => {
  let owner = info.owner
  do {
    owner = (owner + 1) % get_n_users(info)
  } while (info.out && (info.out[info[`p${owner}`]]||1e10) <= turn)
  return owner
}

export class State {
  id: string
  tiles: Tile[]
  deltas?: Tile[][]
}

export const COOKIES_CAPITALS = {
  PROFILES: 'capitals-profiles',
  LOCAL_INFO: 'capitals-info',
  LOCAL_STATE: 'capitals-state',
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
  log('fetch game', {id})
  if (id === 'local') {
    const info = store.get(COOKIES_CAPITALS.LOCAL_INFO)
    const state = store.get(COOKIES_CAPITALS.LOCAL_STATE)
    log('fetch game local', {info,state})
    if (!info) return create_game(hf, [undefined, undefined], true)
    return { info:hydrate_info(info), state:hydrate_state(state) }
  } else {
    const { info=undefined, state=undefined } = await api.get(`/capitals/game/${id}`)
    return { info:hydrate_info(info), state:hydrate_state(state) }
  }
}
const tutorial_messages = [
  'eliminate your enemy to win! start by playing <b>CAPITALS</b> to cover your capital',
  'you keep tiles that connect back to your territory',
  'the enemy loses any tiles touching your new ones',
  `take the enemy's capital 🏎️ for an extra turn!`
]
export const update_game = async (info: Info, state: State) => {
  const { id } = info
  if (id === 'local') {
    info.last_t = Date.now()
    store.set(COOKIES_CAPITALS.LOCAL_INFO, info)
    store.set(COOKIES_CAPITALS.LOCAL_STATE, state)
    
    message.trigger({ delete:'tutorial-hint' })
    if (info.turn % 2 === 0 && store.get('capitals-tutorial-run')) {
      const index = store.get('capitals-tutorial-index')
      // alert(`tutorial ${index}`)
      if (index >= tutorial_messages.length) {
        store.set('capitals-tutorial-run', undefined)
      } else {
        message.trigger({
          text: tutorial_messages[index],
          id: 'tutorial-hint',
        })
        store.set('capitals-tutorial-index', index + 1)
      }
    }
  } else {
    await api.post(`/capitals/game/${id}`, { info, state })
  }
}
const new_info = (users=[undefined, undefined], local=false): Info => {
  const user_map = user_ids_to_map(
      ['first', 'second', 'third', 'fourth', 'fifth', 'sixth']
      .slice(0, users.length)
      .map((default_local, i) => users[i] || (local ? default_local : 'invite')))
  log({user_map})
  return {
    id: undefined,
    ...user_map,
    turn: 0, owner: 0,
    start_t: Date.now(),
    last_t: Date.now(),
    turns: [],
    status: -1, out: {},
    tries: 0,
    words: [],
    public: false,
    chat: false,
  }
}
const new_state = (hf, info): State => {
  const is_tutorial = store.get('capitals-tutorial-start')
  store.set('capitals-tutorial-start', undefined)
  store.set('capitals-tutorial-index', 0)
  store.set('capitals-tutorial-run', is_tutorial)

  const n_users = get_n_users(info)
  const capitals = n_users === 2 ? [
    V.ne(2, 1),
    V.ne(-2, -1),
  ] : n_users === 3 ? [
    V.ne(3, 0),
    V.ne(-3, 3),
    V.ne(0, -3),
  ] : [
    V.ne(3, 3),
    V.ne(-3, 6),
    V.ne(6, -3),
    V.ne(-6, 3),
    V.ne(3, -6),
    V.ne(-3, -3),
  ]
  // const territories = capitals.map(capital => set([capital, ...hf.adj(capital)].map(pos => pos.st())))
  // OMG you don't start with neighbors 😭 im so dumb it was wrong for so long
  const territories = capitals.map(capital => set([capital].map(pos => pos.st())))
  const boundary_raw = capitals
    .flatMap(capital => hf.adj(capital))
    // .flatMap(pos => hf.adj(pos))
    .filter(pos => !territories.some(x => x.has(pos.st())))
  const boundary = set(boundary_raw.map(pos => pos.st()))
  const tile_bag = create_tile_bag({tiles:[]}, info)
  log({tile_bag})

  const n_tiles = n_users === 2 ? 61 : n_users === 3 ? 61 : 61 + 30 + 36 + 42
  const get_is_filtered = (tile) => {
    const cart = hf.to_cartesian(tile.pos)
    if (n_users === 2) {
      if (cart.x < -4.5 || cart.x > 4.5) return false
      if (cart.y < -6 || cart.y > 6) return false
      return true
    } else {
      return tile.owner > -1 || cart.ma() <= 10
    }
  }
  const state = {
    id: undefined,
    tiles: hf.nearest(n_tiles, V.ne(0, 0)).map(pos => {
      return {
        pos,
        owner: territories.findIndex(x => x.has(pos.st())),
        capital: capitals.some(x => x.eq(pos)),
        letter: boundary.has(pos.st()) ? tile_bag.pick() : '',
      }
    }).filter(get_is_filtered),
    deltas: [],
  }

  if (is_tutorial) {
    const user_capital = state.tiles.find(x => x.capital && x.owner === 0)
    const uc_pos_neg = user_capital.pos.sc(-1)
    const closest_letter_tiles = state.tiles.filter(x => x.letter).sort((a, b) => V.ma(a.pos.ad(uc_pos_neg)) - V.ma(b.pos.ad(uc_pos_neg)))
    ;[...'capitals'].map((l, i) => closest_letter_tiles[i].letter = l)
  }

  return state
}
export const create_game = async (hf: any, users: string[], local:boolean=false): Promise<{ info: Info, state: State }> => {
  const info = new_info(users, local)
  const state = new_state(hf, info)
  log('create', {local,users,info,state})

  if (local) {
    info.id = state.id = 'local'
    await update_game(info, state)
    return { info, state }
  } else {
    const { info:server_info=undefined, state:server_state=undefined } = await api.post(`/capitals/game`, { info, state })
    return { info:hydrate_info(server_info), state:hydrate_state(server_state) }
  }
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
  })
  return hydrate_state(new_state)
}

export const play_state = (
  state:State, new_info:Info, hf, turn=undefined, play_turn=undefined, actual_state=undefined
): { new_state:State, new_owner:number, new_status:number, new_boundary_tiles:Tile[], new_out?:{[key:string]:number} } => {
  const prior_turn = (turn ?? new_info.turn) - 1
  const selection = new_info.turns.at(prior_turn).tiles.slice(play_turn !== undefined ? 0 : undefined, play_turn)
  const turn_owner = (new_info.turns[prior_turn]||{owner:1-new_info.owner}).owner

  const new_state = clone_state(state)
  const final_state = construct_state(new_state, prior_turn)
  const capitals = range(get_n_users(new_info)).map(i => final_state.tiles.find(x => x.capital && x.owner === i))

  const final_state_tile_map = {}
  final_state.tiles.map(tile => final_state_tile_map[tile.pos.st()] = tile)

  const connected_selection = []
  {
    const owner_territory = final_state.tiles.filter(x => x.owner === turn_owner)
    const owner_territory_set = set(owner_territory.map(x => x.pos.st()))
    const selection_set = set(selection.map(tile => tile.pos.st()))
    const explored = set(owner_territory_set)
    const frontier = list(owner_territory)
    while (frontier.length) {
      const curr = frontier.pop()
      hf.adj(curr.pos).filter(x => !explored.has(x.st()) && selection_set.has(x.st())).map(x => {
        explored.add(x.st())
        const tile = final_state_tile_map[x.st()]
        frontier.push(tile)
        connected_selection.push(tile)
      })
    }
  }
  connected_selection.map(tile => {
    tile.owner = turn_owner
    tile.letter = ''
  })
  
  // const [[owner_boundary, owner_boundary_set], [other_boundary, other_boundary_set]] = [turn_owner, 1 - turn_owner].map(owner => {
  //   const territory = final_state.tiles.filter(x => x.owner === owner)
  //   const territory_set = set(territory.map(x => x.pos.st()))
  //   log(territory)
  //   const boundary = []
  //   const boundary_set = set()
  //   territory.map(tile => {
  //     const new_letter_tiles = hf.adj(tile.pos)
  //       .filter(x => !territory_set.has(x.st()) && !boundary_set.has(x.st()))
  //       .map(x => final_state_tile_map[x.st()])
  //       .filter(truthy)
  //     new_letter_tiles.map(x => boundary_set.add(x.pos.st()))
  //     boundary.push(...new_letter_tiles)
  //   })
  //   return [boundary, boundary_set]
  // })
  let new_boundary_tiles
  {
    const owner_territory = final_state.tiles.filter(x => x.owner === turn_owner)
    const owner_territory_set = set(owner_territory.map(x => x.pos.st()))
    const owner_boundary = []
    const owner_boundary_set = set()
    owner_territory.map(tile => {
      const new_letter_tiles = hf.adj(tile.pos)
        .filter(x => !owner_territory_set.has(x.st()) && !owner_boundary_set.has(x.st()))
        .map(x => final_state_tile_map[x.st()])
        .filter(truthy)
      new_letter_tiles.map(x => owner_boundary_set.add(x.pos.st()))
      owner_boundary.push(...new_letter_tiles)
    })

    new_boundary_tiles = owner_boundary.filter(tile => !tile.letter)
    new_boundary_tiles.map(tile => {
      tile.owner = -1
      tile.capital = false
    })
  }
  new_boundary_tiles.map(tile => {
    tile.letter = ' '
  })

  // remove tiles now > 1 away from any territory
  {
    const any_territory = final_state.tiles.filter(x => x.owner > -1)
    const any_territory_set = set(any_territory.map(x => x.pos.st()))
    const any_boundary_set = set()
    any_territory.map(tile => {
      const new_letter_tiles = hf.adj(tile.pos)
        .filter(x => !any_territory_set.has(x.st()) && !any_boundary_set.has(x.st()))
        .map(x => final_state_tile_map[x.st()])
        .filter(truthy)
      new_letter_tiles.map(x => any_boundary_set.add(x.pos.st()))
    })

    final_state.tiles.filter(tile => tile.letter && !any_territory_set.has(tile.pos.st()) && !any_boundary_set.has(tile.pos.st())).map(tile => {
      tile.letter = ''
    })
  }

  // spawn new letters
  if (!actual_state) {
    const connected_selection_set = set(connected_selection.map(tile => tile.pos.st()))
    const regenerated_letters = selection.filter(tile => final_state_tile_map[tile.pos.st()].letter && !connected_selection_set.has(tile.pos.st()))

    let tries = 0
    do {
      const tile_bag = create_tile_bag(final_state, new_info)
      window['tile_bag'] = tile_bag
      new_boundary_tiles.map(tile => {
        tile.letter = tile_bag.pick()
      })
      regenerated_letters.map(x => final_state_tile_map[x.pos.st()]).map(tile => {
        tile.letter = tile_bag.pick()
      })
    } while (!game_has_word(new_info, state) && (tries += 1) < 100)
  }

  // // give at least one vowel
  // const letter_tiles = final_state.tiles.filter(x => x.letter)
  // const letter_set = set(letter_tiles.map(x => x.letter))
  // const vowel_list = list('aeiou', '')
  // const all_consonants = !vowel_list.some(vowel => letter_set.has(vowel))
  // if (all_consonants) {
  //   rand.sample(letter_tiles).letter = rand.sample(vowel_list)
  // }

  // detect game end
  let capital_capture = false
  const users_tiles = range(get_n_users(new_info)).map(i => final_state.tiles.filter(x => x.owner === i))
  let { status:new_status, owner:new_owner, out:new_out={} } = new_info
  users_tiles.map((user_tiles, i) => {
    if (i === turn_owner) return

    const name = new_info[`p${i}`]
    if (!new_out[name] && !user_tiles.length) {
      new_out[name] = new_info.turn
    }
  })
  // detect captured capitals
  if (values(new_out).length === get_n_users(new_info) - 1) {
    new_status = turn_owner
  } else {
    if (capitals.some((x, i) => i !== turn_owner && x && x.owner === -1)) {
      // give current player second turn
      new_owner = turn_owner
    } else {
      capitals.map((x, i) => {
        if (i === turn_owner) return
        
        if (!x) {
          // this was a second turn, choose random capital
          capital_capture = true
          const new_capital = rand.sample(users_tiles[i])
          if (new_capital) {
            new_capital.capital = true
          }
        }
      })
    }
  }

  if (actual_state) {
    new_state.tiles.map((tile, i) => {
      const actual_tile = actual_state.tiles[i]
      if (tile.letter) {
        tile.letter = actual_tile.letter || tile.letter
      }
      if (capital_capture) {
        tile.capital = actual_tile.capital
      }
    })
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
  }

  if (new_out[new_info[`p${new_owner}`]]) new_owner = new_turn(new_info, prior_turn + 1)

  return { new_state, new_owner, new_status, new_boundary_tiles, new_out }
}
export const play_turn = (info:Info, state:State, tiles:Tile[], hf):{ new_info:Info, new_state:State } => {
  tiles.map(tile => tile.pos = V.ne(tile.pos)) // TODO figure out why the tiles aren't already hydrated

  const new_info = clone_info(info)
  new_info.turn += 1
  new_info.owner = new_turn(info)
  new_info.turns.push({
    owner: info.owner,
    t: Date.now(),
    tiles,
    word:tiles.map(x=>x.letter).join(''),
  })
  new_info.tries = 0
  new_info.words = []
  // new_info.words.push(word)

  // log('play turn', {new_info,turn:new_info.turns.at(-1)})

  const {
    new_state,
    new_owner,
    new_status,
    new_out,
  } = play_state(state, new_info, hf)
  new_info.owner = new_owner
  new_info.status = new_status
  if (new_out) new_info.out = new_out
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
export const state_to_letters = (state:State): string => construct_state(state).tiles.map(tile => tile.letter).sort().join('')
export const game_has_word = (info:Info, state:State): boolean => {
  return has_word(state_to_letters(state))
}
window['has_word'] = has_word

export const construct_tile_map = (display_state) => {
  const tile_map = {}
  construct_state(display_state).tiles.map((tile,i) => tile_map[tile.pos.st()] = {i,...tile})
  return tile_map
}
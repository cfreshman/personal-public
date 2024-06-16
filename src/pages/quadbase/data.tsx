import { store } from "src/lib/store"
import { dict, rand_alpha } from "./dict"
import api from "src/lib/api"
import { create_tile_bag, default_player_profiles, named_colors, named_icons } from "./util"
import { truthy } from "src/lib/types"

const { named_log, node, svg_node, V, range, set, rand, Q, QQ, on, list, strings, keys, from, values, entries } = window as any
const log = named_log('quadbase data')


export const local_players = {
  TOP: 'top',
  RIGHT: 'right',
  BOTTOM: 'bottom',
  LEFT: 'left',
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
    top: default_player_profiles[0],
    left: default_player_profiles[1],
    right: default_player_profiles[2],
    bottom: default_player_profiles[3],
  }
  if (local_profiles[name]) return local_profiles[name]

  const { profile } = await api.get(`/quadbase/profile/${name}`)
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
  p2: string
  p3: string
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
  out?: {[key:string]:number}
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
export const user_ids = (info) => [info.p0, info.p1, info.p2, info.p3]
export const user_ids_to_map = (ids) => ({p0:ids[0],p1:ids[1],p2:ids[2],p3:ids[3]})

export class State {
  id: string
  tiles: Tile[]
  deltas?: Tile[][]
}
export const BOARD_SIZE = 15
export const CORNER_SIZE = 5
export const CENTER_SIZE = BOARD_SIZE - 2 * CORNER_SIZE
export const QUADBASES = [
  range(CENTER_SIZE).map(i => V.ne(CORNER_SIZE + i, 0)),
  range(CENTER_SIZE).map(i => V.ne(0, CORNER_SIZE + i)),
  range(CENTER_SIZE).map(i => V.ne(BOARD_SIZE - 1, CORNER_SIZE + i)),
  range(CENTER_SIZE).map(i => V.ne(CORNER_SIZE + i, BOARD_SIZE - 1)),
]
export const QUADBASE_SETS = QUADBASES.map(base => set(base.map(pos => pos.st())))
export const co_to_i = ({ x, y }) => x > -1 && x < BOARD_SIZE && y > -1 && y < BOARD_SIZE ? y * BOARD_SIZE + x : -1
export const get_adj = ({ x, y }) => {
  const DIRS = [[0,-1],[1,0],[0,1],[-1,0],[-1,-1],[1,-1],[1,1],[-1,1]].map<any>(V.ne)
  return DIRS.map(o => {
    const pos = V.ne(x, y).ad(o)
    const i = co_to_i(pos)
    if (i > -1) {
      return pos
    }
  }).filter(truthy)
}
export const is_adj = ({ x, y }, adj=undefined) => {
  if (!adj) adj = get_adj({ x, y })
  return adj.some(x => x.eq(V.ne(x, y)))
}

const COOKIES_QUADBASE = {
  INFO: 'quadbase-info',
  STATE: 'quadbase-state',
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
export const fetch_game = async (id: string): Promise<{ info: Info, state: State }> => {
  if (id === 'local') {
    const info = store.get(COOKIES_QUADBASE.INFO)
    const state = store.get(COOKIES_QUADBASE.STATE)
    if (!info) return create_game(['bottom', 'top'], true)
    return { info:hydrate_info(info), state:hydrate_state(state) }
  } else {
    const { info=undefined, state=undefined } = await api.get(`/quadbase/game/${id}`)
    return { info:hydrate_info(info), state:hydrate_state(state) }
  }
}
export const update_game = async (info: Info, state: State) => {
  const { id } = info
  if (id === 'local') {
    info.last_t = Date.now()
    store.set(COOKIES_QUADBASE.INFO, info)
    store.set(COOKIES_QUADBASE.STATE, state)
  } else {
    await api.post(`/quadbase/game/${id}`, { info, state })
  }
}
const new_info = (users=[], local=false): Info => {
  return {
    id: undefined,
    p0: users[0] || (local ? 'top' : undefined),
    p1: users[1] || (local ? 'left' : undefined),
    p2: users[2] || (local ? 'right' : undefined),
    p3: users[3] || (local ? 'bottom' : undefined),
    turn: 0, owner: 0,
    start_t: Date.now(),
    last_t: Date.now(),
    turns: [],
    status: -1,
    out: {},
    tries: 0,
    words: [],
    public: false,
    chat: false,
  }
}
const new_state = (): State => {
  const territories = QUADBASES.map(base => set(base.map(pos => pos.st())))
  const tile_bag = create_tile_bag()
  log({tile_bag})

  return {
    id: undefined,
    tiles: range(BOARD_SIZE).flatMap(y => range(BOARD_SIZE).map(x => {
      const pos = V.ne(x, y)
      const i = co_to_i(pos)
      const owner = territories.findIndex(x => x.has(pos.st()))
      const corner = 
        ((x < CORNER_SIZE && y < CORNER_SIZE)
        || (x > BOARD_SIZE - 1 - CORNER_SIZE && y < CORNER_SIZE)
        || (x > BOARD_SIZE - 1 - CORNER_SIZE && y > BOARD_SIZE - 1 - CORNER_SIZE)
        || (x < CORNER_SIZE && y > BOARD_SIZE - 1 - CORNER_SIZE))
        // && range(CORNER_SIZE).some(i => V.ne(x, y).ad(V.ne(i, i).sc(-1)).ma() < 1)
      return {
        pos, i,
        owner,
        base: owner > -1,
        letter: corner ? '' : tile_bag.pick(),
      }
    })).filter(x => x.i > -1),
    deltas: [],
  }
}
export const create_game = async (users: string[], local:boolean=false): Promise<{ info: Info, state: State }> => {
  const info = new_info(users, local)
  const state = new_state()
  log('create', {info,state})

  if (local) {
    info.id = state.id = 'local'
    await update_game(info, state)
    return { info, state }
  } else {
    const { info:server_info=undefined, state:server_state=undefined } = await api.post(`/quadbase/game`, { info, state })
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

export const compute_new_owner = (info:Info, turn:number=info.turn, already_updated:boolean=false): number => {
  let owner = info.owner
  do {
    if (already_updated) {
      already_updated = false
    } else {
      owner = (owner + 1)%4
    }
  } while ((info.out||{})[owner]||1e6 <= turn)
  return owner
}
export const play_state = (
  state:State, new_info:Info, turn=undefined, play_turn=undefined, actual_state=undefined
): { new_state:State, new_owner:number, new_status:number, new_out:{[key:string]:number} } => {
  const prior_turn = (turn ?? new_info.turn) - 1
  const selection = new_info.turns.at(prior_turn).tiles.slice(play_turn !== undefined ? 0 : undefined, play_turn)
  const turn_owner = new_info.turns.at(prior_turn).owner

  const new_state = clone_state(state)
  const final_state = construct_state(new_state, prior_turn)

  const final_state_tile_map = {}
  final_state.tiles.map(tile => final_state_tile_map[tile.pos.st()] = tile)

  const existing_base_owners = QUADBASES
    .map(base => base.map(pos => final_state_tile_map[pos.st()]))
    .map(base_tiles => range(4).find(i => base_tiles.some(tile => tile.owner === i)))
  const existing_base_tile_lists_for_owner = (owner) => 
    existing_base_owners
    .map((x, i) => x === owner && QUADBASES[i].map(pos => final_state_tile_map[pos.st()]))
    .filter(x=>x)
  log(
    {existing_base_owners},
    // range(4).map(i => QUADBASES[i].map(base => base.map(pos => final_state_tile_map[pos.st()]))),
    range(4).map(existing_base_tile_lists_for_owner))

  const connected_selection = []
  {
    const selection_set = set(selection.map(tile => tile.pos.st()))
    const frontier = final_state.tiles.filter(x => x.owner === turn_owner)
    const explored = set(frontier.map(x => x.pos.st()))
    while (frontier.length) {
      const curr = frontier.pop()
      get_adj(curr.pos).filter(x => !explored.has(x.st()) && selection_set.has(x.st())).map(x => {
        explored.add(x.st())
        const tile = final_state_tile_map[x.st()]
        frontier.push(tile)
        connected_selection.push(tile)
      })
    }
  }
  connected_selection.map(tile => tile.owner = turn_owner)

  // eliminate players
  let new_out = (new_info.out||{})
  range(4).map(i => {
    if (i === turn_owner) return
    if (new_out[i]) return

    const any_base = existing_base_tile_lists_for_owner(i)
      .some(base => {
        const other_tile = base.find(x => x.owner !== i)
        if (other_tile) {
          // final_state.tiles.filter(x => x.owner === i).map(x => x.owner = -1)
          base.map(x => x.owner = other_tile.owner)
          return false
        } else {
          return true
        }
      })
    if (!any_base) {
      new_out[i] = new_info.turn
      final_state.tiles.filter(x => x.owner === i).map(x => x.owner = -1)
    }
    // const i_base = QUADBASES[i].map(pos => final_state_tile_map[pos.st()])
    // if (i_base.some(tile => tile.owner !== i)) {
    //   new_out[i] = new_info.turn
    //   const i_tiles = final_state.tiles.filter(x => x.owner === i)
    //   i_tiles.map(tile => tile.owner = -1)
    // }
  })

  // run a bfs to disconnect each other player's tiles
  range(4).map(i => {
    if (i === turn_owner) return
    const i_bases = existing_base_tile_lists_for_owner(i).flatMap(x=>x).filter(x => x.owner === i)
    const frontier = [...i_bases]
    const explored_set = set(frontier.map(x => x.pos.st()))
    const connected_tile_set = set([...explored_set])
    while (frontier.length) {
      const curr = frontier.pop()
      get_adj(curr.pos).filter(x => !explored_set.has(x.st())).map(x => {
        const tile = final_state_tile_map[x.st()]
        if (tile.owner === i) {
          explored_set.add(x.st())
          frontier.push(tile)
          connected_tile_set.add(x.st())
        }
      })
    }
    const i_tiles = final_state.tiles.filter(x => x.owner === i)
    log('disconnected', i, i_tiles.filter(x => !connected_tile_set.has(x.pos.st())).map(x => {
      x.owner = -1
      return x
    }), i_bases.map(x => x.pos.st()), connected_tile_set)
  })

  // detect game end
  let { status:new_status, owner:new_owner } = new_info
  log('detect game end', entries(new_out).filter(e => e[1] && e[1] <= new_info.turn).length === 3, entries(new_out).filter(e => e[1] && e[1] <= new_info.turn))
  if (entries(new_out).filter(e => e[1] && e[1] <= new_info.turn).length === 3) {
    log('detected game end')
    new_status = turn_owner
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

  if (new_out[new_info[new_owner]]) new_owner = compute_new_owner(new_info, prior_turn + 1)

  return { new_state, new_owner, new_status, new_out }
}
export const play_turn = (info:Info, state:State, tiles:Tile[]):{ new_info:Info, new_state:State } => {
  tiles.map(tile => tile.pos = V.ne(tile.pos)) // TODO figure out why the tiles aren't already hydrated

  const new_info = clone_info(info)
  new_info.turn += 1
  new_info.owner = compute_new_owner(info)
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
  } = play_state(state, new_info)
  Object.assign(new_info, {owner:new_owner,status:new_status,out:new_out})
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
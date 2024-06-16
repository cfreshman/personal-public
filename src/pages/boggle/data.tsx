const { named_log, range, strings, V, rand, duration, math } = window as any
const log = named_log('boggle data')

export const ROUND_MS = 1.5 * 60 * 1_000
const BOGGLE_DIE = [
  'rifobx',
  'ifehey',
  'denows',
  'utoknd',
  'hmsrao',
  'lupets',
  'acitoa',
  'ylgkue',
  ['qu', 'b', 'm', 'j', 'o', 'a'],
  'ehispn',
  'vetign',
  'baliyt',
  'ezavnd',
  'ralesc',
  'uwilrg',
  'pacemd',
].map(x => [...x])
const points_for_word_based_on_length = (word) => {
  return {
    0: 0, 1: 0, 2: 0,
    3: 1,
    4: 1,
    5: 2,
    6: 3,
    7: 5,
  }[word.length] ?? 11
}

export class Tile {
  pos: any // ve.js vector
  face: string
}
export class State {
  id: string
  n_players?: number
  start_t?: number
  last_t?: number
  players?: string[]
  player_i?: number
  round: number
  board: Tile[]
  round_start: (number|false)/* per player */[]/* per round */[]
  round_words: {word:string,accepted:boolean}[]/* per player */[]/* per round */[]
  round_points: number[]/* per player */[]/* per round */[]
  round_total: number/* per player */[]/* per round */[]
  points: number[]
  status: number
  chat?: string|boolean
  public?: boolean
}

export const clone_state = (state) => {
  const new_state = strings.json.clone(state)
  new_state.board?.map(tile => tile.pos = V.ne(tile.pos))
  return new_state
}

export const new_local_state = (n_players): State => {
  return {
    id: 'local',
    n_players,
    player_i: 0,
    round: -1,
    board: undefined,
    round_start: [],
    round_words: [],
    round_points: [],
    round_total: [],
    points: range(n_players).map(i => 0),
    status: -1,
  }
}

export const init_round = (state: State) => {
  const new_state = clone_state(state)

  new_state.round += 1
  new_state.round_start.push(range(new_state.n_players).map(i => false))
  new_state.round_words.push(range(new_state.n_players).map(i => []))

  // create board by randomizing die order and face
  const die_order = rand.shuffle(range(16))
  new_state.board = die_order.map((i, i_i) => {
    const die = BOGGLE_DIE[i]
    const face = rand.sample(die)
    return {
      pos: V.ne(i_i % 4, Math.floor(i_i / 4)),
      face,
    }
  })

  return new_state
}

export const start_round = (state: State, player?: string) => {
  const new_state = clone_state(state)

  // start player_i's round
  let player_i
  if (new_state.id === 'local') {
    player_i = new_state.player_i
  } else {
    player_i = new_state.players.indexOf(player)
  }
  new_state.round_start[new_state.round][player_i] = Date.now()

  return new_state
}
export const next_local_player = (state: State) => {
  const new_state = clone_state(state)

  new_state.player_i += 1

  return new_state
}

export const is_round_over = (state: State) => {
  return state.round_start.length && state.round_start[state.round].every(start => start && start + ROUND_MS <= Date.now())
}
export const end_round = (state: State) => {
  const new_state = clone_state(state)

  // calculate points
  const word_counts = {}
  const player_word_objects = state.round_words[state.round]
  player_word_objects.map(list => list.map(o_word => {
    word_counts[o_word.word] = (word_counts[o_word.word]||0) + 1
  }))
  new_state.round_points.push(player_word_objects.map(list => list.map(o_word => {
    if (!o_word.accepted || word_counts[o_word.word] > 1) return 0
    return points_for_word_based_on_length(o_word.word)
  })))

  new_state.round_total.push([])
  new_state.round_points[new_state.round].map((player_points, i) => {
    const player_round_total = math.sum(player_points)
    new_state.round_total[new_state.round].push(player_round_total)
    new_state.points[i] += player_round_total
  })

  if (new_state.id === 'local') {
    new_state.player_i = 0
  }

  log('round ended', new_state)
  
  return new_state
}
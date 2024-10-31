import { consumer, supplier, truthy } from "src/lib/types";
import { Info, State, Tile, construct_state, construct_tile_map, play_turn, state_to_letters } from "./data";
import { dict } from "./dict";
import { store } from "src/lib/store";

const { named_log, keys, rand, set, list, lists, maths, defer } = window as any
const log = named_log('capitals ai')

export const Difficulty = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
  IMPOSSIBLE: 'impossible',
  STRATEGIST: 'strategist',
  WORDSMITH: 'wordsmith',
  BEAST: 'beast',
  SPEEDY: 'speedy',
}
export const is_ai = (name) => {
  return !!Difficulty[name.toUpperCase()]
}

export const get_selection = async (info:Info, raw_state:State, hf, f_progress?:consumer<string>, get_interrupted?:supplier<boolean>): Promise<Tile[]> => {
  await Promise.resolve() // turn async

  const display_state = construct_state(raw_state)
  const letters = state_to_letters(display_state)
  log({letters})
  const valid_anagrams = keys(dict.anagrams).filter(anagram => {
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
    return true
  })
  log({valid_anagrams})

  const letter_to_tiles = {}
  display_state.tiles.filter(x=>x.letter).map(tile => {
    log(tile.letter, tile)
    if (!letter_to_tiles[tile.letter]) letter_to_tiles[tile.letter] = []
    letter_to_tiles[tile.letter].push(tile)
  })
  log({letter_to_tiles})

  const owner_ai = [info.p0, info.p1].findIndex(is_ai)

  type play_result = { tiles:string, new_info:Info, new_state:State, display_state:State }
  const compute_best_play = async (evaluator, word_length_limit=1e6, timeout_ms=1e6): Promise<play_result[]> => {
    const filtered_anagrams = valid_anagrams.filter(anagram => anagram.length <= word_length_limit)
    const used_anagrams = filtered_anagrams.length ? filtered_anagrams : valid_anagrams

    const PARTIAL_RESULTS_COOKIE = 'capitals-ai-partial-results'
    let partial_results = store.get(PARTIAL_RESULTS_COOKIE)
    const is_speedy = info[`p${owner_ai}`] === 'speedy'
    if (!partial_results || partial_results.total !== used_anagrams.length || is_speedy) {
      partial_results = {
        id: `${info.p0} ${info.p1} ${info.last_t}`,
        i: 0, total: used_anagrams.length,
        play_result: undefined,
      }
      if (is_speedy) rand.shuffle(used_anagrams)
    }
    log({partial_results})
    let play_results = partial_results.play_results || undefined
    const start_ms = Date.now()
    for (let i = partial_results.i; i < used_anagrams.length && (Date.now() - start_ms < timeout_ms || !play_results.length); i++) {
      const anagram = used_anagrams[i]
      log(`computing result for anagram ${i+1}/${used_anagrams.length} ${(Date.now() - start_ms) / timeout_ms}`, anagram)
      f_progress && f_progress(`${maths.round(Math.max(i / used_anagrams.length, (Date.now() - start_ms) / timeout_ms) * 100)}%`)
      await defer(false, 1)
      if (get_interrupted()) throw 'interrupted'

      // compute all possible plays of this word
      let possible_anagram_tiles = []
      const recursive_select = (letters, tiles=[], used_set=set()) => {
        if (letters.length === 0) possible_anagram_tiles.push(tiles)
        const letter = letters[0]
        const possible_letter_plays = display_state.tiles.filter(tile => tile.letter === letter && !used_set.has(tile.pos.st()))
        const remaining_letters = letters.slice(1)
        possible_letter_plays.map(tile => {
          const tile_used_set = set(used_set)
          tile_used_set.add(tile.pos.st())
          const tile_tiles = tiles.concat([tile])
          recursive_select(remaining_letters, tile_tiles, tile_used_set)
        })
      }
      recursive_select(rand.sample(dict.anagrams[anagram]))

      const tile_map = construct_tile_map(display_state)
      // log({tile_map,possible_anagram_tiles})
      possible_anagram_tiles = lists.unique(possible_anagram_tiles, x => x.slice().sort((a, b) => tile_map[a.pos.st()].i - tile_map[b.pos.st()].i).map(y => y.pos.st()).join('-'))
      
      possible_anagram_tiles.map(tiles => {
        const play_turn_result = play_turn(info, display_state, tiles, hf) as play_result
        play_turn_result.display_state = construct_state(play_turn_result.new_state)
        
        const curr_result = {
          anagram, tiles, score:evaluator(play_turn_result)
        }
        
        if (!play_results) {
          play_results = [curr_result]
        } else {
          const diff = curr_result.score - play_results[0].score
          if (diff > 0) {
            play_results = [curr_result]
          } else if (diff === 0) {
            play_results.push(curr_result)
          }
        }
      })
      partial_results.i = i
      partial_results.play_results = play_results
      log(partial_results)
      store.set(PARTIAL_RESULTS_COOKIE, partial_results)
    }
    store.clear(PARTIAL_RESULTS_COOKIE)
    return play_results
  }

  const owner_user = 1 - owner_ai
  const start_ai_tiles = display_state.tiles.filter(tile => tile.owner === owner_ai)
  const start_ai_tiles_n = start_ai_tiles.length
  const start_user_tiles = display_state.tiles.filter(tile => tile.owner === owner_user)
  const start_user_tiles_n = start_user_tiles.length

  const ai_capital = display_state.tiles.find(x => x.owner === owner_ai && x.capital)
  const user_capital = display_state.tiles.find(x => x.owner === owner_user && x.capital)

  const is_ai_capital_protected = (display_state) => {
    const tile_map = construct_tile_map(display_state)
    return hf.adj(ai_capital.pos).map(pos => tile_map[pos.st()]).every(x => !x || x.owner === owner_ai)
  }
  const unprotected_ai_capital = !is_ai_capital_protected(display_state)

  const is_board_disconnected = (display_state) => {
    const tile_map = construct_tile_map(display_state)
    const frontier = [...start_ai_tiles]
    const explored = set(frontier.map(tile => tile.pos.st()))
    while (frontier.length) {
      const curr = frontier.pop()
      hf.adj(curr.pos).map(pos => tile_map[pos.st()]).map(tile => {
        if (tile && !explored.has(tile.pos.st())) {
          if (tile.owner === owner_user) {
            return true
          } else if (tile.letter && tile.owner < 0) {
            frontier.push(tile)
            explored.add(tile.pos.st())
          }
        }
      })
    }
    return false
  }
  let disconnected_board = is_board_disconnected(display_state)
  log({ disconnected_board })

  const ai = [info.p0, info.p1].find(is_ai)
  log({ai})

  const word_length_limit_from_float = (x) => {
    const base = Math.floor(x)
    const extra = x % 1
    return base + (rand.f() < extra ? 1 : 0)
  }

  let selection
  const memoized_distances = {}
  const score_tiles = (tile_list, target_capital) => {
    return maths.sum(tile_list.map(tile => {
      if (!memoized_distances[target_capital.pos.st()]) memoized_distances[target_capital.pos.st()] = {}
      let score = memoized_distances[target_capital.pos.st()][tile.pos.st()]
      if (score === undefined) {
        score = memoized_distances[target_capital.pos.st()][tile.pos.st()] = 1 / target_capital.pos.ad(tile.pos.sc(-1)).ma()
      }
      return score
    }))
  }
  const simple_ai = async (word_lenth_limit_float) => {
    const word_length_limit = word_length_limit_from_float(word_lenth_limit_float)
    log('simple ai agent', word_length_limit, word_lenth_limit_float)
    const evaluator = (anagram_result: play_result) => {
      // log({anagram_result})
      const result_ai_tiles = anagram_result.display_state.tiles.filter(tile => tile.owner === owner_ai)
      const result_ai_tiles_n = result_ai_tiles.length
      const did_protect_ai_capital = unprotected_ai_capital && is_ai_capital_protected(anagram_result.display_state)

      const result_user_tiles = anagram_result.display_state.tiles.filter(tile => tile.owner === owner_user)
      const result_user_tiles_n = result_user_tiles.length
      const took_capital = !result_user_tiles.some(tile => tile.capital)

      const word_length = anagram_result.new_info.turns.at(-1).word.length
      if (took_capital) {
        return 200 + (result_ai_tiles_n - start_ai_tiles_n) + (.01 * word_length)
      } else if (result_ai_tiles_n > start_ai_tiles_n) {
        return 100 + (result_ai_tiles_n - start_ai_tiles_n) + (did_protect_ai_capital ? .5 : 0) + (.001 * word_length)
      } else {
        return word_length
      }
    }
    const anagram_result = await compute_best_play(evaluator, word_length_limit)
    log({anagram_result})
    selection = rand.sample(anagram_result).tiles
  }
  switch (ai) {
    case 'easy':{
      await simple_ai(3.25)
    }break
    case 'medium':{
      await simple_ai(4.5)
    }break
    case 'strategist':{
      const word_length_limit = word_length_limit_from_float(4.5)
      const evaluator = (anagram_result: play_result) => {
        // log({anagram_result})
        const result_ai_tiles = anagram_result.display_state.tiles.filter(tile => tile.owner === owner_ai)
        const result_ai_tiles_n = result_ai_tiles.length
        const did_protect_ai_capital = unprotected_ai_capital && is_ai_capital_protected(anagram_result.display_state)

        const result_user_tiles = anagram_result.display_state.tiles.filter(tile => tile.owner === owner_user)
        const result_user_tiles_n = result_user_tiles.length
        const took_capital = !result_user_tiles.some(tile => tile.capital)

        const did_connect_board = disconnected_board && !is_board_disconnected(anagram_result.display_state)

        const word_length = anagram_result.new_info.turns.at(-1).word.length
        // const user_tile_delta = result_user_tiles_n - start_user_tiles_n
        const user_tile_delta_down = score_tiles(start_user_tiles, ai_capital) - score_tiles(result_user_tiles, ai_capital)
        const ai_tile_delta_up = score_tiles(result_ai_tiles, user_capital) - score_tiles(start_ai_tiles, user_capital)
        if (took_capital) {
          return 400 + user_tile_delta_down + (.01 * word_length)
        } else if (did_protect_ai_capital) {
          return 300 + user_tile_delta_down + (.01 * word_length)
        } else if (result_user_tiles_n < start_user_tiles_n) {
          return 200 + user_tile_delta_down + (.01 * word_length)
        } else if (!did_connect_board && result_ai_tiles_n > start_ai_tiles_n) {
          return 100 + ai_tile_delta_up + (.01 * word_length)
        } else if (!did_connect_board) {
          return word_length
        } else {
          return -100 + word_length
        }
      }
      const anagram_result = await compute_best_play(evaluator, word_length_limit)
      log({anagram_result})
      // const word = rand.sample(dict.anagrams[rand.sample(max_anagram_results.map(x=>x.anagram))])
      selection = rand.sample(anagram_result).tiles
    }break
    case 'beast':{
      const evaluator = (anagram_result: play_result) => {
        // log({anagram_result})
        const result_ai_tiles_n = lists.count(anagram_result.display_state.tiles, tile => tile.owner === owner_ai)
        const result_user_tiles = anagram_result.display_state.tiles.filter(tile => tile.owner === owner_user)
        const result_user_tiles_n = result_user_tiles.length
        const word_length = anagram_result.new_info.turns.at(-1).word.length
        const took_capital = !result_user_tiles.some(tile => tile.capital)
        const user_tile_delta = result_user_tiles_n - start_user_tiles_n
        if (took_capital) {
          return 300 + -user_tile_delta + (.01 * word_length)
        } else if (result_user_tiles_n < start_user_tiles_n) {
          return 200 + -user_tile_delta + (.01 * word_length)
        } else if (result_ai_tiles_n > start_ai_tiles_n) {
          return 100 + (result_ai_tiles_n - start_ai_tiles_n) + (.01 * word_length)
        } else {
          return word_length
        }
      }
      const anagram_result = await compute_best_play(evaluator)
      log({anagram_result})
      // const word = rand.sample(dict.anagrams[rand.sample(max_anagram_results.map(x=>x.anagram))])
      selection = rand.sample(anagram_result).tiles
    }break
    case 'speedy':{
      const evaluator = (anagram_result: play_result) => {
        const result_ai_tiles = anagram_result.display_state.tiles.filter(tile => tile.owner === owner_ai)
        const result_ai_tiles_n = result_ai_tiles.length
        const did_protect_ai_capital = unprotected_ai_capital && is_ai_capital_protected(anagram_result.display_state)

        const result_user_tiles = anagram_result.display_state.tiles.filter(tile => tile.owner === owner_user)
        const result_user_tiles_n = result_user_tiles.length
        const took_capital = !result_user_tiles.some(tile => tile.capital)

        const did_connect_board = disconnected_board && !is_board_disconnected(anagram_result.display_state)

        const word_length = anagram_result.new_info.turns.at(-1).word.length
        // const user_tile_delta = result_user_tiles_n - start_user_tiles_n
        // const ai_tile_delta = result_ai_tiles_n - start_ai_tiles_n
        const user_tile_delta_down = score_tiles(start_user_tiles, ai_capital) - score_tiles(result_user_tiles, ai_capital)
        const ai_tile_delta_up = score_tiles(result_ai_tiles, user_capital) - score_tiles(start_ai_tiles, user_capital)
        if (took_capital) {
          return 400 + user_tile_delta_down + (.01 * word_length)
        } else if (did_protect_ai_capital) {
          return 300 + user_tile_delta_down + (.01 * word_length)
        } else if (result_user_tiles_n < start_user_tiles_n) {
          return 200 + user_tile_delta_down + (.01 * word_length)
        } else if (!did_connect_board && result_ai_tiles_n > start_ai_tiles_n) {
          return 100 + ai_tile_delta_up + (.01 * word_length)
        } else if (!did_connect_board) {
          return word_length
        } else {
          return -100 + word_length
        }
      }
      const anagram_result = await compute_best_play(evaluator, undefined, store.get('capitals-ai-speedy-ms') || 3_000)
      log({anagram_result})
      // const word = rand.sample(dict.anagrams[rand.sample(max_anagram_results.map(x=>x.anagram))])
      selection = rand.sample(anagram_result).tiles
    }break
    default:{
      let max_anagram_is = [0]
      valid_anagrams.map((anagram, i) => {
        const diff = anagram.length - valid_anagrams[max_anagram_is[0]].length
        if (diff > 0) {
          max_anagram_is = [i]
        } else if (diff === 0) {
          max_anagram_is.push(i)
        }
      })
      
      const word = rand.sample(dict.anagrams[valid_anagrams[rand.sample(max_anagram_is)]])
      log({word})

      // TODO pick tiles better
      const picked_tile_set = set()
      selection = list(word,'').map((letter,i) => {
        const tile = display_state.tiles.find(tile => !picked_tile_set.has(tile.pos.st()) && tile.letter === letter)
        log({i,letter,tile})
        picked_tile_set.add(tile.pos.st())
        return tile
      })
    }break
  }

  return selection
}
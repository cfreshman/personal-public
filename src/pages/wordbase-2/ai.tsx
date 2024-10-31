import { consumer, supplier, truthy } from "src/lib/types";
import { Info, State, Tile, clone_state, construct_letter_to_tiles, construct_state, construct_tile_map, find_anagrams, play_turn, state_to_letters } from "./data";
import { dict } from "./dict";
import { store } from "src/lib/store";

const { named_log, keys, rand, set, list, lists, maths, defer, range } = window as any
const log = named_log('letterpress ai')

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
export const is_ai = (name) => !!Difficulty[name?.toUpperCase()]

export const get_selection = async (info:Info, raw_state:State, hf, f_progress?:consumer<string>, get_interrupted?:supplier<boolean>): Promise<Tile[]> => {
  await Promise.resolve() // turn async

  const unplayable_set = new Set(info.words.flatMap(word => range(word.length).map(i => word.slice(0, i + 1))))
  log({unplayable_set})
  
  const display_state = construct_state(raw_state)
  const valid_anagrams = find_anagrams(display_state, unplayable_set)
  log({valid_anagrams})

  const letter_to_tiles = construct_letter_to_tiles(display_state)
  log({letter_to_tiles})

  const owner_ai = [info.p0, info.p1].findIndex(is_ai)
  const ai = info[`p${owner_ai}`]
  log({owner_ai,ai})

  type play_result = { tiles:string, new_info:Info, new_state:State, display_state:State }
  const compute_best_play = async (evaluator, word_length_limit=1e6, timeout_ms=1e6): Promise<play_result[]> => {
    const filtered_anagrams = valid_anagrams.filter(anagram => anagram.length <= word_length_limit)
    const used_anagrams = filtered_anagrams.length ? filtered_anagrams : valid_anagrams

    const PARTIAL_RESULTS_COOKIE = 'letterpress-ai-partial-results'
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

  const word_length_limit_from_float = (x) => {
    const base = Math.floor(x)
    const extra = x % 1
    return base + (rand.f() < extra ? 1 : 0)
  }

  const find_win = (word_length_limit=undefined) => {
    const n_ai = display_state.tiles.filter(tile => tile.owner === owner_ai).length
    const n_user = display_state.tiles.filter(tile => tile.owner === owner_user).length
    const n_total = display_state.tiles.length
    const n_remaining = n_total - (n_ai + n_user)
    if (n_remaining <= 2) {
      const is_win = (anagram) => {
        const picked_tile_set = set()
        let curr_n_ai = n_ai
        let curr_n_user = n_user
        for (let i = 0; i < anagram.length; i++) {
          let tile = letter_to_tiles[anagram[i]].find(tile => !picked_tile_set.has(tile.pos.st()) && tile.owner === owner_user && !tile.locked)
          if (tile) {
            curr_n_user -= 1
            curr_n_ai += 1
          } else {
            tile = letter_to_tiles[anagram[i]].find(tile => !picked_tile_set.has(tile.pos.st()) && tile.owner !== owner_ai && !tile.locked)
            if (tile) {
              curr_n_ai += 1
            }
          }

          if (tile) picked_tile_set.add(tile.pos.st())
        }
        // log(anagram, curr_n_ai, curr_n_user, curr_n_ai > curr_n_user && curr_n_ai + curr_n_user === n_total)
        return curr_n_ai > curr_n_user && curr_n_ai + curr_n_user === n_total
      }
      const winning_anagrams = valid_anagrams.filter(x => !word_length_limit || x.length <= word_length_limit).filter(is_win)
      log({winning_anagrams})
      if (winning_anagrams.length) {
        return rand.sample(dict.anagrams[rand.sample(winning_anagrams)].filter(word => !unplayable_set.has(word)))
      }
    }
    return undefined
  }

  let selection
  const simple_ai = async (word_length_limit_float) => {
    const word_length_limit = word_length_limit_from_float(word_length_limit_float)
    log('simple ai agent', word_length_limit, word_length_limit_float)
    const evaluator = (anagram_result: play_result) => {
      const result_ai_tiles = anagram_result.display_state.tiles.filter(tile => tile.owner === owner_ai)
      const word_length = anagram_result.new_info.turns.at(-1).word.length
      return 1e2 * result_ai_tiles.length + word_length
    }
    const anagram_result = await compute_best_play(evaluator, word_length_limit)
    log({anagram_result})
    selection = rand.sample(anagram_result).tiles
  }
  const strategic_ai = async (word_length_limit_float=undefined, ms=undefined) => {
    const word_length_limit = word_length_limit_float && word_length_limit_from_float(word_length_limit_float)
    log('strategic ai agent', word_length_limit, word_length_limit_float, ms)
    
    // first detect any automatic wins
    let winning_word
    const n_ai = display_state.tiles.filter(tile => tile.owner === owner_ai).length
    const n_user = display_state.tiles.filter(tile => tile.owner === owner_user).length
    const n_total = display_state.tiles.length
    const n_remaining = n_total - (n_ai + n_user)
    if (n_remaining <= 2) {
      winning_word = find_win(word_length_limit)
    }
    if (winning_word) {
      const picked_tile_set = set()
      selection = list(winning_word,'').map((letter,i) => {
        const tile = 
          letter_to_tiles[letter].find(tile => !picked_tile_set.has(tile.pos.st()) && tile.owner === owner_user && !tile.locked)
          || letter_to_tiles[letter].find(tile => !picked_tile_set.has(tile.pos.st()) && tile.owner !== owner_ai && !tile.locked)
          || letter_to_tiles[letter].find(tile => !picked_tile_set.has(tile.pos.st()))
        picked_tile_set.add(tile.pos.st())
        return tile
      })
    } else {
      const evaluator = ({new_info,display_state}: play_result) => {
        const result_ai_tiles = display_state.tiles.filter(tile => tile.owner === owner_ai)
        const result_ai_locked_tiles = result_ai_tiles.filter(tile => tile.locked)
        const result_user_tiles = display_state.tiles.filter(tile => tile.owner === owner_user)
        
        const is_gameover = result_ai_tiles.length + result_user_tiles.length === display_state.tiles.length
        const is_winning = result_ai_tiles.length > result_user_tiles.length
        const gameover_bonus = is_gameover ? is_winning ? 1e6 : -1e6 : 0
        const word_length = new_info.turns.at(-1).word.length
        return gameover_bonus + 1e4 * result_ai_locked_tiles.length + 1e2 * result_ai_tiles.length + word_length
      }
      const anagram_result = await compute_best_play(evaluator, word_length_limit, ms)
      log({anagram_result})
      selection = rand.sample(anagram_result).tiles
    }
  }
  switch (ai) {
    case 'easy':{
      await simple_ai(4.25)
    }break
    case 'medium':{
      await simple_ai(5.5)
    }break
    case 'strategist':{
      await strategic_ai(5.5)
    }break
    case 'beast':{
      // TOO SLOW
      // const evaluator = (anagram_result: play_result) => {
      //   const result_user_tiles = anagram_result.display_state.tiles.filter(tile => tile.owner !== owner_ai)
      //   const word_length = anagram_result.new_info.turns.at(-1).word.length
      //   return 1e2 * -result_user_tiles.length + word_length
      // }
      // const anagram_result = await compute_best_play(evaluator)
      // log({anagram_result})
      // selection = rand.sample(anagram_result).tiles

      const score_anagram = (anagram) => {
        let n_taken = 0
        let n_gained = 0
        const played_tile_set = set()
        for (let i = 0; i < anagram.length; i++) {
          const taken_tile = letter_to_tiles[anagram[i]].find(tile => !played_tile_set.has(tile.pos.st()) && tile.owner === owner_user && !tile.locked)
          if (taken_tile) {
            n_taken += 1
            played_tile_set.add(taken_tile.pos.st())
          } else {
            const gained_tile = letter_to_tiles[anagram[i]].find(tile => !played_tile_set.has(tile.pos.st()) && tile.owner !== owner_ai && !tile.locked)
            if (gained_tile) {
              n_gained += 1
              played_tile_set.add(gained_tile.pos.st())
            }
          }
        }
        return 1e4 * n_taken + 1e2 * n_gained + anagram.length
      }
      
      const max_anagrams = lists.maxxing_list(valid_anagrams, score_anagram)
      const word = rand.sample(dict.anagrams[rand.sample(max_anagrams)].filter(word => !unplayable_set.has(word)))
      
      const picked_tile_set = set()
      selection = list(word,'').map((letter,i) => {
        const tile = 
          letter_to_tiles[letter].find(tile => !picked_tile_set.has(tile.pos.st()) && tile.owner !== owner_ai && !tile.locked)
          || letter_to_tiles[letter].find(tile => !picked_tile_set.has(tile.pos.st()))
        picked_tile_set.add(tile.pos.st())
        return tile
      })
    }break
    case 'speedy':{
      await strategic_ai(undefined, store.get('letterpress-ai-speedy-ms') || 3_000)
    }break
    default:{ // wordsmith
      let word = find_win()
      if (!word) {
        const count_new_tiles = (anagram) => {
          const won_tile_set = set()
          for (let i = 0; i < anagram.length; i++) {
            // log('letter', anagram[i])
            const won_tile = letter_to_tiles[anagram[i]].find(tile => !won_tile_set.has(tile.pos.st()) && tile.owner !== owner_ai && !tile.locked)
            // letter_to_tiles[anagram[i]].map(tile => log(!won_tile_set.has(tile.pos.st()), tile.owner !== owner_ai, !tile.locked))
            if (won_tile) {
              won_tile_set.add(won_tile.pos.st())
            }
          }
          // log(won_tile_set)
          return 1e2 * won_tile_set.size + anagram.length
        }
        
        const max_anagrams = lists.maxxing_list(valid_anagrams, count_new_tiles)
        log({max_anagrams})
        word = rand.sample(dict.anagrams[rand.sample(max_anagrams)].filter(word => !unplayable_set.has(word)))
        log({word}, count_new_tiles(word))
      }

      const picked_tile_set = set()
      selection = list(word,'').map((letter,i) => {
        const shuffled_order = rand.shuffle(letter_to_tiles[letter])
        const tile = 
        shuffled_order.find(tile => !picked_tile_set.has(tile.pos.st()) && tile.owner !== owner_ai && !tile.locked)
          || shuffled_order.find(tile => !picked_tile_set.has(tile.pos.st()))
        picked_tile_set.add(tile.pos.st())
        return tile
      })
    }break
  }

  return selection
}
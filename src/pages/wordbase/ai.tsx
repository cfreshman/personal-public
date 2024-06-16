import { merge, range } from "src/lib/util";
import { wordles } from "../wordle/dict";
import { Board, ITile, Tile } from "./board";
import { dict, getDict } from "./dict";
import { pass } from "src/lib/types";


const trie = {
  instance: undefined,
  new: () => ({
    letter: '',
    end: false,
    next: undefined,
    of: (object_or_letter: {
      letter:string,
      end:boolean,
    } | string, end:boolean=false) => (typeof object_or_letter === 'object') ? object_or_letter : { letter:object_or_letter, end },
    add: (word: string, node=this) => (f=>(f=(x, word: string) => {
      x.letter = word[0]
      ;(word.length > 1)
      ? x.next = f(x, word.substring(1))
      : x.end = true
      return x
    })(node, word))()
  })
}
// dict.add(x => trie.instance = (trie => x.words.map(trie.add))(trie.new()))


const _grid_search = (offsets) => {
  const fn = (pos, field, tr) => ((y=[]) => { tr && y.push(...[
    tr.end && field[pos[1]][pos[0]] === tr.letter && tr,
    ...(
      tr.next && offsets?.map(o => fn([pos[0]+o[0], pos[1]+o[1]], field, tr.next))
    ),
  ].filter(pass)) ;return y})()
  return fn
}

const [SQ, ADJ] = [4, 8].map(n => range(n).map((x, _, ar) => [Math.cos(x * 2*Math.PI/ar.length), Math.sin(x * 2*Math.PI/ar.length)].map(Math.round)))
const grid_search = {
  square: _grid_search(SQ),
  adjacent: _grid_search(ADJ),
}


export class AI {
  difficulty: number

  constructor(difficulty: number) {
    this.difficulty = difficulty
  }

  plays(board: Board, owner: number, history: ITile[][]): ITile[][] {
    const starts = board.tiles().filter(tile => tile.owner === owner)

    // console.debug(history.map(h => h.map(t => t.letter).join('')))
    const possible = this.difficulty === 4 ? wordles : Array.from(getDict())
    console.log('WORDBASE AI PLAYS', owner, possible.length)
    return starts
    .map(start => this._search([start], board, possible))
    // .map(start => grid_search.square(start, board.board, trie.instance))
    .flat()
    .filter(word => !history.some(played => played.length === word.length && played.every((t, i) => Tile.eq(t, word[i]))))
    .sort((a, b) => {
      if (owner === 0) {
        const aMin = Math.min(...a.map(tile => tile.row))
        const bMin = Math.min(...b.map(tile => tile.row))
        return (aMin - bMin) || (b.length - a.length)
      } else {
        const aMax = Math.max(...a.map(tile => tile.row))
        const bMax = Math.max(...b.map(tile => tile.row))
        return (bMax - aMax) || (b.length - a.length)
      }
    })
  }
  play(board: Board, owner: number, history: ITile[][]): ITile[] {
    const plays = this.plays(board, owner, history)
    console.log('WORDBASE AI RESULTS', plays[0], plays.map(tiles => tiles.map(tile => tile.letter).join('')))
    return plays[0];
  }

  _search(tiles: ITile[], board: Board, possible?: string[]): ITile[][] {
    if (tiles.length > [0, 4, 6, 100, 100][this.difficulty]) return []

    const prefix = tiles.map(tile => tile.letter).join('')
    const currPossible = possible.filter(word => word.startsWith(prefix))

    // console.log(prefix, currPossible.length)

    let matches;
    if (currPossible.length) {
      matches = board.adj(tiles[tiles.length - 1])
        .filter(tile => !tiles.includes(tile))
        .map(tile => this._search([...tiles, tile], board, currPossible))
        .flat()

      // add current tiles if is valid word
      const isMatch = currPossible.some(word => word === prefix)
      if (isMatch) {
        matches.push(tiles)
      }
    } else {
      matches = []
    }

    return matches
  }
}
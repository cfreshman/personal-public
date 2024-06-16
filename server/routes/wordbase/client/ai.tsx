import { Board, ITile, Tile } from "./board";
import { getDict } from "./dict";

export class AI {
  difficulty: number

  constructor(difficulty: number) {
    this.difficulty = difficulty
  }

  plays(board: Board, owner: number, history: ITile[][]): ITile[][] {
    const starts = board.tiles().filter(tile => tile.owner === owner)

    // console.debug(history.map(h => h.map(t => t.letter).join('')))

    const possible = this.difficulty === 4 ? wordles : Array.from(getDict())
    return starts
    .map(start => this._search([start], board, possible))
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

    // console.log(owner)
    // console.log(plays.map(tiles => tiles.map(tile => tile.letter).join('')))
    // const best = plays[0]
    // if (owner === 0) {
    //   const bestMin = Math.min(...best.map(tile => tile.row))
    //   console.log('min', bestMin, best.length)
    // } else {
    //   const bestMax = Math.max(...best.map(tile => tile.row))
    //   console.log('max', bestMax, best.length)
    // }

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
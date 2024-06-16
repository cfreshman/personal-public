import { IPos, Pos, Player, ITile, Tile, Board, GameSettings } from './board';
import { globals } from './common';
import { dict } from './dict';

export class Save {
    board?: Board;
    turn: number;
    history: ITile[][];
    player: Player;
    opponent: Player;
    p1: boolean;
    p2: boolean;
    pN: string;
    oN: string;
    _play?: boolean;

    settings?: GameSettings;
    replay?: {
        bombs: ITile[],
        blanks: ITile[],
    };

    constructor(
        board: Board, turn: number, history: ITile[][],
        settings: GameSettings=GameSettings.Normal(), replay?) {

        this.board = board;
        this.settings = settings;
        this.turn = turn;
        this.history = history;
        this.replay = replay;
        this.player = this.turn % 2;
        this.opponent = 1 - this.player;
        this.p1 = this.player === Player.p1;
        this.p2 = this.player === Player.p2;
        this.pN = this.p1 ? 'p1' : 'p2';
        this.oN = this.p1 ? 'p2' : 'p1';
    }
    static new(settings?: GameSettings) {
        const board = Board.new(settings)
        const replay = {
            bombs: board.tiles().filter(t => t.isBomb),
            blanks: board.tiles().filter(t => !t.letter),
        }
        console.debug('NEW SAVE', replay)
        return new Save(board, 0, [], settings, Object.clone(replay))
    }
    static blank(info?: Info) {
        return new Save(Board.empty(), info?.turn ?? -1, [])
    }
    static empty(info?: Info) {
        return new Save(undefined, info?.turn ?? -1, [])
    }

    copy() {
        return new Save(
            this.board, this.turn, this.history, this.settings, this.replay)
    }
    deep() {
        return new Save(
            this.board?.deep(), this.turn, this.history.slice(), Object.clone(this.settings), Object.clone(this.replay));
    }
    get = (pos_or_row: (IPos | number), col?: number): ITile => this.board.get(pos_or_row, col);

    play(word: IPos[]): Save {
        const { player, opponent } = this;
        const deep = this.board.deep();

        // // confirm selected blank tiles
        // word.map(pos => {
        //     const tile = deep.get(pos)
        //     if (tile.blankLetter) {
        //         tile.letter = tile.blankLetter
        //     }
        // })
        // // clear blankLetters
        // deep.tiles().map(t => delete t.blankLetter)

        const tiles = word.map(pos => {
            const tile = Tile.new(deep.get(pos))
            if (tile.blankLetter) tile.letter = tile.blankLetter
            return tile
        });
        const msDelay = 250;
        let currMs = -msDelay;

        deep.do(t => {
            t.swap = undefined;
            t.shocks = undefined;
        });
        const oppoOrder = deep.bfs(opponent);

        const flip = (t, {
            prev, next,
        }: {
            prev?: IPos, next?: IPos,
        }, player, ms, bombFlips?) => {
            if (!t.swap) {
                let degrees
                if (prev || next) {
                    const [a, b] = prev ? next ? [prev, next] : [prev, t] : [t, next]
                    degrees = Math.round(
                        Math.atan2(b.row - a.row, b.col - a.col)
                        * 180/Math.PI
                        + 360) % 360
                } else {
                    const tileBase = player === Player.none ? t.owner : player
                    degrees = tileBase === Player.p1 ? 270 : 90
                }

                t.swap = { ms, from: Tile.new(t), new: true, degrees };
            }

            t.owner = player;
            if (t.isBomb) {
                const toFlip =
                    t.isBomb === 2
                    ? deep.adj(t)
                    : deep.square(t)
                t.isBomb = false;
                bombFlips && bombFlips.push([t, toFlip]);
            }
            if (t.blankLetter) {
                t.letter = t.blankLetter
                delete t.blankLetter
            }
        }

        const bombFlips: [ITile, ITile[]][] = [];
        tiles.forEach((t, i) => {
            const fromStart = i
            const fromEnd = tiles.length - 1 - i
            const fromStartOrEnd = Math.min(fromStart, fromEnd)
            const animScale = .9 // (.9 - Math.min(4, Math.sqrt(fromStartOrEnd)) * .1)
            // const fromStartOrEnd = Math.min(fromStart, 2, fromEnd)
            // currMs += msDelay * (1 - i/(tiles.length - 1) * .2);
            // currMs += msDelay * (1 - Math.max(0, fromStartOrEnd - 1) * .2);
            currMs += msDelay * animScale;
            flip(deep.get(t), {
                prev: tiles[i-1],
                next: tiles[i+1],
            }, player, currMs, bombFlips);
        });

        let bomb_i = 0
        currMs += 2 * msDelay
        if (bombFlips.length) currMs += globals.flipMs
        // let prevBomb
        while (bombFlips.length) {
            bomb_i++
            const [bomb, flips] = bombFlips.shift()
            // currMs += msDelay
            // if (prevBomb) {
            //     currMs += Pos.dist(bomb, prevBomb) * 90 + globals.shockMs + 2 * msDelay
            // }
            flips.forEach(t => flip(t, {}, player, currMs, bombFlips))
            let max = 0
            // console.log('IS SUPER', isSuper, bomb.isBomb, bomb)
            // const adj = isSuper ? deep.adj(bomb) : deep.square(bomb)
            deep.tiles().forEach(t => {
                let type = 'shock'
                let shockMs
                if (Tile.has(flips, t)) {
                    const degrees = Math.round(
                        Math.atan2(t.row - bomb.row, t.col - bomb.col)
                        * 180/Math.PI
                        + 360) % 360
                    type += ` shock-${degrees}`
                    shockMs = 0
                } else {
                    shockMs = Pos.dist(bomb, t) * 95
                }
                t.shocks = (t.shocks || []).concat([[type, Math.round(currMs + shockMs)]])
                if (shockMs > max) max = shockMs
            })
            // if (bombFlips.length)
            // currMs += max + globals.flipMs
            currMs += globals.flipMs * 2.5
            // prevBomb = bomb
        }

        const oppoSafe = deep.bfs(opponent);
        oppoOrder
            .filter(t => t.owner === opponent && !Tile.has(oppoSafe, t))
            .forEach((t, i, arr) => {
                currMs += msDelay/2
                flip(t, {
                    prev: arr[i-1],
                    next: arr[i+1],
                }, Player.none, currMs)
            })

        // let frontier = oppoFlip.filter(t =>
        //     deep.adj(t).some(u => u.swap && u.swap.from.owner === t.owner))
        // currMs += msDelay
        // while (frontier.length > 0) {
        //     currMs += msDelay
        //     frontier.forEach(t => {
        //         flip(t, Player.none, currMs)
        //         remove(oppoFlip, t)
        //     })
        //     frontier = frontier
        //         .map(t => deep.adj(t).filter(t =>
        //             t.owner === opponent && !t.swap))
        //         .flat()
        // }
        // currMs += 2 * msDelay
        // currMs += 2 * msDelay;
        // opooFlip.forEach(t => flip(t, Player.none, currMs))

        const max = deep.tiles().filter(t => t.swap).reduce((max, tile) => {
            if (!max || tile.swap.ms > max.swap.ms) {
                max = tile
            }
            return max
        }, undefined)
        if (max) max.swap.isLast = true

        return new Save(deep, this.turn + 1, [tiles].concat(this.history), this.settings, this.replay);
    }
    skip(): Save {
        const deep = this.board.deep();
        deep.do(t => {
            delete t.swap
            delete t.shocks
        });
        return new Save(deep, this.turn + 1, [[]].concat(this.history), this.settings, this.replay);
    }

    serialize(): string {
        return JSON.stringify({
            board: this.board?.board,
            turn: this.turn,
            history: this.history,
            settings: this.settings,
            replay: this.replay,
        });
    }
    static deserialize(blob: string): Save {
        if (!blob) return undefined
        const save = JSON.parse(blob);
        return new Save(
            new Board(save.board), save.turn, save.history, save.settings, save.replay);
    }

    static eq(a: Save, b: Save): boolean {
        return a === b || (a && b && a.turn === b.turn && a.replay === b.replay
            && JSON.stringify(a.history) === JSON.stringify(b.history)
            && Board.eq(a.board, b.board))
    }
}

export class Info {
    id: string;
    p1: string;
    p2: string;
    status: Player;
    progress: number[];
    turn: number;
    lastWord?: string;
    lastUpdate?: number;
    rematch?: string;
    chat?: string;
    tries?: number;
    ai?: number
    replayable?: boolean
    unseen?: boolean | string | string[]
    previous?: string
    // play?: boolean
    lang?: string
    public?: boolean
    confirm?: Info.Confirm[]

    settings?: GameSettings
    timePerPlayer?: [number, number]
    seen?: number
    animationMs?: number

    constructor({
        id = 'local',
        p1 = 'blue', p2 = 'orange', ai,
        status = Player.none, progress = [0, 100], turn = 0, lastUpdate = Date.now(),
        replayable = true, lang = dict.lang, settings = GameSettings.Normal(), timePerPlayer,
        ...rest
    }: {
        id?: string,
        p1?: string, p2?: string, ai?: number | false,
        status?: Player, progress?: number[],
        turn?: number, replayable?: boolean,
        lang?: string, settings?: GameSettings,
        lastUpdate?: number, timePerPlayer?: [number, number]
        rest?
    }={}) {
        if (ai) {
            p1 = 'human'
            p2 = ['', 'easy', 'medium', 'hard'][ai]
        }
        if (!timePerPlayer && settings?.options?.timePerPlayer) {
            timePerPlayer = [settings.options.timePerPlayer, settings.options.timePerPlayer]
        }
        Object.assign(this, {
            id, p1, p2, ai, status, progress, turn, lastUpdate,
            replayable, lang, settings, timePerPlayer,
            ...rest
        });
    }
    static local(difficulty=0, settings?: GameSettings) {
        return new Info({ ai: difficulty || false, settings })
    }
    static empty = (id='empty') => new Info({ id, turn: -1 })
    static of(info: Info) {
        return new Info({
            ...info,
            replayable: info.replayable ?? false,
        });
    }
    static play(info: Info, save: Save): Info {
        const { timeout, timePerPlayer } = Info.getRemainingTime(info)
        if (timeout) return Info.timeout(info, timePerPlayer)

        if (save.history.length && save.history[0].length === 0) {
            return Info.skip(info, save)
        }

        const animationMs = save?.board?.tiles().filter(t => t.swap || t.shocks).reduce((max, tile) => {
            return Math.max(
                max,
                tile.swap ? tile.swap.ms + globals.flipMs : 0,
                ...(tile.shocks || []).map(shock => shock[1] + globals.shockMs),
            )
        }, 0) || 0

        return Info.of({ ...info,
            tries: 0,
            status: save.board.status(info.settings),
            progress: save.board.progress(),
            turn: save.turn,
            lastUpdate: Date.now(),
            lastWord: save.history.length
                ? save.history[0].map(t => t.letter).join('')
                : undefined,
            timePerPlayer,
            animationMs,
            unseen: true,
            // play: true,
        });
    }
    static skip(info: Info, save: Save): Info {
        return Info.of({ ...info,
            tries: 0,
            turn: save.turn,
            lastWord: '.skip',
        });
    }
    static confirm(info: Info, type: Info.ConfirmType, value?: any): Info {
        const turn = info.turn + 1
        return Info.of({ ...info,
            confirm: [{ turn, type, value } as Info.Confirm].concat(info.confirm ?? []),
            turn,
            lastWord: '.confirm',
        });
    }
    static timeout(info: Info, timePerPlayer: [number, number]): Info {
        // timeout conditions:
        // timePerMove
        // - end at lastUpdate + animationTime + timePerMove
        // - server will also end at this time
        // timePerPlayer
        // - end at timeViewed + animationTime + remaining timePerPlayer
        // - server will also end at this time, but tracks timeViewed from when state was fetched
        // both run server at + 1s for connection issues

        return Info.of({ ...info,
            status: info.turn % 2 ? Player.p1 : Player.p2,
            turn: info.turn + 1,
            lastWord: '.timeout',
            timePerPlayer,
            unseen: info[info.turn % 2 ? 'p1' : 'p2'],
        })
    }
    static getRemainingTime(info: Info): {
        timeout: boolean,
        remainingTime: number,
        timeForMove: number,
        timePerPlayer: [number, number],
    } {
        const timePerPlayer = Object.clone(info.timePerPlayer)
        const timeForMove = Math.min(
            info.settings?.options?.timePerMove || 1e9,
            timePerPlayer ? timePerPlayer[info.turn % 2] : info.settings?.options?.timePerPlayer || 1e9)

        const timeStart = (info.turn < 2 ? info.seen || Date.now() : info.lastUpdate)
            + (info.animationMs || 0)
            + globals.delayMs*2 /* animation time buffer */

        const untimed = info.unseen && info.turn < 2
        const timeSinceLast = untimed ? 0 : (Date.now() - timeStart) / 1000
        const remainingTime = timeForMove - timeSinceLast
        if (timePerPlayer) {
            timePerPlayer[info.turn % 2] = Math.max(0, timePerPlayer[info.turn % 2] - Math.max(0, timeSinceLast))
        }

        // console.debug(info.id, timePerPlayer, timeForMove, timeStart, timeSinceLast, remainingTime)

        const responsibleForTimeout = false // auth.user === info[info.turn % 2 ? 'p2' : 'p1'] || info.id === 'local'
        const timeout = (responsibleForTimeout && remainingTime < 0) || remainingTime < -60 // end game after 60s
        return { timeout, remainingTime, timeForMove, timePerPlayer }
    }
    static replay(info: Info, save: Save, turn?: boolean | number): { replayInfo: Info, replaySave: Save } {
        const history = save.history.slice()
        const bombs = save.replay?.bombs || history.flatMap(word => word.filter(t => t.isBomb))
        const blanks = save.replay?.blanks || history.flatMap(word => word.filter(t => t.blankLetter))
        // const settingsWithoutClock = Object.clone(info.settings)
        // delete settingsWithoutClock.options.timePerMove
        // delete settingsWithoutClock.options.timePerPlayer

        let replaySave: Save = Object.assign(save.deep(), {
            turn: 0,
            history: [],
            player: Player.p1,
            opponent: Player.p2,
        })
        const { progress } = Info.empty()
        let replayInfo: Info = Object.assign({}, Object.clone(info), {
            turn: 0,
            status: Player.none,
            progress,
            lastWord: undefined,
            play: true,
        })
        const board = replaySave.board
        for (let row = 0; row < Board.ROWS; row++) {
          for (let col = 0; col < Board.COLS; col++) {
            const tile = board.get(row, col)
            tile.owner = (row == 0)
              ? Player.p2
              : (row < Board.ROWS-1) ? Player.none : Player.p1
            delete tile.swap
            delete tile.shocks
          }
        }
        bombs.map(t => board.get(t).isBomb = t.isBomb)
        blanks.map(t => board.get(t).letter = '')
        if (typeof(turn) === 'number' && turn > 0) {
            history.slice().reverse().slice(0, turn).map(word => {
                word.map(tile => replaySave.get(tile).blankLetter = tile.letter) // set blanks
                replaySave = replaySave.play(word)
                replayInfo = Info.play(replayInfo, replaySave)
            })
        }
        delete replayInfo.timePerPlayer
        delete replayInfo.settings?.options.timePerPlayer
        delete replayInfo.settings?.options.timePerMove
        return { replayInfo, replaySave }
    }
}

export namespace Info {
    export enum ConfirmType {
        DRAW = 'draw',
        CONTEST = 'contest',
        REJECT = 'reject',
        ACCEPT = 'accept',
    }

    export interface Confirm {
        turn: number,
        type: Info.ConfirmType,
        value?: any,
    }
}
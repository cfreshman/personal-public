import { store } from '../../lib/store';
import { range, sample, dist, array, randi, keyOf, set } from '../../lib/util';
import { AI } from './ai';
import { randAlpha } from './dict';

let demo, demoBombs
// demo = [
//     'cstyuesbwm',
//     'hoeclodloh',
//     'aupbiarmiu',
//     'nranthocet',
//     'sicrflwyha',
//     'etaphienlr',
//     'csuvnrkuoe',
//     'ndcgdnetri',
//     'omligsavsz',
//     'syadnticha',
//     'anrgceivte',
//     'brunraglpo',
//     'kndektmars',
// ]
// demoBombs = [[6, 1], [5, 6]]
// demoBombs = [[6, 1], [6, 2]]
// demo = [
//     'fueeddsopo',
//     'drctiiudpt',
//     'onioikdpgr',
//     'ystdcpeapn',
//     'otnsclodrp',
//     'roweklinnm',
//     'dplvrersor',
//     'eelzomoeso',
//     'urwfbiridp',
//     'yaukledoee',
//     'netpearenn',
//     'sdtuedecev',
//     'rdtifsrgei',
// ]
// demoBombs = [[2, 7], [3, 2], [9, 8]]

export enum Player { none = -1, p1 = 0, p2 = 1, draw = 2 }

export interface IPos {
    row: number,
    col: number,
}
export class Pos implements IPos {
    row: number; col: number;

    constructor(row: number, col: number) { Object.assign(this, {row, col}); }
    static new = (props: IPos): Pos => new Pos(props.row, props.col)
    static from = (coord: number[]): Pos => new Pos(coord[1], coord[0]);
    static eq = (a: IPos, b: IPos) => (a && b && a.row === b.row && a.col === b.col);
    static add = (a: IPos, b: IPos) => new Pos(a.row + b.row, a.col + b.col);
    static manhat = (a: IPos, b: IPos) => Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
    static dist = (a: IPos, b: IPos) =>
        Math.sqrt(Math.pow(a.row - b.row, 2) + Math.pow(a.col - b.col, 2));
    static diff = (a: IPos, b: IPos) => new Pos(a.row - b.row, a.col - b.col);
    static toArray = (a: IPos) => [a.col, a.row]
    static angle = (a: IPos) => (Math.round(Math.atan2(a.row, a.col) * 180 / Math.PI) + 360) % 360
    static hash = (a: IPos) => Pos.toArray(a).join()
    
    static adj = (a: IPos) => {
        const list = []
        for (let i = -1; i < 2; i++) {
            for (let j = -1; j < 2; j++) {
                if (i === 0 && j === 0) continue
                list.push(Pos.add(a, Pos.from([i, j])))
            }
        }
        return list
    }
    static square = (a: IPos) => Dirs.LIST.map(x => Pos.add(a, x))
}
export class Dirs {
    static UP: Pos = Pos.from([0, -1]);
    static DOWN: Pos = Pos.from([0, 1]);
    static LEFT: Pos = Pos.from([-1, 0]);
    static RIGHT: Pos = Pos.from([1, 0]);
    static LIST: Pos[] = [Dirs.UP, Dirs.RIGHT, Dirs.DOWN, Dirs.LEFT];
    static map = (func: (dir: IPos) => any) => Dirs.LIST.map(func);
}

export interface Swap {
    from: ITile,
    ms: number,
    new: boolean,
    isLast?: boolean,
    degrees?: number
}
export interface ITile extends IPos {
    letter: string,
    owner: number,
    isBomb: boolean | number,
    swap?: Swap,
    shocks?: [string, number, IPos][],
    blankLetter?: string,
}
export class Tile extends Pos implements ITile {
    letter: string; owner: number; isBomb: boolean | number; swap?: Swap;

    constructor(row: number, col: number, letter: string, owner: number, isBomb: boolean) {
        super(row, col);
        Object.assign(this, { letter, owner, isBomb });
    }
    static new = (props: ITile) => Object.assign({}, props);

    static has = (arr: any[], tile: ITile): boolean =>
        arr.some(t => Tile.eq(t, tile));

    static isAdj = (p1?: IPos, p2?: IPos): boolean =>
        p1 && p2 && dist(p1.row, p1.col, p2.row, p2.col) < 2;

    static hash = (tile: ITile) => `${tile.row},${tile.col},${tile.letter}`
}

export class GameSettings {
    mode: GameSettings.Mode
    options: GameSettings.Options

    constructor({
        mode=GameSettings.Mode.NORMAL,
        options={},
    }: {
        mode?: GameSettings.Mode,
        options?: GameSettings.Options
    }={}) {

        this.mode = mode

        options = Object.assign({}, GameSettings.ModeOptions[mode], options)
        if (!options.winConditions?.length) {
            options.winConditions = [GameSettings.WinConditions.NORMAL]
        }
        this.options = options
    }

    static Normal(options: GameSettings.CommonOptions & {
        bombMultiplier?, superbombs?
    }={}) {
        return new GameSettings({ options })
    }

    static Minefield(options: GameSettings.CommonOptions & {
        pattern?
    }={}) {
        return new GameSettings({
            mode: GameSettings.Mode.MINEFIELD,
            options: {
                ...options,
                pattern:
                    options.pattern
                    || sample(Object.keys(GameSettings.MinefieldPatterns))
            }
        })
    }

    // nvm, added to Object/String prototypes (we love prototype pollution)
    // static clone = settings => GameSettings.deserialize(GameSettings.serialize(settings))
    // static serialize = settings => JSON.stringify(settings)
    // static deserialize = (x: string | any) => new GameSettings(
    //     typeof(x) === 'string'
    //     ? JSON.parse(x)
    //     : x)
}

export namespace GameSettings {
    export enum Mode {
        NORMAL = 'normal',
        MINEFIELD = 'minefield',
    }
    export type CommonOptions = {
        winConditions?: GameSettings.WinConditions[]
        repeatWithDifferentTiles?: boolean,
        timePerMove?: number,
        timePerPlayer?: number,
        tries?: number,
        blanks?: number,
        theme?: string,
    }
    export type Options = GameSettings.CommonOptions & {
        bombMultiplier?: number
        superbombs?: boolean
        symmetric?: boolean
        pattern?: string,
    }
    export const EditableOptions = set('theme')

    export const ValueToSetting = keyOf
    export enum WinConditions {
        NORMAL = 'reach opposite side',
        COLUMN = 'fill entire column',
    }
    export const TryLimit = {
        'challenge': 0,
        '1': 1,
        '2': 2,
        '3': 3,
        '5': 5,
        '10': 10,
        'off': -1,
    }
    // export const BombTiles = {
    //     'off': [0, false],
    //     'on': [1, false],
    //     'x3': [3, false],
    //     'super bombs': [1, true],
    //     'x3 + superbombs': [3, true],
    // }
    export const BombMultiplier = {
        'off': 0,
        'on': 1,
        'x3': 3,
        'x5': 5,
    }
    export const BlankTiles = {
        'off': 0,
        'on': 2,
        'x3': 6,
        'x5': 10,
    }
    export const TimePerMove = { // measured in seconds
        'none': 0,
        '15 seconds': 15,
        '1 minute': 60,
        '10 minutes': 10 * 60,
        '28 hours': 24 * 60 * 60,
        '1 week': 7 * 24 * 60 * 60,
    }
    export const TimePerGame = { // halved (actually counting time per player), measured in seconds
        'none': 0,
        '4 minutes': 2 * 60,
        '10 minutes': 5 * 60,
        '20 minutes': 10 * 60,
        '2 hours': 60 * 60,
        '1 day': 12 * 60 * 60,
        '1 week': 3.5 * 24 * 60 * 60,
    }
    const TimePerMoveValues = Object.values(TimePerMove)
    const TimePerGameValues = Object.values(TimePerGame)
    export const TimePresets = {
        'none': [TimePerMove.none, TimePerGame.none],
        'BULLET 15s/4m': [TimePerMoveValues[1], TimePerGameValues[1]],
        'BLITZ 1m/20m': [TimePerMoveValues[2], TimePerGameValues[2]],
        'RAPID 10m/2h': [TimePerMoveValues[3], TimePerGameValues[3]],
        'daily': [TimePerMoveValues[4], TimePerGame.none],
        'weekly': [TimePerMoveValues[5], TimePerGame.none],
        '1 week total': [TimePerMove.none, TimePerGameValues[5]],
        // 'custom': true,
    }
    export const randomMinefieldPlaceholder =
    `..........
    ...1111...
    ..11..11..
    ..1....1..
    .......1..
    ......11..
    .....11...
    ....1.....
    ..........
    ....1.....
    ..........`
    export const MinefieldPatterns = {
        random: 'random',

        X:
        `..........
        ..1....1..
        .1......1.
        ...1..1...
        ..........
        ....22....
        ..........
        ...1..1...
        .1......1.
        ..1....1..
        ..........`,

        CENTERLINE:
        `..........
        ..........
        ..........
        ..........
        ..........
        1.2.11.2.1
        ..........
        ..........
        ..........
        ..........
        ..........`,

        JACKPOT:
        `..........
        ..........
        ..........
        ..........
        ....11....
        ....11....
        ..........
        ..........
        ..........
        ..........
        ..........`,

        BUTTERFLY:
        `..........
        .1.1..1.1.
        ..........
        .1.1..1.1.
        ..........
        ...2..2...
        ..........
        .1.1..1.1.
        ..........
        .1.1..1.1.
        ..........`,

        CHECKER:
        `1.1.1.1.1.
        .1.1.1.1.1
        1.1.1.1.1.
        .1.1.1.1.1
        1.1.1.1.1.
        .1.1.1.1.1
        1.1.1.1.1.
        .1.1.1.1.1
        1.1.1.1.1.
        .1.1.1.1.1
        1.1.1.1.1.`,

        // SMILE:
        // `..........
        // ...1111...
        // ..1....1..
        // .1......1.
        // .1.2..2.1.
        // .1......1.
        // .1.1..1.1.
        // .1..11..1.
        // ..1....1..
        // ...1111...
        // ..........`,

        FROG:
        `..........
        ..1....1..
        .1.1..1.1.
        1.1.11.1.1
        1........1
        1.111111.1
        1..1111..1
        1........1
        .1......1.
        ..111111..
        ..........`,
    }

    const commonOptions: Options = {
        repeatWithDifferentTiles: false,
        timePerMove: 0,
        timePerPlayer: 0,
        tries: 3,
        blanks: 0,
        winConditions: [GameSettings.WinConditions.NORMAL],
    }
    export const ModeOptions: { [key: string]: Options } = {
        [GameSettings.Mode.NORMAL]: {
            bombMultiplier: 1,
            superbombs: false,
            symmetric: false,
            ...commonOptions,
        },
        [GameSettings.Mode.MINEFIELD]: {
            pattern: GameSettings.MinefieldPatterns.random,
            ...commonOptions,
        },
    }
}

export class Board {
    static ROWS = 13;
    static COLS = 10;
    static BASE = [Board.ROWS - 1, 0];
    static _updateBase = ([r, c]) => {
        Board.ROWS = r
        Board.COLS = c
        Board.BASE = [Board.ROWS - 1, 0]
    };
    board: ITile[][];
    base: number[];

    constructor(board: ITile[][]) {
        this.board = board;
        this.base = [board.length - 1, 0]
    }
    static new({ mode, options }: GameSettings = GameSettings.Normal(), isPreview=false) {
        console.debug('NEW BOARD', mode, JSON.pretty(options))
        if (isPreview) Math.seed('preview board ============')
        let instance: Board, starts
        const ai = new AI(4)
        do {
            let bombPattern
            if (options?.pattern) {
                bombPattern = GameSettings.MinefieldPatterns[options.pattern]
                if (isPreview && (!bombPattern
                    || bombPattern === GameSettings.MinefieldPatterns.random)) {
                    bombPattern = GameSettings.randomMinefieldPlaceholder
                } else while (!bombPattern
                    || bombPattern === GameSettings.MinefieldPatterns.random) {
                    bombPattern = sample(Object.values(GameSettings.MinefieldPatterns))
                }
                // convert string to lookup table
                // pattern consists of .=none 1=black 2=purple
                bombPattern = bombPattern
                    .split('\n')
                    .map(x => x.trim())
                    .filter(x => x)
                    .map(x => x.split('').map(y => y === '.' ? false : Number(y)))
                console.debug(options.pattern, bombPattern)
                bombPattern = [[], ...bombPattern, []] // add empty end rows
            }
            const board = array(Board.ROWS, row => array(Board.COLS, col => {
                const inField = !Board.BASE.includes(row);

                // create bomb tile
                const isBomb: boolean | number =
                    bombPattern
                    ? bombPattern[row][col]
                    : demo
                    ? false
                    : inField
                    ? !randi(33
                        * (options.symmetric ? 1.25 : 1)
                        / (options.bombMultiplier ?? 1))
                    : false
                return Tile.new({
                    row,
                    col,
                    letter: demo ? demo[row][col] : randAlpha(),
                    owner: inField ? Player.none : (row === 0) ? Player.p2 : Player.p1,
                    isBomb,
                });
            }));
            demo && demoBombs.forEach(([row, col]) => {
                board[row][col].isBomb = true
            })
            // return new Board(board)
            instance = new Board(board)
            if (demo) return instance
            const tiles = instance.tiles()

            const offsets = [[0,0], [1,0], [0,1], [1,1]]
            const VOWELS = new Set('aeiouåøæäöüé')
            const imbalanced = (row, col) => {
                const letters = offsets
                    .map(o => instance.get(row + o[0], col + o[1]))
                    .map(tile => tile.letter)
                const vowels = letters
                    .filter(letter => VOWELS.has(letter))
                    .length
                const unique = new Set(letters).size
                // return unique < 3 || vowels < 1 || vowels > 2
                return vowels > 3
            }
            for (let row = 0; row < this.ROWS; row += 2) {
                if (row + .5 === this.ROWS / 2) row += 1
                for (let col = 0; col < this.COLS; col += 2) {
                    if (col + .5 === this.COLS / 2) col += 1
                    while (imbalanced(row, col)) {
                        const o = sample(offsets)
                        instance.get(row + o[0], col + o[1]).letter = randAlpha()
                    }
                }
            }
            for (let i = 0; i < this.ROWS * this.COLS / 2; i++) {
                const row = randi(this.ROWS - 1)
                const col = randi(this.COLS - 1)
                while (imbalanced(row, col)) {
                    const o = sample(offsets)
                    instance.get(row + o[0], col + o[1]).letter = randAlpha()
                }
            }

            const changes = tiles.slice()
            while (changes.length) {
                const curr = changes.pop()
                const adj = instance.adj(curr)
                const consonants = adj.filter(t => !'aeiou'.includes(t.letter))
                if (consonants.length === 8) {
                    const group = [curr, ...adj]
                    // console.debug('CONSONANTS', group.map(t => t.letter).join(''), group)
                    const repeat = sample(group)
                    const swap = sample(tiles.filter(t => 'aeiou'.includes(t.letter)));
                    [repeat.letter, swap.letter] = [swap.letter, repeat.letter]
                    changes.push(swap, ...instance.adj(swap))
                }
            }

            // const findGroups = () => {
            //     const groups: ITile[][] = []
            //     const explored = new Set<string>()
            //     instance.do(base => {
            //         if (!explored.has(Tile.hash(base))) {
            //             const frontier = [base]
            //             const group = [base]
            //             while (frontier.length) {
            //                 const curr = frontier.pop()
            //                 explored.add(Tile.hash(curr))
            //                 instance.adj(curr)
            //                     .filter(tile => tile.letter === base.letter && !explored.has(Tile.hash(tile)))
            //                     .forEach(tile => {
            //                         explored.add(Tile.hash(tile))
            //                         frontier.push(tile)
            //                         group.push(tile)
            //                     })
            //             }
            //             if (group.length > 2) groups.push(group)
            //         }
            //     })
            //     console.debug(groups)
            //     return groups
            // }
            // let groups: ITile[][] = findGroups()
            // const tiles = instance.tiles()
            // while (groups.length > 0) {
            //     groups.forEach(group => {
            //         const letter = group[0].letter
            //         while (group.filter(t => t.letter === letter).length > 2) {
            //             // sample(group).letter = randAlpha()
            //             const repeat = sample(group)
            //             const swap = sample(tiles);
            //             [repeat.letter, swap.letter] = [swap.letter, repeat.letter]
            //         }
            //     })
            //     groups = findGroups()
            // }
            const findGroups = (changes?: ITile[]) => {
                const groups: ITile[][] = []
                const explored = new Set<string>()
                changes = changes || instance.tiles()
                changes.forEach(base => {
                    if (!explored.has(Tile.hash(base))) {
                        const frontier = [base]
                        const group = [base]
                        while (frontier.length) {
                            const curr = frontier.pop()
                            explored.add(Tile.hash(curr))
                            instance.square(curr)
                                .filter(tile => tile.letter === base.letter && !explored.has(Tile.hash(tile)))
                                .forEach(tile => {
                                    explored.add(Tile.hash(tile))
                                    frontier.push(tile)
                                    group.push(tile)
                                })
                        }
                        if (group.length > 1) groups.push(group)
                    }
                })
                // console.debug(groups)
                return groups
            }
            let groups: ITile[][] = findGroups()
            while (groups.length > 0) {
                const changes: ITile[] = []
                groups.forEach(group => {
                    const letter = group[0].letter
                    while (group.filter(t => t.letter === letter).length > 1) {
                        // sample(group).letter = randAlpha()
                        const repeat = sample(group)
                        const swap = sample(tiles);
                        [repeat.letter, swap.letter] = [swap.letter, repeat.letter]
                        changes.push(repeat, swap)
                    }
                })
                groups = findGroups(changes)
            }

            // const offsets = [[0,0], [1,0], [0,1], [1,1], [2,0], [2,1]]
            // for (let row = 0; row < this.ROWS; row += 3) {
            //     if (row + .5 === this.ROWS / 2) row += 1
            //     for (let col = 0; col < this.COLS; col += 2) {
            //         if (col + .5 === this.COLS / 2) col += 1
            //         const imbalanced = () => {
            //             const vowels = offsets
            //                 .map(o => instance.get(row + o[0], col + o[1]))
            //                 .map(tile => tile.letter)
            //                 .filter(letter => 'aeiou'.includes(letter))
            //                 .length
            //             return vowels < 2 || vowels > 3
            //         }
            //         while (imbalanced()) {
            //             const o = sample(offsets)
            //             instance.get(row + o[0], col + o[1]).letter = randAlpha()
            //         }
            //     }
            // }

            // starts = new Set([
            //     ...ai.plays(instance, Player.p1, []),
            //     ...ai.plays(instance, Player.p2, []),
            // ].map(tiles => tiles.map(tile => tile.letter).join('')))
            starts = [
                ai.plays(instance, Player.p1, []),
                ai.plays(instance, Player.p2, []),
            ].map(plays => new Set(plays.map(tiles =>
                tiles.map(tile => tile.letter).join(''))))
            // console.debug('STARTS', starts)
        } while (Math.min(starts[0].size, starts[1].size) < 8)

        // moved superbombs/blanks out of tile creation above to stabilize preview

        // 50% to convert bomb to superbomb if enabled
        if (options?.superbombs) {
            if (isPreview) Math.seed('preview superbombs')
            instance.tiles().map(t => t.isBomb = t.isBomb && randi(2) + 1)
        }

        if (options?.blanks) {
            if (isPreview) Math.seed('preview blanks')
            const tiles = instance.tiles()
            range(options?.blanks / (options.symmetric ? 2 : 1) || 0).map(i => {
                let tile
                do {
                    tile = sample(tiles)
                    // console.debug('CHECK BLANK', Object.serialize(tile), !tile.letter, tile.isBomb, Board.BASE.includes(tile.row))
                } while (!tile.letter || tile.isBomb || Board.BASE.includes(tile.row))
                tile.letter = ''
            })
        }

        if (options?.symmetric) {
            instance.tiles().map(t => {
                const oppo = instance.get(
                    instance.board.length - 1 - t.row,
                    instance.board[0].length - 1 - t.col)
                if (t.isBomb && !options.pattern) oppo.isBomb = t.isBomb
                if (!t.letter) oppo.letter = t.letter
            })
        }

        if (isPreview) Math.seed()
        return instance
        // const board = array(Board.ROWS, row => array(Board.COLS, col => {
        //     const inField = !Board.BASE.includes(row);
        //     return Tile.new({
        //         row,
        //         col,
        //         letter: demo ? demo[row][col] : randAlpha(),
        //         owner: inField ? Player.none : (row === 0) ? Player.p2 : Player.p1,
        //         isBomb: demo ? false : inField ? randi(33) === 0 : false,
        //     });
        // }));
        // demo && demoBombs.forEach(([row, col]) => {
        //     board[row][col].isBomb = true
        // })
        // // return new Board(board)
        // const instance = new Board(board)
        // const ai = new AI(3)
        // console.debug('STARTS',
        //     ai.plays(instance, Player.p1, []).length
        //     + ai.plays(instance, Player.p2, []).length)
        // return instance
    }
    static empty() {
        return store.memo.get('wordbase-board-empty', () => new Board(array(Board.ROWS, row => array(Board.COLS, col => {
            const inField = !Board.BASE.includes(row);
            return Tile.new({
                row,
                col,
                letter: ' ',
                owner: inField ? Player.none : (row === 0) ? Player.p2 : Player.p1,
                isBomb: false,
            });
        }))))
    }
    static demo(props: { dimensions?: [number, number], demo?: string[], demoBombs?: number[][], mode, options }) {
        const original: [number, number] = [Board.ROWS, Board.COLS]
        if (props.demo) props.dimensions = [props.demo.length, props.demo[0].length]
        if (props.dimensions) Board._updateBase(props.dimensions)
        demo = props.demo.map(x => x.replaceAll('.', 'w'))
        demoBombs = props.demoBombs
        const board = Board.new({ mode: props.mode, options: props.options })

        Board._updateBase(original)
        demo = demoBombs = false
        return board
    }

    get(pos_or_row: (IPos | number), col?: number): ITile {
        const pos = (col === undefined) ? pos_or_row as IPos : { row: pos_or_row as number, col };
        return this.board[pos.row] ? this.board[pos.row][pos.col] : undefined;
    }

    do(func: (tile: ITile, r_i?: number, c_i?: number) => any): any[][] {
        return this.board.map((row, r_i) => row.map((tile, c_i) => func(tile, r_i, c_i)));
    }
    rows(func?: (row: ITile[], r_i?: number) => any): any[] {
        return !func ? this.board : this.board.map((row, r_i) => func(row, r_i));
        // return this.board.map((row, r_i) => func(row, r_i));
    }
    cols(func?: (col: ITile[], c_i?: number) => any): any[][] {
        return range(this.board[0].length).map(c => {
            const col = range(this.board.length).map(r => this.board[r][c])
            return func ? func(col, c) : col
        })
    }
    tiles = () => this.board.flat();

    copy(): Board {
        return new Board(this.board);
    }
    deep(): Board {
        return new Board(this.do(tile => Tile.new(tile)));
    }

    adj(pos: IPos): ITile[] {
        const tiles: ITile[] = [];
        for (let i = -1; i < 2; i++) {
            for (let j = -1; j < 2; j++) {
                if (i === 0 && j === 0) continue;
                tiles.push(this.get({
                    row: pos.row + i,
                    col: pos.col + j
                }));
            }
        }
        return tiles.filter(t => t);
    }
    square(pos: IPos): ITile[] {
        return Dirs.map(dir => this.get(Pos.add(pos, dir))).filter(t => t);
    }
    bfs(player: Player): ITile[] {
        const base = this.base[player];
        const frontier = this.board[base].slice().filter(t => t.owner === player);
        const connected = new Set(this.board[base]);
        const ordered = Array.from(connected)
        while (frontier.length) {
            this.adj(frontier.pop())
                .filter(tile => tile.owner === player && !connected.has(tile))
                .forEach(tile => {
                    frontier.push(tile);
                    connected.add(tile);
                    ordered.push(tile);
                });
        }

        return ordered;
    }

    status(settings?: GameSettings): Player {
        // return Player.none
        const { winConditions=[GameSettings.WinConditions.NORMAL] } = settings?.options || {}
        const statuses = [Player.p1, Player.p2].map(pN => {
            // for now, win conditions are AND
            for (const condition of winConditions) {
                switch (condition) {
                    case GameSettings.WinConditions.NORMAL:
                        // false if player hasn't flipped a tile in opposite base
                        if (!(x => pN ? x.reverse() : x)(this.board.slice())[0].some(tile => tile.owner === pN)) return false
                        break
                    case GameSettings.WinConditions.COLUMN:
                        // false if no col is all pN
                        if (!this.cols().some(col => col.every(tile => tile.owner === pN))) return false
                        break
                }
            }
            return true
        })
        // fallback win condition - all opponent tiles eliminated
        ;[Player.p1, Player.p2].map(pN => {
            if (this.tiles().every(x => x.owner !== 1-pN)) statuses[pN] = true
        })
        return statuses.every(x=>x) ? Player.draw : statuses[0] ? Player.p1 : statuses[1] ? Player.p2 : Player.none;
    }

    /**
     * return percent progress for each player
     */
    progress(swap=false): [number, number] {
        const owner = (tile: ITile) => (swap && tile.swap?.new ? tile.swap.from : tile).owner

        const total = this.board.length - 1
        let p1 = total
        this.do(tile => {
            if (owner(tile) === Player.p1) {
                p1 = Math.min(p1, tile.row); // min is up
            }
        });
        let p2 = 0;
        this.do(tile => {
            if (owner(tile) === Player.p2) {
                p2 = Math.max(p2, tile.row); // max is down
            }
        });

        let progress;
        if (p1 === 0 && p2 === total) {
            progress = [.5, .5]
        } else if (p2 >= p1) {
            p2 = total - p2;
            const ratio = p1 / (p1 + p2)
            progress = [ratio, ratio]
        } else {
            progress = [p2/total, p1/total]
        }
        return progress.map(x => Math.round(x * 100))
    }

    static eq(a: Board, b: Board) {
        return a === b || (
            a && b
            && a.board.length === b.board.length
            && a.board[0].length === b.board[0].length
            && a.tiles().map(t => t.letter).join('') === b.tiles().map(t => t.letter).join(''))
    }
}

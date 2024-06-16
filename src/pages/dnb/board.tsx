import { array, randi, dist } from '../../lib/util';

export enum Player { none = 0, p1 = 1, p2 = 2, p3 = 3, p4 = 4 }

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
    static has = (arr: any[], pos: IPos): boolean => arr.some(p => Pos.eq(p, pos));
    static isAdj = (p1: IPos, p2: IPos): boolean =>
        dist(p1.row, p1.col, p2.row, p2.col) < 1.1;
}
export class Dir {
    static UP: Pos = Pos.from([0, -1]);
    static DOWN: Pos = Pos.from([0, 1]);
    static LEFT: Pos = Pos.from([-1, 0]);
    static RIGHT: Pos = Pos.from([1, 0]);
    static LIST: Pos[] = [Dir.UP, Dir.RIGHT, Dir.DOWN, Dir.LEFT];
    static map = (func: (dir: IPos) => any) => Dir.LIST.map(func);
    static I: Dir[] = [0, 1, 2, 3].map(i => new Dir(i))

    i: number
    diff: IPos
    constructor(i: number) {
        this.i = i
        this.diff = Dir.LIST[i]
    }
    static invert = (d: Dir) => new Dir((d.i + 2) % 4)
}

export interface IDot extends IPos {
    open: Dir[]
}
export class Dot extends Pos implements IDot {
    open: Dir[];

    constructor(row: number, col: number, open?: Dir[]) {
        super(row, col);
        open = open ?? Dir.I
        Object.assign(this, { open });
    }
    static new = (props: IDot) => Object.assign({}, props);

    static connect(board: Board, a: IDot, to: Dir) {
        const b = board.dot
        a.open = a.open.filter(d => d.i !== to.i)

    }
}

export interface Swap {
    from: IBox,
    ms: number,
    new: boolean,
}
export interface IBox extends IPos {
    sides: number,
    owner: Player,
    swap?: Swap,
}
export class Box extends Pos implements IBox {
    sides: number; owner: number; swap?: Swap;

    constructor(row: number, col: number, sides: number, owner: number) {
        super(row, col);
        Object.assign(this, { sides, owner });
    }
    static new = (props: IBox) => Object.assign({}, props);
}

export interface ILine {
    drawn: number;
    order?: number;
    back: IDot; front: IDot; left: IBox; right: IBox;
}
export class Line implements ILine {
    drawn: number;
    order: number;
    back: IDot; front: IDot; left: IBox; right: IBox;

    constructor(drawn: number, back: IDot, front: IDot, left: IBox, right: IBox) {
        Object.assign(this, { drawn, back, front, left, right });
        this.order = 0;
    }
    static new = (props: ILine) => Object.assign({}, props);
}

export class Board {
    size: number;
    dots: IDot[][];
    boxes: IBox[][];
    lines: ILine[];

    constructor(dots: IDot[][], boxes: IBox[][], lines?: ILine[]) {
        this.size = dots.length
        this.dots = dots;
        this.boxes = boxes;
        this.lines = lines;
    }
    static new(size) {
        const dots = array(size + 1, row => array(size + 1, col => {
            return Dot.new({
                row,
                col,
                open: Dir.I,
            });
        }));
        const boxes = array(size, row => array(size, col => {
            return Box.new({
                row,
                col,
                sides: 4,
                owner: Player.none,
            });
        }));
        const board = new Board(dots, boxes)
        board.lines = [
            // across
            ...array(size + 1, row => array(size, col => {
                return Line.new({
                    drawn: Player.none,
                    back: board.dot(row, col),
                    front: board.dot(row, col+1),
                    left: board.box(row-1, col),
                    right: board.box(row, col),
                });
            })).flat(),
            // down
            ...array(size, row => array(size + 1, col => {
                return Line.new({
                    drawn: Player.none,
                    back: board.dot(row, col),
                    front: board.dot(row+1, col),
                    left: board.box(row, col),
                    right: board.box(row, col-1),
                });
            })).flat(),
        ]
        return board
    }

    dot(pos_or_row: (IPos | number), col?: number): IDot {
        const pos = (col === undefined)
            ? pos_or_row as IPos
            : { row: pos_or_row as number, col };
        return this.dots[pos.row]
            ? this.dots[pos.row][pos.col]
            : undefined;
    }
    box(pos_or_row: (IPos | number), col?: number): IBox {
        const pos = (col === undefined)
            ? pos_or_row as IPos
            : { row: pos_or_row as number, col };
        return this.boxes[pos.row]
            ? this.boxes[pos.row][pos.col]
            : undefined;
    }

    clone(): Board {
        return new Board(this.dots, this.boxes, this.lines);
    }

    adj(box: IPos): IBox[] {
        return Dir.map(dir => this.box(Pos.add(box, dir)))
    }
    bfs(box: IPos): IBox[] {
        const frontier = [box]
        const connected = new Set<IBox>()
        while (frontier.length) {
            this.adj(frontier.pop())
                .filter(b => {
                    if (connected.has(b)) return false
                })
                .forEach(b => {
                    frontier.push(b);
                    connected.add(b);
                });
        }

        return Array.from(connected);
    }

    gameStatus(): Player {
        return Player.none;
    }
}

export class Save {
    board: Board
    turn: number
    progress: number[]
    history: ILine[]

    constructor(board: Board, turn: number, progress: number[], history: ILine[]) {
        this.board = board
        this.turn = turn
        this.progress = progress
        this.history = history
    }
    static new(size: number, players: number) {
        return new Save(Board.new(size), 0,
            [size * size, ...array(players, () => 0)], [])
    }

    play(line: ILine) {
        if (!line.drawn) {
            let score = false
            const player = this.player()
            line.drawn = player;
            line.order = this.turn;
            [line.left, line.right].forEach((pos: IBox) => {
                if (!pos) return
                const box = this.board.box(pos)
                box.sides -= 1
                if (box.sides === 0) {
                    box.owner = player
                    score = true
                    this.progress[player] += 1
                }
            })
            this.history.push(line)
            return new Save(
                this.board, score ? this.turn : this.turn + 1,
                this.progress, this.history)
        } else return this
    }
    player() {
        return this.turn % (this.progress.length-1) + 1
    }

    serialize() {
        return JSON.stringify({
            dots: this.board.dots,
            boxes: this.board.boxes,
            lines: this.board.lines,
            turn: this.turn,
            progress: this.progress,
            history: this.history,
        });
    }
    static deserialize(str: string) {
        const save = JSON.parse(str);
        return new Save(
            new Board(save.dots, save.boxes, save.lines),
            save.turn, save.progress, save.history);
    }
}
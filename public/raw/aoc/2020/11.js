(() => {
    const l = console.log;
    const U = {
        opt: (val, func) => func ? func(val) : val,
        apply: (val, func) => func(val),
        use: (val, func) => { func(val); return val; },
        o: (field, value) => ({ [field]: value }),
        k: (obj, func) => U.opt(Object.keys(obj), func),
        v: (obj, func) => U.opt(Object.values(obj), func),
        e: (obj, func) => U.opt(Object.entries(obj), func),
        merge: objs => Object.assign({}, ...objs),
        map: (obj, func) => Object.entries(obj).map(entry => func(...entry)),
        i: (arr, i) => (i < 0) ? arr[arr.length + i] : arr[i],
        wrap: (arr, i) => arr[(arr.length + i) % arr.length],
        numSort: arr => arr.map(Number).sort((a, b) => a - b),
        sum: (arr, func) => arr.reduce((sum, val) => sum + U.opt(val, func), 0),
        product: (arr, func) => arr.reduce((prod, val) => prod * U.opt(val, func), 1),
        match: (strs, regex, func) => strs.map(str => U.opt(str.match(regex), func)),
        union: (a, b) => new Set(...a, ...b),
        splice: (arr, i, nX, ...items) =>
            U.use(arr.slice(), copy => copy.splice(i, nX, ...items)),
        range: (start, stop, step) => {
            if (step === undefined) step = 1;
            if (stop === undefined) [stop, start] = [start, 0];
            return Array.from({length: stop - start}, (_, i) => i*step + start);
        },
        count: arr => U.use({}, counts => arr.map(e => { counts[e] = 1 + (counts[e] || 0); })),
        diff: arr => arr.slice(1).map((val, i) => val - arr[i]),
        answer: (input, func) => U.use({}, answers => func(
            input.split('\n'),
            ...['p1', 'p2'].map(pN => aN => { console.log(pN, aN); answers[pN] = aN; }))),
    };

    let T = {
        FLOOR: '.',
        FULL: '#',
        EMPTY: 'L',
    };

    const get = (board, row, col) => {
        let height = board.length;
        let width = board[0].length;
        if (row < 0 || height <= row || col < 0 || width <= col) {
            return undefined;
        }
        return board[row][col];
    }

    const calc1 = (board, row, col) => {
        let seat = get(board, row, col);
        if (seat === T.FLOOR) return seat;

        let count = 0;
        for (let i = -1; i < 2; i++) {
            for (let j = -1; j < 2; j++) {
                if (i !== 0 || j !== 0) {
                    if (get(board, row + i, col + j) === T.FULL) {
                        count++;
                    }
                }
            }
        }
        if (seat === T.EMPTY && count === 0) {
            return T.FULL;
        }
        if (seat === T.FULL && count >= 4) {
            return T.EMPTY;
        }
        return seat;
    }

    const calc2 = (board, row, col) => {
        let seat = get(board, row, col);
        if (seat === T.FLOOR) return seat;

        let count = 0;
        for (let i = -1; i < 2; i++) {
            for (let j = -1; j < 2; j++) {
                if (i !== 0 || j !== 0) {
                    let v = [i, j];
                    let p = [row, col];
                    let seat;
                    do {
                        p[0] += v[0];
                        p[1] += v[1];
                        seat = get(board, p[0], p[1]);
                    } while (seat === T.FLOOR);
                    if (seat === T.FULL) {
                        count++;
                    }
                }
            }
        }
        if (seat === T.EMPTY && count === 0) {
            return T.FULL;
        }
        if (seat === T.FULL && count >= 5) {
            return T.EMPTY;
        }
        return seat;
    }

    const tick = (str, calc) => {
        let curr = str.split('\n').map(line => line.split(''));
        let next = str.split('\n').map(line => line.split(''));
        for (let i = 0; i < curr.length; i++) {
            for (let j = 0; j < curr[0].length; j++) {
                next[i][j] = calc(curr, i, j);
            }
        }
        return next.map(arr => arr.join('')).join('\n')
    }

    window.solution = input => U.answer(input, (lines, p1, p2) => {
        let str = lines.join('\n');
        let prev;
        do {
            prev = str;
            str = tick(prev, calc1);
        } while (str !== prev);
        let counts = U.count(str.split(''));
        p1(counts[T.FULL]);

        str = lines.join('\n');
        do {
            prev = str;
            str = tick(prev, calc2);
        } while (str !== prev);
        counts = U.count(str.split(''));
        p2(counts[T.FULL]);
    });
    window.U = U;
})();
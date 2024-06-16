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

    let FACE = {
        E: 0,
        N: 90,
        W: 180,
        S: 270,
    };
    let DIR = {
        0: [1, 0],
        90: [0, 1],
        180: [-1, 0],
        270: [0, -1],
    };

    let update = ([x, y, face], [op, arg]) => {
        let state;
        if (FACE[op] !== undefined) {
            let dir = DIR[FACE[op]];
            state = [x + arg*dir[0], y + arg*dir[1], face];
        } else {
            state = [x, y, face];
            switch (op) {
                case 'L':
                    state[2] += arg;
                    break;
                case 'R':
                    state[2] -= arg;
                    break;
                case 'F':
                    let dir = DIR[face];
                    state[0] += arg * dir[0];
                    state[1] += arg * dir[1];
                    break;
                default:
            }
            state[2] = (state[2] + 360) % 360;
        }
        return state;
    }

    let update2 = ([x, y, wp], [op, arg]) => {
        let state;
        if (FACE[op] !== undefined) {
            let dir = DIR[FACE[op]];
            state = [x, y, [wp[0] + arg*dir[0], wp[1] + arg*dir[1]]];
        } else {
            state = [x, y, wp];
            let dir
            switch (op) {
                case 'L':
                    dir = DIR[arg];
                    state[2] = [wp[0]*dir[0] - wp[1]*dir[1], wp[1]*dir[0] + wp[0]*dir[1]];
                    break;
                case 'R':
                    dir = DIR[arg];
                    state[2] = [wp[0]*dir[0] + wp[1]*dir[1], wp[1]*dir[0] - wp[0]*dir[1]];
                    break;
                case 'F':
                    state[0] += arg * wp[0];
                    state[1] += arg * wp[1];
                    break;
                default:
            }
        }
        return state;
    }

    window.solution = input => U.answer(input, (lines, p1, p2) => {
        let insts = U.match(lines, /(\w)(\d+)/, match => [match[1], Number(match[2])]);
        l(insts);
        let state = [0, 0, FACE.E];
        insts.forEach(inst => {
            state = update(state, inst);
            l(state);
        });
        p1(Math.abs(state[0]) + Math.abs(state[1]));

        state = [0, 0, [10, 1]];
        insts.forEach(inst => {
            state = update2(state, inst);
            l(state);
        });
        p2(Math.abs(state[0]) + Math.abs(state[1]));
    });
    window.U = U;
})();
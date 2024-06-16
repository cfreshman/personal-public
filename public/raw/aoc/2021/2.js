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

    window.solution = input => U.answer(input, (lines, p1, p2) => {
        {
            const dirs = {
                forward: [1, 0],
                down: [0, 1],
                up: [0, -1],
            }
            let pos = [0, 0]
            lines.forEach(line => {
                let [dir, amount] = line.split(' ')
                amount = Number(amount)
                dir = dirs[dir]
                pos[0] += dir[0] * amount
                pos[1] += dir[1] * amount
            })
            p1(pos[0] * pos[1])
        }
        {
            let aim = 0
            const pos = [0, 0]
            const dirs = {
                forward: x => {
                    pos[0] += x
                    pos[1] += x * aim
                },
                down: x => aim += x,
                up: x => aim -= x,
            }
            lines.forEach(line => {
                let [dir, amount] = line.split(' ')
                amount = Number(amount)
                dirs[dir](amount)
            })
            p2(pos[0] * pos[1])
        }
    });
    window.U = U;
})();
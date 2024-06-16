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
        numSort: (arr, func=Number) => arr.sort((a, b) => func(a) - func(b)),
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
        array: (length, func=()=>0) => Array.from({ length }).map((_, i) => func(i)),
        answer: (input, func) => U.use({}, answers => func(
            input.split('\n'),
            ...['p1', 'p2'].map(pN => aN => { console.log(pN, aN); answers[pN] = aN; }))),
    };

    window.solution = input => U.answer(input, (lines, p1, p2) => {
        let get = (map, x, y) => (map[y] ?? [])[x]
        let dirs = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]]
        let adj = (map, x, y) => dirs
            .map(diff => [x + diff[0], y + diff[1]])
            .filter(pos => get(map, ...pos) !== undefined)

        let flash = (map, x, y) => {
            map[y][x] = -1e6
            adj(map, x, y).map(pos => {
                map[pos[1]][pos[0]] += 1
                if (map[pos[1]][pos[0]] > 9) {
                    flash(map, ...pos)
                }
            })
        }

        {
            let octos = lines.map(line => line.split('').map(Number))
            let flashed = 0
            U.range(100).map(i => {
                octos.map((row, y) => row.map((energy, x) => {
                    octos[y][x] = energy + 1
                    if (octos[y][x] > 9) {
                        flash(octos, x, y)
                    }
                }))
                octos.map((row, y) => row.map((energy, x) => {
                    if (energy < 0) {
                        octos[y][x] = 0
                        flashed += 1
                    }
                }))
            })
            p1(flashed)
        }
        {
            let octos = lines.map(line => line.split('').map(Number))
            let n = octos.length * octos[0].length
            let step = 0
            while (true) {
                step += 1
                octos.map((row, y) => row.map((energy, x) => {
                    octos[y][x] = energy + 1
                    if (octos[y][x] > 9) {
                        flash(octos, x, y)
                    }
                }))
                let flashed = 0
                octos.map((row, y) => row.map((energy, x) => {
                    if (energy < 0) {
                        octos[y][x] = 0
                        flashed += 1
                    }
                }))
                if (flashed === n) break
            }
            p2(step)
        }
    });
    window.U = U;
})();
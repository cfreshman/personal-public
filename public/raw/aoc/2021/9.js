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
        let map = lines.map(line => line.split('').map(Number))

        let get = (x, y) => (map[y] ?? [])[x]
        let dirs = [[1,0],[0,1],[-1,0],[0,-1]]
        let adj = (x, y) => dirs
            .map(diff => get(x + diff[0], y + diff[1]))
            .filter(t => t !== undefined)

        let lows = []
        map.map((row, y) => row.map((pos, x) => {
            if (adj(x, y).every(adjPos => pos < adjPos)) lows.push([x, y])
        }))

        {
            let risks = lows.map(pos => get(...pos) + 1)
            p1(U.sum(risks))
        }
        {
            let pos2id = pos => `${pos[0]},${pos[1]}`
            let sizes = lows.map(pos => {
                let explored = new Set()
                let frontier = [pos]
                while (frontier.length) {
                    let curr = frontier.pop()
                    let val = get(...curr)
                    let id = pos2id(curr)
                    if (val !== undefined && val < 9 && !explored.has(id)) {
                        explored.add(id)
                        frontier.push(...dirs
                            .map(diff => [curr[0] + diff[0], curr[1] + diff[1]]))
                    }
                }
                return explored.size
            })
            let top3 = U.numSort(sizes).reverse().slice(0, 3)
            p2(U.product(top3))
        }
    });
    window.U = U;
})();
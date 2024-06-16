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
        array: (length, func=()=>0) => Array.from({ length }).map((_, i) => func(i)),
        answer: (input, func) => U.use({}, answers => func(
            input.split('\n'),
            ...['p1', 'p2'].map(pN => aN => { console.log(pN, aN); answers[pN] = aN; }))),
    };

    window.solution = input => U.answer(input, (lines, p1, p2) => {
        let crabs = lines[0].split(',').map(Number)
        {
            let [_, min_cost] = U.range(Math.min(...crabs), Math.max(...crabs))
                .reduce(([min_pos, min_cost], crab) => {
                    let cost = U.sum(crabs, krab => Math.abs(crab - krab))
                    if (min_cost < 0 || cost < min_cost) {
                        return [crab, cost]
                    }
                    return [min_pos, min_cost]
                }, [0, -1])
            p1(min_cost)
        }
        {
            let fuelPerMove = x => (x * (x + 1))/2
            let [_, min_cost] = U.range(Math.min(...crabs), Math.max(...crabs))
                .reduce(([min_pos, min_cost], crab) => {
                    let cost = U.sum(crabs, krab => fuelPerMove(Math.abs(crab - krab)))
                    if (min_cost < 0 || cost < min_cost) {
                        return [crab, cost]
                    }
                    return [min_pos, min_cost]
                }, [0, -1])
            p2(min_cost)
        }
    });
    window.U = U;
})();
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
        let isBig = cave => cave[0] === cave[0].toUpperCase()
        let big = new Set()
        let caves = {}
        lines.map(line => {
            let [a, b] = line.split('-')
            if (b !== 'start') caves[a] = (caves[a] ?? []).concat(b)
            if (a !== 'start') caves[b] = (caves[b] ?? []).concat(a)
        })
        lines['end'] = []
        U.k(caves).map(cave => isBig(cave) && big.add(cave))
        {
            let explore = (cave, explored=new Set()) => {
                if (cave === 'end') return ['end']
                if (!big.has(cave)) explored.add(cave)
                let neighbors = caves[cave]
                let allowed = neighbors.filter(n => !explored.has(n))
                let ends = allowed.flatMap(n => explore(n, new Set(explored)))
                return ends.map(end => `${cave},${end}`)
            }
            let paths = explore('start')
            let passesThroughSmall = paths
                .filter(path => {
                    let caves = path.split(',')
                    return caves.slice(1, caves.length-1).some(cave => !big.has(cave))
                })
                .length
            p1(passesThroughSmall)
        }
        {
            let explore = (cave, explored=new Set(), twice=false) => {
                if (cave === 'end') return ['end']
                if (!twice && explored.has(cave)) twice = true
                if (!big.has(cave)) explored.add(cave)
                let neighbors = caves[cave]
                let allowed = twice
                    ? neighbors.filter(n => !explored.has(n))
                    : neighbors
                let ends = allowed.flatMap(n => explore(n, new Set(explored), twice))
                return ends.map(end => `${cave},${end}`)
            }
            let paths = explore('start')
            p2(paths.length)
        }
    });
    window.U = U;
})();
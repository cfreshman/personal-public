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
        let vents = lines.map(line => {
            let [p1, p2] = line.split(' -> ')
            let [x1, y1] = p1.split(',').map(Number)
            let [x2, y2] = p2.split(',').map(Number)
            // if (x2 < x1) [x1, y1, x2, y2] = [x2, y2, x1, y1]
            return [[x1, y1], [x2, y2]]
        })
        {
            let ortho = vents.filter(([p1, p2]) => p1[0] === p2[0] || p1[1] === p2[1])
            let points = {}
            let overlapped = 0
            ortho.map(([p1, p2]) => {
                let steps = 1 + Math.abs((p2[0] - p1[0]) + (p2[1] - p1[1]))
                let diff = [Math.sign(p2[0] - p1[0]), Math.sign(p2[1] - p1[1])]
                U.range(steps).map(i => {
                    let x = p1[0] + i * diff[0]
                    let y = p1[1] + i * diff[1]
                    let query = `${x},${y}`
                    if (points[query] === 1) overlapped += 1
                    points[query] = 1 + (points[query] ?? 0)
                })
            })
            p1(overlapped)
        }
        {
            let points = {}
            let overlapped = 0
            vents.map(([p1, p2]) => {
                let steps = 1 + Math.max(Math.abs(p2[0] - p1[0]), Math.abs(p2[1] - p1[1]))
                let diff = [Math.sign(p2[0] - p1[0]), Math.sign(p2[1] - p1[1])]
                U.range(steps).map(i => {
                    let x = p1[0] + i * diff[0]
                    let y = p1[1] + i * diff[1]
                    let query = `${x},${y}`
                    if (points[query] === 1) overlapped += 1
                    points[query] = 1 + (points[query] ?? 0)
                })
            })
            p2(overlapped)
        }
    });
    window.U = U;
})();
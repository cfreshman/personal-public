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
        let [points, folds] = lines.join('\n').split('\n\n').map(half => half.split('\n'))
        points = points.map(point => point.split(',').map(Number))
        folds = folds.map(fold => {
            let [axis, pos] = fold.replace('fold along ', '').split('=')
            return { axis, pos: Number(pos) }
        })
        let doFold = (points, fold) => (fold.axis === 'x')
            ? points.map(p => [fold.pos - Math.abs(fold.pos - p[0]), p[1]])
            : points.map(p => [p[0], fold.pos - Math.abs(fold.pos - p[1])])
        {
            let firstFoldPoints = doFold(points.slice(), folds[0])
            p1(new Set(firstFoldPoints.map(p => p.join(','))).size)
        }
        {
            let p2Points = points.slice()
            folds.map(fold => p2Points = doFold(p2Points, fold))
            let xMax = Math.max(...p2Points.map(p => p[0])) + 1
            let yMax = Math.max(...p2Points.map(p => p[1])) + 1
            let paper = U.array(yMax, () => U.array(xMax, () => ' '))
            p2Points.map(p => paper[p[1]][p[0]] = '#')
            let result = paper.map(line => line.join('')).join('\n')
            l(result)
            p2('see console output')
        }
    });
    window.U = U;
})();
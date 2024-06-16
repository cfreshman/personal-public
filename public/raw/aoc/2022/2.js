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
        {
            const rounds = lines.map(line => {
                let [a, b] = line.split(' ')
                return [a.charCodeAt(0) - 'A'.charCodeAt(0), b.charCodeAt(0) - 'X'.charCodeAt(0)]
            })
            l(rounds)
            const scores = rounds.map(([a, b]) => {
                let points = b + 1
                if (a === b) points += 3
                else if ((a + 1) % 3 === b) points += 6
                else points += 0
                return points
            })
            p1(U.sum(scores))
        }
        {
            const rounds = lines.map(line => {
                let [a, b] = line.split(' ')
                return [a.charCodeAt(0) - 'A'.charCodeAt(0), b.charCodeAt(0) - 'X'.charCodeAt(0)]
            })
            const scores = rounds.map(([a, b]) => {
                let c = (a + b - 1 + 3) % 3

                let points = c + 1
                if (b === 1) points += 3
                else if (b === 2) points += 6
                else points += 0
                return points
            })
            p2(U.sum(scores))
        }
    });
    window.U = U;
})();
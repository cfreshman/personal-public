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
        let polymer = lines[0]
        let pairs = {}
        lines.slice(2).map(pair => {
            let [rule, insert] = pair.split(' -> ')
            pairs[rule] = insert
        })
        {
            let step = polymer => {
                for (let i = polymer.length-2; i >= 0; i--) {
                    let pair = polymer.slice(i, i+2)
                    if (pairs[pair]) {
                        polymer = polymer.slice(0, i+1) + pairs[pair] + polymer.slice(i+1)
                    }
                }
                return polymer
            }
            let p1Polymer = polymer
            U.range(10).map(i => p1Polymer = step(p1Polymer))
            let counts = {}
            p1Polymer.split('').map(p => counts[p] = 1 + (counts[p] ?? 0))
            let sortedCounts = U.numSort(U.v(counts))
            p1(sortedCounts[sortedCounts.length-1] - sortedCounts[0])
        }
        {
            // need totally different computation method for 40 iterations
            let transforms = {}
            U.e(pairs).map(([rule, insert]) =>
                transforms[rule] = [rule[0] + insert, insert + rule[1]])
            let step = points => {
                let nextPoints = {}
                U.e(points).map(([pair, count]) => {
                    let [left, right] = transforms[pair]
                    nextPoints[left] = count + (nextPoints[left] ?? 0)
                    nextPoints[right] = count + (nextPoints[right] ?? 0)
                })
                return nextPoints
            }
            let points = {}
            U.range(polymer.length - 1)
                .map(i => polymer.slice(i, i+2))
                .map(point => points[point] = 1 + (points[point] ?? 0))
            U.range(40).map(i => points = step(points))
            let counts = {}
            U.e(points).map(([pair, count]) =>
                pair.split('').map(item => counts[item] = count + (counts[item] ?? 0)))
            counts[polymer[0]] += 1
            counts[polymer[polymer.length - 1]] += 1
            let sortedCounts = U.numSort(U.v(counts)).map(count => count/2)
            p2(sortedCounts[sortedCounts.length-1] - sortedCounts[0])
        }
    });
    window.U = U;
})();
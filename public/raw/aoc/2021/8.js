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
        lines = lines.join('\n').replaceAll('|\n', '| ').split('\n')
        {
            let outputs = lines.map(line => line.split(' | ')[1].split(' ')).flat()
            let uniques = new Set([2, 3, 4, 7])
            let unique = outputs.filter(output => uniques.has(output.length))
            p1(unique.length)
        }
        {
            let problems = lines.map(line => {
                let [signals, outputs] = line
                    .split(' | ')
                    .map(half => half.split(' ').map(part => part.split('').sort()))
                return { signals, outputs }
            })
            let digits = {
                'abcefg': 0,
                'cf': 1,
                'acdeg': 2,
                'acdfg': 3,
                'bcdf': 4,
                'abdfg': 5,
                'abdefg': 6,
                'acf': 7,
                'abcdefg': 8,
                'abcdfg': 9,
            }
            let possible = {
                8: ['a', 'c'],
                6: ['b'],
                7: ['d', 'g'],
                4: ['e'],
                9: ['f']
            }
            let values = problems.map(({ signals, outputs }) => {
                let translate = (signal, mapping) => {
                    let translated = signal
                        .map(s => mapping[s])
                        .sort()
                        .join('')
                    return digits[translated]
                }
                let attempt = mapping => {
                    let entries = U.e(mapping)
                    let multiple = entries.findIndex(e => e[1].length > 1)
                    if (multiple > -1) {
                        let [sig, pos] = entries[multiple]
                        for (let i = 0; i < pos.length; i++) {
                            let val = pos[i]
                            let inner = {}
                            entries.map(e => {
                                inner[e[0]] = e[1].filter(v => v !== val)
                            })
                            inner[sig] = [val]
                            let result = attempt(inner)
                            if (result) return result
                        }
                    } else {
                        if (signals.every(s => translate(s, mapping) !== undefined)) {
                            return outputs.map(o => translate(o, mapping))
                        } else {
                            return false
                        }
                    }
                }

                let counts = {}
                signals.map(signal => signal.map(s => counts[s] = 1 + (counts[s] ?? 0)))
                let mapping = {}
                U.e(counts).map(entry => mapping[entry[0]] = possible[entry[1]])
                let result = attempt(mapping)
                return Number(result.map(String).join(''))
            })
            p2(U.sum(values))
        }
    });
    window.U = U;
})();
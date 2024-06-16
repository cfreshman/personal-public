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
        const ends = {
            ')': '(',
            ']': '[',
            '}': '{',
            '>': '<',
        }
        {
            let results = lines.map(line => {
                let tokens = line.split('')
                let stack = []
                for (let i = 0; i < tokens.length; i++) {
                    let token = tokens[i]
                    if (ends[token]) {
                        let pair = stack.pop()
                        if (pair != ends[token]) {
                            return token
                        }
                    } else {
                        stack.push(token)
                    }
                }
            }).filter(token => token !== undefined)
            let points = {
                ')': 3,
                ']': 57,
                '}': 1197,
                '>': 25137,
            }
            p1(U.sum(results, token => points[token]))
        }
        {
            let results = lines.map(line => {
                let tokens = line.split('')
                let stack = []
                for (let i = 0; i < tokens.length; i++) {
                    let token = tokens[i]
                    if (ends[token]) {
                        let pair = stack.pop()
                        if (pair != ends[token]) {
                            return
                        }
                    } else {
                        stack.push(token)
                    }
                }
                return stack
            }).filter(stack => stack !== undefined)
            let points = {
                '(': 1,
                '[': 2,
                '{': 3,
                '<': 4,
            }
            let scores = results.map(stack =>
                stack.reverse().reduce((score, token) => 5 * score + points[token], 0))
            p2(U.numSort(scores)[(scores.length-1)/2])
        }
    });
    window.U = U;
})();
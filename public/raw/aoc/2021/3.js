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
        {
            let bits = U.array(lines[0].length, () => ({ '0': 0, '1': 0 }));
            lines.forEach(line => line.split('').forEach((bit, i) => bits[i][bit] += 1))
            let process = if0 => parseInt(
                bits.map(bit => if0(bit['0'] > bit['1'])).join(''), 2)
            let epsilon = process(if0 => if0 ? 0 : 1)
            let gamma = process(if0 => if0 ? 1 : 0)
            p1(epsilon * gamma)
        }
        {
            let process = if0 => {
                let group = lines.slice()
                for (let i = 0; group.length > 1; i++) {
                    let bit = { '0': 0, '1': 0 }
                    group.forEach(line => bit[line[i]] += 1)
                    let keep = if0(bit['0'] > bit['1'])
                    group = group.filter(entry => entry[i] === keep)
                }
                return parseInt(group[0], 2)
            }
            let ox = process(if0 => if0 ? '0' : '1')
            let co2 = process(if0 => if0 ? '1' : '0')
            p2(ox * co2)
        }
    });
    window.U = U;
})();
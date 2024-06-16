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
        answer: (input, func) => U.use({}, answers => func(
            input.split('\n'),
            ...['p1', 'p2'].map(pN => aN => { console.log(pN, aN); answers[pN] = aN; }))),
    };

    let apply = (mask, val) => {
        let ss = (val >>> 0).toString(2).split('').reverse();
        let ms = mask.split('').reverse();
        let c = ms.map((m, i) => (m === 'X') ? ss[i] || '0' : m);
        console.log(ss.join(''), ms.join(''), c.join(''));
        return parseInt(c.reverse().join(''), 2);
    }

    let apply2 = (mask, val) => {
        let ss = (val >>> 0).toString(2).split('').reverse();
        let ms = mask.split('').reverse();
        let c = ms.map((m, i) => (m === '0') ? ss[i] || '0' : m);
        console.log(ss.join(''), ms.join(''), c.join(''));
        let floating = [c.reverse().join('')];
        let actual = [];
        do {
            let curr = floating.pop();
            if (curr.includes('X')) {
                floating.push(curr.replace('X', '0'), curr.replace('X', '1'));
            } else {
                actual.push(curr);
            }
        } while (floating.length);
        return actual.map(s => parseInt(s, 2));
    }

    window.solution = input => U.answer(input, (lines, p1, p2) => {
        let mem = {};
        let put0, put1;
        U.match(lines, /(\d*). = (.+)/, ([_, addr, val]) => {
            if (addr) {
                mem[addr] = (BigInt(val) & put0) | put1;
            } else {
                put0 = BigInt('0b' + val.replaceAll('X', '1'));
                put1 = BigInt('0b' + val.replaceAll('X', '0'));
            }
        });
        p1(U.v(mem).reduce((sum, val) => sum + val, 0n));

        let mem2 = {};
        let mask;
        U.match(lines, /(\d*). = (.+)/, ([_, addr, val]) => {
            if (addr) {
                apply(mask, Number(addr)).forEach(a => {
                    mem2[a] = Number(val)
                })
            } else {
                mask = val;
            }
        });
        p2(U.sum(U.v(mem2)));
    });
    window.U = U;
})();
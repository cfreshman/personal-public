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
        class Packet {
            constructor(version, type, contents) {
                this.version = version
                this.type = type
                this.contents = contents
            }
        }
        let parse = (bits, i) => {
            let version = parseInt(bits.slice(i, i+3), 2)
            let type = parseInt(bits.slice(i+3, i+6), 2)
            let contents
            if (type === 4) {
                let value = ''
                let j = i+6
                for (let last = false; !last; j += 5) {
                    last = 0 === parseInt(bits[j])
                    value += bits.slice(j+1, j+5)
                }
                contents = parseInt(value, 2)
                i = j
            } else {
                let mode = parseInt(bits[i+6])
                let subpackets = []
                if (mode === 0) {
                    let length = parseInt(bits.slice(i+7, i+7+15), 2)
                    let start = i+7+15
                    let curr = start
                    while (curr - start < length) {
                        let result = parse(bits, curr)
                        curr = result[0]
                        subpackets.push(result[1])
                    }
                    i = curr
                } else {
                    let count = parseInt(bits.slice(i+7, i+7+11), 2)
                    let curr = i+7+11
                    while (subpackets.length < count) {
                        let result = parse(bits, curr)
                        curr = result[0]
                        subpackets.push(result[1])
                    }
                    i = curr
                }
                contents = subpackets
            }
            return [i, new Packet(version, type, contents)]
        }

        let bitsList = lines
            .map(line => line.split('')
                .map(hex => parseInt(hex, 16).toString(2).padStart(4, '0'))
                .join(''))
        let result = parse(bitsList[0], 0)[1]
        {
            let sumVersion = packet => {
                let sum = packet.version
                if (packet.type !== 4) {
                    packet.contents.map(p => sum += sumVersion(p))
                }
                return sum
            }
            p1(sumVersion(result))
        }
        {
            let calculate = packet => {
                let first, second
                switch (packet.type) {
                    case 0: return U.sum(packet.contents, calculate)
                    case 1: return U.product(packet.contents, calculate)
                    case 2: return Math.min(...packet.contents.map(calculate))
                    case 3: return Math.max(...packet.contents.map(calculate))
                    case 4: return packet.contents
                    case 5:
                        [first, second] = packet.contents.map(calculate)
                        return (first > second) ? 1 : 0
                    case 6:
                        [first, second] = packet.contents.map(calculate)
                        return (first < second) ? 1 : 0
                    case 7:
                        [first, second] = packet.contents.map(calculate)
                        return (first === second) ? 1 : 0
                }
            }
            p2(calculate(result))
        }
    });
    window.U = U;
})();
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
        class Node {
            constructor(value) {
                this.set(value)
                this.parent = undefined
            }
            static parse(value) {
                return (typeof(value) === 'number')
                    ? new Node(value)
                    : new Node([
                        Node.parse(value[0]),
                        Node.parse(value[1])
                    ])
            }
            static add(a, b) {
                let node = new Node([a, b])
                while (node.explode() || node.split()) {}
                return node
            }
            set(value) {
                if (typeof(value) === 'number') {
                    this.isPair = false
                } else {
                    // l('set', value.map(node => node.str()))
                    this.isPair = true
                    value[0].parent = this
                    value[1].parent = this
                }
                this.value = value
            }
            explode(depth=0) {
                // l(depth, this.str())
                if (!this.isPair) return false
                if (depth === 4) {
                    // l('explode', this.str())
                    this.parent.left(this.value[0].value, this)
                    this.parent.right(this.value[1].value, this)
                    this.set(0)
                    // l(depth, this.str())
                    return true
                } else {
                    return this.value.some(node => node.explode(depth + 1))
                }
            }
            left(add, from=false) {
                // l('left', add, this.str(), from ? from.str() : from)
                if (!this.isPair) {
                    this.value += add
                } else if (from) {
                    if (this.value[0] === from) {
                        this.parent?.left(add, this)
                    } else {
                        this.value[0].right(add)
                    }
                } else {
                    this.value[0].left(add)
                }
            }
            right(add, from=false) {
                // l('right', add, this.str(), from ? from.str() : from)
                if (!this.isPair) {
                    this.value += add
                } else if (from) {
                    if (this.value[1] === from) {
                        this.parent?.right(add, this)
                    } else {
                        this.value[1].left(add)
                    }
                } else {
                    this.value[1].right(add)
                }
            }
            split() {
                if (this.isPair) return this.value.some(node => node.split())
                if (this.value > 9) {
                    this.set([
                        new Node(Math.floor(this.value / 2)),
                        new Node(Math.ceil(this.value / 2)),
                    ])
                    return true
                }
                return false
            }
            magnitude() {
                return (this.isPair)
                    ? 3 * this.value[0].magnitude() + 2 * this.value[1].magnitude()
                    : this.value
            }
            array() {
                return (this.isPair)
                    ? this.value.map(node => node.array())
                    : this.value
            }
            str() {
                return JSON.stringify(this.array())
            }
        }
        {
            let nodes = lines.map(JSON.parse).map(Node.parse)
            l(nodes.map(node => node.str()))
            let result = nodes.reduce(Node.add)
            l(result.str())
            p1(result.magnitude())
        }
        {
            let maxMagnitude = 0
            for (let i = 0; i < lines.length - 1; i++) {
                for (let j = i + 1; j < lines.length; j++) {
                    [
                        [i, j],
                        [j, i],
                    ]
                    .map(ij => {
                        let [a, b] = ij.map(i => lines[i]).map(JSON.parse).map(Node.parse)
                        let result = Node.add(a, b)
                        maxMagnitude = Math.max(result.magnitude(), maxMagnitude)
                    })
                }
            }
            p2(maxMagnitude)
        }
    });
    window.U = U;
})();
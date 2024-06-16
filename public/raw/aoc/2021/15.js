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
        let map = lines.map(line => line.split('').map(Number))
        let get = (map, x, y) => (map[y] ?? [])[x]
        let dirs = [[1,0],[0,1],[-1,0],[0,-1]]
        let adj = (map, x, y) => dirs
            .map(diff => [x + diff[0], y + diff[1]])
            .filter(pos => get(map, ...pos) !== undefined)

        let dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])
        class Node {
            constructor(pos, g=0, path=[]) {
                this.pos = pos
                this.g = g
                this.path = path.slice().concat([pos])
            }
        }
        let aStar = (map, start, goal) => {
            let explored = new Set()
            let heap = [[0, new Node(start)]]
            let curr, _
            let key = pos => pos.join(',')
            while (heap.length) {
                [_, curr] = heap.shift()
                if (explored.has(key(curr.pos))) continue
                explored.add(key(curr.pos))
                if (dist(curr.pos, goal) === 0) break
                adj(map, ...curr.pos)
                    .filter(pos => !explored.has(key(pos)))
                    .map(pos => {
                        let node = new Node(pos, curr.g + get(map, ...pos), curr.path)
                        heap.push([node.g + dist(pos, goal), node])
                    })
                // replace with actual heap to improve performance
                heap = U.numSort(heap, s => s[0])
            }
            return curr.path
        }

        {
            let start = [0, 0]
            let goal = [map[0].length-1, map.length-1]
            let path = aStar(map, start, goal)
            p1(U.sum(path.slice(1), pos => get(map, ...pos)))
        }
        {
            let xN = map[0].length
            let big = map.map(row =>
                U.array(xN * 5, i => (row[i % xN] + Math.floor(i / xN) - 1) % 9 + 1))
            let yN = map.length
            big = U.array(yN * 5, i =>
                big[i % yN].map(v => (v + Math.floor(i / yN) - 1) % 9 + 1))

            let start = [0, 0]
            let goal = [xN*5 - 1, yN*5 - 1]
            let path = aStar(big, start, goal)
            p2(U.sum(path.slice(1), pos => get(big, ...pos)))
        }
    });
    window.U = U;
})();
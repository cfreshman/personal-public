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
        let numbers = lines[0].split(',').map(Number)
        let boards = lines.slice(2)
            .join('\n')
            .split('\n\n')
            .map(block => block
                .split('\n')
                .map(line => line.split(/ +/).filter(s=>s).map(Number)))
        {
            let infos = boards.map(board => ({ board, scores: {} }))
            let played = new Set()
            let i, winner
            for (i = 0; i < numbers.length; i++) {
                let play = numbers[i]
                played.add(play)
                for (let b = 0; b < infos.length; b++) {
                    let { board, scores } = infos[b]
                    let pos
                    board.some((row, r_i) => row.some((tile, c_i) => {
                        if (tile === play) {
                            pos = [r_i, c_i]
                            return true
                        }
                        return false
                    }))
                    if (pos) {
                        let [row, col] = pos;
                        [
                            `r${row}`,
                            `c${col}`,
                            // row === col ? 'd1' : false,
                            // row === 4 - col ? 'd2' : false,
                        ].filter(c=>c).forEach(check => {
                            scores[check] = 1 + (scores[check] ?? 0)
                            if (scores[check] === 5) {
                                winner = b
                            }
                        })
                    }
                }
                if (winner) break
            }
            let { board } = infos[winner]
            let unmarked = board
                .flat()
                .filter(n => !played.has(n))
                .reduce((sum, n) => sum + n, 0)
            l(board
                .map(row => row.map(tile => played.has(tile) ? 'X' : tile)))
            p1(unmarked * numbers[i])
        }
        {
            let infos = boards.map(board => ({ board, scores: {} }))
            let played = new Set()
            let i, last
            let won = {}, left = boards.length
            for (i = 0; i < numbers.length && left > 0; i++) {
                let play = numbers[i]
                played.add(play)
                for (let b = 0; b < infos.length; b++) {
                    if (won[b]) continue
                    let { board, scores } = infos[b]
                    let pos
                    board.some((row, r_i) => row.some((tile, c_i) => {
                        if (tile === play) {
                            pos = [r_i, c_i]
                            return true
                        }
                        return false
                    }))
                    if (pos) {
                        let [row, col] = pos;
                        [
                            `r${row}`,
                            `c${col}`,
                        ].filter(c=>c).some(check => {
                            scores[check] = 1 + (scores[check] ?? 0)
                            if (scores[check] === 5) {
                                last = [b, i]
                                won[b] = true
                                left -= 1
                                return true
                            }
                            return false
                        })
                    }
                }
            }
            let { board } = infos[last[0]]
            let unmarked = board
                .flat()
                .filter(n => !played.has(n))
                .reduce((sum, n) => sum + n, 0)
            l(board
                .map(row => row.map(tile => played.has(tile) ? 'X' : tile)))
            p2(unmarked * numbers[last[1]])
        }
    });
    window.U = U;
})();
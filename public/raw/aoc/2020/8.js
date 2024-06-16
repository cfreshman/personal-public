(() => {

let run = insts => {
    let acc = 0;
    let i = 0;
    for (let seen = new Set(); !seen.has(i) && i < insts.length;) {
        seen.add(i);
        let [op, arg] = insts[i];
        switch (op) {
            case 'acc': acc += arg; i++; break;
            case 'jmp': i += arg; break;
            default: i++;
        }
    }
    return [acc, i >= insts.length ? 'term' : 'inf'];
}

window.solution = input => U.answer(input, (lines, p1, p2) => {
    let insts = U.match(lines, /(\w+) (.+)/, match => [match[1], Number(match[2])]);

    p1(run(insts)[0]);

    let swap = {'jmp': 'nop', 'nop': 'jmp'};
    insts.forEach(([op, arg], i) => swap[op] && U.use(
        run(U.splice(insts, i, 1, [swap[op], arg])),
        res => res[1] === 'term' && p2(res[0])
    ));
});

})();
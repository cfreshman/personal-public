function answer(input, callback) {
    let answers = {};
    callback(input.split('\n'), ...['p1', 'p2'].map(pN => aN => { answers[pN] = aN; }));
    return answers;
}

window.solution = input => answer(input, (lines, p1, p2) => {
    let vals = lines.map(Number);

    vals.forEach(v1 => {
        vals.forEach(v2 => {
            if (v1 + v2 === 2020) {
                p1(v1 * v2);
            }
        })
    })

    vals.forEach(v1 => {
        vals.forEach(v2 => {
            vals.forEach(v3 => {
                if (v1 + v2 + v3 === 2020) {
                    p2(v1 * v2 * v3);
                }
            })
        })
    })
});
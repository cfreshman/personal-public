function answer(input, callback) {
    let answers = {};
    callback(input.split('\n'), ...['p1', 'p2'].map(pN => aN => { answers[pN] = aN; }));
    return answers;
}

function toDec(binary, keys) {
    return binary.split('').reverse()
        .reduce((total, digit, i) => total + 2**i * keys.indexOf(digit), 0);
}

window.solution = input => answer(input, (lines, p1, p2) => {
    let ids = U.numSort(lines.map(line => {
        let row = toDec(line.slice(0, 7), 'FB');
        let col = toDec(line.slice(7), 'LR');
        return row * 8 + col;
    }));
    p1(ids[ids.length-1]);
    p2(ids.slice(1).find((id, i) => ids[i] !== id-1) - 1);
});
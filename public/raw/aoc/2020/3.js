function answer(input, callback) {
    let answers = {};
    callback(input.split('\n'), ...['p1', 'p2'].map(pN => aN => { answers[pN] = aN; }));
    return answers;
}

function treesInSlope(lines, slope) {
    let pos = [0, 0];
    let height = lines.length;
    let width = lines[0].length;
    let count = 0;
    while (true) {
        [0, 1].forEach(i => pos[i] += slope[i]);
        if (pos[1] >= height) {
            break;
        }

        pos[0] %= width;
        if (lines[pos[1]][pos[0]] === '#') {
            count++;
        }
    }
    return count;
}

window.solution = input => answer(input, (lines, p1, p2) => {
    p1(treesInSlope(lines, [3, 1]));
    p2(U.product(
        [[1,1], [3,1], [5,1], [7,1], [1,2]],
        slope => treesInSlope(lines, slope)
    ))
});
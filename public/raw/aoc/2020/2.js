function answer(input, callback) {
    let answers = {};
    callback(input.split('\n'), ...['p1', 'p2'].map(pN => aN => { answers[pN] = aN; }));
    return answers;
}

function p1Valid(line) {
    let match = line.match(/(\d+)-(\d+) (\w): (\w+)/);
    let [min, max, letter, password] = match.slice(1);
    [min, max] = [min, max].map(Number);
    let count = password.split('').filter(l => l === letter).length;
    return min <= count && count <= max;
}

function p2Valid(line) {
    let match = line.match(/(\d+)-(\d+) (\w): (\w+)/);
    let [first, second, letter, password] = match.slice(1);
    [first, second] = [first, second].map(p => Number(p) - 1);
    let chars = password.split('');
    return 1 === [first, second].filter(pos => chars[pos] === letter).length;
}

window.solution = input => answer(input, (lines, p1, p2) => {
    p1(lines.filter(p1Valid).length);
    p2(lines.filter(p2Valid).length);
});
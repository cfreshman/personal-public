function answer(input, callback) {
    let answers = {};
    callback(input.split('\n'), ...['p1', 'p2'].map(pN => aN => { answers[pN] = aN; }));
    return answers;
}

window.solution = input => answer(input, (lines, p1, p2) => {
    let groups = lines.join('\n').split('\n\n');
    p1(U.sum(groups, group => new Set(group.replace(/\n/g, '').split('')).size));
    p2(U.sum(groups, group => {
        let counts = {};
        group.replace(/\n/g, '').split('').forEach(letter => {
            counts[letter] = (counts[letter] || 0) + 1;
        });
        let size = group.split('\n').length;
        return Object.keys(counts).filter(key => counts[key] === size).length;
    }));
});
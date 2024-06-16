window.solution = input => U.answer(input, (lines, p1, p2) => {
    let bags = U.merge(U.match(lines, /(\w+ \w+) bags contain (.*)./, match => U.o(match[1], {
        outers: {},
        inners: match[2] === 'no other bags' ? {} : U.merge(U.match(
            match[2].split(', '), /(\d+) (\w+ \w+) bag/,
            ruleMatch => U.o(ruleMatch[2], Number(ruleMatch[1]))
        )),
    })));
    U.map(bags, (key, bag) =>
        U.map(bag.inners, (inKey, count) => { bags[inKey].outers[key] = count; }));

    let getOuterSet = key =>
        U.k(bags[key].outers, outKeys => U.union(outKeys, outKeys.map(getOuterSet)))
    p1(getOuterSet('shiny gold').size);

    let getSize = key =>
        1 + U.sum(U.k(bags[key].inners), inKey => bags[key].inners[inKey] * getSize(inKey));
    p2(getSize('shiny gold') - 1);
});
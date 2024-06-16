function answer(input, callback) {
    let answers = {};
    callback(input.split('\n'), ...['p1', 'p2'].map(pN => aN => { answers[pN] = aN; }));
    return answers;
}

function validPassport1(passport, required) {
    let fields = new Set(passport.split(/[ \n]/g).map(pair => pair.split(':')[0]));
    let missing = required.filter(f => !fields.has(f));
    return missing.length === 0;
}

function validPassport2(passport) {
    let props = {};
    passport.split(/[ \n]/g).forEach(entry => {
        let parts = entry.split(':');
        props[parts[0]] = parts[1];
    });

    let strRange = (str, min, max) => {
        let num = Number(str);
        return min <= num && num <= max;
    }
    let valid = {
        year: (min, max) => str => strRange(str, min, max),
        height: (cmMin, cmMax, inMin, inMax) => str => {
            let numStr = str.slice(0, -2);
            return str.includes('cm')
                ? strRange(numStr, cmMin, cmMax)
                : strRange(numStr, inMin, inMax);
        },
    }

    return [
        ['byr', valid.year(1920, 2002)],
        ['iyr', valid.year(2010, 2020)],
        ['eyr', valid.year(2020, 2030)],
        ['hgt', valid.height(150, 193, 59, 76)],
        ['hcl', str => /^#[0-9a-f]{6}$/.test(str)],
        ['ecl', str => 'amb blu brn gry grn hzl oth'.split(' ').includes(str)],
        ['pid', str => /^\d{9}$/.test(str)],
    ].every(check => props[check[0]] && check[1](props[check[0]]));
}

window.solution = input => answer(input, (lines, p1, p2) => {
    let passports = lines.join('\n').split('\n\n');
    let required = 'byr iyr eyr hgt hcl ecl pid'.split(' ');
    p1(passports.filter(p => validPassport1(p, required)).length);
    p2(passports.filter(validPassport2).length);
});
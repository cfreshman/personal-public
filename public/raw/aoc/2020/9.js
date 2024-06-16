(() => {
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
        numSort: arr => arr.sort((a, b) => a - b),
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
        answer: (input, func) => U.use({}, answers => func(
            input.split('\n'),
            ...['p1', 'p2'].map(pN => aN => { console.log(pN, aN); answers[pN] = aN; }))),
    };

    function ok(i, nums, window) {
        for (let j = i-window; j < i-1; j++) {
            for (let k = j+1; k < i; k++) {
                if (nums[j] + nums[k] === nums[i]) return true;
            }
        }
        return false;
    }

    function is(i, nums, target) {
        for (let sum = 0; i < nums.length; i++) {
            sum += nums[i];
            if (sum === target) return i;
            if (sum > target) return false;
        }
        return false;
    }

    window.solution = input => U.answer(input, (lines, p1, p2) => {
        let nums = lines.map(Number);
        let window = nums.length > 50 ? 25 : 5;
        let target;
        console.log(nums);
        for (let i = window; i < nums.length; i++) {
            if (!ok(i, nums, window)) {
                target = nums[i];
                p1(nums[i]);
                break;
            }
        }

        for (let i = 0; i < nums.length; i++) {
            let result = is(i, nums, target);
            if (is(i, nums, target)) {
                let min = Math.min(...nums.slice(i, result+1));
                let max = Math.max(...nums.slice(i, result+1));
                console.log(i, result, nums.slice(i, result+1), min, max);
                p2(min + max);
                break;
            }
        }
    });
})();
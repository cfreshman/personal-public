function lerp(a, b, t) {
    return a + (b-a)*t;
}

function mag(x, y) {
    return Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
}

function dist(x1, y1, x2, y2) {
    return mag(x2 - x1, y2 - y1);
}

function mag2(x, y) {
    return Math.pow(x, 2) + Math.pow(y, 2);
}

function dist2(x1, y1, x2, y2) {
    return mag2(x2 - x1, y2 - y1);
}

function bounded(value, lower, upper) {
    return lower <= value && value <= upper;
}

function randi(min, max) {
    if (min === undefined) {
        max = 1;
        min = 0;
    } else if (max === undefined) {
        [min, max] = [0, min];
    }
    return Math.floor(Math.random() * Math.floor(max - min)) + min;
}

// rand() returns [0, 1]
// rand(n) returns [0, n]
// rand(min, max) returns [min, max]
function rand(min, max) {
    if (min === undefined) {
        max = 1;
        min = 0;
    } else if (max === undefined) {
        [min, max] = [0, min];
    }
    return Math.random()*(max - min) + min;
}

// rands() returns [-1, 1]
// rands(n) returns [-n, n]
// rands(min, max) returns [min, max]
function rands(min, max) {
    if (min === undefined) {
        max = 1;
        min = -1;
    } else if (max === undefined) {
        [min, max] = [-min, min];
    }
    return Math.random()*(max - min) + min;
}

function randpop(array) {
    return array.pop(randi(array.length));
}

function sample(n, method, constraint) {
    let samples = new Array(n);
    do {
        for (let i = 0; i < n; i++) samples[i] = method(i);
    } while (!constraint(...samples));
    return samples;
}

function matrix(numrows, numcols, initial) {
    var arr = [];
    for (var i = 0; i < numrows; ++i) {
        var columns = [];
        for (var j = 0; j < numcols; ++j) {
            columns[j] = initial;
        }
        arr[i] = columns;
    }
    return arr;
}

export {
    lerp,
    mag,
    dist,
    mag2,
    dist2,
    bounded,
    randi,
    rand,
    rands,
    randpop,
    sample,
    matrix,
}
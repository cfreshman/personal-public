window.Q = window.$ = (doc, selector) => {
    if (selector === undefined) {
        selector = doc
        doc = document
    }
    return doc.querySelector(selector)
}
window.QQ = window.$$ = (doc, selector) => {
    if (selector === undefined) {
        selector = doc
        doc = document
    }
    return Array.from(doc.querySelectorAll(selector))
}
window.on = (el, evts, func, opts=undefined) => el && evts.split(' ').map(evt =>
    el.addEventListener(evt, func, opts))

const range = n => Array.from({ length: n }).map((_, i) => i)



Array.prototype.at = function(arr, i) {
    if (i < 0) i = arr.length + i
    return arr[i]
}
Array.prototype.peek = function(i) { return index(this, i) }
Array.prototype.remove = function(item) {
    const i = this.indexOf(item)
    if (i > -1) {
        this.splice(i, 1)
        return true
    }
    return false
}

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

// rand() returns [0, 2)
// rand(n) returns [0, n)
// rand(min, max) returns [min, max)
function randi(min, max) {
    if (min === undefined) {
        max = 2;
        min = 0;
    } else if (max === undefined) {
        [min, max] = [0, min];
    }
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * Math.floor(max - min)) + min;
}

// rand() returns [0, 1)
// rand(n) returns [0, n)
// rand(min, max) returns [min, max)
function rand(min, max) {
    if (min === undefined) {
        max = 1;
        min = 0;
    } else if (max === undefined) {
        [min, max] = [0, min];
    }

    // console.log(`rand [${min}, ${max}]`);
    return Math.random()*(max - min) + min;
}

// rands() returns [-1, 1)
// rands(n) returns [-n, n)
// rands(n, m) returns [n-m, n+m)
function rands(n, m) {
    let min, max
    if (n === undefined) {
        min = -1
        max = 1
    } else if (m === undefined) {
        min = -n
        max = n
    } else {
        min = n - m
        max = n + m
    }

    return Math.random()*(max - min) + min;
}

// chance() returns 1/2 odds
// chance(x) returns 1/x odds
// chance(x, n) returns x/n odds
function chance(x, n) {
    if (x === undefined) return !!randi(2)
    if (n === undefined) return !randi(x)
    return randi(n) < x
}
function chancef(x) {
    return rand() < x
}

const alphanum = 'qwertyuiopasdfghjklzxcvbnm1234567890QWERTYUIOPASDFGHJKLZXCVBNM'
    .split('').sort().join('');
function randAlphanum(n) {
  let str = '';
  for (let i = 0; i < n; i++) {
    str += alphanum[randi(alphanum.length)];
  }
  return str;
}
function incrementAlphanum(str) {
    // let n = Number(str)
    // if (!isNaN(n)) {
    //     return String(n + 1)
    // }
    if (!str) str = alphanum[0]
    let indices = str.split('').map(s => alphanum.indexOf(s)).reverse().concat([-1])
    indices[0] += 1
    let i = 0
    while (indices[i] === alphanum.length) {
        indices[i] = 0
        indices[i+1] += 1
        i++
    }
    return indices.map(index => alphanum[index] || '').reverse().join('')
}
function decrementAlphanum(str) {
    // let n = Number(str)
    // if (!isNaN(n)) {
    //     return String(Math.max(0, n - 1))
    // }
    if (!str || str === alphanum[0]) return str
    let indices = str.split('').map(s => alphanum.indexOf(s)).reverse()
    indices[0] -= 1
    let i = 0
    while (indices[i] < 0) {
        indices[i] = alphanum.length - 1
        indices[i+1] -= 1
        i++
    }
    return indices.map(index => alphanum[index] || '').reverse().join('')
}
Object.assign(window, {
    alphanum,
    randAlphanum,
    incrementAlphanum,
    decrementAlphanum,
})

function randpick(array) {
    return array[randi(array.length)];
}
function randpop(array) {
    return array.splice(randi(array.length), 1)[0];
}

function sample(n, method, constraint) {
    let samples = new Array(n);
    do {
        for (let i = 0; i < n; i++) samples[i] = method(i);
    } while (!constraint(...samples));
    return samples;
}

function array(n, initial=()=>0) {
    return Array.from({ length: n }).map((_, i) => initial(i))
}

function matrix(rows, cols, initial=()=>0) {
    return array(rows, row => array(cols, col => initial(row, col)))
}
Array.matrix = (rows, cols, initial) => matrix(rows, cols, () => initial)

// overwrite default JS random with a simple seeded one
// https://stackoverflow.com/a/47593316
function xmur3(str) {
    for(var i = 0, h = 1779033703 ^ str.length; i < str.length; i++)
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353),
        h = h << 13 | h >>> 19;
    return function() {
        h = Math.imul(h ^ h >>> 16, 2246822507);
        h = Math.imul(h ^ h >>> 13, 3266489909);
        return (h ^= h >>> 16) >>> 0;
    }
}

function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

function sfc32(a, b, c, d) {
    return function() {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
      var t = (a + b) | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = (c << 21 | c >>> 11);
      d = d + 1 | 0;
      t = t + d | 0;
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    }
}

const defaultRandom = Math.random
function seed(str) {
    // const n = xmur3(str)
    // Math.random = mulberry32(n)
    // return n
    const n = xmur3(str)
    Math.random = sfc32(n(), n(), n(), n())
    return n()
}
Math.seed = seed

function unseed() {
    Math.random = defaultRandom
}
Math.unseed = unseed

// copy text
async function copy(text) {
    return new Promise(resolve => {
       if (navigator.clipboard) {
          navigator.clipboard.writeText(text)
             .then(() => resolve(true))
             .catch(() => resolve(false));
       } else {
          let textarea = document.createElement('textarea')
          textarea.value = text
          document.body.appendChild(textarea)
          textarea.select()
          document.execCommand('copy')
          document.body.removeChild(textarea)
          resolve(true)
       }
    })
}

// return first n primes (after 1)
function primes(n, skip=[]) {
    const primes = []
    for (let i = 2, isPrime = true; primes.length < n + skip.length; i++, isPrime = true) {
        for (let j = 0; j < primes.length; j++) {
            const prime = primes[j]
            if (prime * prime > i) {
                break
            } else if (i % prime === 0) {
                isPrime = false
                break
            }
        }
        if (isPrime) primes.push(i)
    }

    const skipSet = new Set(skip)
    return primes.filter(x => !skipSet.has(x))
}

// return first prime greater than or equal to n (up to 1_000_000)
function prime_atleast(n) {
    const primes = []
    for (let i = 2, isPrime = true; i < 1_000_000; i++, isPrime = true) {
        for (let j = 0; j < primes.length; j++) {
            const prime = primes[j]
            if (prime * prime > i) {
                break
            } else if (i % prime === 0) {
                isPrime = false
                break
            }
        }
        if (isPrime) {
            if (i >= n) return i
            primes.push(i)
        }
    }
}

const isMobile = /iPhone|iPod|Android|Pixel|Windows Phone/i.test(navigator.userAgent);

if (!globalThis.window) globalThis.window = globalThis
;(() => {
  window.solution = (input) => U.answer(input, (lines, p1, p2) => {
    {
      const nums = []
      for (let i = 0; i < lines.length; i++) {
        let num_left = undefined, num_right = undefined
        const close_number = () => {
          const num = Number(lines[i].slice(num_left, num_right + 1))
          // check surrounding characters for non-number non-period chracter
          const has_part = () => {
            for (let n_i = Math.max(0, i - 1); n_i < Math.min(i + 2, lines.length); n_i++) {
              for (let n_j = Math.max(0, num_left - 1); n_j < Math.min(num_right + 2, lines[i].length); n_j++) {
                if (n_i !== i || (n_j < num_left || n_j > num_right)) {
                  if (lines[n_i][n_j] !== '.' && isNaN(lines[n_i][n_j])) {
                    return true
                  }
                }
              }
            }
          }
          if (has_part()) {
            nums.push(num)
            // l(num_left, num_right, lines[i], nums)
          }
          num_left = num_right = undefined
        }
        for (let j = 0; j < lines[i].length; j++) {
          if (!isNaN(lines[i][j])) {
            if (num_left === undefined) num_left = j
            num_right = j
          } else if (num_left !== undefined) {
            close_number()
          }
        }
        if (num_left) close_number()
      }
      p1(U.sum(nums))
    }
    {
      const gears = {}
      const rc_to_key = (r, c) => `${r},${c}`
      for (let i = 0; i < lines.length; i++) {
        let num_left = undefined, num_right = undefined
        const close_number = () => {
          const num = Number(lines[i].slice(num_left, num_right + 1))
          // check surrounding characters for non-number non-period chracter
          const handle_gears = () => {
            for (let n_i = Math.max(0, i - 1); n_i < Math.min(i + 2, lines.length); n_i++) {
              for (let n_j = Math.max(0, num_left - 1); n_j < Math.min(num_right + 2, lines[i].length); n_j++) {
                if (n_i !== i || (n_j < num_left || n_j > num_right)) {
                  if (lines[n_i][n_j] === '*') {
                    const gear_key = rc_to_key(n_i, n_j)
                    gears[gear_key] = gears[gear_key] || []
                    gears[gear_key].push(num)
                    return
                  }
                }
              }
            }
          }
          handle_gears()
          num_left = num_right = undefined
        }
        for (let j = 0; j < lines[i].length; j++) {
          if (!isNaN(lines[i][j])) {
            if (num_left === undefined) num_left = j
            num_right = j
          } else if (num_left !== undefined) {
            close_number()
          }
        }
        if (num_left) close_number()
      }
      const two_gears = Object.entries(gears).filter(([_, nums]) => nums.length === 2)
      p2(U.sum(two_gears.map(([_, nums]) => nums[0] * nums[1])))
    }
  })

  const l = console.log
  const U = {
    opt: (val, func) => func ? func(val) : val,
    apply: (val, func) => func(val),
    use: (val, func) => { func(val); return val; },
    o: (field, value) => ({ [field]: value }),
    k: (ob, func) => U.opt(Object.keys(ob), func),
    v: (ob, func) => U.opt(Object.values(ob), func),
    e: (ob, func) => U.opt(Object.entries(ob), func),
    f: (ar) => Object.fromEntries(ar),
    list: (str, sep) => typeof str === 'string' ? str.split(sep || ' ') : Array.from(str),
    set: (str, sep) => new Set(U.list(str, sep)),
    merge: obs => Object.assign({}, ...obs),
    omap: (ob, func) => Object.entries(ob).map(entry => func(...entry)),
    i: (ar, i) => (i < 0) ? ar[ar.length + i] : ar[i],
    wrap: (ar, i) => ar[(ar.length + i) % ar.length],
    numsort: (ar, func = Number) => ar.sort((a, b) => func(a) - func(b)),
    maxxing: (xs, f) => {
      if (!xs.length) return undefined
      let max_i = 0, max_value = f(xs[0])
      for (let i = 1; i < xs.length; i++) {
        const value = f(xs[i])
        if (value > max_value) {
          max_i = i
          max_value = value
        }
      }
      return xs[max_i]
    },
    minning: (xs, f) => {
      if (!xs.length) return undefined
      let min_i = 0, min_value = f(xs[0])
      for (let i = 1; i < xs.length; i++) {
        const value = f(xs[i])
        if (value < min_value) {
          min_i = i
          min_value = value
        }
      }
      return xs[min_i]
    },
    sum: (ar, func) => ar.reduce((sum, val) => sum + U.opt(val, func), 0),
    product: (ar, func) => ar.reduce((prod, val) => prod * U.opt(val, func), 1),
    match: (strs, regex, func) => strs.map(str => U.opt(str.match(regex), func)),
    union: (a, b) => new Set(...a, ...b),
    splice: (ar, i, nX, ...items) =>
      U.use(ar.slice(), copy => copy.splice(i, nX, ...items)),
    range: (start, stop, step) => {
      if (step === undefined) step = 1;
      if (stop === undefined) [stop, start] = [start, 0];
      return Array.from({ length: stop - start }, (_, i) => i * step + start);
    },
    count: ar => U.use({}, counts => ar.map(e => { counts[e] = 1 + (counts[e] || 0); })),
    diff: ar => ar.slice(1).map((val, i) => val - ar[i]),
    array: (length, func = () => 0) => Array.from({ length }).map((_, i) => func(i)),
    answer: (input, func) => U.use({}, answers => func(input.split('\n'), ...['p1', 'p2'].map(pN => aN => { l(pN, aN); answers[pN] = aN; }))),
  }
  const keys = U.k
  const values = U.v
  const entries = U.e
  const from = U.f
  const range = U.range
  window.U = U
})()
module.exports = solution
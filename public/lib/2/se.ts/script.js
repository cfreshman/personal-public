// se.ts 0.0.1 @ https://freshman.dev/lib/2/se.ts/script.js https://freshman.dev/copyright.js
{
  const names = 'se.ts sets'.split(' ')
  if (names.some(name => !window[name])) {
      
    /* script
    */
    
    const version = `se.ts 0.0.1`
    const log = named_log(version)
    const definition = (() => {

const sets = {
  new: (xs=[]) => new Set(xs),
  empty: () => new Set(),
  equal: (a, b) => {
    return sets.subset(a, b) && sets.superset(a, b)
  },
  union: (...xs) => {
    const output = sets.new()
    // xs.map(x => Array.from(x).map(element => output.add(element)))
    sets.mut.update(output, ...xs)
    return output
  },
  intersection: (...xs) => {
    const output = sets.new()
    const a = xs[0]
    const bs = xs.slice(1)
    Array.from(a).map(element => {
      if (bs.every(b => b.has(element))) {
        output.add(element)
      }
    })
    return output
  },
  difference: (set, ...others) => {
    const output = sets.new()
    Array.from(set).map(x => {
      if (!others.some(other => other.has(x))) {
        output.add(x)
      }
    })
    return output
  },
  symmetric: (...xs) => {
    const differences = []
    for (let i = 0; i < xs.length; i++) {
      const others = xs.slice(0, i).concat(xs.slice(i + 1))
      differences.push(sets.difference(xs[i], ...others))
    }
    return sets.union(...differences)
  },
  disjoint: (...xs) => {
    return sets.intersection(...xs).size === 0
  },
  subset: (a, b) => {
    return Array.from(a).every(x => b.has(x))
  },
  superset: (a, b) => {
    return Array.from(b).every(x => a.has(x))
  },
  peek: (x) => {
    const array_x = Array.from(x)
    const element = array_x[Math.floor(Math.random() * array_x.length)]
    return element
  },
  mut: {
    clear: (x) => {
      x.clear()
      return x
    },
    update: (set, ...others) => {
      others.map(other => Array.from(other).map(element => set.add(element)))
      return set
    },
    difference: (set, ...others) => {
      others.map(other => Array.from(other).map(element => set.delete(element)))
      return set
    },
    pop: (x) => {
      const element = sets.peek(x)
      x.delete(element)
      return element
    },
  },
  array: (x) => {
    return Array.from(x)
  },
  string: (x) => {
    return `{${Array.from(x).join(', ')}}`
  }
}

      return sets
    })()
    names.map(name => window[name] = Object.assign({}, definition, {
        version, [name]:version, t:Date.now()
    }))

  }
}
  
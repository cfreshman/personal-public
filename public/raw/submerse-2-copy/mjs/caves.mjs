const CAVE_HEIGHT = 3
const CAVE_LENGTH = 7

const DIRS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
]
export const generate_2 = () => {
  const vs = []
  const start_end_height = 0 // (CAVE_HEIGHT - 1)/2
  vs.push(V.ne(0, start_end_height))
  for (let c = 1; c < CAVE_LENGTH - 1; c++) {
    for (let r = 0; r < CAVE_HEIGHT; r++) {
      vs.push(V.ne(c, r))
    }
  }
  vs.push(V.ne(CAVE_LENGTH - 1, start_end_height))
  
  const v_map = {}
  const i_to_v = {}
  vs.map((v, i) => {
    v_map[v.st()] = i
    i_to_v[i] = v
  })

  const edge_map = {}
  for (let c = 0; c < CAVE_LENGTH; c++) {
    for (let r = 0; r < CAVE_HEIGHT; r++) {
      const v = V.ne(c, r)
      const i = v_map[v.st()]
      if (i === undefined) continue
      for (let [dx, dy] of DIRS) {
        const nv = V.ne(c + dx, r + dy)
        const ni = v_map[nv.st()]
        if (ni !== undefined) {
          edge_map[i] = edge_map[i] || []
          edge_map[i].push(ni)
        }
      }
    }
  }

  console.log({ vs, edge_map })

  // assign edge weights, A* search for path, remove everything else
  const edge_weights = {}
  let edge_keys = []
  for (let i in edge_map) {
    for (let j of edge_map[i]) {
      if (i > j) continue
      edge_keys.push(`${i}-${j}`)
    }
  }
  edge_keys = rand.shuffle(edge_keys)
  let i = 1
  for (let k of edge_keys) {
    edge_weights[k] = i++
  }

  const start = vs[0]
  const end = vs[vs.length - 1]
  const a_star = () => {
    const q = [[start, 0]]
    const visited = {}
    const came_from = {}
    while (q.length) {
      q.sort((a, b) => a[1] - b[1])
      let [v, d] = q.shift()
      const i = v_map[v.st()]
      if (visited[i]) continue
      visited[i] = true
      if (v.eq(end)) {
        const path = [v]
        while (v.st() !== start.st()) {
          const i = v_map[v.st()]
          path.unshift(came_from[i])
          v = came_from[i]
        }
        return path
      }
      if (edge_map[i]) {
        for (let j of edge_map[i]) {
          if (visited[j]) continue
          const nv = vs[j]
          const nd = d + (edge_weights[`${i}-${j}`] || edge_weights[`${j}-${i}`])
          q.push([nv, nd])
          came_from[j] = v
        }
      }
    }
  }

  const path = a_star()
  const edges_in_path = {}
  for (let i = 1; i < path.length; i++) {
    const v = path[i - 1]
    const vi = v_map[v.st()]
    const nv = path[i]
    const ni = v_map[nv.st()]
    edges_in_path[`${vi}-${ni}`] = true
  }

  const v_in_path = {}
  for (let v of path) {
    v_in_path[v.st()] = v_map[v.st()]
  }
  const v_out = {}
  for (let vst in v_map) {
    if (!v_in_path[vst]) {
      v_out[vst] = v_map[vst]
    }
  }

  // re-attach vertices not in path to path
  for (let i = 0; i < Object.keys(v_out).length && Object.keys(v_out).length; i++) {
    rand.shuffle(Object.keys(v_out)).map(vst => {
      const i = v_out[vst]
      const v = i_to_v[i]
      // get indices of vertices in path adjacent to v
      const vpsi = DIRS.map(([dx, dy]) => V.ne(v.x + dx, v.y + dy)).map(v => v_in_path[v.st()]).filter(i => i !== undefined)
      const pi = rand.sample(vpsi)
      if (pi === undefined) return
      edges_in_path[`${i}-${pi}`] = true
      delete v_out[v.st()]
    })
  }

  const es = []
  const e_taken = {}
  for (let i in edge_map) {
    for (let j of edge_map[i]) {
      if (e_taken[`${i}-${j}`] || e_taken[`${j}-${i}`]) continue
      if (edges_in_path[`${i}-${j}`] || edges_in_path[`${j}-${i}`]) {
        es.push([i, j])
        e_taken[`${i}-${j}`] = true
      }
    }
  }

  return {
    vs,
    es,
  }
}


export const generate = () => {
  let attempts = 0
  do {
    const vs = []
    const start_end_height = 0 // (CAVE_HEIGHT - 1)/2
    vs.push(V.ne(0, start_end_height))
    for (let c = 1; c < CAVE_LENGTH - 1; c++) {
      for (let r = 0; r < CAVE_HEIGHT; r++) {
        vs.push(V.ne(c, r))
      }
    }
    vs.push(V.ne(CAVE_LENGTH - 1, start_end_height))
    
    const v_map = {}
    const i_to_v = {}
    vs.map((v, i) => {
      v_map[v.st()] = i
      i_to_v[i] = v
    })

    const edge_map = {}
    for (let c = 0; c < CAVE_LENGTH; c++) {
      for (let r = 0; r < CAVE_HEIGHT; r++) {
        const v = V.ne(c, r)
        const i = v_map[v.st()]
        if (i === undefined) continue
        for (let [dx, dy] of DIRS) {
          const nv = V.ne(c + dx, r + dy)
          const ni = v_map[nv.st()]
          if (ni !== undefined) {
            edge_map[i] = edge_map[i] || []
            edge_map[i].push(ni)
          }
        }
      }
    }

    console.log({ vs, edge_map })

    // assign edges indices, remove edges, binary search for connected
    const eid = (i, j) => {
      if (i > j) [i, j] = [j, i]
      return `${i}-${j}`
    }
    const edge_nums = {}
    let max_edge_num = 0
    let edge_keys = []
    for (let i in edge_map) {
      for (let j of edge_map[i]) {
        if (i > j) continue
        edge_keys.push(eid(i, j))
      }
    }
    edge_keys = rand.shuffle(edge_keys)
    let i = 1
    for (let k of edge_keys) {
      edge_nums[k] = i++
      max_edge_num = i
    }
    edge_map[0].map(vi => {
      const k = eid(0, vi)
      edge_nums[k] = -1
    })
    edge_map[vs.length - 1].map(vi => {
      const k = eid(vs.length - 1, vi)
      edge_nums[k] = -1
    })

    const start = vs[0]
    const end = vs[vs.length - 1]
    const is_connected = (to_edge_num) => {
      const q = [start]
      const visited = {}
      while (q.length) {
        const v = q.shift()
        const i = v_map[v.st()]
        if (visited[i]) continue
        visited[i] = true
        if (v.eq(end)) return true
        if (edge_map[i]) {
          for (let j of edge_map[i]) {
            let edge_num = edge_nums[eid(i, j)]
            if (edge_num > to_edge_num) continue
            q.push(V.ne(vs[j].x, vs[j].y))
          }
        }
      }
    }

    let to_edge_num = max_edge_num / 2
    while (to_edge_num > 0 && is_connected(to_edge_num)) {
      to_edge_num--
    }
    while (to_edge_num < max_edge_num && !is_connected(to_edge_num)) {
      to_edge_num++
    }

    const es = []
    const e_taken = {}
    for (let i in edge_map) {
      for (let j of edge_map[i]) {
        const k = eid(i, j)
        if (e_taken[k]) continue
        if (edge_nums[k] > to_edge_num) continue
        es.push([i, j])
        e_taken[k] = true
      }
    }

    // find shortest path on es
    const es_keys = {}
    for (let [i, j] of es) {
      es_keys[eid(i, j)] = true
    }
    const a_star = () => {
      const q = [[start, 0]]
      const visited = {}
      const came_from = {}
      while (q.length) {
        q.sort((a, b) => a[1] - b[1])
        let [v, d] = q.shift()
        const i = v_map[v.st()]
        if (visited[i]) continue
        visited[i] = true
        if (v.eq(end)) {
          const path = [v]
          while (v.st() !== start.st()) {
            const i = v_map[v.st()]
            path.unshift(came_from[i])
            v = came_from[i]
          }
          return path
        }
        if (edge_map[i]) {
          for (let j of edge_map[i]) {
            if (visited[j]) continue
            if (!es_keys[eid(i, j)]) continue
            const nv = vs[j]
            const nd = d + 1
            q.push([nv, nd])
            came_from[j] = v
          }
        }
      }
    }
    const path = a_star()

    // return non-simple cave system (no straight-line path)
    if (path.length > CAVE_LENGTH || attempts > 10) {
      return {
        vs,
        es,
        path,
      }
    }
    attempts += 1
  } while (1)
}
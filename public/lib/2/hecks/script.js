// hecks.js 0.0.1 @ https://freshman.dev/lib/2/hecks/script.js https://freshman.dev/copyright.js
Object.entries({
    'common.js': '/lib/2/common/script.js',
    've.js': '/lib/2/ve/ve.js',
}).map(([key,src])=>!window[key]&&document.head.append((x=>Object.assign(x,{innerHTML:(src=>(x=>{x.withCredentials=false;x.open('GET',src,false);x.send();return x.responseText})(new XMLHttpRequest()))(new URL(src,location.port==='3030'/*local testing on port 3030*/?location.origin:'https://freshman.dev').toString())}))(document.createElement('script'))))

{
    const names = lists.of('hecks.js hecks')
    if (names.some(name => !window[name])) {
        
        /* script
        */
        const log = named_log('hecks.js')
        const version = `hecks v0.0.1`
        const definition = {
            Field: class {
                static Orientation = {
                    TOP_FLAT: 0,
                    SIDE_FLAT: 1,
                }
                constructor(size, orientation) {
                    this.size = size
                    this.orientation = orientation

                    if (orientation === definition.Field.Orientation.TOP_FLAT) {
                        this.height = Math.sqrt(3) * size
                        this.vert = this.height
                        this.width = 2 * size
                        this.horiz = 3/4 * this.width
                    } else {
                        this.width = Math.sqrt(3) * size
                        this.horiz = this.width
                        this.height = 2 * size
                        this.vert = 3/4 * this.height
                    }
                }
                get inner_size() {
                    return Math.sqrt(3) / 2 * this.size
                }
                center() {
                    return V.ne(0, 0)
                }
                adj(v_or_q, r) {
                    const v = typeof v_or_q === 'number' ? V.ne(v_or_q, r) : v_or_q
                    if (this.orientation === definition.Field.Orientation.TOP_FLAT) {
                        return [
                            V.ne(1, 0),
                            V.ne(0, 1),
                            V.ne(-1, 1),
                            V.ne(-1, 0),
                            V.ne(0, -1),
                            V.ne(1, -1),
                        ].map(x => V.ad(v, x))
                    } else {
                        return [
                            V.ne(1, 0),
                            V.ne(0, 1),
                            V.ne(-1, 1),
                            V.ne(-1, 0),
                            V.ne(0, -1),
                            V.ne(1, -1),
                        ].map(x => V.ad(v, x))
                    }
                }
                nearest(n, v_or_q, r) {
                    const v = typeof q === 'number' ? V.ne(v_or_q, r) : v_or_q
                    let frontier = [v]
                    let explored = new Set()
                    let nearest = []
                    while (frontier.length && nearest.length < n) {
                        const curr = frontier.shift()
                        if (!explored.has(curr.st())) {
                            explored.add(curr.st())
                            nearest.push(curr)
                            rand.shuffle(this.adj(curr)).forEach(x => {
                                if (!explored.has(x.st())) {
                                    frontier.push(x)
                                }
                            })
                        }
                    }
                    return nearest
                }
                to_cartesian(v_or_q, r) {
                    const v = typeof q === 'number' ? V.ne(v_or_q, r) : v_or_q
                    if (this.orientation === definition.Field.Orientation.TOP_FLAT) {
                        return V.ne(this.horiz * v[0], this.vert * v[1] + this.vert/2 * v[0])
                    } else {
                        return V.ne(this.horiz / 2 * v[0], -this.vert * v[1])
                    }
                }
                from_cartesian(v_or_x, y) {
                    const v = typeof v_or_x === 'number' ? V.ne(v_or_x, y) : v_or_x
                    if (this.orientation === definition.Field.Orientation.TOP_FLAT) {
                        return V.ne(...this.axial_round([2/3 * v[0] / this.size, (-1/3 * v[0] + Math.sqrt(3) / 3 * v[1]) / this.size]))
                    } else {
                        return V.ne(...this.axial_round([(Math.sqrt(3) / 3 * v[0] + -1/3 * v[1]) / this.size, 2/3 * v[1] / this.size]))
                    }
                }
                to_vertices(v_or_q, r) {
                    const v = typeof q === 'number' ? V.ne(v_or_q, r) : v_or_q
                    const cart = this.to_cartesian(v)
                    if (this.orientation === definition.Field.Orientation.TOP_FLAT) {
                        return range(6).map(i => {
                            const angle = 2 * Math.PI / 6 * i
                            return V.ne(cart.x + Math.cos(angle) * this.size, cart.y + Math.sin(angle) * this.size)
                        })
                    } else {
                        return range(6).map(i => {
                            const angle = 2 * Math.PI / 6 * i - Math.PI / 6
                            return V.ne(cart.x + Math.cos(angle) * this.size, cart.y + Math.sin(angle) * this.size)
                        })
                    }
                }
                // from_vertex(v_or_x, y) {
                //     const v = typeof v_or_x === 'number' ? V.ne(v_or_x, y) : v_or_x
                //     const interior_points = range(3).map(i => {
                //         return v.ad(V.p(i * Math.PI / 4 + Math.PI / 4, .5))
                //     })
                //     return interior_points.map(p => this.from_cartesian(p))
                // }
                to_edges(v_or_q, r) {
                    const vs = hf.to_vertices(v_or_q, r)
                    const edges = []
                    for (let i = 0; i < vs.length; i++) {
                        edges.push([vs[i], vs[(i + 1) % vs.length]])
                    }
                    return edges
                }
                deduplicate_cartesian_vertices(vs) {
                    const seen = new Set()
                    const deduplicated = []
                    vs.forEach(v => {
                        if (!seen.has(v.st())) {
                            seen.add(v.st())
                            deduplicated.push(v)
                        }
                    })
                    return deduplicated
                }
                interior_cartesian_vertices(vs, count=2) {
                    const counts = {}
                    const interior = []
                    vs.forEach(v => {
                        const st = V.ne(Math.round(v.x * 100) / 100, Math.round(v.y * 100) / 100).st()
                        counts[st] = (counts[st] || 0) + 1
                        if (counts[st] == count) interior.push(v)
                    })
                    return interior
                }
                axial_to_cube([q, r]) {
                    return [q, r, -q - r]
                }
                cube_to_axial([q, r, s]) {
                    return [q, r]
                }
                cube_round([q, r, s]) {
                    let rq = Math.round(q)
                    let rr = Math.round(r)
                    let rs = Math.round(s)
                    const q_diff = Math.abs(rq - q)
                    const r_diff = Math.abs(rr - r)
                    const s_diff = Math.abs(rs - s)
                    if (q_diff > r_diff && q_diff > s_diff) {
                        rq = -rr - rs
                    } else if (r_diff > s_diff) {
                        rr = -rq - rs
                    } else {
                        rs = -rq - rr
                    }
                    return [rq, rr, rs]
                }
                axial_round([q, r]) {
                    return this.cube_to_axial(this.cube_round(this.axial_to_cube([q, r])))
                }
            },
            Placement: class {
                constructor(field) {
                    this.field = field
                    this._inputs = {}
                    this._places = {}
                    this._id_to_place = {}
                    this._re_place_on_remove = {}
                }
                add(id, position) {
                    // find nearest open hex tile
                    const v_qr = this.field.from_cartesian(position)
                    let frontier = [v_qr]
                    let explored = new Set()
                    let nearest = []
                    let curr
                    while (frontier.length) {
                        curr = frontier.shift()
                        if (!this._places[curr.st()]) break
                        // this._re_place_on_remove[curr.st()].push(id)
                        if (!explored.has(curr.st())) {
                            explored.add(curr.st())
                            nearest.push(curr)
                            rand.shuffle(hf.adj(curr)).forEach(x => {
                                if (!explored.has(x.st())) {
                                    frontier.push(x)
                                }
                            })
                        }
                    }
                    this._inputs[id] = position
                    this._places[curr.st()] = id
                    this._id_to_place[id] = curr
                    // this._re_place_on_remove[curr.st()] = []

                    log('placed', v_qr, id, curr)

                    return this.field.to_cartesian(curr)
                }
                places() {
                    return Object.keys(this._places).length
                }
                ids() {
                    return Object.keys(this._id_to_place)
                }
                place_for_id(id) {
                    return this._id_to_place[id]
                }
                input_for_id(id) {
                    return this._inputs[id]
                }
                remove(id) {
                    const place = this._id_to_place[id]
                    if (place) {
                        // const re_places = this._re_place_on_remove[place]

                        // delete this._inputs[id]
                        // delete this._places[place.st()]
                        // delete this._id_to_place[id]

                        // re_places?.map(r_id => {
                        //     const r_place = this._id_to_place[r_id]
                        //     this.remove(r_id)
                        //     this.add(r_id, r_place)
                        // })

                        delete this._inputs[id]
                        delete this._places[place.st()]
                        delete this._id_to_place[id]

                        // TODO non O(n) solution
                        const id_to_input = Object.entries(this._inputs)
                        this.clear()
                        id_to_input.map(([id, input]) => this.add(id, input))

                        return true
                    }
                    return false
                }
                clear() {
                    this._inputs = {}
                    this._places = {}
                    this._id_to_place = {}
                }
            }
        }
        names.map(name => window[name] = merge(definition, {
            version, v:version, [name]:version, t:Date.now()
        }))
        log('loaded')
    }
}
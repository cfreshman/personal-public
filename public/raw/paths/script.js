/* global ol:readonly jsts:readonly PriorityQueue:readonly $ on store */

//#region map init
let mouse
const mousePositionControl = new ol.control.MousePosition({
    coordinateFormat: ol.coordinate.createStringXY(2),
});
const dragPan = new ol.interaction.DragPan({})
const dragPan2 = new ol.interaction.DragPan({
    condition: function(e) {
        return this.getPointerCount() === 2
    },
})
const map = new ol.Map({
    layers: [],
    target: 'map',
    // controls: [mousePositionControl],
    controls: [],
    view: new ol.View({
        center: [40, 30],
        resolution: .25,
    }),
    interactions: ol.interaction.defaults({
        doubleClickZoom: false,
        dragPan: false,
    }).extend([
        dragPan,
        dragPan2,
    ]),
})
map.on('pointermove', e => {
    mouse = e.coordinate
})
const wktReader = new jsts.io.WKTReader()
const olParser = new jsts.io.OL3Parser()
//#endregion

//#region geom init
const GF = new jsts.geom.GeometryFactory(new jsts.geom.PrecisionModel())
const BufferOp = jsts.operation.buffer.BufferOp
const BufferParameters = jsts.operation.buffer.BufferParameters
const defaultBufferParameters = new BufferParameters(
    1,
    BufferParameters.CAP_SQUARE,
    BufferParameters.JOIN_MITRE,
    BufferParameters.DEFAULT_MITRE_LIMIT
)
const roundBufferParameters = new BufferParameters(
    4,
    BufferParameters.CAP_ROUND,
    BufferParameters.JOIN_ROUND,
    BufferParameters.DEFAULT_MITRE_LIMIT
)
const buffer = (g, distance=clearance/2, parameters=defaultBufferParameters) =>
    BufferOp.bufferOp(g, distance, parameters)
const createPoint = (x_or_point, y, radius=clearance/2) => {
    const point = y ? GF.createPoint(new jsts.geom.Coordinate(x_or_point, y)) : x_or_point
    return radius ? point.buffer(radius) : point
}
const coordsToGeom = (coords, radius=clearance/2) => {
    if (!coords) return undefined
    if (coords.length === 1) return createPoint(coords.x, coords.y, radius)
    const line = GF.createLineString(coords)
    return radius ? line.buffer(radius) : line
}
const pointsToGeometry = (points, radius=clearance/2, type=column.type) => {
    const parameters = type === 'square' ? defaultBufferParameters : roundBufferParameters
    return points.length < 2
        ? points[0]
        : points[0].equals(points.peek(-1))
        ? buffer(GF.createPolygon(points.map(g => g.getCentroid().getCoordinate())), radius, parameters)
        : buffer(GF.createLineString(points.map(g => g.getCentroid().getCoordinate())), radius, parameters)
}
const toCollection = geometries => GF.createGeometryCollection(geometries)
const splitCollection = collection => Array
    .from({ length: collection.getNumGeometries() })
    .map((_, i) => collection.getGeometryN(i))
const geometryStore = {
    get: key => {
        const value = store.get(key)
        return value
            ? wktReader.read(value)
            : undefined
    },
    set: (key, geometry) => {
        store.set(key, geometry.toText())
    },
    clear: store.clear
}
//#endregion

function visualize(layers) {
    const colors = [
        [[255, 200, 0, 1], 'black'],   // yellow - structure
        // [[0, 0, 255, 0.2], '#0001'],   // blue - graph
        [[0, 64, 255, 0.2], '#0001'],   // blue - graph
        [[0, 150, 0, 0.5], '#0001'],   // green - start
        [[255, 0, 0, 0.5], 'black'],   // red - goal
    ]

    const colorToStyle = color => new ol.style.Style({
        fill: new ol.style.Fill({
            color: color[0],
        }),
        stroke: new ol.style.Stroke({
            color: color[1],
            width: 1,
        })
    })

    map.setLayers(layers.map((geometries, i) => new ol.layer.Vector({
        source: new ol.source.Vector({
            features: (geometries instanceof Array ? geometries : [geometries])
                .filter(g => g)
                .map(g => new ol.Feature(olParser.write(g)))
        }),
        style: colorToStyle(colors[i % colors.length])
    })))
}

// store.clear('paths-map')
store.clear('paths-start')
store.clear('paths-goal')
let isEdit = false
let fixed = false
let funnelstar = true
let slot = 1
let clearance = 1
let column = {
    type: 'square',
    width: 1,
}
async function demo() {
    map.getView().fit([-5, -5, 85, 65])
    let obstacles
    const loadMap = () => {
        // obstacles = splitCollection(
        //     geometryStore.get(`paths-map${slot === 1 ? '' : slot}`)
        //     ?? buffer(wktReader.read(wallWkt), .5))
        obstacles = splitCollection(
            geometryStore.get(`paths-map${slot === 1 ? '' : slot}`)
            ?? wktReader.read(defaultWkt))
    }
    const saveMap = () => {
        geometryStore.set(`paths-map${slot === 1 ? '' : slot}`, toCollection(obstacles))
    }
    const clearMap = () => {
        geometryStore.clear(`paths-map${slot === 1 ? '' : slot}`)
    }
    loadMap()
    let graph, path, funnelPath

    let pointer = false
    const request = {
        start: false,
        goal: false,
    }
    const edit = {
        hover: false,
        selected: [],
        wall: false,
        preview: false,
    }

    request.start = geometryStore.get('paths-start') ?? createPoint(2, 2)
    request.goal = geometryStore.get('paths-goal') ?? createPoint(78, 58)
    const generate = async () => {
        $('#generating').style.display = ''
        return new Promise(resolve => {
            setTimeout(() => {
                const start = performance.now()
                graph = new TriangulationGraph(obstacles)
                // re-create start/goal with correct clearance
                console.debug(request.start, request.start.getCentroid())
                if (request.start) request.start = createPoint(request.start.getCentroid())
                if (request.goal) request.goal = createPoint(request.goal.getCentroid())
                console.log(`${graph.vertices.length} vertices ${(performance.now() - start).toFixed(0)}ms`)
                $('#generating').style.display = 'none'
                resolve()
            }, 100)
        })
    }
    const plan = async () => {
        geometryStore.set('paths-start', request.start)
        geometryStore.set('paths-goal', request.goal)
        const start = performance.now()
        // path = FunnelAStar(graph, request.start, request.goal)
        path = funnelstar
            ? FunnelAStar(graph, request.start, request.goal)
            : TriangulationAStar(graph, request.start, request.goal)
        const funnel = Funnel.get(request.start, request.goal, path)
        funnelPath = funnel.path
        console.log(`${funnel.cost.toFixed(2)}m ${(performance.now() - start).toFixed(0)}ms`)
        return Promise.resolve()
    }
    await generate()
    await plan()
    let left = false, right = false

    const render = async () => {
        if (isEdit) {
            visualize([
                [...obstacles, edit.preview ? edit.preview : edit.hover],
                [],
                [...(edit.wall ? [edit.hover] : edit.selected)],
                []])
        } else {
            visualize([
                obstacles,
                [...graph.vertices.map(v => v.geometry),
                    // ...graph.vertices
                    //     .flatMap(v => Array.from(v.outgoing.keys()).map(other =>
                    //         coordsToGeom([v, other]
                    //             .map(e => e.position.getCoordinate()),
                    //             .1))),
                    // ...path.map(v => v.geometry),
                ],
                [request.start,
                    ...path.map(v => v.geometry),
                    // coordsToGeom(path.map(v => v.position.getCoordinate())),
                    // coordsToGeom(funnelPath),
                    coordsToGeom(left),
                    coordsToGeom(right),
                ],
                [request.goal,
                    coordsToGeom(funnelPath),
                ]])
        }
    }
    render()

    let pathVis = path.slice()
    let funnel = new Funnel(request.start)
    let visPath_i = 51
    const visPath = (i) => {
        Array.from({ length: i }).map(() => funnel.add(pathVis.shift()))
        funnelPath = funnel._tail
        left = [funnelPath.peek(-1), ...funnel._left]
        right = [funnelPath.peek(-1), ...funnel._right]
        render()
    }
    window.addEventListener('keypress', e => {
        if (e.key === '1') {
            funnel = new Funnel(request.start)
            pathVis = path.slice()
            visPath_i -= 1
            visPath(visPath_i)
        } else if (e.key === '2') {
            visPath_i += 1
            visPath(1)
        }
    })
    // visPath(visPath_i)

    on($('#fixed'), 'click', () => fixed = !fixed)
    on($('#clearance'), 'change', async e => {
        clearance = Number(e.target.value)
        await generate()
        await plan()
        render()
    })
    on($('#funnelstar'), 'click', async () => {
        funnelstar = !funnelstar
        await plan()
        render()
    })
    const toggleEdit = () => {
        isEdit = !isEdit
        $('#info-view').style.display = isEdit ? 'none' : 'table'
        $('#info-edit').style.display = isEdit ? 'table' : 'none'
        edit.hover = false
        edit.selected = []
        edit.wall = false
        edit.preview = false
        map.removeInteraction(dragPan)
        map.addInteraction(dragPan)
        render()
    }
    on($('#edit'), 'click', toggleEdit)
    on($('#cancel'), 'click', e => {
        loadMap()
        toggleEdit()
    })
    on($('#delete'), 'click', e => {
        edit.selected.map(g => {
            // remove any obstacles behind this one too
            const index = obstacles.indexOf(g)
            if (index > 0) {
                const checkIfCovered = obstacles.slice(0, index)
                checkIfCovered.forEach(other => {
                    if (g.covers(other)) {
                        obstacles.remove(other)
                    }
                })
            }
            obstacles.remove(g)
        })
        edit.selected = []
        edit.hover = false
        edit.wall = false
        edit.preview = false
        map.removeInteraction(dragPan)
        map.addInteraction(dragPan)
        render()
    })
    on($('#save'), 'click', async e => {
        saveMap()
        await generate()
        await plan()
        toggleEdit()
    })
    on($('#reset'), 'click', e => {
        // obstacles = splitCollection(buffer(wktReader.read(wallWkt), .5))
        obstacles = splitCollection(wktReader.read(defaultWkt))
        render()
    })
    const importInputEl = $('#import input')
    on($('#import'), 'click', e => {
        importInputEl.click()
    })
    on(importInputEl, 'change', e => {
        console.log(importInputEl.files)
        const reader = new FileReader()
        reader.onload = e => {
            obstacles = splitCollection(wktReader.read(reader.result))
            render()
            importInputEl.value = ''
        }
        reader.readAsText(importInputEl.files[0])
    })
    const exportLinkEl = $('#export')
    on(exportLinkEl, 'click', e => {
        const wkt = toCollection(obstacles).toText()
        const file = new Blob([wkt], { type: 'wkt' });
        exportLinkEl.href = URL.createObjectURL(file);
        exportLinkEl.download = `paths_slot_${slot}.wkt`;
    })
    const slotEl = $('#slot')
    const slots = store.get('paths-slots') ?? [true]
    const renderSlots = () => {
        slotEl.innerHTML = `
        ${slots.map((v, i) => v
            ? `<option value="${i+1}">map ${i+1}</option>`
            : '')}
        <option value="new">new map</option>
        <option value="delete">delete</option>
        `
        slotEl.value = slot
        store.set('paths-slots', slots)
    }
    renderSlots()
    on(slotEl, 'change', async e => {
        switch (e.target.value) {
            case 'new':
                {
                    slot = 1
                    while (slots[slot-1]) slot++
                    slots[slot-1] = true
                }
                break
            case 'delete':
                {
                    clearMap()
                    slots[slot-1] = false
                    slot = 1
                    while (!slots[slot-1] && slot < slots.length) slot++
                    if (slot >= slots.length) {
                        slot = 1
                        slots[slot-1] = true
                    }
                }
                break
            default:
                slot = Number(e.target.value)
        }
        renderSlots()
        loadMap()
        await generate()
        await plan()
        render()
    })
    on($('#column-width'), 'change', async e => {
        column.width = Number(e.target.value)
        console.debug('COLUMN', column)
    })
    on($('#column-type'), 'change', async e => {
        column.type = e.target.value
        console.debug('COLUMN', column)
    })

    let touches = 0
    on(window, 'touchstart', e => touches = e.touches.length)
    const createEventPointerGeoemtry = e => {
        pointer = column.type === 'square'
        ? buffer(createPoint(...e.coordinate.map(Math.round), 0), column.width / 2)
        : createPoint(...e.coordinate.map(Math.round), column.width / 2)
        return pointer
    }
    let clickStart
    map.on('pointermove', e => {
        clickStart = false
        // if (!e.dragging) {
        //     pointer = createPoint(...e.coordinate)
        //     hover = triangles.filter(g => g.intersects(pointer.getCentroid()))[0]
        //     render()
        // }
        if (isEdit && touches < 2 && (!e.dragging || edit.wall)) {
            pointer = createEventPointerGeoemtry(e)
            if (!edit.hover || !edit.hover.equals(pointer)) {
                edit.hover = pointer
                // obstacles.remove(edit.preview)
                if (edit.wall) {
                    edit.preview = pointsToGeometry([
                        ...edit.wall,
                        edit.hover,
                    ], column.width/2)
                    // obstacles.push(edit.preview)
                } else {
                    edit.preview = false
                }
                render()
            }
        }
    })
    const handleClick = async (e, hold=false) => {
        clickStart = false
        if (!isEdit) {
            const point = createPoint(...e.coordinate)
            if (!graph.query(point)) return
            if (request.goal) {
                if (!fixed) request.start = false
                request.goal = false
            }
            if (!request.start) {
                request.start = point
            } else if (!request.goal) {
                request.goal = point
                await plan()
            }
            render()
        } else {
            console.debug(column)
            pointer = createEventPointerGeoemtry(e)
            edit.hover = pointer
            const select = !hold && obstacles.filter(o => o.intersects(pointer))[0]
            if (edit.wall) {
                const current = pointsToGeometry(edit.wall, column.width/2)
                edit.wall.push(pointer)
                if (pointer.getCentroid().intersects(current)) {
                    const actual = pointsToGeometry(edit.wall, column.width/2)
                    obstacles.push(actual)
                    edit.wall = false
                    map.addInteraction(dragPan)
                    edit.selected = [actual]
                    edit.preview = false
                }
            } else if (select) {
                if (e.originalEvent.shiftKey) {
                    edit.selected.push(select)
                } else {
                    edit.selected = [select]
                }
                if (select.equals(pointer)) {
                    obstacles.remove(select)
                    edit.wall = [select]
                    map.removeInteraction(dragPan)
                }
            } else {
                obstacles.push(pointer)
                // edit.selected = pointer
            }
            render()
        }
    }
    map.on('click', handleClick)
    map.on('pointerdown', async e => {
        const instance = Date.now()
        clickStart = instance
        setTimeout(() => {
            if (clickStart === instance) handleClick(e, true)
        }, 500)
    })
}

class TriangulationGraph {
    vertices
    _sideToGroup
    _quadtree
    constructor(obstacles) {
        let last = performance.now()
        let i = 0
        const perf = () => {
            console.log(
            `${i++} ${(performance.now() - last).toFixed(0)}ms`)
            last = performance.now()
        }
        perf()
        const buffered = obstacles.map(x => buffer(x, clearance/2))
        const keepout = toCollection(buffered).union()
        perf()
        const cdt = new jsts.triangulate.ConformingDelaunayTriangulationBuilder()
        cdt.setConstraints(keepout)
        cdt.setSites(keepout)
        cdt.setTolerance(0.01)
        let triangles = splitCollection(cdt.getTriangles(GF))
        perf()
        // triangles = triangles.filter(g => !g.getCentroid().intersects(keepout))
        // triangles = triangles.filter(g => {
        //     const center = g.getCentroid()
        //     return !obstacles.some(o => o.intersects(center))
        // })
        // triangles = triangles.filter(g => !obstacles.some(o => o.intersects(g)))
        triangles = triangles.filter(g => {
            const center = g.getCentroid()
            return !buffered.some(o => o.covers(center))
        })
        // const tree = new jsts.index.quadtree.Quadtree()
        // triangles.map(t => tree.insert(t.getEnvelopeInternal(), t))
        // const keep = new Set(triangles)
        // obstacles.map(o => {
        //     const possible = tree.query(o.getEnvelopeInternal()).toArray()
        //     possible.map(t => {
        //         if (o.intersects(t)) {
        //             keep.delete(t)
        //         }
        //     })
        // })
        // triangles = [...keep]
        perf()

        this.vertices = []
        this._sideToGroup = {}
        this._quadtree = new jsts.index.quadtree.Quadtree()

        triangles.map(triangle => this._add(triangle))
        perf()
    }

    query(geometry) {
        const point = geometry.getCentroid()
        return this.vertices.filter(v => v.geometry.intersects(point))[0]
    }

    _add(triangle) {
        const vertex = new TriangulationVertex(triangle)
        const sides = triangle.getCoordinates().slice(1).map((c, i, arr) => {
            const next = arr[(i + 1)%arr.length]
            const side = [c, next]
            return side
        })
        const sideHashes = sides.map(side => `${[...new Set(side)].sort()}`)
        sideHashes.map(sideHash => {
            if (this._sideToGroup[sideHash]) {
                this._sideToGroup[sideHash].map(other => vertex.connect(other))
                this._sideToGroup[sideHash].push(vertex)
            } else {
                this._sideToGroup[sideHash] = [vertex]
            }
        })
        this.vertices.push(vertex)
    }
}
class TriangulationVertex {
    position
    geometry
    outgoing
    incoming
    constructor(triangle) {
        this.position = triangle.getCentroid()
        this.geometry = triangle
        this.outgoing = new Map()
        this.incoming = new Map()
    }

    connect(other) {
        // this.outgoing.set(other) = other.incoming[this] = new TriangulationEdge(this, other)
        // this.incoming[other] = other.outgoing[this] = new TriangulationEdge(other, this)
        const outgoing = new TriangulationEdge(this, other)
        this.outgoing.set(other, outgoing)
        other.incoming.set(this, outgoing)
        const incoming = new TriangulationEdge(other, this)
        this.incoming.set(other, incoming)
        other.outgoing.set(this, incoming)
    }
}
class TriangulationEdge {
    source
    destination
    weight
    constructor(source, destination, weight=undefined) {
        this.source = source
        this.destination = destination
        this.weight = weight
            ?? source.position.distance(destination.position)
    }
}

const TriangulationAStar = (graph, start, goal) => {
    class SearchNode {
        previous
        cost
        priority
        vertex
        constructor(vertex, previous=false) {
            this.previous = previous
            if (previous) {
                this.cost =
                    previous.cost
                    + previous.vertex.outgoing.get(vertex).weight
            } else {
                this.cost = 0
            }
            this.priority = this.cost + vertex.position.distance(goal)
            this.vertex = vertex
        }
    }

    const startVertex = graph.query(start)
    const goalVertex = graph.query(goal)
    if (!startVertex || !goalVertex) return []

    const explored = new Set()
    const frontier = new PriorityQueue({
        comparator: (a, b) => a.priority - b.priority,
    })
    frontier.queue(new SearchNode(startVertex))
    while (frontier.length) {
        const curr = frontier.dequeue()
        if (curr.vertex === goalVertex) {
            // return path to this node
            const path = []
            let node = curr
            while (node) {
                path.push(node.vertex)
                node = node.previous
            }
            return path.reverse()
        }
        explored.add(curr.vertex)
        curr.vertex.outgoing.forEach((_, neighbor) => {
            if (!explored.has(neighbor)) {
                frontier.queue(new SearchNode(neighbor, curr))
            }
        })
    }
    return []
}

class Funnel {
    _tail
    _left
    _right
    _previous
    path
    cost
    constructor(start=undefined) {
        this._tail = start ? [start.getCentroid().getCoordinate()] : []
        this._left = []
        this._right = []
        this._previous = false
        this.path = false
        this.cost = 0
    }
    static get(start, goal, vertices) {
        const funnel = new Funnel(start)
        vertices.map(v => funnel.add(v))
        funnel.close(goal)
        return funnel
    }
    add(vertex) {
        if (this._previous) {
            const side = this._previous.intersection(vertex.geometry)
            const coords = side.getCoordinates()
            // console.log(coords)
            if (Funnel._crosses(
                this._previous.getCentroid().getCoordinate(),
                coords[0],
                coords[1],
                true)) {

                coords.reverse()
            }
            this._add(coords[0], coords[1])
        }
        this._previous = vertex.geometry
        return this
    }
    close(goal) {
        if (!this._previous || !this._previous.intersects(goal)) {
            this.path = []
            return
        }
        const coord = goal.getCentroid().getCoordinate()
        this._add(coord, coord)
        this.path = this._tail
        return this
    }
    copy() {
        const copy = new Funnel()
        copy._tail = this._tail.slice()
        copy._left = this._left.slice()
        copy._right = this._right.slice()
        copy._previous = this._previous
        copy.path = this.path
        copy.cost = this.cost
        return copy
    }
    _add(left, right) {
        // console.log('ADD', left, right, this._tail.slice(), this._left.slice(), this._right.slice())
        let i = this._tail.length
        Funnel._side(left, this._left, this._right, this._tail, true)
        Funnel._side(right, this._right, this._left, this._tail, false)
        for (; i < this._tail.length; i++) {
            this.cost += this._tail[i-1].distance(this._tail[i])
        }
    }
    static _side(next, side, other, tail, isLeft) {
        if (!next.equals(side.peek(-1) || tail.peek(-1))) {
            // while left is to right of last left point, remove that point
            while (side.length && !Funnel._crosses(
                side.peek(-2) || tail.peek(-1),
                side.peek(-1),
                next,
                isLeft)) {

                // console.log('POP', isLeft,
                //     side.peek(-2) || tail.peek(-1),
                //     side.peek(-1),
                //     next)
                side.pop()
            }
            // while left crosses first right point, move right to tail
            while (Funnel._crosses(
                tail.peek(-1),
                other[0],
                next,
                !isLeft)) {

                // console.log('SHIFT', isLeft,
                //     next, side.slice(), other.slice(), tail.slice())
                tail.push(other.shift())
                // if (tail.peek(-1).equals(tail.peek(-2))) tail.pop()
            }
            // add to left
            side.push(next)
        }
    }
    static _crosses(apex, other, side, toCCW) {
        // if (!side.length) throw 'side is empty'
        // if (!side.length || !other.length) return false
        if (!other || !side) return false
        const ccw = jsts.algorithm.Angle.angleBetweenOriented(
            /* p1 */    other,
            /* apex */  apex,
            /* p2 */    side)
        const crosses = (toCCW ? ccw : -ccw) >= 0
        // console.log(crosses, ccw * 180/3.14)
        return crosses
    }
}

const FunnelAStar = (graph, start, goal) => {
    start = start.getCentroid()
    goal = goal.getCentroid()
    const startVertex = graph.query(start)
    const goalVertex = graph.query(goal)
    if (!startVertex || !goalVertex) return []

    const goalCoord = goal.getCoordinate()
    class SearchNode {
        previous
        priority
        vertex
        funnel
        constructor(vertex, previous=false) {
            this.previous = previous
            if (previous) {
                this.funnel = previous.funnel.copy().add(vertex)
            } else {
                this.funnel = new Funnel(start)
            }
            // use distance from tail through nearest point in vertex to line from tail to goal
            const nearestPoint = jsts.operation.distance.DistanceOp.nearestPoints(
                coordsToGeom([
                    this.funnel._tail.peek(-1),
                    goalCoord
                ], 0),
                vertex.geometry
            )[1]
            this.priority = this.funnel.cost
                // + this.funnel._tail.peek(-1).distance(goalCoord)
                + this.funnel._tail.peek(-1).distance(nearestPoint)
                + nearestPoint.distance(goalCoord)
            this.vertex = vertex
        }
    }

    const explored = new Set()
    const frontier = new PriorityQueue({
        comparator: (a, b) => a.priority - b.priority,
    })
    frontier.queue(new SearchNode(startVertex))
    while (frontier.length) {
        const curr = frontier.dequeue()
        if (curr.vertex === goalVertex) {
            // return path to this node
            const path = []
            let node = curr
            while (node) {
                path.push(node.vertex)
                node = node.previous
            }
            return path.reverse()
        }
        explored.add(curr.vertex)
        curr.vertex.outgoing.forEach((_, neighbor) => {
            if (!explored.has(neighbor)) {
                frontier.queue(new SearchNode(neighbor, curr))
            }
        })
    }
    return []
}

const defaultWkt = `GEOMETRYCOLLECTION (POLYGON ((-0.5 60.5, 80.5 60.5, 80.5 -0.5, -0.5 -0.5, -0.5 60.5), (0.5 59.5, 0.5 0.5, 79.5 0.5, 79.5 59.5, 0.5 59.5)), POLYGON ((-0.5 60.5, 80.5 60.5, 80.5 -0.5, -0.5 -0.5, -0.5 60.5), (0.5 59.5, 0.5 0.5, 79.5 0.5, 79.5 59.5, 0.5 59.5)), POLYGON ((41.5 1, 41.5 0.5, 40.5 0.5, 40.5 23, 40.5 23.5, 41.5 23.5, 41.5 1)), POLYGON ((79 30.5, 79.5 30.5, 79.5 29.5, 48 29.5, 47.5 29.5, 47.5 30.5, 79 30.5)), POLYGON ((75.5 59, 75.5 59.5, 76.5 59.5, 76.5 57, 76.5 56.5, 75.5 56.5, 75.5 59)), POLYGON ((73.5 57.5, 73.5 56.5, 72.5 56.5, 72.5 57.5, 73.5 57.5)), POLYGON ((73.5 54.5, 73.5 53.5, 72.5 53.5, 72.5 54.5, 73.5 54.5)), POLYGON ((73.5 51.5, 73.5 50.5, 72.5 50.5, 72.5 51.5, 73.5 51.5)), POLYGON ((70.5 54.5, 70.5 53.5, 69.5 53.5, 69.5 54.5, 70.5 54.5)), POLYGON ((70.5 51.5, 70.5 50.5, 69.5 50.5, 69.5 51.5, 70.5 51.5)), POLYGON ((70.5 57.5, 70.5 56.5, 69.5 56.5, 69.5 57.5, 70.5 57.5)), POLYGON ((70.5 36.5, 70.5 35.5, 69.5 35.5, 69.5 36.5, 70.5 36.5)), POLYGON ((67.5 48.5, 67.5 47.5, 66.5 47.5, 66.5 48.5, 67.5 48.5)), POLYGON ((67.5 51.5, 67.5 50.5, 66.5 50.5, 66.5 51.5, 67.5 51.5)), POLYGON ((64.5 42.5, 64.5 41.5, 63.5 41.5, 63.5 42.5, 64.5 42.5)), POLYGON ((69 57.5, 69.5 57.5, 69.5 56.5, 67 56.5, 66.5 56.5, 66.5 57.5, 69 57.5)), POLYGON ((66.5 56, 66.5 56.5, 67.5 56.5, 67.5 54, 67.5 53.5, 66.5 53.5, 66.5 56)), POLYGON ((66 51.5, 66.5 51.5, 66.5 50.5, 64 50.5, 63.5 50.5, 63.5 51.5, 66 51.5)), POLYGON ((63.5 50, 63.5 50.5, 64.5 50.5, 64.5 48, 64.5 47.5, 63.5 47.5, 63.5 50)), POLYGON ((76.5 52, 76.5 51.5, 75.5 51.5, 75.5 54, 75.5 54.5, 76.5 54.5, 76.5 52)), POLYGON ((74 50.5, 73.5 50.5, 73.5 51.5, 76 51.5, 76.5 51.5, 76.5 50.5, 74 50.5)), POLYGON ((75.5 50, 75.5 50.5, 76.5 50.5, 76.5 48, 76.5 47.5, 75.5 47.5, 75.5 50)), POLYGON ((75.5 47, 75.5 47.5, 76.5 47.5, 76.5 45, 76.5 44.5, 75.5 44.5, 75.5 47)), POLYGON ((76.5 40, 76.5 39.5, 75.5 39.5, 75.5 42, 75.5 42.5, 76.5 42.5, 76.5 40)), POLYGON ((76.5 37, 76.5 36.5, 75.5 36.5, 75.5 39, 75.5 39.5, 76.5 39.5, 76.5 37)), POLYGON ((76.5 34, 76.5 33.5, 75.5 33.5, 75.5 36, 75.5 36.5, 76.5 36.5, 76.5 34)), POLYGON ((76.5 31, 76.5 30.5, 75.5 30.5, 75.5 33, 75.5 33.5, 76.5 33.5, 76.5 31)), POLYGON ((75 33.5, 75.5 33.5, 75.5 32.5, 73 32.5, 72.5 32.5, 72.5 33.5, 75 33.5)), POLYGON ((72.5 38, 72.5 38.5, 73.5 38.5, 73.5 36, 73.5 35.5, 72.5 35.5, 72.5 38)), POLYGON ((71 38.5, 70.5 38.5, 70.5 39.5, 73 39.5, 73.5 39.5, 73.5 38.5, 71 38.5)), POLYGON ((69.5 41, 69.5 41.5, 70.5 41.5, 70.5 39, 70.5 38.5, 69.5 38.5, 69.5 41)), POLYGON ((72 42.5, 72.5 42.5, 72.5 41.5, 70 41.5, 69.5 41.5, 69.5 42.5, 72 42.5)), POLYGON ((72.5 44, 72.5 44.5, 73.5 44.5, 73.5 42, 73.5 41.5, 72.5 41.5, 72.5 44)), POLYGON ((72.5 47, 72.5 47.5, 73.5 47.5, 73.5 45, 73.5 44.5, 72.5 44.5, 72.5 47)), POLYGON ((71 47.5, 70.5 47.5, 70.5 48.5, 73 48.5, 73.5 48.5, 73.5 47.5, 71 47.5)), POLYGON ((69.5 50, 69.5 50.5, 70.5 50.5, 70.5 48, 70.5 47.5, 69.5 47.5, 69.5 50)), POLYGON ((67.5 31, 67.5 30.5, 66.5 30.5, 66.5 33, 66.5 33.5, 67.5 33.5, 67.5 31)), POLYGON ((63.5 38, 63.5 38.5, 64.5 38.5, 64.5 36, 64.5 35.5, 63.5 35.5, 63.5 38)), POLYGON ((63.5 41, 63.5 41.5, 64.5 41.5, 64.5 39, 64.5 38.5, 63.5 38.5, 63.5 41)), POLYGON ((69.5 35, 69.5 35.5, 70.5 35.5, 70.5 33, 70.5 32.5, 69.5 32.5, 69.5 35)), POLYGON ((67.5 36.5, 67.5 35.5, 66.5 35.5, 66.5 36.5, 67.5 36.5)), POLYGON ((67.5 39.5, 67.5 38.5, 66.5 38.5, 66.5 39.5, 67.5 39.5)), POLYGON ((63.5 35, 63.5 35.5, 64.5 35.5, 64.5 33, 64.5 32.5, 63.5 32.5, 63.5 35)), POLYGON ((56 16, 55.903926402016154 15.024548389919358, 55.61939766255644 14.08658283817455, 55.15734806151273 13.22214883490199, 54.53553390593274 12.464466094067262, 53.777851165098014 11.842651938487274, 52.91341716182545 11.380602337443566, 51.97545161008064 11.096073597983848, 51 11, 50.02454838991936 11.096073597983848, 49.08658283817455 11.380602337443566, 48.222148834901986 11.842651938487274, 47.46446609406726 12.464466094067262, 46.84265193848727 13.22214883490199, 46.38060233744356 14.08658283817455, 46.096073597983846 15.024548389919357, 46 16, 46.096073597983846 16.975451610080643, 46.38060233744356 17.91341716182545, 46.84265193848727 18.77785116509801, 47.46446609406726 19.535533905932738, 48.222148834901986 20.157348061512728, 49.08658283817455 20.61939766255643, 50.02454838991936 20.90392640201615, 51 21, 51.97545161008064 20.903926402016154, 52.91341716182545 20.619397662556434, 53.77785116509801 20.157348061512728, 54.53553390593274 19.535533905932738, 55.15734806151273 18.77785116509801, 55.61939766255643 17.913417161825453, 55.903926402016154 16.975451610080643, 56 16)), POLYGON ((64 23, 63.94235584120969 22.414729033951616, 63.77163859753386 21.85194970290473, 63.49440883690764 21.333289300941193, 63.121320343559645 20.878679656440358, 62.666710699058804 20.505591163092365, 62.14805029709527 20.228361402466142, 61.585270966048384 20.05764415879031, 61 20, 60.414729033951616 20.05764415879031, 59.85194970290473 20.228361402466142, 59.333289300941196 20.505591163092365, 58.878679656440355 20.878679656440358, 58.50559116309236 21.333289300941193, 58.22836140246614 21.85194970290473, 58.05764415879031 22.414729033951613, 58 23, 58.05764415879031 23.585270966048384, 58.22836140246614 24.14805029709527, 58.50559116309236 24.666710699058807, 58.878679656440355 25.121320343559642, 59.333289300941196 25.494408836907635, 59.851949702904726 25.771638597533858, 60.414729033951616 25.94235584120969, 61 26, 61.585270966048384 25.94235584120969, 62.14805029709527 25.771638597533858, 62.666710699058804 25.49440883690764, 63.121320343559645 25.121320343559642, 63.49440883690764 24.666710699058807, 63.77163859753386 24.14805029709527, 63.94235584120969 23.585270966048387, 64 23)), POLYGON ((70 7, 69.94235584120969 6.414729033951615, 69.77163859753387 5.851949702904731, 69.49440883690764 5.3332893009411935, 69.12132034355965 4.878679656440358, 68.66671069905881 4.505591163092364, 68.14805029709527 4.22836140246614, 67.58527096604838 4.057644158790309, 67 4, 66.41472903395162 4.057644158790309, 65.85194970290473 4.22836140246614, 65.33328930094119 4.5055911630923635, 64.87867965644035 4.878679656440357, 64.50559116309236 5.3332893009411935, 64.22836140246613 5.85194970290473, 64.05764415879031 6.414729033951614, 64 7, 64.05764415879031 7.585270966048385, 64.22836140246613 8.148050297095269, 64.50559116309236 8.666710699058806, 64.87867965644035 9.121320343559642, 65.33328930094119 9.494408836907635, 65.85194970290473 9.77163859753386, 66.41472903395162 9.942355841209691, 67 10, 67.58527096604838 9.942355841209691, 68.14805029709527 9.77163859753386, 68.66671069905881 9.494408836907636, 69.12132034355965 9.121320343559642, 69.49440883690764 8.666710699058807, 69.77163859753387 8.14805029709527, 69.94235584120969 7.585270966048386, 70 7)), POLYGON ((73.5 24, 73.47117792060484 23.707364516975808, 73.38581929876693 23.425974851452366, 73.24720441845382 23.166644650470598, 73.06066017177982 22.939339828220177, 72.8333553495294 22.75279558154618, 72.57402514854763 22.61418070123307, 72.2926354830242 22.528822079395155, 72 22.5, 71.7073645169758 22.528822079395155, 71.42597485145237 22.61418070123307, 71.1666446504706 22.75279558154618, 70.93933982822018 22.939339828220177, 70.75279558154618 23.166644650470598, 70.61418070123307 23.425974851452366, 70.52882207939516 23.707364516975808, 70.5 24, 70.52882207939516 24.292635483024192, 70.61418070123307 24.574025148547634, 70.75279558154618 24.833355349529402, 70.93933982822018 25.060660171779823, 71.1666446504706 25.24720441845382, 71.42597485145237 25.38581929876693, 71.7073645169758 25.471177920604845, 72 25.5, 72.2926354830242 25.471177920604845, 72.57402514854763 25.38581929876693, 72.8333553495294 25.24720441845382, 73.06066017177982 25.060660171779823, 73.24720441845382 24.833355349529402, 73.38581929876693 24.574025148547637, 73.47117792060484 24.292635483024192, 73.5 24)), POLYGON ((76.5 17, 76.47117792060484 16.707364516975808, 76.38581929876693 16.425974851452366, 76.24720441845382 16.166644650470598, 76.06066017177982 15.939339828220179, 75.8333553495294 15.752795581546183, 75.57402514854763 15.614180701233071, 75.2926354830242 15.528822079395155, 75 15.5, 74.7073645169758 15.528822079395155, 74.42597485145237 15.614180701233071, 74.1666446504706 15.752795581546183, 73.93933982822018 15.939339828220179, 73.75279558154618 16.166644650470598, 73.61418070123307 16.425974851452366, 73.52882207939516 16.707364516975808, 73.5 17, 73.52882207939516 17.292635483024192, 73.61418070123307 17.574025148547634, 73.75279558154618 17.833355349529402, 73.93933982822018 18.060660171779823, 74.1666446504706 18.24720441845382, 74.42597485145237 18.38581929876693, 74.7073645169758 18.471177920604845, 75 18.5, 75.2926354830242 18.471177920604845, 75.57402514854763 18.38581929876693, 75.8333553495294 18.24720441845382, 76.06066017177982 18.060660171779823, 76.24720441845382 17.833355349529402, 76.38581929876693 17.574025148547637, 76.47117792060484 17.292635483024192, 76.5 17)), POLYGON ((62.5 15, 62.471177920604845 14.707364516975808, 62.38581929876693 14.425974851452365, 62.24720441845382 14.166644650470596, 62.06066017177982 13.939339828220179, 61.833355349529405 13.752795581546183, 61.57402514854763 13.614180701233071, 61.29263548302419 13.528822079395155, 61 13.5, 60.70736451697581 13.528822079395155, 60.42597485145237 13.614180701233071, 60.166644650470595 13.752795581546183, 59.93933982822018 13.939339828220179, 59.75279558154618 14.166644650470596, 59.61418070123307 14.425974851452365, 59.528822079395155 14.707364516975806, 59.5 15, 59.528822079395155 15.292635483024192, 59.61418070123307 15.574025148547635, 59.75279558154618 15.833355349529404, 59.93933982822018 16.060660171779823, 60.166644650470595 16.24720441845382, 60.42597485145237 16.38581929876693, 60.70736451697581 16.471177920604845, 61 16.5, 61.29263548302419 16.471177920604845, 61.57402514854763 16.38581929876693, 61.833355349529405 16.24720441845382, 62.06066017177982 16.060660171779823, 62.24720441845382 15.833355349529404, 62.38581929876693 15.574025148547635, 62.471177920604845 15.292635483024194, 62.5 15)), POLYGON ((47 4, 46.98078528040323 3.8049096779838716, 46.923879532511286 3.6173165676349104, 46.83146961230255 3.444429766980398, 46.707106781186546 3.2928932188134525, 46.5555702330196 3.1685303876974547, 46.38268343236509 3.076120467488713, 46.19509032201613 3.0192147195967696, 46 3, 45.80490967798387 3.0192147195967696, 45.61731656763491 3.076120467488713, 45.4444297669804 3.1685303876974547, 45.292893218813454 3.2928932188134525, 45.16853038769745 3.444429766980398, 45.076120467488714 3.61731656763491, 45.01921471959677 3.8049096779838716, 45 4, 45.01921471959677 4.195090322016128, 45.076120467488714 4.38268343236509, 45.16853038769745 4.555570233019602, 45.292893218813454 4.707106781186548, 45.4444297669804 4.831469612302545, 45.61731656763491 4.923879532511286, 45.80490967798387 4.98078528040323, 46 5, 46.19509032201613 4.98078528040323, 46.38268343236509 4.923879532511287, 46.5555702330196 4.831469612302546, 46.707106781186546 4.707106781186548, 46.83146961230255 4.555570233019602, 46.923879532511286 4.3826834323650905, 46.98078528040323 4.195090322016129, 47 4)), POLYGON ((55 26, 54.98078528040323 25.804909677983872, 54.923879532511286 25.61731656763491, 54.83146961230255 25.4444297669804, 54.707106781186546 25.292893218813454, 54.5555702330196 25.168530387697455, 54.38268343236509 25.076120467488714, 54.19509032201613 25.019214719596768, 54 25, 53.80490967798387 25.019214719596768, 53.61731656763491 25.076120467488714, 53.4444297669804 25.168530387697455, 53.292893218813454 25.292893218813454, 53.16853038769745 25.4444297669804, 53.076120467488714 25.61731656763491, 53.01921471959677 25.804909677983872, 53 26, 53.01921471959677 26.195090322016128, 53.076120467488714 26.38268343236509, 53.16853038769745 26.5555702330196, 53.292893218813454 26.707106781186546, 53.4444297669804 26.831469612302545, 53.61731656763491 26.923879532511286, 53.80490967798387 26.98078528040323, 54 27, 54.19509032201613 26.980785280403232, 54.38268343236509 26.923879532511286, 54.5555702330196 26.831469612302545, 54.707106781186546 26.707106781186546, 54.83146961230255 26.5555702330196, 54.923879532511286 26.38268343236509, 54.98078528040323 26.195090322016128, 55 26)), POLYGON ((65 17, 64.98078528040323 16.804909677983872, 64.9238795325113 16.61731656763491, 64.83146961230254 16.4444297669804, 64.70710678118655 16.292893218813454, 64.55557023301961 16.168530387697455, 64.38268343236508 16.076120467488714, 64.19509032201613 16.019214719596768, 64 16, 63.80490967798387 16.019214719596768, 63.61731656763491 16.076120467488714, 63.4444297669804 16.168530387697455, 63.292893218813454 16.292893218813454, 63.16853038769745 16.4444297669804, 63.076120467488714 16.61731656763491, 63.01921471959677 16.804909677983872, 63 17, 63.01921471959677 17.195090322016128, 63.076120467488714 17.38268343236509, 63.16853038769745 17.5555702330196, 63.292893218813454 17.707106781186546, 63.4444297669804 17.831469612302545, 63.61731656763491 17.923879532511286, 63.80490967798387 17.98078528040323, 64 18, 64.19509032201613 17.980785280403232, 64.38268343236508 17.923879532511286, 64.55557023301961 17.831469612302545, 64.70710678118655 17.707106781186546, 64.83146961230254 17.5555702330196, 64.9238795325113 17.38268343236509, 64.98078528040323 17.195090322016128, 65 17)), POLYGON ((65 3, 64.98078528040323 2.8049096779838716, 64.9238795325113 2.6173165676349104, 64.83146961230254 2.444429766980398, 64.70710678118655 2.2928932188134525, 64.55557023301961 2.1685303876974547, 64.38268343236508 2.076120467488713, 64.19509032201613 2.0192147195967696, 64 2, 63.80490967798387 2.0192147195967696, 63.61731656763491 2.076120467488713, 63.4444297669804 2.1685303876974547, 63.292893218813454 2.2928932188134525, 63.16853038769745 2.444429766980398, 63.076120467488714 2.61731656763491, 63.01921471959677 2.8049096779838716, 63 3, 63.01921471959677 3.1950903220161284, 63.076120467488714 3.3826834323650896, 63.16853038769745 3.555570233019602, 63.292893218813454 3.7071067811865475, 63.4444297669804 3.8314696123025453, 63.61731656763491 3.9238795325112865, 63.80490967798387 3.9807852804032304, 64 4, 64.19509032201613 3.9807852804032304, 64.38268343236508 3.9238795325112865, 64.55557023301961 3.8314696123025453, 64.70710678118655 3.707106781186548, 64.83146961230254 3.555570233019602, 64.9238795325113 3.3826834323650905, 64.98078528040323 3.195090322016129, 65 3)), POLYGON ((71 27, 70.98078528040323 26.804909677983872, 70.9238795325113 26.61731656763491, 70.83146961230254 26.4444297669804, 70.70710678118655 26.292893218813454, 70.55557023301961 26.168530387697455, 70.38268343236508 26.076120467488714, 70.19509032201613 26.019214719596768, 70 26, 69.80490967798387 26.019214719596768, 69.61731656763492 26.076120467488714, 69.44442976698039 26.168530387697455, 69.29289321881345 26.292893218813454, 69.16853038769746 26.4444297669804, 69.0761204674887 26.61731656763491, 69.01921471959677 26.804909677983872, 69 27, 69.01921471959677 27.195090322016128, 69.0761204674887 27.38268343236509, 69.16853038769746 27.5555702330196, 69.29289321881345 27.707106781186546, 69.44442976698039 27.831469612302545, 69.61731656763492 27.923879532511286, 69.80490967798387 27.98078528040323, 70 28, 70.19509032201613 27.980785280403232, 70.38268343236508 27.923879532511286, 70.55557023301961 27.831469612302545, 70.70710678118655 27.707106781186546, 70.83146961230254 27.5555702330196, 70.9238795325113 27.38268343236509, 70.98078528040323 27.195090322016128, 71 27)), POLYGON ((65.5 23, 65.49039264020162 22.902454838991936, 65.46193976625564 22.808658283817454, 65.41573480615128 22.7222148834902, 65.35355339059328 22.646446609406727, 65.2777851165098 22.584265193848726, 65.19134171618255 22.538060233744357, 65.09754516100807 22.509607359798384, 65 22.5, 64.90245483899193 22.509607359798384, 64.80865828381745 22.538060233744357, 64.7222148834902 22.584265193848726, 64.64644660940672 22.646446609406727, 64.58426519384872 22.7222148834902, 64.53806023374436 22.808658283817454, 64.50960735979838 22.902454838991936, 64.5 23, 64.50960735979838 23.097545161008064, 64.53806023374436 23.191341716182546, 64.58426519384872 23.2777851165098, 64.64644660940672 23.353553390593273, 64.7222148834902 23.415734806151274, 64.80865828381745 23.461939766255643, 64.90245483899193 23.490392640201616, 65 23.5, 65.09754516100807 23.490392640201616, 65.19134171618255 23.461939766255643, 65.2777851165098 23.415734806151274, 65.35355339059328 23.353553390593273, 65.41573480615128 23.2777851165098, 65.46193976625564 23.191341716182546, 65.49039264020162 23.097545161008064, 65.5 23)), POLYGON ((56.5 20, 56.49039264020161 19.902454838991936, 56.46193976625565 19.808658283817454, 56.41573480615127 19.7222148834902, 56.35355339059328 19.646446609406727, 56.277785116509804 19.584265193848726, 56.19134171618254 19.538060233744357, 56.097545161008064 19.509607359798384, 56 19.5, 55.902454838991936 19.509607359798384, 55.80865828381746 19.538060233744357, 55.722214883490196 19.584265193848726, 55.64644660940672 19.646446609406727, 55.58426519384873 19.7222148834902, 55.53806023374435 19.808658283817454, 55.50960735979839 19.902454838991936, 55.5 20, 55.50960735979839 20.097545161008064, 55.53806023374435 20.191341716182546, 55.58426519384873 20.2777851165098, 55.64644660940672 20.353553390593273, 55.722214883490196 20.415734806151274, 55.80865828381746 20.461939766255643, 55.902454838991936 20.490392640201616, 56 20.5, 56.097545161008064 20.490392640201616, 56.19134171618254 20.461939766255643, 56.277785116509804 20.415734806151274, 56.35355339059328 20.353553390593273, 56.41573480615127 20.2777851165098, 56.46193976625565 20.191341716182546, 56.49039264020161 20.097545161008064, 56.5 20)), POLYGON ((62.5 18, 62.49039264020161 17.902454838991936, 62.46193976625565 17.808658283817454, 62.41573480615127 17.7222148834902, 62.35355339059328 17.646446609406727, 62.277785116509804 17.584265193848726, 62.19134171618254 17.538060233744357, 62.097545161008064 17.509607359798384, 62 17.5, 61.902454838991936 17.509607359798384, 61.80865828381746 17.538060233744357, 61.722214883490196 17.584265193848726, 61.64644660940672 17.646446609406727, 61.58426519384873 17.7222148834902, 61.53806023374435 17.808658283817454, 61.50960735979839 17.902454838991936, 61.5 18, 61.50960735979839 18.097545161008064, 61.53806023374435 18.191341716182546, 61.58426519384873 18.2777851165098, 61.64644660940672 18.353553390593273, 61.722214883490196 18.415734806151274, 61.80865828381746 18.461939766255643, 61.902454838991936 18.490392640201616, 62 18.5, 62.097545161008064 18.490392640201616, 62.19134171618254 18.461939766255643, 62.277785116509804 18.415734806151274, 62.35355339059328 18.353553390593273, 62.41573480615127 18.2777851165098, 62.46193976625565 18.191341716182546, 62.49039264020161 18.097545161008064, 62.5 18)), POLYGON ((66.5 19, 66.49039264020162 18.902454838991936, 66.46193976625564 18.808658283817454, 66.41573480615128 18.7222148834902, 66.35355339059328 18.646446609406727, 66.2777851165098 18.584265193848726, 66.19134171618255 18.538060233744357, 66.09754516100807 18.509607359798384, 66 18.5, 65.90245483899193 18.509607359798384, 65.80865828381745 18.538060233744357, 65.7222148834902 18.584265193848726, 65.64644660940672 18.646446609406727, 65.58426519384872 18.7222148834902, 65.53806023374436 18.808658283817454, 65.50960735979838 18.902454838991936, 65.5 19, 65.50960735979838 19.097545161008064, 65.53806023374436 19.191341716182546, 65.58426519384872 19.2777851165098, 65.64644660940672 19.353553390593273, 65.7222148834902 19.415734806151274, 65.80865828381745 19.461939766255643, 65.90245483899193 19.490392640201616, 66 19.5, 66.09754516100807 19.490392640201616, 66.19134171618255 19.461939766255643, 66.2777851165098 19.415734806151274, 66.35355339059328 19.353553390593273, 66.41573480615128 19.2777851165098, 66.46193976625564 19.191341716182546, 66.49039264020162 19.097545161008064, 66.5 19)), POLYGON ((71.5 21, 71.49039264020162 20.902454838991936, 71.46193976625564 20.808658283817454, 71.41573480615128 20.7222148834902, 71.35355339059328 20.646446609406727, 71.2777851165098 20.584265193848726, 71.19134171618255 20.538060233744357, 71.09754516100807 20.509607359798384, 71 20.5, 70.90245483899193 20.509607359798384, 70.80865828381745 20.538060233744357, 70.7222148834902 20.584265193848726, 70.64644660940672 20.646446609406727, 70.58426519384872 20.7222148834902, 70.53806023374436 20.808658283817454, 70.50960735979838 20.902454838991936, 70.5 21, 70.50960735979838 21.097545161008064, 70.53806023374436 21.191341716182546, 70.58426519384872 21.2777851165098, 70.64644660940672 21.353553390593273, 70.7222148834902 21.415734806151274, 70.80865828381745 21.461939766255643, 70.90245483899193 21.490392640201616, 71 21.5, 71.09754516100807 21.490392640201616, 71.19134171618255 21.461939766255643, 71.2777851165098 21.415734806151274, 71.35355339059328 21.353553390593273, 71.41573480615128 21.2777851165098, 71.46193976625564 21.191341716182546, 71.49039264020162 21.097545161008064, 71.5 21)), POLYGON ((74.5 26, 74.49039264020162 25.902454838991936, 74.46193976625564 25.808658283817454, 74.41573480615128 25.7222148834902, 74.35355339059328 25.646446609406727, 74.2777851165098 25.584265193848726, 74.19134171618255 25.538060233744357, 74.09754516100807 25.509607359798384, 74 25.5, 73.90245483899193 25.509607359798384, 73.80865828381745 25.538060233744357, 73.7222148834902 25.584265193848726, 73.64644660940672 25.646446609406727, 73.58426519384872 25.7222148834902, 73.53806023374436 25.808658283817454, 73.50960735979838 25.902454838991936, 73.5 26, 73.50960735979838 26.097545161008064, 73.53806023374436 26.191341716182546, 73.58426519384872 26.2777851165098, 73.64644660940672 26.353553390593273, 73.7222148834902 26.415734806151274, 73.80865828381745 26.461939766255643, 73.90245483899193 26.490392640201616, 74 26.5, 74.09754516100807 26.490392640201616, 74.19134171618255 26.461939766255643, 74.2777851165098 26.415734806151274, 74.35355339059328 26.353553390593273, 74.41573480615128 26.2777851165098, 74.46193976625564 26.191341716182546, 74.49039264020162 26.097545161008064, 74.5 26)), POLYGON ((67.5 3, 67.49039264020162 2.902454838991936, 67.46193976625564 2.808658283817455, 67.41573480615128 2.722214883490199, 67.35355339059328 2.646446609406726, 67.2777851165098 2.5842651938487275, 67.19134171618255 2.5380602337443565, 67.09754516100807 2.509607359798385, 67 2.5, 66.90245483899193 2.509607359798385, 66.80865828381745 2.5380602337443565, 66.7222148834902 2.5842651938487275, 66.64644660940672 2.646446609406726, 66.58426519384872 2.722214883490199, 66.53806023374436 2.808658283817455, 66.50960735979838 2.9024548389919356, 66.5 3, 66.50960735979838 3.097545161008064, 66.53806023374436 3.191341716182545, 66.58426519384872 3.277785116509801, 66.64644660940672 3.353553390593274, 66.7222148834902 3.4157348061512725, 66.80865828381745 3.461939766255643, 66.90245483899193 3.490392640201615, 67 3.5, 67.09754516100807 3.490392640201615, 67.19134171618255 3.4619397662556435, 67.2777851165098 3.415734806151273, 67.35355339059328 3.353553390593274, 67.41573480615128 3.277785116509801, 67.46193976625564 3.1913417161825453, 67.49039264020162 3.0975451610080644, 67.5 3)), POLYGON ((53.5 6, 53.49039264020161 5.902454838991936, 53.46193976625565 5.808658283817455, 53.41573480615127 5.722214883490199, 53.35355339059328 5.646446609406726, 53.277785116509804 5.5842651938487275, 53.19134171618254 5.538060233744357, 53.097545161008064 5.509607359798385, 53 5.5, 52.902454838991936 5.509607359798385, 52.80865828381746 5.538060233744357, 52.722214883490196 5.5842651938487275, 52.64644660940672 5.646446609406726, 52.58426519384873 5.722214883490199, 52.53806023374435 5.808658283817455, 52.50960735979839 5.902454838991936, 52.5 6, 52.50960735979839 6.097545161008064, 52.53806023374435 6.191341716182545, 52.58426519384873 6.277785116509801, 52.64644660940672 6.353553390593274, 52.722214883490196 6.4157348061512725, 52.80865828381746 6.461939766255643, 52.902454838991936 6.490392640201615, 53 6.5, 53.097545161008064 6.490392640201615, 53.19134171618254 6.461939766255643, 53.277785116509804 6.4157348061512725, 53.35355339059328 6.353553390593274, 53.41573480615127 6.277785116509801, 53.46193976625565 6.191341716182545, 53.49039264020161 6.097545161008064, 53.5 6)), POLYGON ((59.5 5, 59.49039264020161 4.902454838991936, 59.46193976625565 4.808658283817455, 59.41573480615127 4.722214883490199, 59.35355339059328 4.646446609406726, 59.277785116509804 4.5842651938487275, 59.19134171618254 4.538060233744357, 59.097545161008064 4.509607359798385, 59 4.5, 58.902454838991936 4.509607359798385, 58.80865828381746 4.538060233744357, 58.722214883490196 4.5842651938487275, 58.64644660940672 4.646446609406726, 58.58426519384873 4.722214883490199, 58.53806023374435 4.808658283817455, 58.50960735979839 4.902454838991936, 58.5 5, 58.50960735979839 5.097545161008064, 58.53806023374435 5.191341716182545, 58.58426519384873 5.277785116509801, 58.64644660940672 5.353553390593274, 58.722214883490196 5.4157348061512725, 58.80865828381746 5.461939766255643, 58.902454838991936 5.490392640201615, 59 5.5, 59.097545161008064 5.490392640201615, 59.19134171618254 5.461939766255643, 59.277785116509804 5.4157348061512725, 59.35355339059328 5.353553390593274, 59.41573480615127 5.277785116509801, 59.46193976625565 5.191341716182545, 59.49039264020161 5.097545161008064, 59.5 5)), POLYGON ((48.5 5, 48.49039264020161 4.902454838991936, 48.46193976625565 4.808658283817455, 48.41573480615127 4.722214883490199, 48.35355339059328 4.646446609406726, 48.277785116509804 4.5842651938487275, 48.19134171618254 4.538060233744357, 48.097545161008064 4.509607359798385, 48 4.5, 47.902454838991936 4.509607359798385, 47.80865828381746 4.538060233744357, 47.722214883490196 4.5842651938487275, 47.64644660940672 4.646446609406726, 47.58426519384873 4.722214883490199, 47.53806023374435 4.808658283817455, 47.50960735979839 4.902454838991936, 47.5 5, 47.50960735979839 5.097545161008064, 47.53806023374435 5.191341716182545, 47.58426519384873 5.277785116509801, 47.64644660940672 5.353553390593274, 47.722214883490196 5.4157348061512725, 47.80865828381746 5.461939766255643, 47.902454838991936 5.490392640201615, 48 5.5, 48.097545161008064 5.490392640201615, 48.19134171618254 5.461939766255643, 48.277785116509804 5.4157348061512725, 48.35355339059328 5.353553390593274, 48.41573480615127 5.277785116509801, 48.46193976625565 5.191341716182545, 48.49039264020161 5.097545161008064, 48.5 5)), POLYGON ((73.5 15, 73.49039264020162 14.902454838991936, 73.46193976625564 14.808658283817454, 73.41573480615128 14.7222148834902, 73.35355339059328 14.646446609406727, 73.2777851165098 14.584265193848728, 73.19134171618255 14.538060233744357, 73.09754516100807 14.509607359798384, 73 14.5, 72.90245483899193 14.509607359798384, 72.80865828381745 14.538060233744357, 72.7222148834902 14.584265193848728, 72.64644660940672 14.646446609406727, 72.58426519384872 14.7222148834902, 72.53806023374436 14.808658283817454, 72.50960735979838 14.902454838991936, 72.5 15, 72.50960735979838 15.097545161008064, 72.53806023374436 15.191341716182546, 72.58426519384872 15.2777851165098, 72.64644660940672 15.353553390593273, 72.7222148834902 15.415734806151272, 72.80865828381745 15.461939766255643, 72.90245483899193 15.490392640201614, 73 15.5, 73.09754516100807 15.490392640201616, 73.19134171618255 15.461939766255643, 73.2777851165098 15.415734806151272, 73.35355339059328 15.353553390593273, 73.41573480615128 15.2777851165098, 73.46193976625564 15.191341716182546, 73.49039264020162 15.097545161008064, 73.5 15)), POLYGON ((75.5 14, 75.49039264020162 13.902454838991936, 75.46193976625564 13.808658283817454, 75.41573480615128 13.7222148834902, 75.35355339059328 13.646446609406727, 75.2777851165098 13.584265193848728, 75.19134171618255 13.538060233744357, 75.09754516100807 13.509607359798384, 75 13.5, 74.90245483899193 13.509607359798384, 74.80865828381745 13.538060233744357, 74.7222148834902 13.584265193848728, 74.64644660940672 13.646446609406727, 74.58426519384872 13.7222148834902, 74.53806023374436 13.808658283817454, 74.50960735979838 13.902454838991936, 74.5 14, 74.50960735979838 14.097545161008064, 74.53806023374436 14.191341716182546, 74.58426519384872 14.2777851165098, 74.64644660940672 14.353553390593273, 74.7222148834902 14.415734806151272, 74.80865828381745 14.461939766255643, 74.90245483899193 14.490392640201614, 75 14.5, 75.09754516100807 14.490392640201616, 75.19134171618255 14.461939766255643, 75.2777851165098 14.415734806151272, 75.35355339059328 14.353553390593273, 75.41573480615128 14.2777851165098, 75.46193976625564 14.191341716182546, 75.49039264020162 14.097545161008064, 75.5 14)), POLYGON ((72.5 17, 72.49039264020162 16.902454838991936, 72.46193976625564 16.808658283817454, 72.41573480615128 16.7222148834902, 72.35355339059328 16.646446609406727, 72.2777851165098 16.584265193848726, 72.19134171618255 16.538060233744357, 72.09754516100807 16.509607359798384, 72 16.5, 71.90245483899193 16.509607359798384, 71.80865828381745 16.538060233744357, 71.7222148834902 16.584265193848726, 71.64644660940672 16.646446609406727, 71.58426519384872 16.7222148834902, 71.53806023374436 16.808658283817454, 71.50960735979838 16.902454838991936, 71.5 17, 71.50960735979838 17.097545161008064, 71.53806023374436 17.191341716182546, 71.58426519384872 17.2777851165098, 71.64644660940672 17.353553390593273, 71.7222148834902 17.415734806151274, 71.80865828381745 17.461939766255643, 71.90245483899193 17.490392640201616, 72 17.5, 72.09754516100807 17.490392640201616, 72.19134171618255 17.461939766255643, 72.2777851165098 17.415734806151274, 72.35355339059328 17.353553390593273, 72.41573480615128 17.2777851165098, 72.46193976625564 17.191341716182546, 72.49039264020162 17.097545161008064, 72.5 17)), POLYGON ((71.5 16, 71.49039264020162 15.902454838991936, 71.46193976625564 15.808658283817454, 71.41573480615128 15.7222148834902, 71.35355339059328 15.646446609406727, 71.2777851165098 15.584265193848728, 71.19134171618255 15.538060233744357, 71.09754516100807 15.509607359798384, 71 15.5, 70.90245483899193 15.509607359798384, 70.80865828381745 15.538060233744357, 70.7222148834902 15.584265193848728, 70.64644660940672 15.646446609406727, 70.58426519384872 15.7222148834902, 70.53806023374436 15.808658283817454, 70.50960735979838 15.902454838991936, 70.5 16, 70.50960735979838 16.097545161008064, 70.53806023374436 16.191341716182546, 70.58426519384872 16.2777851165098, 70.64644660940672 16.353553390593273, 70.7222148834902 16.415734806151274, 70.80865828381745 16.461939766255643, 70.90245483899193 16.490392640201616, 71 16.5, 71.09754516100807 16.490392640201616, 71.19134171618255 16.461939766255643, 71.2777851165098 16.415734806151274, 71.35355339059328 16.353553390593273, 71.41573480615128 16.2777851165098, 71.46193976625564 16.191341716182546, 71.49039264020162 16.097545161008064, 71.5 16)), POLYGON ((56.5 13, 56.49039264020161 12.902454838991936, 56.46193976625565 12.808658283817454, 56.41573480615127 12.7222148834902, 56.35355339059328 12.646446609406727, 56.277785116509804 12.584265193848728, 56.19134171618254 12.538060233744357, 56.097545161008064 12.509607359798384, 56 12.5, 55.902454838991936 12.509607359798384, 55.80865828381746 12.538060233744357, 55.722214883490196 12.584265193848728, 55.64644660940672 12.646446609406727, 55.58426519384873 12.7222148834902, 55.53806023374435 12.808658283817454, 55.50960735979839 12.902454838991936, 55.5 13, 55.50960735979839 13.097545161008064, 55.53806023374435 13.191341716182546, 55.58426519384873 13.2777851165098, 55.64644660940672 13.353553390593273, 55.722214883490196 13.415734806151272, 55.80865828381746 13.461939766255643, 55.902454838991936 13.490392640201614, 56 13.5, 56.097545161008064 13.490392640201616, 56.19134171618254 13.461939766255643, 56.277785116509804 13.415734806151272, 56.35355339059328 13.353553390593273, 56.41573480615127 13.2777851165098, 56.46193976625565 13.191341716182546, 56.49039264020161 13.097545161008064, 56.5 13)), POLYGON ((54.5 11, 54.49039264020161 10.902454838991936, 54.46193976625565 10.808658283817454, 54.41573480615127 10.7222148834902, 54.35355339059328 10.646446609406727, 54.277785116509804 10.584265193848728, 54.19134171618254 10.538060233744357, 54.097545161008064 10.509607359798384, 54 10.5, 53.902454838991936 10.509607359798384, 53.80865828381746 10.538060233744357, 53.722214883490196 10.584265193848728, 53.64644660940672 10.646446609406727, 53.58426519384873 10.7222148834902, 53.53806023374435 10.808658283817454, 53.50960735979839 10.902454838991936, 53.5 11, 53.50960735979839 11.097545161008064, 53.53806023374435 11.191341716182546, 53.58426519384873 11.2777851165098, 53.64644660940672 11.353553390593273, 53.722214883490196 11.415734806151272, 53.80865828381746 11.461939766255643, 53.902454838991936 11.490392640201614, 54 11.5, 54.097545161008064 11.490392640201616, 54.19134171618254 11.461939766255643, 54.277785116509804 11.415734806151272, 54.35355339059328 11.353553390593273, 54.41573480615127 11.2777851165098, 54.46193976625565 11.191341716182546, 54.49039264020161 11.097545161008064, 54.5 11)), POLYGON ((60 18, 59.98078528040323 17.804909677983872, 59.923879532511286 17.61731656763491, 59.83146961230255 17.4444297669804, 59.707106781186546 17.292893218813454, 59.5555702330196 17.168530387697455, 59.38268343236509 17.076120467488714, 59.19509032201613 17.019214719596768, 59 17, 58.80490967798387 17.019214719596768, 58.61731656763491 17.076120467488714, 58.4444297669804 17.168530387697455, 58.292893218813454 17.292893218813454, 58.16853038769745 17.4444297669804, 58.076120467488714 17.61731656763491, 58.01921471959677 17.804909677983872, 58 18, 58.01921471959677 18.195090322016128, 58.076120467488714 18.38268343236509, 58.16853038769745 18.5555702330196, 58.292893218813454 18.707106781186546, 58.4444297669804 18.831469612302545, 58.61731656763491 18.923879532511286, 58.80490967798387 18.98078528040323, 59 19, 59.19509032201613 18.980785280403232, 59.38268343236509 18.923879532511286, 59.5555702330196 18.831469612302545, 59.707106781186546 18.707106781186546, 59.83146961230255 18.5555702330196, 59.923879532511286 18.38268343236509, 59.98078528040323 18.195090322016128, 60 18)), POLYGON ((56.5 5, 56.49039264020161 4.902454838991936, 56.46193976625565 4.808658283817455, 56.41573480615127 4.722214883490199, 56.35355339059328 4.646446609406726, 56.277785116509804 4.5842651938487275, 56.19134171618254 4.538060233744357, 56.097545161008064 4.509607359798385, 56 4.5, 55.902454838991936 4.509607359798385, 55.80865828381746 4.538060233744357, 55.722214883490196 4.5842651938487275, 55.64644660940672 4.646446609406726, 55.58426519384873 4.722214883490199, 55.53806023374435 4.808658283817455, 55.50960735979839 4.902454838991936, 55.5 5, 55.50960735979839 5.097545161008064, 55.53806023374435 5.191341716182545, 55.58426519384873 5.277785116509801, 55.64644660940672 5.353553390593274, 55.722214883490196 5.4157348061512725, 55.80865828381746 5.461939766255643, 55.902454838991936 5.490392640201615, 56 5.5, 56.097545161008064 5.490392640201615, 56.19134171618254 5.461939766255643, 56.277785116509804 5.4157348061512725, 56.35355339059328 5.353553390593274, 56.41573480615127 5.277785116509801, 56.46193976625565 5.191341716182545, 56.49039264020161 5.097545161008064, 56.5 5)), POLYGON ((58.5 6, 58.49039264020161 5.902454838991936, 58.46193976625565 5.808658283817455, 58.41573480615127 5.722214883490199, 58.35355339059328 5.646446609406726, 58.277785116509804 5.5842651938487275, 58.19134171618254 5.538060233744357, 58.097545161008064 5.509607359798385, 58 5.5, 57.902454838991936 5.509607359798385, 57.80865828381746 5.538060233744357, 57.722214883490196 5.5842651938487275, 57.64644660940672 5.646446609406726, 57.58426519384873 5.722214883490199, 57.53806023374435 5.808658283817455, 57.50960735979839 5.902454838991936, 57.5 6, 57.50960735979839 6.097545161008064, 57.53806023374435 6.191341716182545, 57.58426519384873 6.277785116509801, 57.64644660940672 6.353553390593274, 57.722214883490196 6.4157348061512725, 57.80865828381746 6.461939766255643, 57.902454838991936 6.490392640201615, 58 6.5, 58.097545161008064 6.490392640201615, 58.19134171618254 6.461939766255643, 58.277785116509804 6.4157348061512725, 58.35355339059328 6.353553390593274, 58.41573480615127 6.277785116509801, 58.46193976625565 6.191341716182545, 58.49039264020161 6.097545161008064, 58.5 6)), POLYGON ((55 4, 54.98078528040323 3.8049096779838716, 54.923879532511286 3.6173165676349104, 54.83146961230255 3.444429766980398, 54.707106781186546 3.2928932188134525, 54.5555702330196 3.1685303876974547, 54.38268343236509 3.076120467488713, 54.19509032201613 3.0192147195967696, 54 3, 53.80490967798387 3.0192147195967696, 53.61731656763491 3.076120467488713, 53.4444297669804 3.1685303876974547, 53.292893218813454 3.2928932188134525, 53.16853038769745 3.444429766980398, 53.076120467488714 3.61731656763491, 53.01921471959677 3.8049096779838716, 53 4, 53.01921471959677 4.195090322016128, 53.076120467488714 4.38268343236509, 53.16853038769745 4.555570233019602, 53.292893218813454 4.707106781186548, 53.4444297669804 4.831469612302545, 53.61731656763491 4.923879532511286, 53.80490967798387 4.98078528040323, 54 5, 54.19509032201613 4.98078528040323, 54.38268343236509 4.923879532511287, 54.5555702330196 4.831469612302546, 54.707106781186546 4.707106781186548, 54.83146961230255 4.555570233019602, 54.923879532511286 4.3826834323650905, 54.98078528040323 4.195090322016129, 55 4)), POLYGON ((60 3, 59.98078528040323 2.8049096779838716, 59.923879532511286 2.6173165676349104, 59.83146961230255 2.444429766980398, 59.707106781186546 2.2928932188134525, 59.5555702330196 2.1685303876974547, 59.38268343236509 2.076120467488713, 59.19509032201613 2.0192147195967696, 59 2, 58.80490967798387 2.0192147195967696, 58.61731656763491 2.076120467488713, 58.4444297669804 2.1685303876974547, 58.292893218813454 2.2928932188134525, 58.16853038769745 2.444429766980398, 58.076120467488714 2.61731656763491, 58.01921471959677 2.8049096779838716, 58 3, 58.01921471959677 3.1950903220161284, 58.076120467488714 3.3826834323650896, 58.16853038769745 3.555570233019602, 58.292893218813454 3.7071067811865475, 58.4444297669804 3.8314696123025453, 58.61731656763491 3.9238795325112865, 58.80490967798387 3.9807852804032304, 59 4, 59.19509032201613 3.9807852804032304, 59.38268343236509 3.9238795325112865, 59.5555702330196 3.8314696123025453, 59.707106781186546 3.707106781186548, 59.83146961230255 3.555570233019602, 59.923879532511286 3.3826834323650905, 59.98078528040323 3.195090322016129, 60 3)), POLYGON ((51 5, 50.98078528040323 4.804909677983872, 50.923879532511286 4.61731656763491, 50.83146961230255 4.444429766980398, 50.707106781186546 4.292893218813452, 50.5555702330196 4.168530387697455, 50.38268343236509 4.076120467488713, 50.19509032201613 4.01921471959677, 50 4, 49.80490967798387 4.01921471959677, 49.61731656763491 4.076120467488713, 49.4444297669804 4.168530387697455, 49.292893218813454 4.292893218813452, 49.16853038769745 4.444429766980398, 49.076120467488714 4.61731656763491, 49.01921471959677 4.804909677983871, 49 5, 49.01921471959677 5.195090322016128, 49.076120467488714 5.38268343236509, 49.16853038769745 5.555570233019602, 49.292893218813454 5.707106781186548, 49.4444297669804 5.831469612302545, 49.61731656763491 5.923879532511286, 49.80490967798387 5.98078528040323, 50 6, 50.19509032201613 5.98078528040323, 50.38268343236509 5.923879532511287, 50.5555702330196 5.831469612302546, 50.707106781186546 5.707106781186548, 50.83146961230255 5.555570233019602, 50.923879532511286 5.3826834323650905, 50.98078528040323 5.195090322016129, 51 5)), POLYGON ((63.5 59, 63.5 59.5, 64.5 59.5, 64.5 57, 64.5 56.5, 63.5 56.5, 63.5 59)), POLYGON ((64.5 52, 64.5 51.5, 63.5 51.5, 63.5 54, 63.5 54.5, 64.5 54.5, 64.5 52)), POLYGON ((64.5 45.5, 64.5 44.5, 63.5 44.5, 63.5 45.5, 64.5 45.5)), POLYGON ((66.5 44, 66.5 44.5, 67.5 44.5, 67.5 42, 67.5 41.5, 66.5 41.5, 66.5 44)), POLYGON ((68 44.5, 67.5 44.5, 67.5 45.5, 70 45.5, 70.5 45.5, 70.5 44.5, 68 44.5)), POLYGON ((65 44.5, 64.5 44.5, 64.5 45.5, 67 45.5, 67.5 45.5, 67.5 44.5, 65 44.5)), POLYGON ((63 45.5, 63.5 45.5, 63.5 44.5, 14 44.5, 13.5 44.5, 13.5 45.5, 63 45.5)), POLYGON ((41.353553390593255 53.646446609406716, 41.19134171618253 53.538060233744346, 40.999999999999986 53.49999999999999, 40.80865828381744 53.53806023374435, 40.64644660940671 53.646446609406716, 38.64644660940672 55.64644660940671, 38.53806023374435 55.808658283817444, 38.5 55.999999999999986, 38.53806023374436 56.191341716182535, 38.64644660940672 56.35355339059326, 38.80865828381746 56.46193976625563, 39 56.499999999999986, 39.19134171618255 56.461939766255625, 39.35355339059328 56.35355339059326, 40.99999999999999 54.70710678118654, 42.64644660940673 56.35355339059326, 42.80865828381746 56.46193976625563, 43 56.499999999999986, 43.19134171618255 56.461939766255625, 43.35355339059328 56.353553390593255, 43.46193976625565 56.19134171618253, 43.5 55.999999999999986, 43.46193976625564 55.80865828381744, 43.35355339059327 55.64644660940671, 41.353553390593255 53.646446609406716)), POLYGON ((40.64644660940671 51.35355339059326, 40.80865828381744 51.46193976625563, 40.99999999999998 51.49999999999999, 41.19134171618253 51.46193976625564, 41.353553390593255 51.35355339059327, 43.35355339059327 49.35355339059327, 43.46193976625564 49.19134171618254, 43.5 48.99999999999999, 43.46193976625565 48.80865828381745, 43.35355339059328 48.64644660940672, 43.19134171618255 48.53806023374435, 43 48.49999999999999, 42.80865828381746 48.538060233744346, 42.64644660940673 48.646446609406716, 40.999999999999986 50.29289321881345, 39.35355339059328 48.64644660940672, 39.19134171618255 48.53806023374435, 39 48.49999999999999, 38.80865828381746 48.538060233744346, 38.64644660940673 48.646446609406716, 38.53806023374436 48.808658283817444, 38.5 48.99999999999999, 38.53806023374435 49.191341716182535, 38.64644660940672 49.35355339059326, 40.64644660940671 51.35355339059326)), POLYGON ((48.00000000000001 47.70710678118654, 49.6464466094067 49.35355339059326, 49.80865828381743 49.46193976625563, 49.99999999999997 49.49999999999999, 50.19134171618252 49.46193976625564, 50.35355339059325 49.35355339059327, 50.46193976625562 49.19134171618254, 50.49999999999998 49, 50.461939766255625 48.80865828381745, 50.353553390593255 48.64644660940672, 48.35355339059329 46.64644660940672, 48.19134171618256 46.53806023374435, 48.00000000000002 46.49999999999999, 47.80865828381747 46.538060233744346, 47.646446609406745 46.646446609406716, 45.64644660940673 48.646446609406716, 45.53806023374436 48.808658283817444, 45.5 48.99999999999999, 45.53806023374435 49.191341716182535, 45.64644660940672 49.35355339059326, 45.80865828381745 49.46193976625563, 46 49.49999999999999, 46.19134171618254 49.46193976625564, 46.35355339059327 49.35355339059327, 48.00000000000001 47.70710678118654)), POLYGON ((47.64644660940674 58.35355339059328, 47.80865828381747 58.46193976625565, 48.000000000000014 58.5, 48.19134171618256 58.46193976625564, 48.35355339059329 58.35355339059327, 50.353553390593255 56.353553390593255, 50.461939766255625 56.19134171618253, 50.49999999999998 55.99999999999998, 50.46193976625562 55.80865828381744, 50.35355339059325 55.64644660940671, 50.19134171618252 55.53806023374434, 49.99999999999997 55.499999999999986, 49.80865828381743 55.538060233744346, 49.6464466094067 55.646446609406716, 48.000000000000014 57.29289321881345, 46.35355339059328 55.64644660940671, 46.19134171618254 55.53806023374434, 46 55.499999999999986, 45.80865828381746 55.53806023374434, 45.64644660940672 55.64644660940671, 45.53806023374435 55.808658283817444, 45.5 55.999999999999986, 45.53806023374435 56.19134171618253, 45.64644660940672 56.35355339059326, 47.64644660940674 58.35355339059328)), POLYGON ((48.500000000000014 50.99999999999999, 48.46193976625566 50.80865828381745, 48.35355339059329 50.646446609406716, 48.191341716182556 50.538060233744346, 48.000000000000014 50.49999999999999, 47.80865828381747 50.538060233744346, 47.64644660940674 50.646446609406716, 47.53806023374437 50.80865828381745, 47.500000000000014 50.99999999999999, 47.500000000000014 53.99999999999999, 47.53806023374437 54.191341716182535, 47.64644660940674 54.35355339059327, 47.80865828381747 54.46193976625564, 48.000000000000014 54.49999999999999, 48.191341716182556 54.46193976625564, 48.35355339059329 54.35355339059327, 48.46193976625566 54.191341716182535, 48.500000000000014 53.99999999999999, 48.500000000000014 50.99999999999999)), POLYGON ((52.49999999999998 55.999999999999986, 52.53806023374433 56.19134171618253, 52.6464466094067 56.35355339059326, 52.80865828381744 56.46193976625563, 52.99999999999998 56.499999999999986, 53.19134171618252 56.46193976625563, 53.353553390593255 56.35355339059326, 53.461939766255625 56.19134171618253, 53.49999999999998 55.999999999999986, 53.49999999999998 48.99999999999999, 53.461939766255625 48.80865828381745, 53.353553390593255 48.646446609406716, 53.19134171618252 48.538060233744346, 52.99999999999998 48.49999999999999, 52.80865828381744 48.538060233744346, 52.6464466094067 48.646446609406716, 52.53806023374433 48.80865828381745, 52.49999999999998 48.99999999999999, 52.49999999999998 55.999999999999986)), POLYGON ((14.5 7.5, 14.5 6.5, 13.5 6.5, 13.5 7.5, 14.5 7.5)), POLYGON ((14.5 13.5, 14.5 12.5, 13.5 12.5, 13.5 13.5, 14.5 13.5)), POLYGON ((14.5 18.5, 14.5 17.5, 13.5 17.5, 13.5 18.5, 14.5 18.5)), POLYGON ((14.5 22.5, 14.5 21.5, 13.5 21.5, 13.5 22.5, 14.5 22.5)), POLYGON ((14.5 25.5, 14.5 24.5, 13.5 24.5, 13.5 25.5, 14.5 25.5)), POLYGON ((14.5 27.5, 14.5 26.5, 13.5 26.5, 13.5 27.5, 14.5 27.5)), POLYGON ((13.5 31.5, 1 31.5, 0.5 31.5, 0.5 32.5, 14.5 32.5, 14.5 29, 14.5 28.5, 13.5 28.5, 13.5 31.5)), POLYGON ((32.5 14.5, 32.5 15.5, 38.5 15.5, 38.5 9.5, 32.5 9.5, 32.5 14, 32.5 14.5), (33.5 14.5, 33.5 10.5, 37.5 10.5, 37.5 14.5, 33.5 14.5)), POLYGON ((29.5 10.5, 30.5 10.5, 30.5 7.5, 27.5 7.5, 27.5 10.5, 29 10.5, 29.5 10.5), (29.5 9.5, 28.5 9.5, 28.5 8.5, 29.5 8.5, 29.5 9.5)), POLYGON ((25.5 9.5, 25.5 5.5, 20.5 5.5, 20.5 10.5, 25 10.5, 25.5 10.5, 25.5 9.5), (21.5 9.5, 21.5 6.5, 24.5 6.5, 24.5 9, 24.5 9.5, 21.5 9.5)), POLYGON ((33.5 7.5, 35.5 7.5, 35.5 4.5, 32.5 4.5, 32.5 7, 32.5 7.5, 33.5 7.5), (33.5 5.5, 34.5 5.5, 34.5 6.5, 34 6.5, 33.5 6.5, 33.5 5.5)), POLYGON ((32.5 18.5, 32.5 20.5, 35.5 20.5, 35.5 17.5, 33 17.5, 32.5 17.5, 32.5 18.5), (33.5 18.5, 34.5 18.5, 34.5 19.5, 33.5 19.5, 33.5 19, 33.5 18.5)), POLYGON ((21.5 13.5, 21.5 21.5, 30.5 21.5, 30.5 12.5, 22 12.5, 21.5 12.5, 21.5 13.5), (22.5 13.5, 29.5 13.5, 29.5 20.5, 22.5 20.5, 22.5 14, 22.5 13.5)), POLYGON ((56.500000000000014 53.99999999999999, 56.46193976625566 53.80865828381745, 56.35355339059329 53.646446609406716, 56.191341716182556 53.538060233744346, 56.000000000000014 53.49999999999999, 55.80865828381747 53.538060233744346, 55.64644660940674 53.646446609406716, 55.53806023374437 53.80865828381745, 55.500000000000014 53.99999999999999, 55.500000000000014 58, 55.53806023374437 58.19134171618254, 55.64644660940674 58.35355339059328, 55.80865828381747 58.46193976625565, 56.000000000000014 58.5, 56.191341716182556 58.46193976625565, 56.35355339059329 58.35355339059328, 56.46193976625566 58.19134171618254, 56.500000000000014 58, 56.500000000000014 53.99999999999999)), POLYGON ((56.500000000000014 46.99999999999999, 56.46193976625566 46.80865828381745, 56.35355339059329 46.646446609406716, 56.191341716182556 46.538060233744346, 56.000000000000014 46.49999999999999, 55.80865828381747 46.538060233744346, 55.64644660940674 46.646446609406716, 55.53806023374437 46.80865828381745, 55.500000000000014 46.99999999999999, 55.500000000000014 50.99999999999999, 55.53806023374437 51.191341716182535, 55.64644660940674 51.35355339059327, 55.80865828381747 51.46193976625564, 56.000000000000014 51.49999999999999, 56.191341716182556 51.46193976625564, 56.35355339059329 51.35355339059327, 56.46193976625566 51.191341716182535, 56.500000000000014 50.99999999999999, 56.500000000000014 46.99999999999999)), POLYGON ((27.5 24.5, 27.5 27.5, 31.5 27.5, 31.5 23.5, 28 23.5, 27.5 23.5, 27.5 24.5), (28.5 24.5, 30.5 24.5, 30.5 26.5, 28.5 26.5, 28.5 25, 28.5 24.5)), POLYGON ((27.5 30.5, 27.5 32.5, 30.5 32.5, 30.5 29.5, 28 29.5, 27.5 29.5, 27.5 30.5), (28.5 30.5, 29.5 30.5, 29.5 31.5, 28.5 31.5, 28.5 31, 28.5 30.5)), POLYGON ((28.5 5.5, 29.5 5.5, 29.5 3.5, 27.5 3.5, 27.5 5, 27.5 5.5, 28.5 5.5)), POLYGON ((25.5 27.5, 25.5 25.5, 22.5 25.5, 22.5 28.5, 25 28.5, 25.5 28.5, 25.5 27.5), (23.5 27.5, 23.5 26.5, 24.5 26.5, 24.5 27, 24.5 27.5, 23.5 27.5)), POLYGON ((21.5 37.5, 21.5 41.5, 25.5 41.5, 25.5 39, 25.5 38.5, 25.5 37.5, 21.5 37.5), (24.5 38.5, 24.5 40.5, 22.5 40.5, 22.5 38.5, 24.5 38.5)), POLYGON ((27.5 42.5, 31.5 42.5, 31.5 38.5, 29 38.5, 28.5 38.5, 27.5 38.5, 27.5 42.5), (28.5 39.5, 30.5 39.5, 30.5 41.5, 28.5 41.5, 28.5 39.5)), POLYGON ((34.5 42.5, 36.5 42.5, 36.5 39.5, 33.5 39.5, 33.5 42, 33.5 42.5, 34.5 42.5), (34.5 40.5, 35.5 40.5, 35.5 41.5, 35 41.5, 34.5 41.5, 34.5 40.5)), POLYGON ((18.5 40.5, 17.5 40.5, 17.5 42.5, 19.5 42.5, 19.5 41, 19.5 40.5, 18.5 40.5)), POLYGON ((45 30, 44.98078528040323 29.804909677983872, 44.923879532511286 29.61731656763491, 44.83146961230255 29.4444297669804, 44.707106781186546 29.292893218813454, 44.5555702330196 29.168530387697455, 44.38268343236509 29.076120467488714, 44.19509032201613 29.019214719596768, 44 29, 43.80490967798387 29.019214719596768, 43.61731656763491 29.076120467488714, 43.4444297669804 29.168530387697455, 43.292893218813454 29.292893218813454, 43.16853038769745 29.4444297669804, 43.076120467488714 29.61731656763491, 43.01921471959677 29.804909677983872, 43 30, 43.01921471959677 30.195090322016128, 43.076120467488714 30.38268343236509, 43.16853038769745 30.5555702330196, 43.292893218813454 30.707106781186546, 43.4444297669804 30.831469612302545, 43.61731656763491 30.923879532511286, 43.80490967798387 30.98078528040323, 44 31, 44.19509032201613 30.980785280403232, 44.38268343236509 30.923879532511286, 44.5555702330196 30.831469612302545, 44.707106781186546 30.707106781186546, 44.83146961230255 30.5555702330196, 44.923879532511286 30.38268343236509, 44.98078528040323 30.195090322016128, 45 30)), POLYGON ((42 33, 41.98078528040323 32.80490967798387, 41.923879532511286 32.61731656763491, 41.83146961230255 32.4444297669804, 41.707106781186546 32.292893218813454, 41.5555702330196 32.16853038769745, 41.38268343236509 32.076120467488714, 41.19509032201613 32.01921471959677, 41 32, 40.80490967798387 32.01921471959677, 40.61731656763491 32.076120467488714, 40.4444297669804 32.16853038769745, 40.292893218813454 32.292893218813454, 40.16853038769745 32.4444297669804, 40.076120467488714 32.61731656763491, 40.01921471959677 32.80490967798387, 40 33, 40.01921471959677 33.19509032201613, 40.076120467488714 33.38268343236509, 40.16853038769745 33.5555702330196, 40.292893218813454 33.707106781186546, 40.4444297669804 33.83146961230255, 40.61731656763491 33.923879532511286, 40.80490967798387 33.98078528040323, 41 34, 41.19509032201613 33.98078528040323, 41.38268343236509 33.923879532511286, 41.5555702330196 33.83146961230255, 41.707106781186546 33.707106781186546, 41.83146961230255 33.5555702330196, 41.923879532511286 33.38268343236509, 41.98078528040323 33.19509032201613, 42 33)), POLYGON ((42 27, 41.98078528040323 26.804909677983872, 41.923879532511286 26.61731656763491, 41.83146961230255 26.4444297669804, 41.707106781186546 26.292893218813454, 41.5555702330196 26.168530387697455, 41.38268343236509 26.076120467488714, 41.19509032201613 26.019214719596768, 41 26, 40.80490967798387 26.019214719596768, 40.61731656763491 26.076120467488714, 40.4444297669804 26.168530387697455, 40.292893218813454 26.292893218813454, 40.16853038769745 26.4444297669804, 40.076120467488714 26.61731656763491, 40.01921471959677 26.804909677983872, 40 27, 40.01921471959677 27.195090322016128, 40.076120467488714 27.38268343236509, 40.16853038769745 27.5555702330196, 40.292893218813454 27.707106781186546, 40.4444297669804 27.831469612302545, 40.61731656763491 27.923879532511286, 40.80490967798387 27.98078528040323, 41 28, 41.19509032201613 27.980785280403232, 41.38268343236509 27.923879532511286, 41.5555702330196 27.831469612302545, 41.707106781186546 27.707106781186546, 41.83146961230255 27.5555702330196, 41.923879532511286 27.38268343236509, 41.98078528040323 27.195090322016128, 42 27)), POLYGON ((39 30, 38.98078528040323 29.804909677983872, 38.923879532511286 29.61731656763491, 38.83146961230255 29.4444297669804, 38.707106781186546 29.292893218813454, 38.5555702330196 29.168530387697455, 38.38268343236509 29.076120467488714, 38.19509032201613 29.019214719596768, 38 29, 37.80490967798387 29.019214719596768, 37.61731656763491 29.076120467488714, 37.4444297669804 29.168530387697455, 37.292893218813454 29.292893218813454, 37.16853038769745 29.4444297669804, 37.076120467488714 29.61731656763491, 37.01921471959677 29.804909677983872, 37 30, 37.01921471959677 30.195090322016128, 37.076120467488714 30.38268343236509, 37.16853038769745 30.5555702330196, 37.292893218813454 30.707106781186546, 37.4444297669804 30.831469612302545, 37.61731656763491 30.923879532511286, 37.80490967798387 30.98078528040323, 38 31, 38.19509032201613 30.980785280403232, 38.38268343236509 30.923879532511286, 38.5555702330196 30.831469612302545, 38.707106781186546 30.707106781186546, 38.83146961230255 30.5555702330196, 38.923879532511286 30.38268343236509, 38.98078528040323 30.195090322016128, 39 30)), POLYGON ((36.5 30, 36.49039264020161 29.902454838991936, 36.46193976625565 29.808658283817454, 36.41573480615127 29.7222148834902, 36.35355339059328 29.646446609406727, 36.277785116509804 29.584265193848726, 36.19134171618254 29.538060233744357, 36.097545161008064 29.509607359798384, 36 29.5, 35.902454838991936 29.509607359798384, 35.80865828381746 29.538060233744357, 35.722214883490196 29.584265193848726, 35.64644660940672 29.646446609406727, 35.58426519384873 29.7222148834902, 35.53806023374435 29.808658283817454, 35.50960735979839 29.902454838991936, 35.5 30, 35.50960735979839 30.097545161008064, 35.53806023374435 30.191341716182546, 35.58426519384873 30.2777851165098, 35.64644660940672 30.353553390593273, 35.722214883490196 30.415734806151274, 35.80865828381746 30.461939766255643, 35.902454838991936 30.490392640201616, 36 30.5, 36.097545161008064 30.490392640201616, 36.19134171618254 30.461939766255643, 36.277785116509804 30.415734806151274, 36.35355339059328 30.353553390593273, 36.41573480615127 30.2777851165098, 36.46193976625565 30.191341716182546, 36.49039264020161 30.097545161008064, 36.5 30)), POLYGON ((41.5 35, 41.49039264020161 34.902454838991936, 41.46193976625565 34.80865828381746, 41.41573480615127 34.722214883490196, 41.35355339059328 34.64644660940672, 41.277785116509804 34.58426519384873, 41.19134171618254 34.53806023374435, 41.097545161008064 34.50960735979839, 41 34.5, 40.902454838991936 34.50960735979839, 40.80865828381746 34.53806023374435, 40.722214883490196 34.58426519384873, 40.64644660940672 34.64644660940672, 40.58426519384873 34.722214883490196, 40.53806023374435 34.80865828381746, 40.50960735979839 34.902454838991936, 40.5 35, 40.50960735979839 35.097545161008064, 40.53806023374435 35.19134171618254, 40.58426519384873 35.277785116509804, 40.64644660940672 35.35355339059328, 40.722214883490196 35.41573480615127, 40.80865828381746 35.46193976625565, 40.902454838991936 35.49039264020161, 41 35.5, 41.097545161008064 35.49039264020161, 41.19134171618254 35.46193976625565, 41.277785116509804 35.41573480615127, 41.35355339059328 35.35355339059328, 41.41573480615127 35.277785116509804, 41.46193976625565 35.19134171618254, 41.49039264020161 35.097545161008064, 41.5 35)), POLYGON ((46.5 30, 46.49039264020161 29.902454838991936, 46.46193976625565 29.808658283817454, 46.41573480615127 29.7222148834902, 46.35355339059328 29.646446609406727, 46.277785116509804 29.584265193848726, 46.19134171618254 29.538060233744357, 46.097545161008064 29.509607359798384, 46 29.5, 45.902454838991936 29.509607359798384, 45.80865828381746 29.538060233744357, 45.722214883490196 29.584265193848726, 45.64644660940672 29.646446609406727, 45.58426519384873 29.7222148834902, 45.53806023374435 29.808658283817454, 45.50960735979839 29.902454838991936, 45.5 30, 45.50960735979839 30.097545161008064, 45.53806023374435 30.191341716182546, 45.58426519384873 30.2777851165098, 45.64644660940672 30.353553390593273, 45.722214883490196 30.415734806151274, 45.80865828381746 30.461939766255643, 45.902454838991936 30.490392640201616, 46 30.5, 46.097545161008064 30.490392640201616, 46.19134171618254 30.461939766255643, 46.277785116509804 30.415734806151274, 46.35355339059328 30.353553390593273, 46.41573480615127 30.2777851165098, 46.46193976625565 30.191341716182546, 46.49039264020161 30.097545161008064, 46.5 30)), POLYGON ((41.5 25, 41.49039264020161 24.902454838991936, 41.46193976625565 24.808658283817454, 41.41573480615127 24.7222148834902, 41.35355339059328 24.646446609406727, 41.277785116509804 24.584265193848726, 41.19134171618254 24.538060233744357, 41.097545161008064 24.509607359798384, 41 24.5, 40.902454838991936 24.509607359798384, 40.80865828381746 24.538060233744357, 40.722214883490196 24.584265193848726, 40.64644660940672 24.646446609406727, 40.58426519384873 24.7222148834902, 40.53806023374435 24.808658283817454, 40.50960735979839 24.902454838991936, 40.5 25, 40.50960735979839 25.097545161008064, 40.53806023374435 25.191341716182546, 40.58426519384873 25.2777851165098, 40.64644660940672 25.353553390593273, 40.722214883490196 25.415734806151274, 40.80865828381746 25.461939766255643, 40.902454838991936 25.490392640201616, 41 25.5, 41.097545161008064 25.490392640201616, 41.19134171618254 25.461939766255643, 41.277785116509804 25.415734806151274, 41.35355339059328 25.353553390593273, 41.41573480615127 25.2777851165098, 41.46193976625565 25.191341716182546, 41.49039264020161 25.097545161008064, 41.5 25)), POLYGON ((35.5 33, 35.49039264020161 32.902454838991936, 35.46193976625565 32.80865828381746, 35.41573480615127 32.722214883490196, 35.35355339059328 32.64644660940672, 35.277785116509804 32.58426519384873, 35.19134171618254 32.53806023374435, 35.097545161008064 32.50960735979839, 35 32.5, 34.902454838991936 32.50960735979839, 34.80865828381746 32.53806023374435, 34.722214883490196 32.58426519384873, 34.64644660940672 32.64644660940672, 34.58426519384873 32.722214883490196, 34.53806023374435 32.80865828381746, 34.50960735979839 32.902454838991936, 34.5 33, 34.50960735979839 33.097545161008064, 34.53806023374435 33.19134171618254, 34.58426519384873 33.277785116509804, 34.64644660940672 33.35355339059328, 34.722214883490196 33.41573480615127, 34.80865828381746 33.46193976625565, 34.902454838991936 33.49039264020161, 35 33.5, 35.097545161008064 33.49039264020161, 35.19134171618254 33.46193976625565, 35.277785116509804 33.41573480615127, 35.35355339059328 33.35355339059328, 35.41573480615127 33.277785116509804, 35.46193976625565 33.19134171618254, 35.49039264020161 33.097545161008064, 35.5 33)), POLYGON ((38.5 36, 38.49039264020161 35.902454838991936, 38.46193976625565 35.80865828381746, 38.41573480615127 35.722214883490196, 38.35355339059328 35.64644660940672, 38.277785116509804 35.58426519384873, 38.19134171618254 35.53806023374435, 38.097545161008064 35.50960735979839, 38 35.5, 37.902454838991936 35.50960735979839, 37.80865828381746 35.53806023374435, 37.722214883490196 35.58426519384873, 37.64644660940672 35.64644660940672, 37.58426519384873 35.722214883490196, 37.53806023374435 35.80865828381746, 37.50960735979839 35.902454838991936, 37.5 36, 37.50960735979839 36.097545161008064, 37.53806023374435 36.19134171618254, 37.58426519384873 36.277785116509804, 37.64644660940672 36.35355339059328, 37.722214883490196 36.41573480615127, 37.80865828381746 36.46193976625565, 37.902454838991936 36.49039264020161, 38 36.5, 38.097545161008064 36.49039264020161, 38.19134171618254 36.46193976625565, 38.277785116509804 36.41573480615127, 38.35355339059328 36.35355339059328, 38.41573480615127 36.277785116509804, 38.46193976625565 36.19134171618254, 38.49039264020161 36.097545161008064, 38.5 36)), POLYGON ((44.5 36, 44.49039264020161 35.902454838991936, 44.46193976625565 35.80865828381746, 44.41573480615127 35.722214883490196, 44.35355339059328 35.64644660940672, 44.277785116509804 35.58426519384873, 44.19134171618254 35.53806023374435, 44.097545161008064 35.50960735979839, 44 35.5, 43.902454838991936 35.50960735979839, 43.80865828381746 35.53806023374435, 43.722214883490196 35.58426519384873, 43.64644660940672 35.64644660940672, 43.58426519384873 35.722214883490196, 43.53806023374435 35.80865828381746, 43.50960735979839 35.902454838991936, 43.5 36, 43.50960735979839 36.097545161008064, 43.53806023374435 36.19134171618254, 43.58426519384873 36.277785116509804, 43.64644660940672 36.35355339059328, 43.722214883490196 36.41573480615127, 43.80865828381746 36.46193976625565, 43.902454838991936 36.49039264020161, 44 36.5, 44.097545161008064 36.49039264020161, 44.19134171618254 36.46193976625565, 44.277785116509804 36.41573480615127, 44.35355339059328 36.35355339059328, 44.41573480615127 36.277785116509804, 44.46193976625565 36.19134171618254, 44.49039264020161 36.097545161008064, 44.5 36)), POLYGON ((47.5 33, 47.49039264020161 32.902454838991936, 47.46193976625565 32.80865828381746, 47.41573480615127 32.722214883490196, 47.35355339059328 32.64644660940672, 47.277785116509804 32.58426519384873, 47.19134171618254 32.53806023374435, 47.097545161008064 32.50960735979839, 47 32.5, 46.902454838991936 32.50960735979839, 46.80865828381746 32.53806023374435, 46.722214883490196 32.58426519384873, 46.64644660940672 32.64644660940672, 46.58426519384873 32.722214883490196, 46.53806023374435 32.80865828381746, 46.50960735979839 32.902454838991936, 46.5 33, 46.50960735979839 33.097545161008064, 46.53806023374435 33.19134171618254, 46.58426519384873 33.277785116509804, 46.64644660940672 33.35355339059328, 46.722214883490196 33.41573480615127, 46.80865828381746 33.46193976625565, 46.902454838991936 33.49039264020161, 47 33.5, 47.097545161008064 33.49039264020161, 47.19134171618254 33.46193976625565, 47.277785116509804 33.41573480615127, 47.35355339059328 33.35355339059328, 47.41573480615127 33.277785116509804, 47.46193976625565 33.19134171618254, 47.49039264020161 33.097545161008064, 47.5 33)), POLYGON ((35.5 27, 35.49039264020161 26.902454838991936, 35.46193976625565 26.808658283817454, 35.41573480615127 26.7222148834902, 35.35355339059328 26.646446609406727, 35.277785116509804 26.584265193848726, 35.19134171618254 26.538060233744357, 35.097545161008064 26.509607359798384, 35 26.5, 34.902454838991936 26.509607359798384, 34.80865828381746 26.538060233744357, 34.722214883490196 26.584265193848726, 34.64644660940672 26.646446609406727, 34.58426519384873 26.7222148834902, 34.53806023374435 26.808658283817454, 34.50960735979839 26.902454838991936, 34.5 27, 34.50960735979839 27.097545161008064, 34.53806023374435 27.191341716182546, 34.58426519384873 27.2777851165098, 34.64644660940672 27.353553390593273, 34.722214883490196 27.415734806151274, 34.80865828381746 27.461939766255643, 34.902454838991936 27.490392640201616, 35 27.5, 35.097545161008064 27.490392640201616, 35.19134171618254 27.461939766255643, 35.277785116509804 27.415734806151274, 35.35355339059328 27.353553390593273, 35.41573480615127 27.2777851165098, 35.46193976625565 27.191341716182546, 35.49039264020161 27.097545161008064, 35.5 27)), POLYGON ((38.5 24, 38.49039264020161 23.902454838991936, 38.46193976625565 23.808658283817454, 38.41573480615127 23.7222148834902, 38.35355339059328 23.646446609406727, 38.277785116509804 23.584265193848726, 38.19134171618254 23.538060233744357, 38.097545161008064 23.509607359798384, 38 23.5, 37.902454838991936 23.509607359798384, 37.80865828381746 23.538060233744357, 37.722214883490196 23.584265193848726, 37.64644660940672 23.646446609406727, 37.58426519384873 23.7222148834902, 37.53806023374435 23.808658283817454, 37.50960735979839 23.902454838991936, 37.5 24, 37.50960735979839 24.097545161008064, 37.53806023374435 24.191341716182546, 37.58426519384873 24.2777851165098, 37.64644660940672 24.353553390593273, 37.722214883490196 24.415734806151274, 37.80865828381746 24.461939766255643, 37.902454838991936 24.490392640201616, 38 24.5, 38.097545161008064 24.490392640201616, 38.19134171618254 24.461939766255643, 38.277785116509804 24.415734806151274, 38.35355339059328 24.353553390593273, 38.41573480615127 24.2777851165098, 38.46193976625565 24.191341716182546, 38.49039264020161 24.097545161008064, 38.5 24)), POLYGON ((44.5 24, 44.49039264020161 23.902454838991936, 44.46193976625565 23.808658283817454, 44.41573480615127 23.7222148834902, 44.35355339059328 23.646446609406727, 44.277785116509804 23.584265193848726, 44.19134171618254 23.538060233744357, 44.097545161008064 23.509607359798384, 44 23.5, 43.902454838991936 23.509607359798384, 43.80865828381746 23.538060233744357, 43.722214883490196 23.584265193848726, 43.64644660940672 23.646446609406727, 43.58426519384873 23.7222148834902, 43.53806023374435 23.808658283817454, 43.50960735979839 23.902454838991936, 43.5 24, 43.50960735979839 24.097545161008064, 43.53806023374435 24.191341716182546, 43.58426519384873 24.2777851165098, 43.64644660940672 24.353553390593273, 43.722214883490196 24.415734806151274, 43.80865828381746 24.461939766255643, 43.902454838991936 24.490392640201616, 44 24.5, 44.097545161008064 24.490392640201616, 44.19134171618254 24.461939766255643, 44.277785116509804 24.415734806151274, 44.35355339059328 24.353553390593273, 44.41573480615127 24.2777851165098, 44.46193976625565 24.191341716182546, 44.49039264020161 24.097545161008064, 44.5 24)), POLYGON ((47.5 27, 47.49039264020161 26.902454838991936, 47.46193976625565 26.808658283817454, 47.41573480615127 26.7222148834902, 47.35355339059328 26.646446609406727, 47.277785116509804 26.584265193848726, 47.19134171618254 26.538060233744357, 47.097545161008064 26.509607359798384, 47 26.5, 46.902454838991936 26.509607359798384, 46.80865828381746 26.538060233744357, 46.722214883490196 26.584265193848726, 46.64644660940672 26.646446609406727, 46.58426519384873 26.7222148834902, 46.53806023374435 26.808658283817454, 46.50960735979839 26.902454838991936, 46.5 27, 46.50960735979839 27.097545161008064, 46.53806023374435 27.191341716182546, 46.58426519384873 27.2777851165098, 46.64644660940672 27.353553390593273, 46.722214883490196 27.415734806151274, 46.80865828381746 27.461939766255643, 46.902454838991936 27.490392640201616, 47 27.5, 47.097545161008064 27.490392640201616, 47.19134171618254 27.461939766255643, 47.277785116509804 27.415734806151274, 47.35355339059328 27.353553390593273, 47.41573480615127 27.2777851165098, 47.46193976625565 27.191341716182546, 47.49039264020161 27.097545161008064, 47.5 27)), POLYGON ((34.5 30, 34.49039264020161 29.902454838991936, 34.46193976625565 29.808658283817454, 34.41573480615127 29.7222148834902, 34.35355339059328 29.646446609406727, 34.277785116509804 29.584265193848726, 34.19134171618254 29.538060233744357, 34.097545161008064 29.509607359798384, 34 29.5, 33.902454838991936 29.509607359798384, 33.80865828381746 29.538060233744357, 33.722214883490196 29.584265193848726, 33.64644660940672 29.646446609406727, 33.58426519384873 29.7222148834902, 33.53806023374435 29.808658283817454, 33.50960735979839 29.902454838991936, 33.5 30, 33.50960735979839 30.097545161008064, 33.53806023374435 30.191341716182546, 33.58426519384873 30.2777851165098, 33.64644660940672 30.353553390593273, 33.722214883490196 30.415734806151274, 33.80865828381746 30.461939766255643, 33.902454838991936 30.490392640201616, 34 30.5, 34.097545161008064 30.490392640201616, 34.19134171618254 30.461939766255643, 34.277785116509804 30.415734806151274, 34.35355339059328 30.353553390593273, 34.41573480615127 30.2777851165098, 34.46193976625565 30.191341716182546, 34.49039264020161 30.097545161008064, 34.5 30)), POLYGON ((41.5 37, 41.49039264020161 36.902454838991936, 41.46193976625565 36.80865828381746, 41.41573480615127 36.722214883490196, 41.35355339059328 36.64644660940672, 41.277785116509804 36.58426519384873, 41.19134171618254 36.53806023374435, 41.097545161008064 36.50960735979839, 41 36.5, 40.902454838991936 36.50960735979839, 40.80865828381746 36.53806023374435, 40.722214883490196 36.58426519384873, 40.64644660940672 36.64644660940672, 40.58426519384873 36.722214883490196, 40.53806023374435 36.80865828381746, 40.50960735979839 36.902454838991936, 40.5 37, 40.50960735979839 37.097545161008064, 40.53806023374435 37.19134171618254, 40.58426519384873 37.277785116509804, 40.64644660940672 37.35355339059328, 40.722214883490196 37.41573480615127, 40.80865828381746 37.46193976625565, 40.902454838991936 37.49039264020161, 41 37.5, 41.097545161008064 37.49039264020161, 41.19134171618254 37.46193976625565, 41.277785116509804 37.41573480615127, 41.35355339059328 37.35355339059328, 41.41573480615127 37.277785116509804, 41.46193976625565 37.19134171618254, 41.49039264020161 37.097545161008064, 41.5 37)), POLYGON ((10.707106781186546 45, 12.353553390593271 43.35355339059327, 12.46193976625564 43.191341716182535, 12.499999999999996 42.99999999999999, 12.46193976625564 42.80865828381745, 12.35355339059327 42.646446609406716, 12.19134171618254 42.538060233744346, 11.999999999999996 42.49999999999999, 11.80865828381745 42.538060233744346, 11.646446609406722 42.646446609406716, 9.646446609406725 44.646446609406716, 9.538060233744357 44.808658283817444, 9.5 44.99999999999999, 9.538060233744355 45.191341716182535, 9.646446609406725 45.35355339059326, 11.646446609406722 47.35355339059327, 11.80865828381745 47.46193976625564, 11.999999999999995 47.5, 12.19134171618254 47.46193976625565, 12.35355339059327 47.35355339059328, 12.46193976625564 47.19134171618255, 12.499999999999996 47, 12.46193976625564 46.80865828381746, 12.353553390593271 46.64644660940673, 10.707106781186546 45)), POLYGON ((7.353553390593271 45.35355339059327, 7.461939766255642 45.19134171618254, 7.499999999999999 44.99999999999999, 7.461939766255642 44.80865828381745, 7.353553390593273 44.646446609406716, 5.353553390593272 42.646446609406716, 5.191341716182543 42.538060233744346, 4.999999999999998 42.49999999999999, 4.808658283817453 42.538060233744346, 4.646446609406724 42.646446609406716, 4.538060233744355 42.80865828381745, 4.499999999999998 42.99999999999999, 4.538060233744355 43.191341716182535, 4.646446609406724 43.35355339059327, 6.292893218813448 44.99999999999999, 4.646446609406726 46.6464466094067, 4.538060233744355 46.80865828381743, 4.499999999999998 46.99999999999998, 4.538060233744354 47.19134171618252, 4.646446609406723 47.35355339059325, 4.808658283817452 47.46193976625562, 4.9999999999999964 47.49999999999998, 5.191341716182541 47.461939766255625, 5.35355339059327 47.353553390593255, 7.353553390593271 45.35355339059327)), POLYGON ((24.5 30.5, 22.5 30.5, 22.5 33.5, 25.5 33.5, 25.5 31, 25.5 30.5, 24.5 30.5), (24.5 31.5, 24.5 32.5, 23.5 32.5, 23.5 31.5, 24 31.5, 24.5 31.5)), POLYGON ((33.5 57.5, 33.5 56.5, 32.5 56.5, 32.5 57.5, 33.5 57.5)), POLYGON ((33.5 54.5, 33.5 53.5, 32.5 53.5, 32.5 54.5, 33.5 54.5)), POLYGON ((33.5 51.5, 33.5 50.5, 32.5 50.5, 32.5 51.5, 33.5 51.5)), POLYGON ((33.5 48.5, 33.5 47.5, 32.5 47.5, 32.5 48.5, 33.5 48.5)), POLYGON ((30.5 48.5, 30.5 47.5, 29.5 47.5, 29.5 48.5, 30.5 48.5)), POLYGON ((27.5 48.5, 27.5 47.5, 26.5 47.5, 26.5 48.5, 27.5 48.5)), POLYGON ((24.5 48.5, 24.5 47.5, 23.5 47.5, 23.5 48.5, 24.5 48.5)), POLYGON ((21.5 48.5, 21.5 47.5, 20.5 47.5, 20.5 48.5, 21.5 48.5)), POLYGON ((18.5 48.5, 18.5 47.5, 17.5 47.5, 17.5 48.5, 18.5 48.5)), POLYGON ((18.5 51.5, 18.5 50.5, 17.5 50.5, 17.5 51.5, 18.5 51.5)), POLYGON ((21.5 51.5, 21.5 50.5, 20.5 50.5, 20.5 51.5, 21.5 51.5)), POLYGON ((24.5 51.5, 24.5 50.5, 23.5 50.5, 23.5 51.5, 24.5 51.5)), POLYGON ((27.5 51.5, 27.5 50.5, 26.5 50.5, 26.5 51.5, 27.5 51.5)), POLYGON ((30.5 51.5, 30.5 50.5, 29.5 50.5, 29.5 51.5, 30.5 51.5)), POLYGON ((30.5 54.5, 30.5 53.5, 29.5 53.5, 29.5 54.5, 30.5 54.5)), POLYGON ((27.5 54.5, 27.5 53.5, 26.5 53.5, 26.5 54.5, 27.5 54.5)), POLYGON ((24.5 54.5, 24.5 53.5, 23.5 53.5, 23.5 54.5, 24.5 54.5)), POLYGON ((21.5 54.5, 21.5 53.5, 20.5 53.5, 20.5 54.5, 21.5 54.5)), POLYGON ((18.5 54.5, 18.5 53.5, 17.5 53.5, 17.5 54.5, 18.5 54.5)), POLYGON ((18.5 57.5, 18.5 56.5, 17.5 56.5, 17.5 57.5, 18.5 57.5)), POLYGON ((21.5 57.5, 21.5 56.5, 20.5 56.5, 20.5 57.5, 21.5 57.5)), POLYGON ((24.5 57.5, 24.5 56.5, 23.5 56.5, 23.5 57.5, 24.5 57.5)), POLYGON ((27.5 57.5, 27.5 56.5, 26.5 56.5, 26.5 57.5, 27.5 57.5)), POLYGON ((30.5 57.5, 30.5 56.5, 29.5 56.5, 29.5 57.5, 30.5 57.5)))`
// const defaultWkt = `GEOMETRYCOLLECTION (POLYGON ((15 9.292893218813454, 9.292893218813454 15, 15 20.707106781186546, 20.707106781186546 15, 15 9.292893218813454)), POLYGON ((-0.5 60.5, 80.5 60.5, 80.5 -0.5, -0.5 -0.5, -0.5 60.5), (0.5 59.5, 0.5 0.5, 79.5 0.5, 79.5 59.5, 0.5 59.5)), POLYGON ((-0.5 60.5, 80.5 60.5, 80.5 -0.5, -0.5 -0.5, -0.5 60.5), (0.5 59.5, 0.5 0.5, 79.5 0.5, 79.5 59.5, 0.5 59.5)), POLYGON ((29.5 29.5, 1 29.5, 0.5 29.5, 0.5 30.5, 30.5 30.5, 30.5 20, 30.5 19.5, 29.5 19.5, 29.5 29.5)), POLYGON ((29.5 29.5, 1 29.5, 0.5 29.5, 0.5 30.5, 30.5 30.5, 30.5 20, 30.5 19.5, 29.5 19.5, 29.5 29.5)), POLYGON ((30.5 1, 30.5 0.5, 29.5 0.5, 29.5 10, 29.5 10.5, 30.5 10.5, 30.5 1)), POLYGON ((30.5 1, 30.5 0.5, 29.5 0.5, 29.5 10, 29.5 10.5, 30.5 10.5, 30.5 1)), POLYGON ((9.5 50.5, 45 50.5, 45.5 50.5, 45.5 49.5, 10.5 49.5, 10.5 45, 10.5 44.5, 9.5 44.5, 9.5 50.5)), POLYGON ((45.5 39.5, 10 39.5, 9.5 39.5, 9.5 40.5, 44.5 40.5, 44.5 45, 44.5 45.5, 45.5 45.5, 45.5 39.5)), POLYGON ((46.5 27.5, 56.5 27.5, 56.5 16.5, 45.5 16.5, 45.5 27, 45.5 27.5, 46.5 27.5), (46.5 17.5, 55.5 17.5, 55.5 26.5, 47 26.5, 46.5 26.5, 46.5 17.5)), POLYGON ((42.5 23.5, 43.5 23.5, 43.5 20.5, 40.5 20.5, 40.5 23.5, 42 23.5, 42.5 23.5), (42.5 22.5, 41.5 22.5, 41.5 21.5, 42.5 21.5, 42.5 22.5)), POLYGON ((58.5 18.5, 58.5 19.5, 65.5 19.5, 65.5 12.5, 58.5 12.5, 58.5 18, 58.5 18.5), (59.5 18.5, 59.5 13.5, 64.5 13.5, 64.5 18.5, 59.5 18.5)), POLYGON ((42.5 36.5, 42.5 37.5, 46.5 37.5, 46.5 33.5, 42.5 33.5, 42.5 36, 42.5 36.5), (43.5 36.5, 43.5 34.5, 45.5 34.5, 45.5 36.5, 43.5 36.5)), POLYGON ((41.5 30.5, 41.5 25.5, 35.5 25.5, 35.5 31.5, 41 31.5, 41.5 31.5, 41.5 30.5), (36.5 30.5, 36.5 26.5, 40.5 26.5, 40.5 30, 40.5 30.5, 36.5 30.5)), POLYGON ((44.5 31.5, 45.5 31.5, 45.5 29.5, 43.5 29.5, 43.5 31, 43.5 31.5, 44.5 31.5)), POLYGON ((55.5 12.5, 53.5 12.5, 53.5 14.5, 55.5 14.5, 55.5 12.5)), POLYGON ((38.5 35.5, 38.5 36.5, 40.5 36.5, 40.5 34.5, 39 34.5, 38.5 34.5, 38.5 35.5)), POLYGON ((65.5 26.5, 65.5 27.5, 67.5 27.5, 67.5 25.5, 66 25.5, 65.5 25.5, 65.5 26.5)), POLYGON ((38.5 19.5, 36.5 19.5, 36.5 21.5, 38.5 21.5, 38.5 19.5)), POLYGON ((62.5 25.5, 63.5 25.5, 63.5 21.5, 59.5 21.5, 59.5 25.5, 62 25.5, 62.5 25.5), (62.5 24.5, 60.5 24.5, 60.5 22.5, 62.5 22.5, 62.5 24.5)), POLYGON ((49.5 32.5, 51.5 32.5, 51.5 29.5, 48.5 29.5, 48.5 32, 48.5 32.5, 49.5 32.5), (49.5 30.5, 50.5 30.5, 50.5 31.5, 50 31.5, 49.5 31.5, 49.5 30.5)), POLYGON ((58.5 27.5, 58.5 29.5, 60.5 29.5, 60.5 27.5, 58.5 27.5)), POLYGON ((65.5 37.5, 65.5 31.190983005625053, 52.8819660112501 37.5, 65.5 37.5)), POLYGON ((30.5 47.5, 30.5 42.5, 29 42.5, 28.5 42.5, 28.5 43.5, 29.5 43.5, 29.5 46.5, 29 46.5, 28.5 46.5, 28.5 47.5, 30.5 47.5)), POLYGON ((25.5 46.5, 25.5 43.5, 26 43.5, 26.5 43.5, 26.5 42.5, 24.5 42.5, 24.5 47.5, 26 47.5, 26.5 47.5, 26.5 46.5, 25.5 46.5)), POLYGON ((68.5 23.5, 72.5 23.5, 72.5 18.5, 67.5 18.5, 67.5 23, 67.5 23.5, 68.5 23.5), (68.5 19.5, 71.5 19.5, 71.5 22.5, 69 22.5, 68.5 22.5, 68.5 19.5)), POLYGON ((69.5 16.5, 70.5 16.5, 70.5 14.5, 68.5 14.5, 68.5 16, 68.5 16.5, 69.5 16.5)), POLYGON ((50.5 12.5, 50.5 7.5, 44.5 7.5, 44.5 13.5, 50 13.5, 50.5 13.5, 50.5 12.5), (45.5 12.5, 45.5 8.5, 49.5 8.5, 49.5 12, 49.5 12.5, 45.5 12.5)), POLYGON ((76 55.5, 76.5 55.5, 76.5 54.5, 74 54.5, 73.5 54.5, 73.5 55.5, 76 55.5)), POLYGON ((79 55.5, 79.5 55.5, 79.5 54.5, 77 54.5, 76.5 54.5, 76.5 55.5, 79 55.5)), POLYGON ((79 46.5, 79.5 46.5, 79.5 45.5, 77 45.5, 76.5 45.5, 76.5 46.5, 79 46.5)), POLYGON ((69 42.5, 68.5 42.5, 68.5 43.5, 71 43.5, 71.5 43.5, 71.5 42.5, 69 42.5)), POLYGON ((72 42.5, 71.5 42.5, 71.5 43.5, 74 43.5, 74.5 43.5, 74.5 42.5, 72 42.5)), POLYGON ((74.5 44, 74.5 43.5, 73.5 43.5, 73.5 46, 73.5 46.5, 74.5 46.5, 74.5 44)), POLYGON ((79 31.5, 79.5 31.5, 79.5 30.5, 77 30.5, 76.5 30.5, 76.5 31.5, 79 31.5)), POLYGON ((77.5 32, 77.5 31.5, 76.5 31.5, 76.5 34, 76.5 34.5, 77.5 34.5, 77.5 32)), POLYGON ((76 34.5, 76.5 34.5, 76.5 33.5, 74 33.5, 73.5 33.5, 73.5 34.5, 76 34.5)), POLYGON ((73 34.5, 73.5 34.5, 73.5 33.5, 71 33.5, 70.5 33.5, 70.5 34.5, 73 34.5)), POLYGON ((77.5 50, 77.5 49.5, 76.5 49.5, 76.5 52, 76.5 52.5, 77.5 52.5, 77.5 50)), POLYGON ((76 49.5, 76.5 49.5, 76.5 48.5, 74 48.5, 73.5 48.5, 73.5 49.5, 76 49.5)), POLYGON ((77.5 47, 77.5 46.5, 76.5 46.5, 76.5 49, 76.5 49.5, 77.5 49.5, 77.5 47)), POLYGON ((73 49.5, 73.5 49.5, 73.5 48.5, 71 48.5, 70.5 48.5, 70.5 49.5, 73 49.5)), POLYGON ((70.5 48, 70.5 48.5, 71.5 48.5, 71.5 46, 71.5 45.5, 70.5 45.5, 70.5 48)), POLYGON ((79 37.5, 79.5 37.5, 79.5 36.5, 77 36.5, 76.5 36.5, 76.5 37.5, 79 37.5)), POLYGON ((76 37.5, 76.5 37.5, 76.5 36.5, 74 36.5, 73.5 36.5, 73.5 37.5, 76 37.5)), POLYGON ((79 43.5, 79.5 43.5, 79.5 42.5, 77 42.5, 76.5 42.5, 76.5 43.5, 79 43.5)), POLYGON ((70.5 42, 70.5 42.5, 71.5 42.5, 71.5 40, 71.5 39.5, 70.5 39.5, 70.5 42)), POLYGON ((71.5 35, 71.5 34.5, 70.5 34.5, 70.5 37, 70.5 37.5, 71.5 37.5, 71.5 35)), POLYGON ((72 39.5, 71.5 39.5, 71.5 40.5, 74 40.5, 74.5 40.5, 74.5 39.5, 72 39.5)), POLYGON ((75 39.5, 74.5 39.5, 74.5 40.5, 77 40.5, 77.5 40.5, 77.5 39.5, 75 39.5)), POLYGON ((67.5 59, 67.5 59.5, 68.5 59.5, 68.5 31, 68.5 30.5, 67.5 30.5, 67.5 59)), POLYGON ((69 30.5, 68.5 30.5, 68.5 31.5, 71 31.5, 71.5 31.5, 71.5 30.5, 69 30.5)), POLYGON ((72 30.5, 71.5 30.5, 71.5 31.5, 74 31.5, 74.5 31.5, 74.5 30.5, 72 30.5)), POLYGON ((69 54.5, 68.5 54.5, 68.5 55.5, 71 55.5, 71.5 55.5, 71.5 54.5, 69 54.5)), POLYGON ((70.5 54, 70.5 54.5, 71.5 54.5, 71.5 52, 71.5 51.5, 70.5 51.5, 70.5 54)), POLYGON ((72 51.5, 71.5 51.5, 71.5 52.5, 74 52.5, 74.5 52.5, 74.5 51.5, 72 51.5)), POLYGON ((15.5 41, 15.5 40.5, 14.5 40.5, 14.5 45, 14.5 45.5, 15.5 45.5, 15.5 41)), POLYGON ((19.5 49, 19.5 49.5, 20.5 49.5, 20.5 45, 20.5 44.5, 19.5 44.5, 19.5 49)), POLYGON ((35.5 41, 35.5 40.5, 34.5 40.5, 34.5 45, 34.5 45.5, 35.5 45.5, 35.5 41)), POLYGON ((39.5 49, 39.5 49.5, 40.5 49.5, 40.5 45, 40.5 44.5, 39.5 44.5, 39.5 49)), POLYGON ((65.5 40.5, 65.5 39.5, 64.5 39.5, 64.5 40.5, 65.5 40.5)), POLYGON ((62.5 40.5, 62.5 39.5, 61.5 39.5, 61.5 40.5, 62.5 40.5)), POLYGON ((59.5 40.5, 59.5 39.5, 58.5 39.5, 58.5 40.5, 59.5 40.5)), POLYGON ((56.5 40.5, 56.5 39.5, 55.5 39.5, 55.5 40.5, 56.5 40.5)), POLYGON ((53.5 40.5, 53.5 39.5, 52.5 39.5, 52.5 40.5, 53.5 40.5)), POLYGON ((50.5 40.5, 50.5 39.5, 49.5 39.5, 49.5 40.5, 50.5 40.5)), POLYGON ((50.5 43.5, 50.5 42.5, 49.5 42.5, 49.5 43.5, 50.5 43.5)), POLYGON ((53.5 43.5, 53.5 42.5, 52.5 42.5, 52.5 43.5, 53.5 43.5)), POLYGON ((56.5 43.5, 56.5 42.5, 55.5 42.5, 55.5 43.5, 56.5 43.5)), POLYGON ((59.5 43.5, 59.5 42.5, 58.5 42.5, 58.5 43.5, 59.5 43.5)), POLYGON ((62.5 43.5, 62.5 42.5, 61.5 42.5, 61.5 43.5, 62.5 43.5)), POLYGON ((65.5 43.5, 65.5 42.5, 64.5 42.5, 64.5 43.5, 65.5 43.5)), POLYGON ((65.5 46.5, 65.5 45.5, 64.5 45.5, 64.5 46.5, 65.5 46.5)), POLYGON ((62.5 46.5, 62.5 45.5, 61.5 45.5, 61.5 46.5, 62.5 46.5)), POLYGON ((59.5 46.5, 59.5 45.5, 58.5 45.5, 58.5 46.5, 59.5 46.5)), POLYGON ((56.5 46.5, 56.5 45.5, 55.5 45.5, 55.5 46.5, 56.5 46.5)), POLYGON ((53.5 46.5, 53.5 45.5, 52.5 45.5, 52.5 46.5, 53.5 46.5)), POLYGON ((50.5 46.5, 50.5 45.5, 49.5 45.5, 49.5 46.5, 50.5 46.5)), POLYGON ((50.5 49.5, 50.5 48.5, 49.5 48.5, 49.5 49.5, 50.5 49.5)), POLYGON ((53.5 49.5, 53.5 48.5, 52.5 48.5, 52.5 49.5, 53.5 49.5)), POLYGON ((56.5 49.5, 56.5 48.5, 55.5 48.5, 55.5 49.5, 56.5 49.5)), POLYGON ((59.5 49.5, 59.5 48.5, 58.5 48.5, 58.5 49.5, 59.5 49.5)), POLYGON ((62.5 49.5, 62.5 48.5, 61.5 48.5, 61.5 49.5, 62.5 49.5)), POLYGON ((65.5 49.5, 65.5 48.5, 64.5 48.5, 64.5 49.5, 65.5 49.5)), POLYGON ((65.5 52.5, 65.5 51.5, 64.5 51.5, 64.5 52.5, 65.5 52.5)), POLYGON ((62.5 52.5, 62.5 51.5, 61.5 51.5, 61.5 52.5, 62.5 52.5)), POLYGON ((62.5 55.5, 62.5 54.5, 61.5 54.5, 61.5 55.5, 62.5 55.5)), POLYGON ((65.5 55.5, 65.5 54.5, 64.5 54.5, 64.5 55.5, 65.5 55.5)), POLYGON ((59.5 52.5, 59.5 51.5, 58.5 51.5, 58.5 52.5, 59.5 52.5)), POLYGON ((56.5 52.5, 56.5 51.5, 55.5 51.5, 55.5 52.5, 56.5 52.5)), POLYGON ((53.5 52.5, 53.5 51.5, 52.5 51.5, 52.5 52.5, 53.5 52.5)), POLYGON ((50.5 52.5, 50.5 51.5, 49.5 51.5, 49.5 52.5, 50.5 52.5)), POLYGON ((50.5 55.5, 50.5 54.5, 49.5 54.5, 49.5 55.5, 50.5 55.5)), POLYGON ((53.5 55.5, 53.5 54.5, 52.5 54.5, 52.5 55.5, 53.5 55.5)), POLYGON ((56.5 55.5, 56.5 54.5, 55.5 54.5, 55.5 55.5, 56.5 55.5)), POLYGON ((59.5 55.5, 59.5 54.5, 58.5 54.5, 58.5 55.5, 59.5 55.5)))`
// const wallWkt = `
// GEOMETRYCOLLECTION (
//     LINESTRING (
//         0 0,
//         80 0,
//         80 60,
//         0 60,
//         0 0
//     ),
//     POLYGON (
//         (
//             15 10,
//             20 15,
//             15 20,
//             10 15,
//             15 10
//         )
//     ),
//     LINESTRING (
//         0 30,
//         30 30,
//         30 20
//     ),
//     LINESTRING (
//         30 0,
//         30 10
//     ),
//     LINESTRING (
//         10 40,
//         40 40,
//         40 20,
//         60 20
//     ),
//     POINT (10 45),
//     POINT (15 45),
//     POINT (20 45),
//     POINT (25 45),
//     POINT (30 45),
//     POINT (35 45),
//     POINT (40 45),
//     POINT (45 45),
//     LINESTRING (
//         45 40,
//         45 25,
//         60 25
//     ),
//     LINESTRING (
//         40 10,
//         70 10,
//         70 50
//     ),
//     POLYGON (
//         (
//             50 30,
//             60 30,
//             60 40,
//             50 40,
//             50 30
//         )
//     ),
//     LINESTRING (
//         73 10,
//         73 15),
//     POINT (73 18),
//     POINT (73 21),
//     POINT (73 24),
//     POINT (73 27),
//     POINT (73 30),
//     POINT (73 33),
//     POINT (73 36),
//     POINT (73 39),
//     POINT (73 42),
//     LINESTRING (
//         73 45,
//         73 50)
// )
// `

// demo()
setTimeout(demo, 100)
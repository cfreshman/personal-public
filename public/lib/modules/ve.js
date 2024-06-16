// ve.js @ https://freshman.dev/lib/2/ https://freshman.dev/copyright.js

const V = class extends Array {
  // VECTOR WITH 4 NAMED DIMENSIONS (x, y, z, w)
  // ve ctor : from list
  // => ne w
  // di mension
  // ze ro
  // ra nge
  // ho t
  // id entity
  // as sign
  // d0 .. d4 dN
  // ad d
  // mu ltiply
  // sc ale
  // su m
  // ma gnitude
  // no rmalize
  // do t product
  // cr oss product
  // in vert
  // tr ansform
  // pr oduct
  // st ring
  // ar ray

  get x() { return this[0]??0 }; set x(x) { return this[0] = x }
  get y() { return this[1]??0 }; set y(x) { return this[1] = x }
  get z() { return this[2]??0 }; set z(x) { return this[2] = x }
  get w() { return this[3]??0 }; set w(x) { return this[3] = x }

  static ve = (...x) => {
    if (Array.isArray(x[0])) x = x[0]
    const n = x[0] === undefined ? 0 : x.indexOf(undefined) + 1 || x.length
    const v = new V(n)
    for (let i = 0; i < n; i++) v[i] = x[i]
    return Object.assign(v, Object.fromEntries(Object.getOwnPropertyNames(V).filter(k => !'length name prototype'.includes(k)).map(k => [k, (...x)=>V[k](v, ...x)])))
  }
  static ne = (...x) => V.ve(...x)
  static di = (v) => V.ar(v).length

  static ze = (n) => V.ne(Array.from({ length: Array.isArray(n) ? n.length : n}).map(_=> 0))
  static ra = (n) => V.ne(V.ze(n).map((_,i)=> i))
  static ho = (n, i=0) => V.ne(V.ra(n).map(_i=> _i === i ? 1 : 0))
  static id = (n) => V.ho(n, 0)
  static as = (v, ...x) => V.ne(V.ra(v).map(i=> x[i] ?? x[x.length-1] ?? 0))

  static dN = (v, n, x) => {
    v = V.ne(...v)
    return V.ne(V.ra(n).map(i=> v[i] ?? 0))
  }
  static d0 = () => V.ne()
  static d1 = (...v) => V.dN(v, 1)
  static d2 = (...v) => V.dN(v, 2)
  static d3 = (...v) => V.dN(v, 3)
  static d4 = (...v) => V.dN(v, 4)

  static ad = (...x) => {
    if (x.length > 2) {
      let v = V.as(x[[0]], 0)
      for (let i = 0; i < x.length; i++) v = V.ad(v, x[i])
      return v
    } else {
      const [a, b] = x
      return V.ne((a.x??0)+(b.x??0), (a.y??0)+(b.y??0), (a.z??0)+(b.z??0), (a.w??0)+(b.w??0))
    }
  }
  static mu = (...x) => {
    if (x.length > 2) {
      let v = V.as(x[0], 1)
      for (let i = 0; i < x.length; i++) v = V.mu(v, x[i])
      return v
    } else {
      const [a, b] = x
      return V.ne((a.x??0)*(b.x??0), (a.y??0)*(b.y??0), (a.z??0)*(b.z??0), (a.w??0)*(b.w??0))
    }
  }
  static sc = (c, v) => V.mu(v, V.as(v, c))
  static su = (v) => V.ar(v).reduce((s,x)=>s+x,0)
  static ma = (v) => Math.sqrt(V.su(v))
  static no = (v) => V.sc(v, 1 / (V.ma(v) || 1))

  static do = (a, b=a) => V.su(V.mu(a, b))
  static cr = (a, b) => V.ne((a.x??0)*(b.y??0), (a.y??0)*(b.z??0), (a.z??0)*(b.x??0))
  static in = (v) => V.ne(v.x?1/v.x:0, v.y?1/v.y:0, v.z?1/v.z:0, v.w?1/v.w:0)

  static tr = (v, M) => ({
    // 3-dimensional homogenous transform
    x: v.x*(M[0][0]??0) + v.y*(M[0][1]??0) + v.z*(M[0][2]??0) + v.w*(M[0][2]??0),
    y: v.x*(M[1][0]??0) + v.y*(M[1][1]??0) + v.z*(M[1][2]??0) + v.w*(M[1][2]??0),
    z: v.x*(M[2][0]??0) + v.y*(M[2][1]??0) + v.z*(M[2][2]??0) + v.w*(M[2][2]??0),
    w: v.x*(M[3][0]??0) + v.y*(M[3][1]??0) + v.z*(M[3][2]??0) + v.w*(M[3][2]??0),
  })
  static pr = (v, p) => M.mu(v, M.mu(p, M.tr(p)))

  static st = (v) => V.di(st)+V.ar(st).toString()
  static ar = (v) => Array.from(v)
}

const M = class extends Array {
  // MATRIX IMPLEMENTATION (2-dimensional array, no named components)
  // ma trix : from list of vectors
  // => ne w
  // di mension
  // el ement
  // => a
  // ro w vector
  // co lumn vector
  // tr anspose
  // mu ltiply
  // st ring
  // ar ray

  static ma = (Mv) => Array.isArray(Mv[0]) ? Mv : Mv.map(x=>[x])
  static ne = (...x) => M.ma(...x)
  static di = (A) => {
    A = M.ma(A)
    return [A.length, A[0].length]
  }

  static el = (A, i, j) => M.ma(A)[i][j]
  static a = (...x) => M.el(...x)
  static ro = (A, i=undefined) => {
    A = M.ma(A)
    return i === undefined ? A : V.ve(A[i])
  }
  static co = (A, i) => M.ro(M.tr(M.ma(A)), i)
  static tr = (A) => {
    A = M.ma(A)
    return A[0].map((_,c)=>A.map((_,r)=>A[r][c]))
  }
  static mu = (aMN, bNP) => {
    aMN = M.ma(aMN)
    bNP = M.ma(bNP)
    const cMP = aMN.slice().map(_=>bNP[0].slice(_=>0))
    for (let r = 0; r < cMP.length; r++)
    for (let c = 0; c < cMP[0].length; c++) {
      cMP[r][c] = V.do(V.ne(aMN[0].map((_,i)=>aMN[r][i])), V.ne(bNP.map((_,i)=>bNP[i][c])))
    }
    return cMP
  }

  static st = (A) => {
    A = M.ma(A)
    const lines = A.map(rv => rv.map(x => String(Math.round(x * 1000) / 1000)))
    const value_len = Math.max(...lines.flatMap(x=>x).map(x=>x.length))
    return `${M.di(A)}\n${lines.map(rv=>rv.map(s=>s.padStart(value_len)).join(' ')).join('\n')}`
  }
  static ar = (A, d=2) => {
    A = M.ma(A)
    while (d--) A = A.flatMap(x=>x)
    return A
  }
}

Object.assign(window, window.ve = {
  V,
  M,
})
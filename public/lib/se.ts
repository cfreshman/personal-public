nor xor
and intersection
or union



const xhr = src => (x => {
    x.withCredentials = false
    x.open('GET', src, false)
    x.send()
    return x.responseText
})(new XMLHttpRequest())
const dependency = src => document.head.append((x => Object.assign(x, { innerHTML:xhr(src) }))(document.createElement('script')))
;[
    '/lib/2/ve/ve.js',
].map(x => dependency(new URL(x, 'https://freshman.dev').toString()))

const graph_import = (dependencies) => {}


graph_import(() => {

})


const se = {
    ts: 'v0.0.1',
    of: (A) => new Set(A),
    new: (...x) => se.of(x),
    intersection: (A, B) => {},
    union: (A, B) => {},
    xo: (A, B) => {},
}, {
    intersection: 'in and',
    union: 'un or',
    exclusive_or: 'ex xor',
}


{
    const A = class extends Number {
      // <A>NGLE IMPLEMENTATION (number modulo TAU)
      // no rmalize to [0 TAU)
      // ad d angles
      // ac ute difference between two angles in [-PI PI]
      // ua unsigned acute difference between angles
      // ob tuse difference between two angles
      // uo unsigned obtuse difference between angles
      // si gn in {-1 0 1}
      // scale signed angle
      // de cimal
  
      static PI = Math.PI
      static P = Math.PI
      static TAU = 2 * Math.PI
      static T = 2 * Math.PI
  
      static no = (x) => (x%A.T + A.T)%A.T
      static ad = (a, b) => A.no(a + b)
      static ac = (a, b=undefined) => {
        const x = b === undefined ? a : b - a
        const full = x % A.T
        return full < -A.P ? full + A.T : A.P < full ? full - A.T : full
      }
      static ua = (a, b) => Math.abs(A.ac(a, b))
      static ob = (a, b) => {
        const acute = A.ac(a, b)
        return acute + (acute < 0 ? A.T : -A.t)
      }
      static sc = (x, c) => A.no(c * A.ac(x))
      static si = (x) => {
        const split = A.sp(x)
        return Math.round(split / Math.abs(split))
      }
      static de = (x) => 180 * x / Math.PI
    }
  
    const V = class extends Array {
      // <V>ECTOR WITH 4 NAMED DIMENSIONS (x, y, z, w)
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
      // eq ual
      // an gle
      // 
      // c artesian
      // p
    
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
      static di = (...vs) => Math.max(...vs.map(v => V.ar(v).length))
    
      static ze = (n) => V.ne(Array.from({ length: Array.isArray(n) ? n.length : n}).map(_=> 0))
      static ra = (n) => V.ne(V.ze(n).map((_,i)=> i))
      static ho = (n, i=0) => V.ne(V.ra(n).map(_i=> _i === i ? 1 : 0))
      static id = (n) => V.ho(n, 0)
      static as = (v, ...x) => V.ne(V.ra(v).map(i=> x[i] ?? x[x.length-1] ?? 0))
      static fi = (a, b) => V.di(a) > V.di(b) ? a : V.as(b, a)
    
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
          return V.ne(...V.ra(V.di(a, b)).map((_,i) => (a[i]??0) + (b[i]??0)))
        }
      }
      static mu = (...x) => {
        if (x.length > 2) {
          let v = V.as(x[0], 1)
          for (let i = 0; i < x.length; i++) v = V.mu(v, x[i])
          return v
        } else {
          const [a, b] = x
          return V.ne(...V.ra(V.di(a, b)).map((_,i) => (a[i]??0) * (b[i]??0)))
        }
      }
      static sc = (v, c) => V.mu(v, V.as(v, c))
      static po = (v, c) => V.ar(v).map(x => Math.pow(x, c))
      static su = (v) => V.ar(v).reduce((s,x)=>s+x,0)
      static ma = (v) => Math.sqrt(V.su(v))
      static no = (v) => V.sc(v, 1 / (V.ma(v) || 1))
  
      static lN = (a, b, n) => Math.pow(V.su(V.po(V.ad(V.ne(a), V.sc(V.ne(b), -1)), n).map(Math.abs)), n ? 1/n : 1)
      static l1 = (a, b) => V.lN(a, b, 1)
      static l2 = (a, b) => V.lN(a, b, 2)
    
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
    
      static st = (v) => V.di(v)+'('+V.ar(v).toString()+')'
      static ar = (v) => Array.from(v)
      static eq = (a, b) => V.di(a) === V.di(b) && a.every((a_i, i) => a_i === b[i])
      static an = (v, di=undefined) => {
        // V.an(V.ne(1, 1)) returns [PI/4]
        // V.an(V.ne(1, 1, 0)) returns [PI/4, 0]
        // V.an(V.ne(1, 1, 0), 2) returns PI/4
        // V.an(V.ne(1, 1, 0), 3) returns 0
        // V.an(V.ne(1, 1, 0), 1) returns 0
        // V.an(V.ne(1, 1, 0), 0) returns undefined
        const ans = V.ar(v).map((_, i, a) => i ? Math.atan2(a[i], a[i - 1]) : undefined).slice(1)
        return (di === undefined) ? ans : ans[di - 2] ?? (i > 0 ? 0 : undefined)
      }
  
      
      static c = (x, y) => V.ne(x, y)
      static p = (t, r=1) => V.ne(r * Math.cos(t), r * Math.sin(t))
      static ou = (v, min, max) => v[0] < min[0] || v[1] < min[1] || max[0] < v[0] || max[1] < v[1]
    }
    
    const M = class extends Array {
      // <M>ATRIX IMPLEMENTATION (2-dimensional array, no named components)
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
    
      get m() { return this.length }
      get n() { return this[0].length }
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
      static eq = (A, B) => V.eq(M.di(A), M.di(B)) && A.every((A_i, i) => V.eq(A_i, B[i]))
    }
    
    Object.assign(window, window.ve = {A,V,M})
}
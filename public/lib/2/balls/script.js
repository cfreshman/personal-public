// balls.js 0.0.1 @ https://freshman.dev/lib/2/balls/script.js https://freshman.dev/copyright.js
Object.entries({
    'common.js': '/lib/2/common/script.js',
}).map(([key,src])=>!window[key]&&document.head.append((x=>Object.assign(x,{innerHTML:(src=>(x=>{x.withCredentials=false;x.open('GET',src,false);x.send();return x.responseText})(new XMLHttpRequest()))(new URL(src,location.port==='3030'/*local testing on port 3030*/?location.origin:'https://freshman.dev').toString())}))(document.createElement('script'))))

{
    const names = lists.of('balls.js balls')
    if (names.some(name => !window[name])) {
        
        /* script
        */
        const log = named_log('balls.js')
        const version = `balls.js v0.0.1`
        const definition = {
            field: () => {
                const forces = []
                const balls = [] // { p, r, v }
                const ties = []
                const simulate = (dt) => {

                    // determine collisions
                    balls.slice(0, -1).map((a, i) => {
                        balls.slice(i + 1).map(b => {
                            const d2 = V.ad(a.p, b.p.sc(-1)).do()
                            const r2 = a.r * a.r + b.r * b.r
                            if (d2 < r2) {
                                const A_ab = Math.atan2(b.p.y - a.p.y, b.p.x - a.p.x)
                                const A_ba = Math.atan2(a.p.y - b.p.y, a.p.x - b.p.x)
                                // a.v = V.p(A_ba, a.v.ma())
                                // b.v = V.p(A_ab, b.v.ma())
                                // a.v = V.p(A_ba, .95 * a.v.ma())
                                // b.v = V.p(A_ab, .95 * b.v.ma())
                                // const v = {
                                //     a: a.v,
                                //     b: b.v,
                                // }
                                // a.v = v.a.ad(V.p(A_ba, v.b.sc(b.m / a.m * .05).ma()))
                                // b.v = v.b.ad(V.p(A_ab, v.a.sc(a.m / b.m * .05).ma()))
                                const v = {
                                    a: a.v.ct(b.v),
                                    b: b.v.ct(a.v),
                                }
                                a.v = v.a.ad(V.p(A_ba, v.b.sc(b.m / a.m * .95).ma()))
                                b.v = v.b.ad(V.p(A_ab, v.a.sc(a.m / b.m * .95).ma()))
                            }
                        })
                    })

                    balls.map(ball => {
                        forces.map(force_f => {
                            ball.v = ball.v.ad(force_f(ball, balls).sc(dt))
                        })
                        ball.p = ball.p.ad(ball.v.sc(dt))
                    })
                }
                const renders = []
                let prev_ms = performance.now()
                let loop_id
                const loop = () => {
                    const now = performance.now()
                    const dt = Math.min(now - prev_ms, 250) / 1_000
                    prev_ms = now
                    simulate(dt)
                    renders.map(render => render())
                    loop_id = requestAnimationFrame(loop)
                }
                return {
                    add: (...new_balls) => {
                        new_balls.map(ball => {
                            ball.p = ball.p || V.ne(0, 0)
                            ball.r = ball.r || 1
                            ball.m = 4/3 * Math.PI * Math.pow(ball.r, 3)
                            ball.v = ball.v || V.ne(0, 0)
                            balls.push(ball)
                        })
                    },
                    force: (...force_fs) => {
                        forces.push(...force_fs)
                    },
                    remove: (...remove_balls) => {
                        remove_balls.map(ball => {
                            lists.remove(balls, ball)
                        })
                    },
                    play: () => {
                        // log('here')
                        loop_id = requestAnimationFrame(loop)
                    },
                    pause: () => {
                        cancelAnimationFrame(loop_id)
                    },
                    balls: () => {
                        // log({balls})
                        return balls
                    },
                    render: (...new_renders) => {
                        renders.push(...new_renders)
                    }
                }
            },
        }
        names.map(name => window[name] = merge(definition, {
            version, v:version, [name]:version, t:Date.now()
        }))
        log('loaded')
    }
}
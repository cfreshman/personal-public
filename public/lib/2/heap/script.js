// heap.js 0.0.1 @ https://freshman.dev/lib/2/heap/script.js https://freshman.dev/copyright.js
Object.entries({
    'common.js': '/lib/2/common/script.js',
}).map(([key,src])=>!window[key]&&document.head.append((x=>Object.assign(x,{innerHTML:(src=>(x=>{x.withCredentials=false;x.open('GET',src,false);x.send();return x.responseText})(new XMLHttpRequest()))(new URL(src,location.port==='3030'/*local testing on port 3030*/?location.origin:'https://freshman.dev').toString())}))(document.createElement('script'))))

{
    const names = lists.of('heap.js heap')
    if (names.some(name => !window[name])) {
        
        /* script
        */
        const log = named_log('heap.js')
        const version = `heap.js v0.0.1`
        const definition = {
            new: (elements, evaluator) => new definition.Heap(elements, evaluator),
            Heap: class {
                constructor(elements=[], evaluator=pass) {
                    // create array of next 2^n length
                    // [length, 0, 1, 2, 3, 4, 5, 6]
                    const next_n = Math.pow(2, Math.max(4, Math.ceil(Math.log2(elements.length + 1))))
                    this.internal = range(next_n).map(x => undefined)
                    this.internal[0] = 0
                    this.evaluator = evaluator
                    elements.map(x => this.push(x))
                }
                get length() {
                    return this.internal[0]
                }
                set length(x) {
                    return this.internal[0] = x
                }
                push(element) {
                    if (this.internal[0] === 0) {
                        this.internal[1] = element
                    } else {
                        const next_n = Math.pow(2, Math.max(4, Math.ceil(Math.log2(this.length + 2))))
                        if (this.internal.length < next_n) {
                            log(next_n)
                            this.internal = range(next_n).map((_, i) => this.internal[i] ?? undefined)
                        }
                        this.internal[this.length + 1] = element
                        let curr = this.length + 1
                        while (curr > 1 && this.evaluator(this.internal[Math.floor(curr / 2)]) < this.evaluator(this.internal[curr])) {
                            ;[this.internal[Math.floor(curr / 2)], this.internal[curr]] = [this.internal[curr], this.internal[Math.floor(curr / 2)]]
                            curr = Math.floor(curr / 2)
                        }
                    }
                    this.length += 1
                    return this.length
                }
                pop() {
                    const result = this.internal[1]
                    let curr = 1
                    this.internal[curr] = this.internal[this.length]
                    this.internal[this.length] = undefined
                    this.length -= 1
                    while (
                        (curr * 2 <= this.length && this.evaluator(this.internal[curr]) < this.evaluator(this.internal[curr * 2]))
                        || (curr * 2 + 1 <= this.length && this.evaluator(this.internal[curr]) < this.evaluator(this.internal[curr * 2 + 1]))) {
                        const left = this.internal[curr * 2]
                        const right = this.internal[curr * 2 + 1]
                        if (curr * 2 + 1 > this.length || this.evaluator(left) > this.evaluator(right)) {
                            ;[this.internal[curr], this.internal[curr * 2]] = [left, this.internal[curr]]
                            curr = curr * 2
                        } else {
                            ;[this.internal[curr], this.internal[curr * 2 + 1]] = [right, this.internal[curr]]
                            curr = curr * 2 + 1
                        }
                    }
                    return result
                }
                peek() {
                    return this.internal[1]
                }
                toString() {
                    return this.internal.slice(1, Math.pow(2, Math.ceil(Math.log2(this.length + 1))))
                }
            },
        }
        names.map(name => window[name] = merge(definition, {
            version, v:version, [name]:version, t:Date.now()
        }))
        log('loaded')
    }
}
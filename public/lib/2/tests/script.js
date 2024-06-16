{
    const tests = []

    const runner = async () => {
        document.body.innerHTML = ''
        const tests_node = node(`<div id="tests" class="column">
            <div style="
            font-weight: bold;
            ">${location.pathname} test runner</div>
            <div style="
            font-style: italic;
            ">${tests.length} test(s)</div>
        </div>`)
        document.body.append(tests_node)
        const test_nodes = []
        for (let i = 0; i < tests.length; i++) {
            const { label, test } = tests[i]
            const test_node = node(`<div>
                <a href class="label">${label}</a>: <span class="status">not started</span>
                <pre class="code" style="display:none">${test}</pre>
            </div>`)
            const label_node = Q(test_node, '.label')
            const code_node = Q(test_node, '.code')
            tests_node.append(test_node)
            on(label_node, 'click', e => {
                e.preventDefault()
                QQ('#tests .code').map(x => {
                    if (x === code_node) return
                    x.style.display = 'none'
                })
                code_node.style.display = code_node.style.display ? '' : 'none'
            })
            test_nodes.push(test_node)
        }
        for (let i = 0; i < tests.length; i++) {
            const { test, results } = tests[i]
            const test_node = test_nodes[i]
            const status_node = Q(test_node, '.status')
            await defer(async () => {
                status_node.innerHTML = `<span style="color:gray">in progress</span>`
                await defer(async () => {
                    expect_results = results
                    try {
                        await test()
                    } catch (e) {
                        expect_results = [false]
                    }
                    const n_passed = expect_results.filter(truthy).length
                    const passed = n_passed === expect_results.length
                    const indices_failed = expect_results.map((x, i) => [i, x]).filter(e => !e[1]).map(e => e[0])
                    status_node.innerHTML = `<span style="color:${passed ? 'green' : 'red'}">passed ${n_passed}/${expect_results.length}${passed ? '' : ` (${indices_failed.join(', ')})`}</span>`
                })
            })
        }
    }
    
    let timeout_runner
    const test = (label, test) => {
        console.debug('test', label)
        tests.push({ label, test, results:[] })
        clearTimeout(timeout_runner)
        timeout_runner = setTimeout(() => runner())
    }

    let expect_results
    const expect = (result) => {
        const expect_results_i = expect_results.length
        expect_results.push(undefined)
        return {
            toBe: (expected) => {
                expect_results[expect_results_i] = result === expected
            },
            toStringify: (expected) => {
                expect_results[expect_results_i] = JSON.stringify(result) === JSON.stringify(expected)
            },
        }
    }

    Object.assign(window, { test, expect })
}
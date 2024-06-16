// a web console
// - reversed direction (input at top)

import { useState } from "react"
// import { asList, useF, useM, useR, withRef } from "../../lib/hooks"
// import { convertLinks } from "../../lib/render"
// import { store } from "../../lib/store"
// import { apply, many, props } from "../../lib/types"
// import { hashString, list, merge, named_log, S } from "../../lib/util"
// import { CodeBlock, Loader } from "../Info"


// const log = named_log('console')


// // command subcommand --named=x --flag -f ordered
// type defined = Exclude<any, undefined>
// type CommandLeaf = {
//   values: defined[]
//   name?: string
//   letter?: string
//   default?: defined
// }
// type CommandNode = {
//   name: string
//   handle: many<any>
//   inner: CommandNode[]
//   outer: CommandLeaf[]
// }
// const command = {
//   parse: (line) => {
//     const parts = list(line.matchAll(/(\"[^"]*\")|([^ ]+)/g)).map(x => x[0].replace(/^"(.*)"$/, ''))
//     // TODO actual command parsing
//     return parts
//   },
//   options: (commands, parsed) => {
//     // options: outer names, inner --name or values
//     const resolve = command => Object.entries(merge(command.outer, command.inner)).map(e => [e[0], resolve(e[1])])

//     let options = resolve({ commands })
//     while (parsed.length > 1) {
//       const part = parsed.shift()
//       options = options.filter(x => x[0] === part).flatMap(x => typeof(x[1]) === 'string' ? Object.fromEntries(list(x[1]).map(x=>[x,{}])) : x[1])
//     }
//     options = options.filter(x => x[0] && x[0].startsWith(parsed[0])).map(x => x[0])
//     return options
//   },
// }


// // command input & output history stored in reverse temporal order
// type CommandHistoryItem = { input:string, outputs:string[] }
// type CommandHistory = {
//   index: number,
//   start: number,
//   items: CommandHistoryItem[],
// }
// const history = {
//   all: (x) => {
//     return x.items.slice(0, x.items.length - 1 - x.start)
//   },
//   get: (x) => {
//     return x.items[x.index]
//   },
//   set: (x, item) => {
//     return merge(x, { items: [merge(x.items[0], { item })].concat(x.items.slice(1)) })
//   },

//   input: (x, line) => {
//     return merge(x, { items: [{ input: line, outputs: [] }].concat(x.items) })
//   },
//   output: (x, line) => {
//     const item = list[list.length - 1]
//     return merge(x, { items: [merge(item, { outputs: item.outputs.concat([line]) })].concat(x.items.slice(1)) })
//   },
//   clear: (x) => {
//     return merge(x, { index: 0, start: x.items.length })
//   },
// }


// export const Console = withRef(({ ref:base_ref, of:_commands, id, key, label, control, ...props }: props & { 
//   label, commands: CommandNode[], control: { clear, focus }
// }) => {
//   key = key || id || hashString(JSON.stringify(_commands))
//   const STORE_KEY = (suffix) => `console-${key}-${suffix}`

//   const [history, setHistory, addHistory] = asList<CommandHistory>(store.local.use(STORE_KEY('history'), { default:[] }))
//   const [history_index, setHistoryIndex] = useState(-1)
//   const [history_start, setHistoryStart] = store.local.use(STORE_KEY('history-start'), { default:0 })

//   const [input, setInput] = store.local.use(STORE_KEY('input'), { default:'' })
//   const ref = useR()
//   const [options, setOptions] = useState([])
//   const [completed, setCompleted] = useState<string>(undefined)
//   const [wait, setWait] = useState(false)

//   const commands = useM(_commands, completed, history, () => 
//   Object.assign(_commands, !history.slice(history_start).length || _commands.connect ? {} : {
//     clear: {
//       commands: {},
//       run: () => setHistoryStart(history.length + 1),
//     },
//   }, _commands))
//   const runner = (command, ...values) => () => (commands[command] || command)(...values)

//   const handle = {
//     focus: (force=false) => {
//       const rect = ref.current.getBoundingClientRect()
//       if (force || (rect.y > 0 && rect.y + rect.height < window.innerHeight)) ref.current.focus()
//     },
//     input: (value) => {
//       setCompleted(undefined)
//       setInput(value)
//       setOptions(command.options(commands, command.parse(value)))
//       handle.focus()
//     },
//     complete: (option=undefined) => {
//       const to_complete = completed ?? ref.current.value
//       log({ to_complete })
//       const options = command.options(commands, command.parse(to_complete))
//       const suffix = ref.current.value.split(' ').slice(-1)[0]
//       log({ options, suffix, option, completed })
//       if (!option) option = completed !== undefined ? options[(options.indexOf(suffix) + 1) % options.length] : options[0]
//       setInput(to_complete.split(' ').slice(0, -1).concat([option]).join(' '))
//       setOptions(options)
//       if (!completed) setCompleted(to_complete)
//     },
//     run: async () => {
//       // setHistory(history.concat([{ input }]))
//       setInput('')
//       setOptions([])
//       const parts = input.split(' ')
//       const command = commands[parts[0]]
//       if (command) {
//         setWait(true)
//           Promise.resolve((command.run || command)(...parts.slice(1))).then(() => {
//           setWait(false)
//           // setHistory(history.concat([{ input }]))
//           handle.input(ref.current.value)
//         })
//       }
//       else {
//         // setHistory(history.concat('not a command'))
//         setInput(parts)
//       }
//     },
//   }
//   useF(() => handle.input(input))
//   useF(commands, input, () => setOptions(command.options(commands, command.parse(input))))

//   useM(control, () => Object.assign(control, {
//     clear: runner('clear'),
//     focus: () => handle.focus(),
//   }))
//   return (
//     <CodeBlock {...props} ref={base_ref} className='console' copy={false} onClick={() => handle.focus(true)} onFocus={e => handle.focus(true)}>
//       {label}
//       <div style={S(`
//       width: 100%;
//       display: flex;
//       `)}>
//         {'> '}<input ref={ref} value={input}
//         onChange={e => handle.input(ref.current.value)}
//         onKeyDown={e => (x => x ? [() => e.preventDefault(), x].map(apply) : 0)({ 
//           'Tab': handle.complete,
//           'Enter': handle.run,
//           'ArrowDown': () => {
//             let new_history_index = history_index
//             while (new_history_index < history.length - 1) {
//               new_history_index += 1
//               const entry = history[history.length - 1 - new_history_index]
//               if (typeof entry !== 'string' && entry.input !== input) {
//                 setInput(entry.input)
//                 setHistoryIndex(new_history_index)
//                 return
//               }
//             }
//           },
//           'ArrowUp': () => {
//             let new_history_index = history_index
//             while (new_history_index > -1) {
//               new_history_index -= 1
//               const entry = history[history.length - 1 - new_history_index]
//               if (typeof entry !== 'string' && entry?.input !== input) {
//                 setInput(entry?.input)
//                 setHistoryIndex(new_history_index)
//                 return
//               }
//             }
//           },
//         }[e.key])}
//         style={S(`
//         font-size: 1em; width: 0; flex-grow: 1;
//         border: 0; background: none; outline: 0; color: inherit; padding: 0; resize: none;
//         `)}/>
//       </div>
//       <div className='group'>
//         {options.map(x => <a key={x} style={S(`
//         cursor: pointer;
//         `)}
//         onClick={e => input.endsWith(x) ? handle.run() : handle.complete(x)}
//         onContextMenu={e => {
//           e.preventDefault()
//           handle.input(input.split(' ').slice(0, -1).join(' '))
//         }}
//         >{x}</a>)}
//         &nbsp;
//       </div>

//       <div>{wait ? <Loader /> : ''}</div>
//       {convertLinks(history.slice(history_start).reverse().map((x, i, arr) => typeof x === 'string' ? x : ((!i ? !wait : typeof arr[i-1] === 'string') ? '\n' : '')+'> '+x.input).join('\n'))}
//     </CodeBlock>
//   )
// })

import express from 'express'
import { randAlphanum } from '../../util'
/*

2022-03-23
Browser Compute Bank

1. Web clients execute a common compute language
2. Connected clients form a distributed computation engine
3. Server orchestrates parallelized workloads from active clients on passive clients
4. Passive clients earn compute & memory

In this implementation:
- Clients connect via WebSocket
- Active clients emit instructions as list of html snippets
- Snippets are distributed across passive clients
- Compute meta functions exposed within snippets:
  - window['compute-start'](task_id) when task started (called automatically on load)
  - window['compute-end'](task_id, result?) when task completed (must be defined)

Client {
  id: UUID,
  socket: socket_id,
  tasks: Set<task_id>,
  compute: number_ms,
  runs: run_id[],
}
Run {
  id: UUID,
  client: client_id,
  tasks: task_id[],
  start: number_ms,
  end: number_ms,
  timeout: number_ms,
  remaining: number,
}
Task { 
  id: UUID,
  run: run_id,
  data: string_html,
  start: number_ms,
  end: number_ms,
  result: string,
}
*/

const sockets = {}
const clients = {}
const online = (client_ids=Object.keys(clients)) => client_ids.filter(client_id => sockets[clients[client_id].socket])
const runs = {}
const tasks = {}
const unassigned = []

const assign = (client_id, task_id) => {
  console.debug('[BROWSER-COMPUTE-BANK] assign', client_id, task_id)
  const task = tasks[task_id]
  const run = runs[task?.run]
  const owner = clients[run.client]
  task.local = (owner.compute + owner.credit + owner.spent - run.timeoeut < 0)
  const client = clients[task?.local ? run.client : client_id]
  if (!client) {
    unassigned.push(task_id)
  } else {
    if (!task.end && (!run.timeout || Date.now() < run.start + run.timeout)) {
      task.start = undefined
      task.timeout = run.timeout - (Date.now() - run.start)
      owner.spent -= run.timeout
      client.tasks.add(task_id)
      sockets[client.socket]?.emit('task', task)
    }
  }
}
let last_i = 0
const distribute = task_ids => {
  const client_ids = online()
  console.debug('[BROWSER-COMPUTE-BANK] distribute', task_ids, client_ids)
  if (!client_ids.length) {
    unassigned.push(...task_ids)
  } else {
    const curr_i = last_i % client_ids.length
    task_ids.forEach((task_id, i) => assign(client_ids[(curr_i + i) % client_ids.length], task_id))
    last_i = (curr_i + client_ids.length) % client_ids.length
  }
}
const status = (client_ids=online()) => {
  const status = {
    clients: client_ids.length,
    load: client_ids.map(client_id => clients[client_id].tasks.size),
    tasks: client_ids.map(client_id => Array.from(clients[client_id].tasks)),
  }
  client_ids.map(client_id => clients[client_id]).map(client => sockets[client.socket].emit('status', {
    ...status,
    client: {
      id: client.id,
      compute: client.compute,
      credit: client.credit,
      spent: client.spent,
      net: client.compute + client.credit + client.spent,
      runs: client.runs.map(run_id => runs[run_id]).map(run => ({
        ...run,
        tasks: run.tasks.map(task_id => tasks[task_id])
      }))
    },
  }))
}
const I = (io, socket) => socket.on('browser-compute-bank', (client_id=undefined, secret=undefined) => {
  sockets[socket.id] = socket
  const client = {
    id: randAlphanum(16),
    socket: socket.id,
    tasks: new Set(),
    compute: 0, credit: 5 * 60_000, spent: 0,
    runs: [],
    secret: undefined,
  }
  const onClient = (other_id, secret) => {
    const other = other_id !== client.id && clients[other_id]
    console.debug('[BROWSER-COMPUTE-BANK] client', client, other)
    if (other && (!other.secret || other.secret === secret)) {
      // merge clients
      delete clients[client.id]
      client.id = other_id
      clients[other_id] = client
      other.tasks.forEach(x => client.tasks.add(x))
      client.compute += other.compute
      client.spent += other.spent
      client.runs = [].concat(other.runs, client.runs)
      client.secret = client.secret ?? other.secret
      status([client.id])
    }
    sockets[client.socket].emit('client', client.id)
  }
  onClient(client_id, secret)
  clients[client.id] = client
  console.debug('[BROWSER-COMPUTE-BANK] connect', client)
  status()

  if (unassigned.length) {
    distribute(unassigned.splice(0, unassigned.length))
  }

  socket.on('disconnect', () => {
    console.debug('[BROWSER-COMPUTE-BANK] disconnect', client.id, client.socket)
    delete sockets[client.socket]
    distribute(client.tasks)
    client.tasks.clear()
  })
  socket.on('client', onClient)
  socket.on('run', (task_data_list, timeout=undefined) => {
    if (!task_data_list || task_data_list.length > 1000) return

    timeout = Math.min(timeout || 1e6, 5 * 60_000)

    console.debug('[BROWSER-COMPUTE-BANK] run', {
      id: client.id, timeout
    })
    const run_id = randAlphanum(16)
    const run = runs[run_id] = {
      id: run_id,
      client: client.id,
      tasks: task_data_list.map(data => {
        const task_id = randAlphanum(16)
        const task = tasks[task_id] = {
          id: task_id,
          run: run_id,
          data,
          result: undefined,
        }
        return task_id
      }),
      start: Date.now(),
      timeout,
      remaining: task_data_list.length,
    }
    client.runs.push(run_id)
    distribute(run.tasks)
    status()
    socket.emit('run', run)
  })
  socket.on('start', (task_id) => {
    console.debug('[BROWSER-COMPUTE-BANK] start', client.id, task_id)
    const task = tasks[task_id]
    if (!task) return
    task.start = Date.now()
    const other = sockets[clients[runs[task.run].client].socket]
    if (other) other.emit('start', task)
    status()
  })
  socket.on('end', (task_id, result) => {
    console.debug('[BROWSER-COMPUTE-BANK] end', client.id, task_id, result)
    const task = tasks[task_id]
    if (!task) return
    task.end = Date.now()
    task.result = result
    const run = runs[task.run]
    const owner = clients[run.client]
    // revert spent to actual duration instead of timeout
    owner.spent += run.timeout - (task.end - task.start)
    client.compute += task.end - task.start
    const other = sockets[owner.socket]
    if (other) other.emit('end', task)
    run.remaining -= 1
    if (!run.remaining) run.end = task.end
    client.tasks.delete(task_id)
    status()
  })
})
setInterval(status, 5000)

const R = express.Router()

export default {
  routes: R,
  io: I,
}

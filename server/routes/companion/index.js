import express from 'express'
import stream from 'stream'
import { J, P, U, named_log } from '../../util'

import { read_secret } from '../../secrets'
import db from '../../db'
import file from '../file'
let COMPANION_KEY
read_secret('ai.json').then(({ companion }) => {
  COMPANION_KEY = companion.key
})

const TYPES = {
  LLM: 'llm',
  SD: 'sd',
  SPEECH: 'speech',
}
const AI_TIMEOUT = duration({ m:3 })

const name = 'companion'
const log = named_log(name)
const C = db.of({
  companion: 'companion',
    // user: string-user
    // context: context
    // history: { prompt: string, response: string }[]
})
let key_to_context = {}
db.queueInit(async () => {
  const contexts = await C.companion().find({}).toArray()
  log(`loaded ${contexts.length} contexts`)
  contexts.map(({ user, context }) => key_to_context[user] = context)
})
db.queueClose(async () => {
  const contexts = Object.entries(key_to_context)
  log(`saving ${contexts.length} contexts`)
  await Promise.all(contexts.map(([user, context]) => C.companion().updateOne({ user }, { $set: { user, context } }, { upsert:true })))
  log(`saved ${contexts.length} contexts`)
})

const R = express.Router()

const work_queue = [{
  work: {
    id: rand.alphanum(12),
    type: TYPES.LLM,
    // query: { prompt: `please create a homepage greeting for https://freshman.dev, cyrus's collection of free web apps` },
    query: { prompt: `please share some wisdom (1 sentence)` },
  },
  resolve: x => log(x), // pass
}]
const active_work = {}
const workers = {
  [TYPES.LLM]: [],
  [TYPES.SD]: [],
  [TYPES.SPEECH]: [],
}
const do_work = async ({ type, key, query }) => {
  const work = { type, key, query }

  let resolve, promise = new Promise(r => resolve = r), response
  defer(() => resolve(undefined), AI_TIMEOUT)
  const type_workers = workers[type]
  if (type_workers.length) {
    const id = rand.alphanum(12)
    const worker = rand.sample(type_workers)
    active_work[id] = { id, worker, work, resolve }
    log('sending work', id)
    {
      const context = key ? key_to_context[key] : undefined
      const work_response_handler = (data={}) => {
        log('received response', id)
        const { context, response } = data
        if (key && context) key_to_context[key] = context
        resolve(response)
      }
      const work_fail_handler = (reason) => {
        log('received fail', id, reason)
        resolve(undefined)
      }
      worker.once(`companion:response:${id}`, work_response_handler)
      worker.once(`companion:fail:${id}`, work_fail_handler)
      worker.emit('companion:work', { id, type, context, query })
      response = await promise
      worker.off(`companion:response:${id}`, work_response_handler)
      worker.off(`companion:fail:${id}`, work_fail_handler)
    }
    delete active_work[id]
  } else {
    log('queueing work')
    work_queue.push({ work, resolve })
    response = await promise
  }
  return response
}
const companion_io = (io, socket, info) => {
  socket.on(`companion:join`, async (key, types) => {
    if (key === COMPANION_KEY) {
      types.map(type => {
        workers[type].push(socket)
        log('worker connected', type, workers[type].length)
      })
      await Promise.all(work_queue.map(async (item) => {
        const { work, resolve } = item
        if (types.includes(work.type)) {
          work_queue.splice(work_queue.indexOf(item), 1)
          resolve(await do_work(work))
        }
      }))
    }
  })
  const leave = () => {
    entries(workers).map(([type, type_workers]) => {
      const index = type_workers.indexOf(socket)
      if (index < 0) return
      type_workers.splice(index, 1)
      log('worker disconnected', type, type_workers.length)
    })
    const socket_work = Object.values(active_work).filter(({ worker }) => worker === socket)
    socket_work.map(({ id, work, resolve }) => {
      delete active_work[id]
      work_queue.push({ work, resolve })
    })
  }
  socket.on(`companion:leave`, leave)
  socket.on('disconnect', leave)
}

const api_get_history = async (key) => {
  if (key) {
    const { history=[] } = (await C.companion().findOne({ user:key })) || {}
    return { history }
  } else {
    return {}
  }
}
R.get('/llm', J(async rq => {
  const { user } = rq
  return await api_get_history(user)
}))
R.post('/llm/history/get', J(async rq => {
  const { user } = rq
  const { key=user } = rq.body
  return await api_get_history(key)
}))

R.post('/llm', J(async rq => {
  try {
    const { user } = rq
    const { key=user, prompt, temporary, prefix='', suffix='' } = rq.body
    const final_prompt = [prefix, prompt, suffix].filter(truthy).join('\n')
    log('LLM prompt:', { temporary }, final_prompt.slice(0, 32), final_prompt.length)
    const response = await do_work({
      type: TYPES.LLM,
      key: temporary ? undefined : key,
      query: { prompt: final_prompt },
    })
    if (!response) throw 'unable to query LLM'
    if (key && !temporary) {
      const { history=[] } = (await C.companion().findOne({ user:key })) || {}
      history.push({ prompt, response })
      await C.companion().updateOne({ user:key }, { $set: { user:key, history } }, { upsert:true })
      return { response, history }
    } else {
      return { response }
    }
  } catch (e) {
    log(e)
    throw 'unable to query LLM'
  }
}))

const api_delete_history = async (key) => {
  key_to_context[key] = undefined
  await C.companion().deleteOne({ user:key })
  return { success:true }
}
R.delete('/llm', J(async rq => {
  return await api_delete_history(rq.user)
}))
R.post('/llm/history/delete', J(async rq => {
  const { user } = rq
  const { key=user } = rq.body
  return await api_delete_history(key)
}))

R.post('/sd', J(async rq => {
  try {
    const { prompt } = rq.body
    log('SD prompt:', prompt.slice(0, 32), prompt.length)
    const response = await do_work(({
      type: TYPES.SD,
      query: { prompt },
    }))
    if (!response) throw 'unable to query SD'
    return { response }
  } catch (e) {
    log(e)
    throw 'unable to query SD'
  }
}))

R.post('/speech', J(async rq => {
  try {
    const { audio } = rq.body
    log('speech audio received')
    const response = await do_work({
      type: TYPES.SPEECH,
      query: { audio },
    })
    if (!response) throw 'unable to query speech-to-text'
    return { response }
  } catch (e) {
    log(e)
    throw 'unable to query speech-to-text'
  }
}))

export default {
  routes: R,
  C,
  io: companion_io,
}

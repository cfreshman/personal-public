import express from 'express'
import { J, P, U, named_log } from '../../util'

import { read_secret } from '../../secrets'
import db from '../../db'
let companion_header_key
read_secret('ai.json').then(({ companion }) => {
  companion_header_key = companion.key
})
const assert_companion_header = rq => {
  const companion_header = rq.header('X-Freshman-Companion')
  if (companion_header !== companion_header_key) throw 'unauthorized'
}

const name = 'companion'
const log = named_log(name)
const C = db.of({
  companion: 'companion',
    // user: string-user
    // context: context
    // history: { prompt: string, response: string }[]
})
let user_to_context = {}
db.queueInit(async () => {
  const contexts = await C.companion().find({}).toArray()
  log(`loaded ${contexts.length} contexts`)
  contexts.map(({ user, context }) => user_to_context[user] = context)
})
db.queueClose(async () => {
  const contexts = Object.entries(user_to_context)
  log(`saving ${contexts.length} contexts`)
  await Promise.all(contexts.map(([user, context]) => C.companion().updateOne({ user }, { $set: { user, context } }, { upsert:true })))
  log(`saved ${contexts.length} contexts`)
})

const R = express.Router()

let llm_defer_queue = []
const llm_queue = [{
  id: rand.alphanum(12),
  // query: { prompt: `please create a homepage greeting for https://freshman.dev, cyrus's collection of free web apps` },
  query: { prompt: `please share some wisdom (1 sentence)` },
  resolve: x => log(x), // pass
}]
R.get('/prompt', J(async rq => {
  const { user } = rq
  if (user) {
    const { history=[] } = (await C.companion().findOne({ user })) || {}
    return { history }
  } else {
    return {}
  }
}))
R.post('/prompt', J(async rq => {
  try {
    // timeout after 55 seconds
    const { user } = rq
    const { prompt } = rq.body
    log('prompt:', prompt)
    let resolve
    let response = new Promise(r => resolve = r)
    defer(() => resolve(undefined), 55_000)
    llm_queue.push({
      id: rand.alphanum(12),
      user,
      query: { prompt },
      resolve,
    })
    log('waiting:', llm_defer_queue.length)
    if (llm_defer_queue.length) llm_defer_queue.shift().interrupt()
    response = await response
    if (!response) throw 'unable to query LLM'
    if (user) {
      const { history=[] } = (await C.companion().findOne({ user })) || {}
      history.push({ prompt, response })
      await C.companion().updateOne({ user }, { $set: { user, history } }, { upsert:true })
      return { response, history }
    } else {
      return { response }
    }
  } catch (e) {
    log(e)
    throw 'unable to query LLM'
  }
}))
R.delete('/prompt', J(async rq => {
  user_to_context[rq.user] = undefined
  await C.companion().deleteOne({ user:rq.user })
  return { success:true }
}))

const llm_work = {}
R.get('/llm', J(async rq => {
  assert_companion_header(rq)
  if (!llm_queue.length) {
    try {
      const llm_defer = defer(null, 55_000)
      llm_defer_queue.push(llm_defer)
      await llm_defer
      llm_defer_queue = llm_defer_queue.filter(x => x !== llm_defer)
    } catch {}
  }
  if (!llm_queue.length) return { id: null, query: null }
  const { id, user, query, resolve } = llm_queue.shift()
  log('llm query', id)
  llm_work[id] = { user, resolve }
  return { id, user, context:user_to_context[user], query }
}))
R.post('/llm', J(async rq => {
  assert_companion_header(rq)
  const { id, context, response } = rq.body
  log('llm response', id)
  const { user, resolve } = llm_work[id]
  delete llm_work[id]
  user_to_context[user] = context
  defer(() => resolve(response))
  return { received:true }
}))

R.get('/llm/reset', J(async rq => {
  llm_defer_queue = []
  return { success:true }
}))

export default {
  routes: R,
  C,
}

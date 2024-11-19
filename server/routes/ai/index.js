import express from 'express'
import { J, P, U, named_log } from '../../util'

import OpenAI from "openai"
import { read_secret } from '../../secrets'
let openai
read_secret('openai.json').then(({ key }) => {
  openai = new OpenAI({ apiKey:key, dangerouslyAllowBrowser:true })
})

const name = 'ai'
const log = named_log(name)
const R = express.Router()

R.post('/openai-llm', J(async rq => {
  try {
    const { prompt } = rq.body
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: prompt },
        ],
      }],
    })

    const content = response.choices[0].message.content
    let json
    try {
      json = JSON.parse((content.match(/```json([^`]+)```/)||[])[1] || content)
    } catch {
      json = null
    }

    return { response:content, json }
  } catch (e) {
    log(e)
    throw 'unable to query LLM response'
  }
}))

export default {
  routes: R,
}

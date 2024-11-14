import express from 'express'
import { J, P, U, named_log } from '../../util'

import OpenAI from "openai"
import { read_secret } from '../../secrets'
let openai
read_secret('openai.json').then(({ key }) => {
  openai = new OpenAI({ apiKey:key })
})

const name = 'rephrase'
const log = named_log(name)
const R = express.Router()

R.post('/', J(async rq => {
  try {
    const { phrase } = rq.body
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: `give me 7 variations of "${phrase}" in a JSON list. do not respond with anything else. return variations in the same writing style as the original, such as using lowercase letters. don't just be a thesaurus, build phrases from scratch with the same SEMANTICS - take the SEMANTIC MEANING of metaphors and remix that, not the words used, for example "you blow chunks" means "you suck"` },
        ],
      }],
    })
    const raw_result = response.choices[0].message.content
    const raw_list = raw_result.match(/```json([^`]+)```/)[1]
    // log(raw_list)
    return { list: JSON.parse(raw_list) }
  } catch (e) {
    log(e)
    throw 'unable to find list items'
  }
}))

export default {
  routes: R,
}

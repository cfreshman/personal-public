import express from 'express'
import { J, P, U, named_log } from '../../util'

import OpenAI from "openai"
import { read_secret } from '../../secrets'
let openai
read_secret('openai.json').then(({ key }) => {
  openai = new OpenAI({ apiKey:key, dangerouslyAllowBrowser:true })
})

const name = 'tennis'
const log = named_log(name)
const R = express.Router()

R.post('/', J(async rq => {
  try {
    const { responses } = rq.body
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: `i am tracking my tennis match using a speech-to-text tool. i have a list of captured audio responses and i need you to parse them into game score sequences

an example sequence is "love-love -> 15-love -> 15-all -> 15-30 -> 15-40 -> game server"
another is "love-love -> 15-love -> 30-love -> 40-love -> game server"
another is "love-love -> 15-love -> 30-love -> 30-15 -> 30-30 -> 30-40 -> deuce -> advantage in -> deuce -> advantage out -> game receiver"

game score sequences start at love-love, are written on a single line, and have these state transitions:
"""
love-love -> 15-love, love-15
15-love -> 30-love, 15-all
30-love -> 40-love, 30-15
40-love -> game server, 40-15
love-15 -> 15-all, love-30
love-30 -> 15-30, love-40
love-40 -> 15-40, game receiver
15-all -> 30-15, 15-30
30-15 -> 40-15, 30-all
40-15 -> game server, 40-30
15-30 -> 30-all, 15-40
15-40 -> 30-40, game receiver
30-all -> 40-30, 30-40
40-30 -> game server, deuce
30-40 -> deuce, game receiver
deuce -> advantage in, advantage out
advantage in -> game server, deuce
advantage out -> deuce, game receiver
game server -> 15-love, love-15
game receiver -> 15-love, love-15
"""

if the overall score total has been said ("total 1-0"), return that as the first step in the score sequence:
total 3-1 -> love-love -> 15-love -> 30-love -> 30-15

here is the speech-to-text so far. not all of them are scores. some of the audio text may be *really* innacurate, so you might need to guess at what the score should've been based on previous scores. ignore periods next to scores, they don't mean anything: """
${responses.join('\n')}
"""

RETURN CURRENT ARROW-DELIMITED PLAY SESSION SEQUENCE, NOTHING ELSE, NO OTHER WORDS. DO NOT PREDICT NEXT SCORE` },
        ],
      }],
    })
    return { response:response.choices[0].message.content }
  } catch (e) {
    log(e)
    throw 'unable to query tennis response'
  }
}))

R.post('/json', J(async rq => {
  try {
    const { responses } = rq.body
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: `i am tracking my tennis match using a speech-to-text tool. i have a list of captured audio responses and i need you to parse them into game score sequences

game score sequences start at love-love, are written on a single line, and have these state transitions:
"""
love-love -> 15-love, love-15
15-love -> 30-love, 15-all
love-15 -> 15-all, love-30
30-love -> 40-love, 30-15
love-30 -> 15-30, love-40
40-love -> game, 40-15
love-40 -> 15-40, game
15-all -> 30-15, 15-30
30-15 -> 40-15, 30-all
15-30 -> 30-all, 15-40
40-15 -> game, 40-30
15-40 -> 30-40, game
30-all -> 40-30, 30-40
40-30 -> game, deuce
30-40 -> deuce, game
deuce -> advantage in, advantage out
advantage in -> game, deuce
advantage out -> deuce, game
game -> 15-love, love-15
"""

abbreviate "advantage" as "adv" in YOUR response

if the overall score total has been said ("total <number>-<number>"), return that as the first step in the score sequence:
total <total score> -> 15-love or love-15 -> and so on

if the match score has been said ("match <number>-<number>") after a game, return that in place of the "game" step:
-> 40-30 -> match <match score> -> 15-love or love-15 -> and so on

DON'T RETURN A FOLLOWING SCORE IF IT DOESN'T EXIST YET

here is the speech-to-text so far. not all of them are scores. some of the audio text may be *really* innacurate, so you might need to guess at what the score should've been based on previous scores. ignore periods next to scores, they don't mean anything: """
${responses.join('\n')}
"""

RETURN CURRENT ARROW-DELIMITED PLAY SESSION SEQUENCE, NOTHING ELSE, NO OTHER WORDS. DO NOT PREDICT NEXT SCORE. DO NOT SWITCH THE ORDER OF THE SCORE BY ACCIDENT ("love 15" to "15-love"). DO NOT USE EXAMPLES HERE AS YOUR RESPONSE

your response should be JSON with the fields "total", "match", "sequence", with null for fields without values yet. total and match like "<number>-<number>" and NOT the game score. both should be the LAST reported value for that key
`
          },
        ],
      }],
    })
    // return { response:response.choices[0].message.content }
    const raw_result = response.choices[0].message.content
    const raw_response = raw_result.match(/```json([^`]+)```/)[1]
    return { response: JSON.parse(raw_response) }
  } catch (e) {
    log(e)
    throw 'unable to query tennis response'
  }
}))

export default {
  routes: R,
}

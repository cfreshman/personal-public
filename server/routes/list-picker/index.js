import express from 'express'
import { J, P, U, named_log } from '../../util'

import OpenAI from "openai"
import { read_secret } from '../../secrets'
let openai
read_secret('openai.json').then(({ key }) => {
    openai = new OpenAI({ apiKey:key })
})

const name = 'list-picker'
const log = named_log(name)
const R = express.Router()

R.post('/', J(async rq => {
    const { data_url } = rq.body
    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
            role: "user",
            content: [
                { type: "text", text: "please give a single JSON list of all the menu items that are most likely a relevant choice. return the list alone without any extra text. if there are multiple lists, e.g. beverages, appetizers, food items, and desserts, return the list most prominent in the image. but put similar lists like coffee and tea options together. but, again, DO NOT combine dissimilar things like drinks and desserts. each list item should be a single string with name and price e.g. $15. if there are no prices or it's not a menu but rather just a list of things, still return that list - anything the user could be selecting from e.g. types of animal" },
                // { type: "image_url", image_url: { "url": 'https://marketplace.canva.com/EAF5PnNIRfI/1/0/1131w/canva-beige-and-brown-classic-coffee-shop-menu-4cGFJVBWr20.jpg' } },
                { type: "image_url", image_url: { "url": data_url } },
            ],
        }],
    })
    
    try {
        const raw_result = response.choices[0].message.content
        log(raw_result)
        const raw_list = raw_result.match(/```json([^`]+)```/)[1]
        log(raw_list)
        return { list: JSON.parse(raw_list) }
    } catch {
        throw 'unable to find list items'
    }
}))

R.get('/test', J(async rq => {

    // const completion = await openai.chat.completions.create({
    //     model: "gpt-4o-mini",
    //     messages: [
    //         { role: "system", content: "You are a helpful assistant." },
    //         {
    //             role: "user",
    //             content: "Write a haiku about recursion in programming.",
    //         },
    //     ],
    // })

    // return completion.choices[0].message

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "What’s in this image?" },
              {
                type: "image_url",
                image_url: {
                  "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Gfp-wisconsin-madison-the-nature-boardwalk.jpg/2560px-Gfp-wisconsin-madison-the-nature-boardwalk.jpg",
                },
              },
            ],
          },
        ],
      })
      
      return response.choices[0]

}))

export default {
    routes: R,
}

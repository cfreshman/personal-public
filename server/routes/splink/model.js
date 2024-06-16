import { promises } from 'fs'
import db from '../../db'
import { named_log, randAlphanum } from '../../util'
import file from '../file'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { url_for_data_url } from '../integrations'

const name = 'splink'
const log = named_log(name)
const C = db.of({
    splink_image: 'splink_image',
        // id: string-rand-alphanum-16
        // original_url: string-url
        // splink_url: string-url
})

async function get_splink_url(original_url) {

    const existing = await C.splink_image().findOne({ original_url })
    if (existing) {
        return existing.splink_url
    }

    const SIZE = 64
    const canvas = createCanvas(SIZE, SIZE)
    const ctx = canvas.getContext('2d')
    const original_album_art = await loadImage(original_url)
    ctx.drawImage(original_album_art, 0, 0, original_album_art.width, original_album_art.height, 0, 0, SIZE, SIZE)
    const item = {
        id: randAlphanum(16),
        original_url,
        splink_url: url_for_data_url(canvas.toDataURL()),
    }
    /* async */ C.splink_image().updateOne({ original_url }, { $set:item }, { upsert:true })

    return item.splink_url
}

export {
    name, C,
    get_splink_url,
}

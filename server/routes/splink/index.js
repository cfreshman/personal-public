import express from 'express'
import { J, P, U, named_log } from '../../util'
import { create_link_object, create_link_preview } from '../base'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { get_splink_url } from './model'

const name = 'splink'
const log = named_log(name)
const R = express.Router()

R.get('/*', J(async (rq, rs) => {

    if (!rq.url.slice(1)) {
        rs.redirect(`https://freshman.dev/splink`)
        return
    }

    // log(rq.url)
    const parsed_spotify_url = `https://${rq.url.slice(1)}`
    const link_object = await create_link_object(parsed_spotify_url)

    // let [splink_title, splink_description] = link_object.title.split(/ - song /)
    // log({splink_title, splink_description})
    // if (splink_description) splink_description = `song ${splink_description}`
    const splink_title = `${link_object.og_title} (Spotify)`
    const splink_description = link_object.og_description
    const splink_icon = await get_splink_url(link_object.icon)

    // log(link_object)
    const html = `<!DOCTYPE html>
<html>
    <head>
        <title>${splink_title}</title>
        <link rel="icon" href="${splink_icon}"/>
        <script>location.href="${parsed_spotify_url}"</script>

        <!-- open graph protocol -->
        <meta property="og:url" content="${parsed_spotify_url}" />
        ${'' || '<meta property="og:type" content="music:song" />' /* TODO type parsing (track vs playlist) */}
        <meta property="og:title" content="${splink_title}" />
        ${splink_description ? `<meta property="og:description" content="${splink_description}" />` : ''}
        <meta property="og:image" content="${splink_icon}" />
    </head>
</html>`
    rs.send(html)
}))

export default {
    routes: R,
}

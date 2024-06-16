import express from 'express'
import { J, P, U, named_log } from '../../util'
import { create_link_object, create_link_preview } from '../base'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { get_itly_url } from './model'

const name = 'itly'
const log = named_log(name)
const R = express.Router()

const create_itly_object = async (path, rs) => {
    if (!path.slice(1)) {
        rs.redirect(`https://freshman.dev/itly`)
        return
    }

    const parsed_url = `https://${path.slice(1)}`
    const link_object = await create_link_object(parsed_url)

    const itly_domain = new URL(parsed_url, 'https://freshman.dev').hostname.split('.').slice(-2).join('.')
    let itly_title = link_object.og_title || link_object.title
    if (!itly_title.includes(itly_domain)) itly_title = `${itly_title} (${itly_domain})`
    const itly_description = link_object.og_description
    const itly_icon = await get_itly_url(link_object.icon)

    return {
        title: itly_title,
        icon: itly_icon,
        url: parsed_url,
        description: itly_description,
    }
}

R.get('/object/*', J(async (rq, rs) => {
    const path = rq.url.split('/object')[1]
    return await create_itly_object(path)
}))

R.get('/*', J(async (rq, rs) => {
    const itly_object = await create_itly_object(rq.url)
    if (itly_object) rs.send(`<!DOCTYPE html>
<html>
    <head>
        <title>${itly_object.title}</title>
        <link rel="icon" href="${itly_object.icon}"/>
        <script>location.href="${itly_object.url}"</script>

        <!-- open graph protocol -->
        <meta property="og:url" content="${itly_object.url}" />
        <meta property="og:title" content="${itly_object.title}" />
        ${itly_object.description ? `<meta property="og:description" content="${itly_object.description}" />` : ''}
        <meta property="og:image" content="${itly_object.icon}" />
    </head>
</html>`)
}))

export default {
    routes: R,
}

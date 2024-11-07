import db from '../../db'
import { named_log } from '../../util'
import { clear_url_for_data_url, url_for_data_url } from '../integrations'
import notify from '../notify'
const { rand, duration } = window

const RETURN_RADIUS = 25_000 // earth's circumference in miles for now, likely 50 miles later

const name = 'vibe'
const log = named_log(name)
const C = db.of({
    user: 'vibe_user',
        // user: string-user
        // posts: string-id
    post: 'vibe_post',
        // id: string-id
        // t: number-date
        // user: string-user
        // loc: point
        // hrefs: string-href[]
        // likes: { string-user:boolean }
})

db.queueInit(() => C.post().createIndex({ geo: '2dsphere' }))

// expire posts after 1 day
const d1 = duration({ d:1 })
const set_expiry = (data) => {
    const ms_till_expiry = data.t + d1 - Date.now()
    setTimeout(async () => {
        delete_post(data.user, { id:data.id })
    }, ms_till_expiry)
    log(`will expire ${data.id} in ${datetimes.durations.pretty(ms_till_expiry)}`)
}
db.queueInit(async () => {
    // delete all older than an hour
    Array.from(await C.post().find().toArray()).forEach(set_expiry)
}, 10_000)

async function get_user(viewer) {
    log('get_user', {viewer})

    const vibe_profile = {
        user: viewer,
        posts: [],
        ...(await C.user().findOne({ user: viewer })||{}),
    }
    return { vibe_profile }
}
async function get_user_posts(viewer) {
    log('get_user_posts', {viewer})

    const { vibe_profile } = await get_user(viewer)
    const post_list = await C.post().find({ id: { $in:vibe_profile.posts } }).toArray()
    return { post_list }
}

async function add_post(viewer, { location, data_urls, lat, long }) {
    log('add_post', {viewer, n:data_urls.length})

    const hrefs = data_urls.map(url_for_data_url)

    const post = {
        id: rand.anycasenum(12),
        t: Date.now(),
        user: viewer,
        location,
        hrefs,
        lat, long,
        geo: {
            type: 'Point',
            coordinates: [long, lat],
        },
        likes: {},
    }
    await C.post().insertOne(post)

    // add post to user's posts
    const { vibe_profile } = await get_user(viewer)
    vibe_profile.posts.push(post.id)
    await C.user().updateOne({ user: viewer }, { $set: vibe_profile }, { upsert:true })

    // set post expiry
    set_expiry(post)

    return { post }
}

async function get_post(viewer, { id }) {
    log('get_post', {viewer, id})
    const post = await C.post().findOne({ id })
    return { post }
}

async function get_posts(viewer, { lat, long }) {
    log('get_posts', {viewer, lat, long})

    // aggregate posts with distance, limited to 1000 posts within 10 miles
    const post_list = await C.post().aggregate([
        {
            $geoNear: {
                includeLocs: 'geo',
                near: { type: 'Point', coordinates: [long, lat] },
                distanceField: 'dist',
                maxDistance: RETURN_RADIUS * 1609.34,
                spherical: true,
            },
        },
        { $limit: 1_000 },
    ]).toArray()

    return { post_list }
}

async function like_post(viewer, { id }) {
    log('like_post', {viewer, id})

    const post = await C.post().findOne({ id })
    if (!post) throw 'post not found'

    if (!post.likes[viewer]) {
        post.likes[viewer] = true
        notify.send([post.user], 'vibe', `someone liked your post`, `freshman.dev/vibe/post/${id}`)
    }
    await C.post().updateOne({ id }, { $set: { likes: post.likes } })
    return { post }
}

async function delete_post(viewer, { id }) {
    log('delete_post', {viewer, id})

    const post = await C.post().findOne({ id })
    if (!post) throw 'post not found'

    if (post.user !== viewer) throw 'not your post'

    await C.post().deleteOne({ id })

    // delete all images
    post.hrefs.map(clear_url_for_data_url)

    // remove post from user's posts
    const { vibe_profile } = await get_user(viewer)
    vibe_profile.posts = vibe_profile.posts.filter(p => p !== id)
    await C.user().updateOne({ user: viewer }, { $set: vibe_profile })

    return { success:true }
}

export {
    name, C,
    get_user, get_user_posts,
    add_post,
    get_post,
    get_posts,
    like_post,
    delete_post,
}

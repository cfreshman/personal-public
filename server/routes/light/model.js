import db from '../../db'
import { named_log } from '../../util'
import '../../utils/script'

const { rand } = window

const name = 'light'
const log = named_log(name)
const C = db.of({
    user: 'light_user',
        // user: string-user
        // t: number-date
        // posts: { string-id:true }
        // likes: { string-id:true }
        // follows: { string-user:true }
        // followers: { string-user:true }
    post: 'light_post',
        // id: string-id
        // user: string-user
        // t: number-date
        // text: string
        // n_likes: number
        // likes: { string-user:true }
        // n_replies: number
        // replies: { string-id:true }
        // parent?: string-id
})

async function get_user(viewer, user=viewer) {
    // log('get_user', {viewer, user})
    const data = {
        user,
        t: undefined,
        posts: {},
        likes: {},
        follows: {},
        followers: {},
        ...(await C.user().findOne({ user }) || {})
    }
    return { data }
}

async function get_posts(viewer, ids) {
    // log('get_posts', {viewer, ids})
    const list = Array.from(await C.post().find({ id:{$in:ids} }).toArray()).map(x => ({
        n_likes: 0,
        likes: {},
        n_replies: 0,
        replies: {},
        parent: undefined,
        ...x,
    }))
    return { list }
}
async function get_post(viewer, id) {
    const { list } = await get_posts(viewer, [id])
    const data = list[0]

    // for single post, return all ancestors
    const ancestors = []
    let curr = data
    while (curr.parent) {
        curr = await C.post().findOne({ id:curr.parent })
        ancestors.push(curr)
    }

    return { data, ancestors }
}

async function create_post(viewer, { text, parent }) {
    const post = {
        user: viewer,
        t: Date.now(),
        text,
        n_likes: 0,
        likes: {},
        n_replies: 0,
        replies: {},
        parent,
    }
    do {
        post.id = rand.alphanum(8)
    } while (await C.post().findOne({ id:post.id }))
    await C.post().insertOne(post)

    if (parent) {
        const { data:parent_post } = await get_post(viewer, parent)
        parent_post.replies[post.id] = true
        parent_post.n_replies = Object.keys(parent_post.replies).length
        await C.post().updateOne({ id:parent }, { $set:parent_post })
    }

    const { data:profile } = await get_user(viewer)
    profile.t = profile.t || post.t
    profile.posts[post.id] = true
    await C.user().updateOne({ user:viewer }, { $set:profile }, { upsert:true })

    log('create_post', viewer, post)

    return { success:true, data:post }
}
async function like_post(viewer, id) {
    log('like_post', viewer, id)
    const { data:post } = await get_post(viewer, id)
    if (viewer) {
        post.likes[viewer] = !post.likes[viewer]
    }
    if (!post.likes[viewer] || !viewer) delete post.likes[viewer]
    post.n_likes = Object.keys(post.likes).length
    await C.post().updateOne({ id }, { $set:post })
    return { success:true, data:post }
}

async function home(viewer) {
    // just return all posts
    const list = Array.from(await C.post().find({ parent:{$eq:undefined} }).toArray())
    return { list }
}

export {
    name, C,
    get_user,
    get_posts, get_post,
    create_post,
    like_post,
    home,
}

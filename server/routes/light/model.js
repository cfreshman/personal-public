import db from '../../db'
import io from '../../io'
import { named_log } from '../../util'
import login from '../login'
import notify from '../notify'
import profile from '../profile'

const { rand, duration } = window

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
        // pin: string-id
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
    notify: 'light_notify', // TODO - unnotify
        // post: string-id
        // user: string-user
})

async function user_get(viewer, user=viewer) {
    // log('user_get', {viewer, user})
    const data = {
        user,
        t: undefined,
        posts: {},
        likes: {},
        follows: {},
        followers: {},
        pin: undefined,
        is_account: !!(await login.model.get(user)),
        ...(await C.user().findOne({ user }) || {})
    }
    if (viewer !== user)  {
        delete data.likes
        delete data.follows
        delete data.followers
    }
    return { data }
}
async function post_pin(viewer, id) {
    const { data:profile } = await user_get(viewer)
    profile.pin = profile.pin === id ? undefined : id
    await C.user().updateOne({ user:viewer }, { $set:profile }, { upsert:true })
    io.update(`light:user:${profile.user}`, profile)
    return { success:true, data:profile }
}

async function posts_get(viewer, ids) {
    // log('posts_get', {viewer, ids})
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
async function post_get(viewer, id) {
    const { list } = await posts_get(viewer, [id])
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

const regex_user = /@(?<user>[a-zA-Z0-9]+)/gim
const do_at_notify = (post) => {
    const matches = [...post.text.matchAll(regex_user)]
    matches.map(match => {
        const user = match.groups.user
        notify.send([user], 'light', `you were mentioned by ${post.user}`, `freshman.dev/light/post/${post.id}`)
    })
}

async function post_create(viewer, { text, parent }) {
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
        const { data:parent_post } = await post_get(viewer, parent)
        parent_post.replies[post.id] = true
        parent_post.n_replies = Object.keys(parent_post.replies).length
        viewer !== parent_post.user && notify.send([parent_post.user], 'light', `${viewer} replied to your post`, `freshman.dev/light/post/${post.id}`)
        await C.post().updateOne({ id:parent }, { $set:parent_post })
    } else {
        io.update('light:home')
    }

    const { data:profile } = await user_get(viewer)
    profile.t = profile.t || post.t
    profile.posts[post.id] = true
    await C.user().updateOne({ user:viewer }, { $set:profile }, { upsert:true })
    io.update(`light:user:${profile.user}`, profile)

    log('create_post', viewer, post.id)
    if (viewer !== 'cyrus') notify.send(['cyrus'], 'light', 'someone posted!', `freshman.dev/light/post/${post.id}`)
    
    do_at_notify(post)
    return { success:true, data:post }
}
async function post_edit(viewer, id, { text }) {
    log('post_edit', viewer, id)
    const { data:post } = await post_get(viewer, id)
    if (viewer !== post.user) throw 'unauthorized'
    if ((viewer !== 'cyrus' && post.t + duration({ m:15 }) < Date.now()) || Object.keys(post.replies).length) throw 'unable to edit'
    post.text = text
    post.edited = true
    await C.post().updateOne({ id }, { $set:post })

    do_at_notify(post)
    return { success:true, data:post }
}
async function post_like(viewer, id) {
    log('post_like', viewer, id)
    const { data:post } = await post_get(viewer, id)
    if (viewer) {
        if (post.likes[viewer] === undefined) {
            viewer !== post.user && notify.send([post.user], 'light', `${viewer} liked your post`, `freshman.dev/light/post/${id}`)
        }
        post.likes[viewer] = !post.likes[viewer]
    }
    // if (!post.likes[viewer] || !viewer) delete post.likes[viewer]
    post.n_likes = Object.values(post.likes).filter(x => x).length
    await C.post().updateOne({ id }, { $set:post })
    return { success:true, data:post }
}
async function post_delete(viewer, id) {
    log('post_delete', viewer, id)

    const { data:post } = await post_get(viewer, id)
    if (post.user !== viewer) throw 'unauthorized'
    post.user = undefined
    post.text = ''
    await C.post().updateOne({ id }, { $set:post })

    const { data:profile } = await user_get(viewer)
    delete profile.posts[post.id]
    await C.user().updateOne({ user:viewer }, { $set:profile }, { upsert:true })

    return { success:true, data:post }
}
async function post_permadelete(viewer, id) {
    if (viewer !== 'cyrus') throw 'unauthorized'
    const { data:post } = await post_get(viewer, id)
    if (post.user && post.user !== viewer) throw 'unauthorized'
    await C.post().deleteOne({ id })

    const { data:profile } = await user_get(viewer)
    delete profile.posts[post.id]
    await C.user().updateOne({ user:viewer }, { $set:profile }, { upsert:true })

    if (post.parent) {
        const { data:parent_post } = await post_get(viewer, post.parent)
        delete parent_post.replies[post.id]
        parent_post.n_replies = Object.keys(parent_post.replies).length
        await C.post().updateOne({ id:post.parent }, { $set:parent_post })
    }

    return { success:true,  }
}

async function home(viewer) {
    // just return all posts
    const list = Array.from(await C.post().find({ parent:{$eq:undefined} }).sort({ $natural:-1 }).limit(256).toArray())
    log('home', list.length)
    return { list }
}
async function friends(viewer) {
    const site_profile = await profile.model._get(viewer)
    const friends = site_profile.friends
    const list = Array.from(await C.post().find({ user:{$in:friends} }).sort({ $natural:-1 }).limit(256).toArray())
    log('friends', list.length)
    return { list }
}

export {
    name, C,
    user_get,
    post_pin,
    posts_get, post_get,
    post_create, post_edit,
    post_like, post_delete, post_permadelete,
    home, friends,
}

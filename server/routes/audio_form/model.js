import db from '../../db';
import io from '../../io';
import { entryMap, remove as removeArr } from '../../util';
import { randAlphanum } from '../../rand';
import file from '../file';

const names = {
    audio_form: 'audio_form',
        // user: string
        // hash: string
        // parent: undefined | string
        // public: boolean
        // audio: blob
        // t: number_date
        // likes: string[]
        // replies: string[]
    upload: 'audio_form-upload',
        // user: string
        // audio: blob
}
const C = entryMap(names, name => () => db.collection(name))

// setTimeout(() => {
//     console.log('deleting audio forms')
//     C.audio_form().deleteMany({})
//     C.upload().deleteMany({})
// }, 1_000)
// setTimeout(async () => {
//     const audios = Array.from(await C.audio_form().find({}).toArray())
//     console.log('updating audio forms', audios.map(x => x.hash))
//     audios.forEach(async audio => {
//         audio.parent = audio.parent || undefined
//         audio.replies = Array.from(await C.audio_form().find({ parent:audio.hash }).toArray()).map(x => x.hash)
//         // console.log('[audio_form]', audio.replies)
//         C.audio_form().updateOne({ hash:audio.hash }, { $set: audio })
//     })
// }, 2_000)

async function _get(hash) {
    return await C.audio_form().findOne({ hash })
}
async function _getOrDefault(viewer, hash) {
    return await _get(hash) ?? { user:viewer, hash, public: true, audio: undefined }
}
async function _update(user, hash, props) {
    if (props.hash && hash !== props.hash) throw `${props.hash} can't update /audio_form/${hash}`

    const audio_form = _getOrDefault(user, hash)
    if (audio_form.user && audio_form.user !== user) throw `/audio_form/${hash} already exists`

    audio_form.user = user
    Object.assign(audio_form, props)
    await C.audio_form().updateOne({ hash }, { $set: audio_form }, { upsert: true })
    return audio_form
}

async function all(viewer) {
    let list = []
    // if (user) {
    //     list = list.concat(await C.audio_form().find({ user }).toArray() ?? [])
    // }
    list = list.concat(await C.audio_form().find({ public:true, parent:{$eq:undefined} }).toArray() ?? [])
    
    const returned = new Set()
    list = list.filter(item => {
        if (returned.has(item.hash)) return false
        returned.add(item.hash)
        return true
    })
    list.sort((a, b) => b.t - a.t)
    return { list: list }
}
async function user(viewer, user) {
    let list = []
    list = list.concat(await C.audio_form().find({ user, ...(viewer === user ? {} : {public:true}) }).toArray() ?? [])

    const returned = new Set()
    list = list.filter(item => {
        if (returned.has(item.hash)) return false
        returned.add(item.hash)
        return true
    })
    list.sort((a, b) => b.t - a.t)
    return { list: list }
}
async function replies(viewer, parent) {
    let list = [await C.audio_form().findOne({ hash:parent, public:true })]
    list = list.concat(await C.audio_form().find({ parent, public:true }).toArray() ?? [])

    const returned = new Set()
    list = list.filter(item => {
        if (returned.has(item.hash)) return false
        returned.add(item.hash)
        return true
    })
    list.sort((a, b) => b.t - a.t)
    return { list: list }
}
async function get(viewer, hash) {
    let audio_form = await _getOrDefault(viewer, hash)
    if (audio_form && !audio_form.public && audio_form.user !== viewer)
        throw `/audio_form/${hash} is private`
    return { audio_form }
}
async function create(user, body) {
    console.debug('[audio_form] create new post', user, body)
    // console.debug(body.audio)
    const upload = await C.upload().findOne({ user })
    if (upload) {
        const hash = upload.hash
        const parent = body.parent || undefined
        let parent_audio_form
        // update parent
        if (parent) {
            parent_audio_form = await C.audio_form().findOne({ hash:parent })
            if (parent_audio_form) {
                parent_audio_form.replies.push(hash)
                await C.audio_form().updateOne({ hash:parent }, { $set:parent_audio_form })
            }
        }
        if (!parent_audio_form) {
            parent_audio_form = { hash:undefined }
        }
        const audio_form = await _update(user, hash, { 
            ...body,
            user, public:true,
            parent:parent_audio_form.hash,
            likes: [user],
            replies: 0,
            audio:upload.audio
        })
        await C.upload().deleteOne({ user })


        return {
            audio_form
        }
    } else {
        throw 'user must upload audio first'
    }
}
async function audio(user, body) {
    console.debug('[audio_form] create new post', user)
    let hash
    do {
        hash = randAlphanum(16)
    } while (await _get(hash))
    const filename = `public-audio_form-${hash}.mp3`
    console.debug('[audio_form] write audio to', filename)
    file.write(filename, body)
    await C.upload().updateOne({ user }, { $set: { user, hash, audio:filename } }, { upsert: true })
}
async function remove(viewer, hash) {
    const audio_form = await C.audio_form().findOne({ user:viewer, hash })
    if (audio_form) {
        await C.audio_form().deleteOne({ hash })
        // update parent
        if (audio_form.parent) {
            const parent_audio_form = await C.audio_form().findOne({ hash:audio_form.parent })
            if (parent_audio_form) {
                parent_audio_form.replies = removeArr(parent_audio_form.replies, audio_form.hash)
                await C.audio_form().updateOne({ hash:audio_form.parent }, { $set:parent_audio_form })
            }
        }
        return {
            success: true,
        }
    } else {
        return {
            success: false,
        }
    }
}

async function like(viewer, hash) {
    if (!viewer) throw 'sign in to like posts'
    const { audio_form } = await get(viewer, hash)
    const like_set = new Set(audio_form.likes)
    like_set.add(viewer)
    console.debug(viewer, like_set)
    return {
        audio_form: await _update(user, hash, { likes:Array.from(like_set) })
    }
}
async function unlike(viewer, hash) {
    const { audio_form } = await get(viewer, hash)
    const like_set = new Set(audio_form.likes)
    like_set.delete(viewer)
    return {
        audio_form: await _update(user, hash, { likes:Array.from(like_set) })
    }
}

export {
    names,
    all, user, replies,
    get,
    create, audio,
    // update,
    remove,
    like, unlike,
}
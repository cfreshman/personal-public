import db from '../../db'
import { named_log } from '../../util'

const name = 'was'
const log = named_log(name)
const C = db.of({
    was: 'was',
        // id: string-id
        // t: number-date
        // user: string-id
        // name: string
        // url: string-url
        // title: string
        // icon: string-url
        // description: string
        // rating: { total: number, count: number }
    rating: 'was_rating',
        // id: string-id
        // t: number-date
        // app: string-id
        // user: string-id
        // rating: number
        // comment: string
})

db.queueInit(async () => {
    log('web-app-store init')
    
    C.was().createIndex({ id:1 }, { unique:true })
    C.was().createIndex({ user:1 })

    C.rating().createIndex({ id:1 }, { unique:true })
    C.rating().createIndex({ app:1, user:1 })

    const apps = Array.from(await C.was().find({}).toArray())
    for (const app of apps) {
        if (!app.t) {
            await C.was().updateOne({ id:app.id }, { $set:{ t:Date.now() } })
        }
    }

    const ratings = Array.from(await C.rating().find({}).toArray())
    for (const rating of ratings) {
        if (!rating.t) {
            await C.rating().updateOne({ id:rating.id }, { $set:{ t:Date.now() } })
        }
    }
}, 30_000)

async function apps(viewer) {
    log('all', {viewer})

    const list = Array.from(await C.was().find({}).toArray())
    return { list }
}

async function app(viewer, app_id) {
    log('app', {viewer,app_id})

    const item = await C.was().findOne({ id:app_id })
    return { item }
}

async function publish(viewer, {id, name, url, title, icon, description}) {
    log('publish', {viewer,name,url,title,icon,description})

    const existing = id && await C.was().findOne({ id })
    if (existing && existing.user !== viewer) throw 'unauthorized'
    const item = existing || {
        t: Date.now(),
        user: viewer,
        rating: { total:0, count:0 },
    }
    if (!existing) {
        do item.id = rand.alphanum(8)
        while (await C.was().findOne({ id:item.id }))
    }
    Object.assign(item, { name, url, title, icon, description })
        
    await C.was().updateOne({ id:item.id }, { $set:item }, { upsert:true })
    return { success:true, item }
}

async function del_app(viewer, app_id) {
    log('del_app', {viewer,app_id})

    const item = await C.was().findOne({ id:app_id })
    if (item.user !== viewer) throw 'unauthorized'

    await C.was().deleteOne({ id:app_id })
    return { success:true, item }
}

async function ratings(viewer, app_id) {
    log('ratings', {viewer,app_id})

    const list = Array.from(await C.rating().find({ app:app_id }).toArray())
    return { list }
}

async function rating(viewer, app_id) {
    log('rating', {viewer,app_id})

    const item = await C.rating().findOne({ app:app_id, user:viewer })
    return { item }
}

async function rate(viewer, app_id, {rating, comment}) {
    log('rate', {viewer,app_id,rating,comment})

    const app = await C.was().findOne({ id:app_id })

    const existing = await C.rating().findOne({ app:app_id, user:viewer })
    if (existing) {
        app.rating.total -= existing.rating
        app.rating.count -= 1

        if (isNaN(app.rating.total)) {
            app.rating.total = 0
            app.rating.count = 0
        }
    }

    const item = existing || {
        t: Date.now(),
        app: app_id,
        user: viewer,
    }
    if (!existing) {
        do item.id = rand.alphanum(8)
        while (await C.rating().findOne({ id:item.id }))
    }
    Object.assign(item, { rating, comment })

    await C.rating().updateOne({ id:item.id }, { $set:item }, { upsert:true })

    app.rating.total += rating
    app.rating.count += 1
    await C.was().updateOne({ id:app_id }, { $set:{ rating:app.rating } })

    return { success:true, item, app }
}

async function del_rating(viewer, app_id) {
    log('del_rating', {viewer,app_id})

    const app = await C.was().findOne({ id:app_id })

    const existing = await C.rating().findOne({ app:app_id, user:viewer })
    if (existing) {
        app.rating.total -= existing.rating
        app.rating.count -= 1
        await C.rating().deleteOne({ id:existing.id })
        await C.was().updateOne({ id:app_id }, { $set:{ rating:app.rating } })
    }

    return { success:true, item:existing, app }
}

export {
    name, C,
    apps, app, publish, del_app,
    ratings, rating, rate, del_rating,
}

import db from '../../db'
import io from '../../io'
import { fetch, randAlphanum, pick, fill, validate, toYearMonthDay, defer } from '../../util'
import chat from '../chat'
import login from '../login'
import notify from '../notify'
import * as mail from '../mail'
import profile from '../profile'
import { time } from '../login/model'
import cost from '../cost'


const C = db.of({
    default: 'dinder',
        // user string-user
        // recipe string-recipe-id
        // recipes string-recipe-id[]
        // matches string-match-id[]
        // denied { string-recipe-id }
        // day string
        // lookingForMatch boolean
        // filter string-category-or-tag[]
        // previous string-recipe-id
    
    invite: 'dinder-invite', // 50/50 chance of getting shown new recipe or one someone already liked
        // user string-user
        // id string-recipe-id
        // category string-category
        // timestamp number
        // date: string-YMD
        // match? string-match-id

    match: 'dinder-match',
        // id string-match-id
        // recipe string-recipe-id
        // users string-user[]
        // date: number
        // vote { [key:string-user]: boolean }
        // previous string-match-id
        // postpone { [key:string-user]: boolean }
        // unmatched?: boolean
    
    recipe: 'dinder-recipe',
        // id string-recipe-id
        // user string-user
        // name string
        // category string-category
        // tags string-category-or-tag[]
        // img string-url
        // url string-url
        // prep number-minutes (default 30)
        // cook number-minutes (default 30)
        // time number-minutes (prep + cook)
        // removed boolean
})
const RECIPE_REMOVED = {
    TRUE: true,
    UNAPPROVED: 'unapproved',
}
const RECIPE_REMOVED_VALUES = Object.values(RECIPE_REMOVED)

let tagList
const ONE_DAY_MS = 24 * 60 * 60 * 1000
const loadDb = async () => {

    // const { body: {results:_tags} } = await fetch('https://tasty.p.rapidapi.com/tags/list', {
    //     headers: {
    //       'X-RapidAPI-Key': 'bfa1f0756amshf52b560d0265db5p194eb6jsnd4978bf120a8',
    //       'X-RapidAPI-Host': 'tasty.p.rapidapi.com'
    //     }
    // })
    // tagList = _tags || []
    // // id:number type:string name:string display_name:string
    // console.log('[DINDER] loaded tags', tagList.length, tagList.slice(0, 5).map(x => x.display_name).concat('...'))
    // db.simple.set('dinder-tags-tasty', tagList)

    const load = {
        _prev: new Date((await db.simple.get('dinder-db-load')) ?? 0),
        get prev() { return load._prev },
        set prev(value) { return db.simple.set('dinder-db-load', Number(load._prev = value)) },
        get next() { return new Date(Number(load.prev) + ONE_DAY_MS * 7) },
        get do() { return load.next < new Date() },
    }
    console.debug('dinder-db-load', { ...load })
    if (load.do) { // rate limited 6/1s
        const { body: { meals: categories } } = await fetch('https://www.themealdb.com/api/json/v1/1/list.php?c=list')
        while (categories.length) {
            await defer(0, 6/1 * 1_000 * 1.5)
            const { strCategory: category } = categories.shift()
            const { body: { meals: recipes } } = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?c=${category}`)
            for (let { idMeal: id } of recipes) {
                await defer(0, 6/1 * 1_000 * 1.5)
                const { body } = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`)
                const { meals } = body
                if (!meals) return
                const x = meals[0]
                const recipe = {
                    id: x.idMeal,
                    name: x.strMeal,
                    category: x.strCategory,
                    tags: [x.strCategory],
                    img: x.strMealThumb,
                    url: x.strSource,
                    prep: 30, cook: 30, time: 60,
                    user: 'site:TheMealDB',
                }
                await C.recipe().updateOne(
                    { id: recipe.id },
                    { $set: recipe },
                    { upsert: true })
            }
        }
        load.prev = new Date()
    }
    setTimeout(loadDb, Number(load.next) - Date.now())
}
db.queueInit(loadDb, 10_000)
db.queueInit(async () => {
    Array.from(await C.recipe().find({})).map(x => {
        fill(x, { prep: 30, cook: 30 })
        fill(x, { time: x.prep + x.cook })
        C.recipe().updateOne({ id:x.id }, { $set: x })
    })
})

async function _get(user) {
    return (await C.default().findOne({ user })) || {
        user,
        recipes: [],
        matches: [],
        denied: [],
        filter: [],
    }
}
async function _setRecipe(user, recipeId) {
    const entry = await _get(user)
    if (entry.previous !== entry.recipe) entry.previous = entry.recipe
    entry.recipe = recipeId
    await C.default().updateOne({ user }, { $set: entry }, { upsert: true })
}
const _isTempUser = async (user) => !(await profile.model.C.profile().findOne({ user }))

// schedule expiration notifications for users looking for a match
const expirationTimeouts = {}
const scheduleExpirationNotification = async user => {
    clearTimeout(expirationTimeouts[user])
    const date = await login.model.time(user)
    const end = await login.model.time(user)
    end.setHours(24, 0, 0, 0)
    console.debug('[DINDER:LOOKING]', user, date, end)
    expirationTimeouts[user] = setTimeout(async () => {
        notify.send([user], 'dinder', "couldn't find a match for dinner tonight - but swipe again tomorrow and past swipes will be carried over")
        await _hideUserSwipes(user)
    }, Number(end) - Number(date))
}
db.queueInit(async () => {
    Array.from(await C.default().find({ lookingForMatch:true }).toArray()).map(async x => 
        scheduleExpirationNotification(x.user))
    
    await db.simple.set(
        'dinder-user-recipe-count',
        await C.recipe().countDocuments({ user: { $ne: 'site:TheMealDB' }}))
})

async function _hideUserSwipes(user) {
    const entry = await _get(user)
    if (entry.lookingForMatch) {
        console.debug(`[DINDER] prevent further matches with ${user} for today`)
        entry.lookingForMatch = false
        await C.default().updateOne({ user }, { $set: entry })
    }
    // await C.invite().deleteMany({ user, id: { $in: entry.recipes } })
    // nvm, keep invites since they're probably better recipes, and can match if the user swipes again today
}
async function _unhideUserSwipes(user) {
    if (await _isTempUser(user)) {
        // this is a temporary ID & should create an account on the first YES swipe
        return
    }

    const entry = await _get(user)
    console.debug(`[DINDER] allow matches with ${user} for today`)
    if (!entry.lookingForMatch) {
        // check if user wants to carry swipes over
        const { profile: { settings }} = await profile.settings(user)
        const { dinder:dinderSettings={} } = settings
        const { carrySwipes } = dinderSettings

        if (carrySwipes) {
            // check if any past swipes match an invite
            const matches = Array.from(await C.invite().find({ id: { $in: entry.recipes } }).toArray())
            console.debug(`[DINDER] found ${matches.length} existing matches for ${user}`)
            // filter to invites where the user is looking for a match for today
            let invite
            const ignoreUsers = new Set()
            for (let i = 0; i < matches.length; i++) {
                const other = matches[i].user
                const entry = await C.default().findOne({ user: other })
                if (entry.lookingForMatch) {
                    invite = matches[i]
                    break
                } else {
                    ignoreUsers.add(other)
                }
            }
            if (invite) {
                console.debug(`[DINDER] found match based on ${user}'s previous swipes`)
                // match & return without unhiding user's swipes
                const { id:recipe_id } = invite
                await C.invite().deleteOne({ id:recipe_id })
                const users = [user, invite.user]
                const match_id = randAlphanum(7)
                await chat.newChat(users, match_id)
                const match = { id: match_id, recipe: recipe_id, users, date: Date.now() }
                await C.match().insertOne(match)
                users.forEach(async user => {
                    await _hideUserSwipes(user)
                    const entry = await _get(user)
                    entry.matches.push(match_id)
                    entry.recipes = entry.recipes.filter(x => x !== recipe_id)
                    await C.default().updateOne({ user }, { $set: entry }, { upsert: true })
                })
                await io.send(users, 'dinder:match')
                const recipe = await _recipe(recipe_id)
                notify.send(invite.user, 'dinder', `${user} also wants to make ${recipe.name}`)
                return true
            }
        }
        
        entry.lookingForMatch = true
        entry.recipe = undefined
        await C.default().updateOne({ user }, { $set: entry })
        if (carrySwipes) {
            entry.recipes.map(async id => await C.invite().updateOne(
                { id }, { $set: { user, id, timestamp: Date.now() } }, { upsert: true }))
        }
        user !== 'cyrus' && mail.send(
            'freshman.dev',
            'cyrus+contact@freshman.dev',
            '/dinder: someone is looking for a match',
            '')
        console.debug(await C.default().findOne({ user }))
    }
    return false
}
async function day(user, day) {
    const entry = await _get(user)
    if (entry.day !== day) {
        entry.day = day
        await C.default().updateOne({ user }, { $set:entry })
        scheduleExpirationNotification(user)
    }
}
async function create(user, recipe) {
    if (!user) throw 'you must be signed in'
    const date = recipe.date && Number(new Date(recipe.date))

    if (recipe.id) {
        const existing = await C.recipe().findOne({ id:recipe.id })
        if (!existing || existing.user !== user) throw ''
    }

    recipe.user = user
    recipe.id = recipe.id || randAlphanum(7)
    recipe = pick(recipe, 'id user name category url img prep cook')
    recipe.removed = 'unapproved'
    await C.recipe().insertOne(recipe)
    mail.send(
        'freshman.dev',
        'cyrus+contact@freshman.dev',
        '/dinder: someone submitted a recipe',
        JSON.stringify(recipe, null, 2),
    )

    const entry = await _get(user)
    console.debug(`[DINDER] create`, pick(entry, 'user recipe'), recipe)
    await _setRecipe(user, recipe.id)

    await db.simple.set(
        'dinder-user-recipe-count',
        1 + await db.simple.get('dinder-user-recipe-count'))

    // if user marked date made, add to calendar
    if (date) {
        await C.match().insertOne({
            id: randAlphanum(7),
            recipe: recipe.id,
            users: [user],
            date,
        })
    }

    return { recipe }
}
async function suggestions(user) {
    if (!user) throw 'you must be signed in'
    const list = await C.recipe().find({ user, removed: { $ne:true } }).toArray()
    return { list }
}
async function made(user, recipeId, { date:yearMonthDay }) {
    validate(user, 'you must be signed in')
    const entry = validate(await _get(user), 'invalid user')
    const recipe = validate(
        await C.recipe().findOne({ id:recipeId }), 
        'invalid recipe ID')
    const midday = yearMonthDay && Number(new Date(yearMonthDay)) + 12 * 60 * 60 * 1000
    const date = midday && await time(user, new Date(midday))
    const timestamp = validate(date && Number(date), 'invalid date')

    // if the user is making the recipe today, prevent further matches
    if (yearMonthDay === toYearMonthDay(new Date())) await _hideUserSwipes()
    
    // add recipe to user's calendar on given date
    const match = {
        id: randAlphanum(7),
        recipe: recipe.id,
        users: [user],
        date: timestamp,
    }
    console.log('[DINDER:MADE]', user, yearMonthDay, date, match)
    await C.match().insertOne(match)
    entry.matches.push(match.id)
    await C.default().updateOne({ user }, { $set: entry }, { upsert: true })
    await io.send(user, 'dinder:match')

    return { success: true, match }
}
async function remove(user, recipeId) {
    // prevent additional matches for this recipe
    if (!user) throw 'you must be signed in'
    const recipe = await C.recipe().findOne({ id: recipeId })
    if (recipe?.user !== user) throw `you don't have permission to do that`
    recipe.removed = true
    await C.recipe().updateOne({ id:recipeId }, { $set: recipe })
    return { success: true }
}

async function _recipe(id) {
    return await C.recipe().findOne({ id })
}
const IGNORED_CATEGORIES = [] // ...set('Dessert')
async function open(user, recipeId) {
    const entry = user && await _get(user)
    console.log('[DINDER:OPEN]', user, recipeId)
    // if (entry?.lookingForMatch) {
        const recipe = await C.recipe().findOne({ id:recipeId })
        // console.log('[DINDER:OPEN] returning', recipe)
        if (user) await _setRecipe(user, recipe.id)
        return { recipe, previous: entry?.previous }
    // } else {
    //     throw 'user already has a match for today'
    // }
}
// cache queries per search key
const cachedResults = {
    'tasty': {},
}
async function random(user, force=false) {
    const entry = await _get(user)
    console.debug('[DINDER:RANDOM]', user, entry.filter, entry.recipe)

    if (entry?.recipe && !force) {
        const recipe = await _recipe(entry.recipe)
        if (!entry.filter?.includes(recipe.category)) {
            return { recipe, previous: entry.previous }
        }
    }
    
    let recipe
    const excludedRecipes = [].concat(entry.recipes, entry.denied)
    const excludedCategories = [].concat(IGNORED_CATEGORIES, entry.filter || [])

    // 50% chance to match with existing invite UNLESS this is a temp user - then 100%
    if (Math.random() < .5 || await _isTempUser(user)) {
        const invite = await C.invite().aggregate([
            { $match: { 
                user: { $ne: user },
                id: { $nin: excludedRecipes },
                category: { $nin: excludedCategories },
            } },
            { $sample: { size: 1 } },
        ]).next()
        if (invite) {
            recipe = await _recipe(invite.id)
        }
    }
    
    if (!recipe) {
        console.debug(`[DINDER:RANDOM] SEARCH FOR RECIPES (not ${[...excludedCategories]})`)
        // TODO if supporter, search paid recipe DB
        // if (true || await cost.model.supporter(user)) {
        //     // query with all enabled tags
        //     const filterSet = new Set(entry.filter)
        //     const tags = tagList.map(x => x.name).filter(x => !filterSet.has(x))
        //     const tastyRequestKey = tags.join(',')
        //     const cachedResultsForKey = cachedResults.tasty[tastyRequestKey]
        //     if (cachedResultsForKey?.length) recipe = cachedResultsForKey.pop()
        //     else {
        //         const { body } = await fetch('https://tasty.p.rapidapi.com/recipes/list', {
        //             params: { from: '0', size: '40', tags: tags.join(',') },
        //             headers: {
        //               'X-RapidAPI-Key': 'bfa1f0756amshf52b560d0265db5p194eb6jsnd4978bf120a8',
        //               'X-RapidAPI-Host': 'tasty.p.rapidapi.com'
        //             }
        //         })
        //         console.log('[DINDER:RANDOM] paid result for', tags, body)
        //     }
        // }
        
        recipe = recipe 
        || await C.recipe().aggregate([
            { $match: {
                id: { $nin: excludedRecipes },
                category: { $nin: excludedCategories },
                removed: { $nin: RECIPE_REMOVED_VALUES },
            } },
            { $sample: { size: 1 } },
        ]).next()
        // open up to previous recipes
        || await C.recipe().aggregate([
            { $match: {
                category: { $nin: excludedCategories },
                removed: { $nin: RECIPE_REMOVED_VALUES },
            } },
            { $sample: { size: 1 } },
        ]).next()
        // open up to anything (all categories filtered or empty category)
        || await C.recipe().aggregate([
            { $match: {
                removed: { $nin: RECIPE_REMOVED_VALUES },
            } },
            { $sample: { size: 1 } },
        ]).next()
    }

    console.log('[DINDER:RANDOM] returning', recipe)
    await _setRecipe(user, recipe.id)
    {
        const entry = await _get(user)
        return { recipe, previous: entry.previous }
    }
}
async function yes(user) {
    const { recipe:id } = await _get(user)
    const invites = Array.from(await C.invite().find({ id }).toArray())
    console.debug('[DINDER:YES] possible matches', invites)
    
    // find the first invite with a user who is still looking for a meal
    // NEW or if the invite has been matched & allows for more users
    // TODO also check that they swiped for dinner today? (user.day)
    let invite
    for (let i = 0; i < invites.length; i++) {
        const { user:owner, recipe, match } = invites[i]
        const entry = await _get(owner)
        const { date } = match ? await C.match().findOne({ id:match }) : {}
        if (date) {
            // console.log(user, invites[i], date)
            // console.log(
            //     toYearMonthDay(await login.model.time(user)),
            //     toYearMonthDay(await login.model.time(user, new Date(date)))
            // )
        }
        const validGroup = match 
            && await login.model.date(user) === await login.model.date(user, new Date(date))
        if (entry.lookingForMatch || validGroup) {
            invite = invites[i]
            break
        } else if (!validGroup) {
            // C.invite().deleteOne({ user:owner, recipe })
        }
    }

    let result
    if (invite && await _isTempUser(user)) {
        return { match: {
            id: false,
            recipe: id,
            users: [invite.user, '(log in)'],
        } }
    } else if (invite && invite.match) {
        // if this invite was already matched with, add the user to the group

        // add user to match
        const match = await C.match().findOne({ id:invite.match })
        const others = match.users.slice()
        match.users.push(user)
        await C.match().updateOne({ id:match.id }, { $set: match })
        await chat._addUser(match.id, user)

        // remove user's other recipe invites (until tomorrow)
        await _hideUserSwipes(user)
        const entry = await _get(user)
        entry.matches.push(match.id)
        entry.recipes = entry.recipes.filter(x => x !== id)
        await C.default().updateOne({ user }, { $set: entry }, { upsert: true })

        await io.send(match.users, 'dinder:match')
        // notify all users (only at certain thresholds)
        if (others.length === 2) notify.send(others, 'dinder', `${user} also wants to make ${recipe.name}, and additional users may continue to join`)
        if ([10, 50, 500, 10000].includes(match.users.length)) notify.send(others, 'dinder', `${match.users.length} users want to make ${recipe.name}`)

    } else if (invite && invite.user !== user) {
        // if either user has matches with > 2 people disabled, delete invite
        // (default to true, allowing all interested users to make the recipe)
        // otherwise, keep for others to match with
        const users = [user, invite.user]
        const matchId = randAlphanum(7)
        {
            const settings = await Promise.all(users.map(x => profile.settings(x)))
            if (settings.every(x => x?.dinder?.groupMatch !== false)) {
                invite.match = matchId
                // delete all invites in case user has multiple invites open for same recipe
                await C.invite().deleteMany({ user:invite.user, recipe:invite.recipe })
                await C.invite().insertOne(invite)
            } else {
                await C.invite().deleteOne({ id })
            }
        }
        await chat.newChat(users, matchId)
        const match = { id: matchId, recipe: id, users, date: Date.now() }
        result = { match }
        await C.match().insertOne(match)
        // for both users, remove other recipe invites (until tomorrow)
        users.forEach(async user => {
            await _hideUserSwipes(user)
            const entry = await _get(user)
            entry.matches.push(matchId)
            entry.recipes = entry.recipes.filter(x => x !== id)
            await C.default().updateOne({ user }, { $set: entry }, { upsert: true })
        })
        await io.send(users, 'dinder:match')
        // notify other
        const recipe = await _recipe(id)
        notify.send(invite.user, 'dinder', `${user} also wants to make ${recipe.name}`)
    } else {
        const recipe = await _recipe(id)

        // if this is a temp user, ask them to sign in instead
        if (await _isTempUser(user)) {
            throw 'you must sign in'
        } else {
            await C.invite().updateOne(
                { user, id },
                { $set: { 
                    user,
                    id,
                    category: recipe.category,
                    timestamp: Date.now(),
                    date: await login.model.date(user),
                } },
                { upsert: true })
            await _unhideUserSwipes(user)
            const entry = await _get(user)
            entry.recipes.push(id)
            await C.default().updateOne({ user }, { $set: entry }, { upsert: true })
            result = await random(user, true)
        }
    }

    // if there was an invite and the user got matched, delete the user's past invites for the same recipe
    if (invite) await C.invite().deleteMany({ user, recipe:invite.recipe })

    return result
}
async function no(user) {
    await _unhideUserSwipes(user)
    const entry = await _get(user)
    if (!entry.denied) entry.denied = []
    entry.denied.push(entry.recipe)
    await C.default().updateOne({ user }, { $set: entry }, { upsert: true })
    return random(user, true)
}
async function back(user) {
    await _unhideUserSwipes(user)
    const entry = await _get(user)
    await C.invite().deleteMany({ user, id: entry.previous })
    await _setRecipe(user, entry.previous)
    return random(user)
}

async function matches(user) {
    const entry = await _get(user)
    const matchIds = entry.matches
    const matches = []
    for (let i = 0; i < matchIds.length; i++) {
        const match = await C.match().findOne({ id: matchIds[i] })
        if (match) {
            match.recipe = match.recipe && await _recipe(match.recipe)
            matches.push(match)
        }
    }
    return { list: matches, previous: entry.previous }
}
async function match(user, matchId=undefined) {
    let match
    if (matchId) {
        match = await C.match().findOne({ id:matchId })
        if (!match?.users.includes(user)) throw 'invalid match ID for user'
    } else {
        // return user's active match
        const { list } = await matches(user)
        // include recipes up to 8 hours ahead, e.g. 10am now, return a remake created at 12pm a week ago
        const today = Date.now() + 8 * 60 * 60 * 1000
        while (list.length && list[0].date > today) list.pop()
        match = list.length ? list.pop() : false
        // ignore previous matches (> 16 hours ago)
        if (match.date < today - 24 * 60 * 60 * 1000) match = false
    }

    if (match) {
        const recipe = await C.recipe().findOne({ id:match.recipe })
        const entry = await _get(user)
        return { match, recipe, previous: entry.previous }
    } else {
        return {}
    }
}
async function unmatch(user, matchId) {
    const match = await C.match().findOne({ id:matchId })
    if (match && match.users.includes(user)) {
        const entry = await _get(user)
        if (!entry.denied) entry.denied = []
        entry.denied.push(match.recipe)
        await C.default().updateOne({ user }, { $set: entry })

        // if one other user left, dissolve group, otherwise only remove this user
        match.users = [...new Set(match.users)].filter(x => x !== user)
        const dissolved = match.users.length < 2
        console.debug('[DINDER:UNMATCH]', {
            user, users: match.users, dissolved
        }, match)
        ;(dissolved ? match.users : []).concat([user]).forEach(async user => {
            await _setRecipe(user, false)
            const entry = await _get(user)
            entry.matches = entry.matches.filter(x => x && x !== match.id)
            await C.default().updateOne({ user }, { $set: entry }, { upsert: true })
            await _unhideUserSwipes(user)
        })
        await C.match().updateOne({ id:match.id }, { $set: match })

        if (dissolved) {
            match.unmatched = true
            await C.match().updateOne({ id:match.id }, { $set:match })

            // if group dissolved, clear votes to make again on previous match
            if (match.previous) {
                const previous = await C.match().findOne({ id:match.previous })
                previous.vote = {}
                await C.match().updateOne({ id:previous.id }, { $set:previous })
            }
        }

        io.send([user, ...match.users], 'dinder:match')
        return { success: true }
    }
}

async function vote(user, matchId, vote) {
    const match = await C.match().findOne({ id:matchId })
    if (!match.vote) match.vote = {}
    match.vote[user] = vote
    await C.match().updateOne({ id:matchId }, { $set: match })
    if (match.users.every(x => match.vote[x])) {
        // all users have voted to have the meal again next week
        
        let { recipe, users, date } = match
        console.debug('[DINDER-REMAKE]', users, recipe)
        const newMatchId = randAlphanum(7)
        await chat.newChat(users, newMatchId)
        date += 7 * 24 * 60 * 60 * 1000
        await C.match().insertOne({ id: newMatchId, recipe, users, date, previous:matchId })
        users.forEach(async user => {
            await _hideUserSwipes(user)
            const entry = await _get(user)
            entry.matches.push(newMatchId)
            await C.default().updateOne({ user }, { $set: entry }, { upsert: true })
        })
        
        // notify users
        await io.send(users, 'dinder:match')
        notify.send(users, 'dinder', `${user} agreed to make ${recipe.name} again`)
    }
    return { success: true }
}
async function postpone(user, matchId, postpone) {
    const match = await C.match().findOne({ id:matchId })
    if (!match.postpone) match.postpone = {}
    match.postpone[user] = postpone
    await C.match().updateOne({ id:matchId }, { $set: match })
    if (match.users.every(x => match.postpone[x])) {
        // all users have voted to postpone the meal until tomorrow
        let { recipe:recipeId, users, date } = match
        const recipe = await _recipe(recipeId)
        console.debug('[DINDER-POSTPONE]', users, recipe)
        match.date += 24 * 60 * 60 * 1000
        match.postpone = {}
        await C.match().updateOne({ id:matchId }, { $set: match })

        // notify users
        await io.send(users, 'dinder:match')
        notify.send(users, 'dinder', `${user} agreed to postpone ${recipe.name} until tomorrow`)

        // send both users to a new random recipe
        users.map(async (user) => {
            const entry = await _get(user)
            entry.recipe = false
            await C.default().updateOne({ user }, { $set: entry })
            await random(user, true)
        })
    }
    return { success: true }
}
async function filter(user, categories=undefined) {
    const entry = await _get(user)
    if (categories === undefined) return { value: entry.filter }

    // TODO proper include/exclude
    if (categories.length === 1) {
        entry.filter = (entry.filter || []).concat(categories)
    } else {
        entry.filter = categories
    }
    // entry.filter = [...new Set([...(entry.filter || []), ...categories])]
    // if (entry.filter?.includes(category)) {
    //     entry.filter = entry.filter.filter(x => x !== category)
    // } else {
    //     entry.filter = (entry.filter || []).concat([category])
    // }

    await C.default().updateOne({ user }, { $set: entry })
    console.log('[DINDER:FILTER]', user, categories, entry.recipe, entry.filter)

    if (entry.recipe) {
        const recipe = await C.recipe().findOne({ id:entry.recipe })
        if (entry.filter.includes(recipe.category)) {
            await random(user, true)
        }
    }

    return { success: true }
}
async function resetFilter(user) {
    const entry = await _get(user)
    entry.filter = []
    await C.default().updateOne({ user }, { $set: entry })
    return { success: true }
}

async function recipe(id) {
    return { recipe: await _recipe(id) }
}

async function tags(user, filter) {
    let entry
    if (await _isTempUser(user)) {
        entry = { filter: [] }
    } else {
        entry = await _get(user)
        if (filter) {
            entry.filter = filter
            await C.default().updateOne({ user }, { $set:entry })
            console.log('[DINDER:FILTER]', user, entry.recipe, entry.filter)
        
            if (entry.recipe) {
                const recipe = await C.recipe().findOne({ id:user.recipe })
                const filterSet = new Set(entry.filter)
                if ([recipe.category, ...(recipe.tags || [])].some(x => filterSet.has(x))) {
                    await random(user, true)
                }
            }
        }
    }
    return { tags: tagList, filter:entry.filter }
}

export {
    C,

    day,
    create,
    suggestions,
    made,
    remove,

    recipe, tags,
    open,
    random,
    yes,
    no,
    back,

    matches,
    match,
    unmatch,

    vote,
    postpone,
    filter,
    resetFilter,
}

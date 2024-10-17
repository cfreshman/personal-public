import db from '../../db'
import { named_log, pick, randAlphanum, unpick } from '../../util'

const name = 'AOB'
const log = named_log(name)
const C = db.of({
    aob: 'aob',
        // user: string-user
        // started: boolean
        // plots: plot[]
        // inventory: { name, type, emoji, angle? }[]
        // sold: boolean|string-id
    aob_fruits: 'aob_fruits',
        // name: string
        // emoji: string
        // angle: number
    aob_mrkt: 'aob_mrkt',
        // id: string-id
        // user: string-user
        // fruit: item
        // price: number
    aob_board: 'aob_board'
        // board: { user:string, gold:number }[]
})

// tick at 4am every day
// grow crops, fulfill orders
const tick = async () => {
    // grow plots & expire fruits
    {
        const datas = [...await C.aob().find().toArray()]
        await Promise.all(datas.map(async data => {
            data.sold = false
            data.plots.map(plot => {
                if (plot?.fruit) {
                    plot.ready = true
                }
            })
            // expire fruits after 7 days
            
            data.inventory = data.inventory.filter(x => {
                x.days = (x.days||0) + 1
                if (x.type === 'fruit' && x.days >= 7) {
                    return false
                }
                return true
            })
            await set(data.user, { data })
        }))
    }

    // settle fruit market
    {
        const market = [...await C.aob_mrkt().find().toArray()]
        await C.aob_mrkt().deleteMany()
        await Promise.all(market.map(async listing => {
            // if fruit empty, give gold to user
            // if not, give fruit to user
            const { data } = await get(listing.user)
            if (!listing.fruit) {
                data.inventory.push(...Array.from({ length:listing.price }).map(i => ({ name:'gold', emoji:'🟡' })))
            } else {
                data.inventory.push(listing.fruit)
            }
            await C.aob().updateOne({ user:data.user }, { $set:data })
        }))
    }

    await update_leaderboard()
}
const update_leaderboard = async () => {
    // calculate gold & leaderboard
    {
        const datas = [...await C.aob().find().toArray()]
        const user_and_gold = datas.map(data => {
            let gold = 0
            data.inventory.map(x => {
                if (x.name === 'gold') {
                    gold += 1
                }
            })
            return { user:data.user, gold }
        })
        const board = user_and_gold.sort((a, b) => b.gold - a.gold).slice(0, 10)
        await C.aob_board().updateOne({}, { $set:{ board }}, { upsert:true })
    }
}
const d_24_hr = 24 * 60 * 60 * 1000
db.queueInit(async () => {
    let tick_at = new Date()
    tick_at.setHours(4, 0, 0, 0)
    if (Number(tick_at) < Date.now()) {
        tick_at = new Date(Number(tick_at) + d_24_hr)
    }
    setTimeout(() => {
        tick()
        setInterval(tick, d_24_hr)
    }, Number(tick_at) - Date.now())

    // add default fruits
    if (!(await C.aob_fruits().findOne({ name:'apple' }))) {
        add_fruit(0, { fruit:{ name:'apple', emoji:'🍎', angle:0 } })
        add_fruit(0, { fruit:{ name:'orange', emoji:'🍊', angle:120 } })
        add_fruit(0, { fruit:{ name:'banana', emoji:'🍌', angle:240 } })
    }

    await update_leaderboard()

    // tick()
})

async function get(viewer) {
    const data = (await C.aob().findOne({ user:viewer })) || {
        user:viewer,
        started: false,
        plots: [0, 0, 0, 0, 0, 0, 0, 0],
        inventory: [],
        sold: false,
    }
    return { data }
}

async function set(viewer, { data }) {
    data.user = viewer
    delete data._id
    await C.aob().updateOne({ user:data.user }, { $set:data }, { upsert:true })
    return { success:true }
}

async function taken_fruit(viewer, { fruit }) {
    const name = fruit.name && !!(await C.aob_fruits().findOne({ name:fruit.name }))
    const emoji = fruit.name && !!(await C.aob_fruits().findOne({ emoji:fruit.emoji }))
    return { taken:{ name, emoji } }
}
async function add_fruit(viewer, { fruit }) {
    await C.aob_fruits().insertOne(fruit)
    return { success:true }
}

async function sell(viewer, { fruit, price }) {
    fruit = unpick(fruit, 'days')
    const listing = {
        id: randAlphanum(12),
        user: viewer,
        fruit,
        price,
    }
    await C.aob_mrkt().insertOne(listing)
    return { success:true, listing }
}
async function market(viewer) {
    const list = await C.aob_mrkt().find({}).toArray()
    // log('market', list)
    return { list }
}
async function buy(viewer, id) {
    const item = C.aob_mrkt().findOne({ id })
    if (!item) return { success:false }
    item.fruit = undefined
    await C.aob_mrkt().updateOne({ id }, { $set:item })
    return { success:true }
}

async function board(viewer) {
    const { board } = (await C.aob_board().findOne()) || { board:[{ user:viewer, gold:0 }] }
    // log('board', item)
    return { board }
}

export {
    name, C,
    get,
    set,
    taken_fruit,
    add_fruit,
    sell, market, buy,
    board,
}

import { exec, execSync, spawn } from 'child_process'
import { readdir, readdirSync } from 'fs'
import path from 'path'
import db from '../../db'
import { randAlphanum } from '../../rand'
import { pick, HttpError, basedir, sleep } from '../../util'
import file from '../file'

const C = db.of({
    default: 'pico-repo',
        // id string-rAN(7)
        // created number-timestamp
        // updated number-timestamp
        // name string
        // author string-url
        // targets string[]
        // formats string[]
        // count number
        // physical string[]
        // tags string[]
        // link string-url
        // short string
        // contents string-markdown
        // downloads { string:string-url }
        // images string-url[]

        // uploads string-targets[]
        // builds string-targets[]

        // user string-user
        // public boolean
        // verified boolean (true if raspberrypi.com or user-uploaded)
        // payment { amount: number, link: string-url, required: boolean }
    collection: 'pico-repo-collection',
        // user string-user
        // ids string-id[]
})

db.queueInit(async () => {
    const entries = Array.from(await all('cyrus'))
    entries.map(async entry => {
        if (!entry.created) {
            entry.created = entry.updated = Date.now()
            await C.default().updateOne({ id:entry.id }, { $set: entry })
        }
    })
})

async function all(user) {
    return await C.default().find({ $or: [{ public: true }, { user }] }).toArray()
}

async function _permissioned(user, query) {
    const entry = query.user ? query : await C.default().findOne(query)
    if (entry.user !== user) throw HttpError(401, `you don't have permission to do that`)
    return entry
}
async function get(user, id) {
    const entry = 
        await C.default().findOne({ id }) 
        || await C.default().findOne({ name:id })
        || await C.default().findOne({ name:'pico-'+id })
    // console.debug('[PICO-REPO:GET', user, entry)
    if (entry) {
        if (!entry.public) await _permissioned(user, entry)
        if (!entry.created) {
            entry.created = entry.updated = Date.now()
            await C.default().updateOne({ id:entry.id }, { $set: entry })
        }
    }
    return { entry }
}
async function create(user) {
    // fetch previous un-published project for user, or create new project
    let entry = await C.default().findOne({ user, public: false })
    if (!entry) {
        do {
            entry = {
                id: randAlphanum(3), user, public: false, // TODO increase ID length as needed
                created: Date.now(), updated: Date.now()
            }
        } while (await C.default().findOne({ id: entry.id }))
        await C.default().insertOne(entry)
        console.debug('[PICO-REPO:NEW]', entry)
        collect(user, entry.id)
    } else {
        console.debug('[PICO-REPO:NEW] found existing:', entry.id)
    }
    return { entry }
}
async function edit(user, id, body) {
    console.debug('[PICO-REPO:EDIT]', body)
    const entry = await _permissioned(user, { id })
    Object.assign(entry, pick(body,
        'name author targets formats count physical tags link icon short content downloads images public verified payment'))
    if (entry.author.includes('raspberrypi.com')) {
        if (user !== 'cyrus') throw HttpError(400, `/contact me to add official Raspberry Pi apps`)
        // entry.verified = true
    }
    if (entry.public) {
        const missing = 'name author targets formats count physical link'
            .split(' ')
            .filter(x => !entry[x] || entry[x].length === 0)
        if (entry.payment?.required && !entry.payment.amount) missing.push('payment amount')
        if (missing.length) throw HttpError(400, `Missing ${missing.map(x => ({
            short: 'tagline',
            link: 'project link',
            formats: 'format',
        }[x] || x)).join(', ')}`)
    }
    if ((entry.name + entry.short).length > 40) throw HttpError(400, `Title is too long (> 40 characters)`)
    if (!entry._id && await C.default().findOne({ 
        name: { $in: [entry.name, 'pico-'+entry.name]} 
    })) throw HttpError(400, `This name is taken`)
    entry.updated = Date.now()
    console.debug('[PICO-REPO:EDIT]', entry)
    await C.default().updateOne(
        { id },
        { $set: entry })
    return { success: true, entry }
}
async function remove(user, id) {
    await _permissioned(user, { id })
    await C.default().deleteOne({ id })
    return { success: true }
}


async function getCollection(user) {
    console.debug('[PICO-REPO] GET COLLECTION', user)
    return { collection: (await C.collection().findOne({ user })) || { user, ids: [] } }
}
async function collect(user, id) {
    const { collection } = await getCollection(user)
    if (!collection.ids.find(x => x === id)) {
        collection.ids.push(id)
        await C.collection().updateOne({ user }, { $set: collection }, { upsert: true })
        console.debug('[PICO-REPO] COLLECT', user, id, collection)
    }
    return { collection }
}
async function uncollect(user, id) {
    const { collection } = await getCollection(user)
    collection.ids = collection.ids.filter(x => x !== id)
    await C.collection().updateOne({ user }, { $set: collection }, { upsert: true })
    return { collection }
}


// MicroPython apps can be built into a drag-n-drop .uf2 by including them in the MicroPython build
// To support user-uploaded apps, the app files are copied into the MicroPython dir, built, then deleted
// Perform this in a queue to avoid conflicts between apps (No (current) performance concerns, as apps are < 2MB)
const MICROPYTHON_DIR =  path.resolve('./server/routes/pico-repo/micropython')
const getMicroPythonPath = filepath => path.join(MICROPYTHON_DIR, filepath)

const _microPythonUf2BuildQueue = Promise.resolve()
import fs from 'node:fs'
let rateLimit = 3
const _buildMicroPythonUf2 = async (fileid, target) => _microPythonUf2BuildQueue.then(async () => {
    if (rateLimit < 0) throw 'rate-limited: this API is too busy right now, please try again in >10s'
    try {
        rateLimit -= 1

        // copy zipped app to MicroPython directory, unzip, build, delete
        const filename = fileid+'.zip'
        const filepath = await file.getPath(filename)
        const modulesdir = getMicroPythonPath(`ports/rp2/modules`)
        const modulespath = path.join(modulesdir, filename)
        const modulessavefolder = '.target-dir-save'
        const builddir = getMicroPythonPath(`ports/rp2/build-${target}`)
        try {
            if (modulespath.length < 10) throw 'dangerous rm -rf aborted for ' + modulespath
            execSync(`rm -rf ${modulesdir}/* && cp -rf ${modulesdir}/../${modulessavefolder}/* ${modulesdir}`)
            execSync(`rm -rf ${modulesdir}/../${modulessavefolder}`)

            execSync(`cd ${modulesdir} && mkdir ../${modulessavefolder} && cp -rf * ../${modulessavefolder}`)
        } catch {} // ignore if original files already saved
        try {
            execSync(`cp -rf ${filepath} ${modulespath} && cd ${modulesdir} && unzip ${filename} -d ${fileid}`)
            const contents = fs.readdirSync(path.join(modulesdir, fileid))
            if (contents?.length) {
                execSync(`rm ${modulespath} && mv ${path.join(modulesdir, fileid, contents[0])}/* ${modulesdir}/ && rm -rf ${path.join(modulesdir, fileid)} && rm -rf ${builddir}`)
                // console.debug(fs.readdirSync(modulesdir))
                console.debug('[PICO-REPO:MICROPYTHON-UF2] BEGIN UF2 BUILD')
                execSync(`cd ${modulesdir}/.. && make BOARD=${target}`)
            }
        } catch (e) {
            console.error(e)
        }

        console.debug('[PICO-REPO:MICROPYTHON-UF2] BUILT UF2')
        // console.debug(readdirSync(builddir))

        const outputname = fileid+'.uf2'
        const outputpath = await file.getPath(outputname)
        execSync(`cp ${builddir}/firmware.uf2 ${outputpath}`)
    } catch {} finally { rateLimit += 1 }
})
db.queueInit(() => exec(`cd ${getMicroPythonPath('mpy-cross')} && make`, async () => 
    Array.from(await C.default().find({ uploaded: true, built: false })).map(pick('id')).map(_buildMicroPythonUf2)))
// MUST RUN BELOW INIT MANUALLY FOR SUDO
// db.queueInit(() => {
//     console.debug('initializing MicroPython repo')
//     console.debug(execSync(`
    // sudo apt-get install git
    // sudo apt-get install gcc-arm-none-eabi libnewlib-arm-none-eabi
    // sudo apt-get install build-essential
    // sudo apt-get install cmake
//     git clone git@github.com:micropython/micropython.git ${MICROPYTHON_DIR}
//     cd ${MICROPYTHON_DIR}/mp-cross
//     make
//     cd ..
//     git submodule update --init --recursive`))
// }, 7_000)
async function buildMicroPythonUf2(user, id, target, body) {
    if (!['PICO', 'PICO_W'].includes(target)) throw new HttpError(401, 'invalid board target '+target)

    const entry = await _permissioned(user, { id })
    if (!entry) throw new HttpError(404, 'no pico-repo app with id '+id)

    // write zipped MicroPython app to file, copy to MicroPython, unzip, build, delete
    console.debug('[PICO-REPO:BUILD-MICROPYTHON-UF2]', user, id, body)
    const fileid = `pico-repo-app-${id}-${target}`
    const filename = fileid+`.zip`
    await file.remove(filename)
    await file.write(filename, body)

    entry.uploads = (entry.uploads || []).concat(target)
    await C.default().updateOne({ id }, { $set: entry })

    await _buildMicroPythonUf2(fileid, target)

    entry.builds = (entry.builds || []).concat(target)
    await C.default().updateOne({ id }, { $set: entry })

    return {
        success: true,
    }
}
async function getMicroPythonUf2(rs, id, target) {
    if (!['PICO', 'PICO_W'].includes(target)) throw new HttpError(401, 'invalid board target '+target)
    file.send(`pico-repo-app-${id}-${target}.uf2`, rs)
}

async function serveMicroPythonUf2(rs, target, name, body) {
    // perform same .uf2 build service for one-off MicroPython zip - do not save the results
    if (!['PICO', 'PICO_W'].includes(target)) throw new HttpError(401, 'invalid board target '+target)
    
    // write zipped MicroPython app to file, copy to MicroPython, unzip, build, delete
    console.debug('[PICO-REPO:SERVE-MICROPYTHON-UF2]', name, target)
    const fileid = `pico-repo-anonymous-${name.replace('.zip', '')}-${target}`
    const filename = fileid+'.zip'
    await file.remove(filename)
    await file.write(filename, body)

    await _buildMicroPythonUf2(fileid, target)

    await file.download(filename.replace('.zip', '.uf2'), rs)

    await new Promise(res => setTimeout(res, 10_000))
    await file.remove(filename)
    await file.remove(filename.replace('.zip', '.uf2'))
}

export {
    C,
    all,

    get,
    create,
    edit,
    remove,
    
    getCollection,
    collect,
    uncollect,

    buildMicroPythonUf2,
    getMicroPythonUf2,
    serveMicroPythonUf2,
}

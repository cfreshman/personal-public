import fs from 'node:fs'
import path from 'path'
import express from 'express'
import file from './file'
import { convertLinks, isDevelopment, pass, pick, set, staticPath } from '../util'
import db from '../db'
import login from './login'
import mail from './mail'

console.debug(staticPath)
const socketIoClientSrc = file.read(path.join(staticPath, 'lib/socket.io.min.js'))

/*

Mock computer/filesystem

Supports basic read/write
Socket notifications with file changes

*/

const logins = {}
db.queueInit(async () => Object.assign(logins, await db.simple.get('simple-logins') || {}))

const R = express.Router()
const ignore_files = set('.DS_Store')


let io
const watches = {}
const I = (_io, socket) => {
    io = _io
    socket.on('computer', (on_off, file) => {
        console.debug('[socket] computer', on_off, file)
        watches[file] = (watches[file] ?? new Set())[(on_off === 'on' ? 'add' : 'delete')](socket.id)
        watches[socket.id] = file
        if (!watches[file].size) delete watches[file]
        feed.watches(file, watches[file] && watches[file].size || 0)
    })
    socket.on('disconnect', () => {
        if (watches[socket.id]) {
            console.debug('[socket] computer', 'disconnect', watches[socket.id])
            watches[watches[socket.id]] && watches[watches[socket.id]].delete(socket.id)
        }
    })
}
const feed = {
    delta: (id, data) => {
        io.emit('computer', {
            type: 'delta',
            id,
            data,
            watchest: watches[id] && watches[id].size || 0,
        })
    },
    snapshot: (id, data) => {
        io.emit('computer', {
            type: 'snapshot',
            id,
            data,
            watches: watches[id] && watches[id].size || 0,
        })
    },
    watches: (id, count) => {
        io.emit('computer', {
            type: 'watches',
            id,
            data: '',
            watches: count,
        })
    }
}


R.get('/raw/simple/home/public*', async (req, res) => {
    // if public file, redirect to actual location
    const public_example_file_location = path.join(staticPath, 'raw', req.url.replace(/^\/simple\/home\/public\//, 'simple'))
    console.debug('simple test public location', file.file(public_example_file_location), public_example_file_location)
    if (file.file(public_example_file_location)) res.redirect(path.join('raw', req.url.replace(/^\/simple\/home\/public\//, 'simple')))
})

R.post('/simple/render', async (req, res) => {
    if (req.body.text.length > 50_000) return res.json({ error: 'why' })
    res.json({
        html: convertLinks(req.body.text)
    })
})
R.post('/simple/login', async (req, res) => {
    if (req.user && logins[req.true_ip] !== req.user) {
        logins[req.true_ip] = req.user
        await db.simple.set('simple-logins', logins)
    }
    console.debug(req.user, req.true_ip, logins[req.true_ip], logins)
    if (logins[req.true_ip]) {
        const result = pick(await login.model.get(logins[req.true_ip]), 'user token')
        console.debug(result)
        return res.json(result)
    }
    return res.json({ user:false, token:undefined })
})
R.post('/simple/logout', async (req, res) => {
    logins[req.true_ip] = false
    await db.simple.set('simple-logins', logins)
    return res.json({ user:false, token:undefined })
})

R.get('/simple*', async (req, res) => {
    if (req.user && logins[req.true_ip] !== req.user) {
        logins[req.true_ip] = req.user
        await db.simple.set('simple-logins', logins)
    }

    // verify user is authorized - file under /home/public/, /home/<any>/public/, or /home/<user>/
    const authorized_prefixes = [/^\/home\/public\//, /^\/home\/[^/]+\/public\//, req.user && new RegExp(`^/home/${req.user}/`)].filter(pass)
    const resolved_location = ('/home/public'+req.url.split('/simple').slice(1).join('/simple')).replace('/home/public/home/', '/home/')
    if (!'/home/public/'.startsWith(resolved_location) && !authorized_prefixes.some(re => re.test(resolved_location))) {
        console.debug('unauthorized', resolved_location, authorized_prefixes)
        return res.json({ error: 'unauthorized' })
    }

    // send matching file
    const generic_file_location = req.url
    const public_example_file_location = path.join(staticPath, 'raw', req.url.replace('home/public/', ''))
    let static_note = req.url.includes('/notes/')
    let watched_note = false
    const file_location = 
        file.file(generic_file_location) ? generic_file_location : 
        file.file(public_example_file_location) ? public_example_file_location :
        file.file(generic_file_location+'.txt') ? (() => {
            watched_note = static_note
            return generic_file_location+'.txt'
        })() : 
        file.file(public_example_file_location+'.txt') ? (() => {
            watched_note = static_note
            return public_example_file_location+'.txt'
        })() :
        false
    console.debug('file?', req.url, file_location)
    if (file_location) {
        console.debug(req.url, static_note ? 'is a note:' : 'is a file:', file_location)
        if (watched_note) return res.send(`<!-- cyrusfreshman 2023 -->
<title>${file_location.split('/').filter(x=>x).slice(-1)[0]}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<script>${socketIoClientSrc}</script>
<script>
window.node = html => (x => {
    x.innerHTML = html
    return x.children[0]
})(document.createElement('div'))
</script>
<script>
const backend = '${isDevelopment() ? 'http://localhost:5050' : 'https://cyrusfre.sh'}'
console.debug('[SOCKET CONNECT]', backend)
const socket = io(backend, {
    closeOnBeforeunload: false,
})
socket.once('connect', () => {
    console.debug('[SOCKET CONNECTED]')
    document.write('<body>'+document.body.innerHTML)
})
socket.on('connect', () => {
    socket.emit('computer', 'on', '${resolved_location}.txt')
})
window.addEventListener('beforeunload', e => {
    e.preventDefault()
    e.stopImmediatePropagation()
    socket.emit('computer', 'off', '${resolved_location}.txt')
    socket.close()
    e.returnValue = ''
})
let update_timeout_handle
socket.on('computer', (...args) => {
    const { type, id, data, watches } = args[0]
    console.debug({ type, id, data }, '${resolved_location}.txt', args)
    if (id === '${resolved_location}.txt') {
        watch_count.textContent = watches > 1 ? watches+' ' : ''
        if (type === 'watches') return

        if (type === 'delta') document.write(data)
        else {
            document.close()
            document.write('<body>'+data)
        }
        document.body.scrollTop = document.body.scrollHeight

        clearTimeout(update_timeout_handle)
        document.body.style.transition = ''
        document.body.style.background = watch_color_display.style.background
        update_timeout_handle = setTimeout(() => {
            document.body.style.transition = 'background 10s'
            update_timeout_handle = setTimeout(() => {
                document.body.style.background = '#fff'
                update_timeout_handle = setTimeout(() => document.body.style.transition = '', 10_000)
            }, 1_000)
        }, 1_000)
    }
})
</script>
<div style="white-space:pre;background:inherit;position:fixed;top:0;right:0;border-bottom-left-radius:.25em;overflow:hidden;padding:.25em;display:flex;align-items:center;justify-content:flex-end"><span id=watch_count></span>watching ${file_location.replace(/^\/simple/, '').replace(/^\/home\/public/, '')} <span 
id=watch_color_display style="background:#88ff88;border:1px solid black;display:inline-flex;cursor:pointer;width:1em;height:1em;border-radius:50%" onclick="
watch_color.value = watch_color_display.style.backgroundColor
watch_color.click()
"></span><input 
id=watch_color style="display:none" type="color" value="#88ff88" oninput="
watch_color_display.style.background = watch_color.value
"></input></div><style>
body {
    font-family: monospace;
    margin: .5em .25em;
    height: max-content;
    white-space: pre-wrap;
}
a {
    color: inherit;
    text-decoration: underline;
    cursor: pointer;
}
<\/style>\n`+convertLinks(file.read(file_location)))
        if (static_note) return res.send(`<!-- cyrusfreshman 2023 -->
<title>${file_location.split('/').filter(x=>x).slice(-1)[0]}</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
body {
    font-family: monospace;
    margin: .5em .25em;
    height: max-content;
    white-space: pre-wrap;
}
a {
    color: inherit;
    text-decoration: underline;
    cursor: pointer;
}
<\/style>\n`+convertLinks(file.read(file_location)))
        return file.send(file_location, res)
    }

    // if url but no matching file, redirect to main site
    console.debug('simple computer', req.url)
    // if (req.url !== '/simple') return res.redirect('https://cyrusfre.sh'+req.url.replace('/simple', '').replace('/home/public', ''))

    // send full file tree
    const root = { 'home/': {} }
    const traverse = (parent, prefix, result) => {
        if (ignore_files.has(result)) return
        if (result.slice(-1) === '/') {
            const node = parent[result] = {}
            const node_prefix = path.join(prefix, result)
            const files = []
            try {
                files.push(...file.dir(node_prefix))
            } catch {}
            if (node_prefix === 'simple/home/public/') files.push(...fs.readdirSync(path.join(staticPath, 'raw/simple')))
            // files.map(child_result => traverse(node, node_prefix, child_result))
            files.filter(x=>x.slice(-1)!=='/').map(child_result => traverse(node, node_prefix, child_result))
            files.filter(x=>x.slice(-1)==='/').map(child_result => traverse(node, node_prefix, child_result))
        } else {
            parent[result] = true
        }
    }
    traverse(root['home/'], 'simple/home/', 'public/')
    if (req.user) {
        traverse(root['home/'], 'simple/home/', req.user+'/')
        root['home/'][req.user+'/'] = Object.assign({ 'public/':{} }, root['home/'][req.user+'/'] || {})
    }
    console.debug(JSON.stringify(root, 0, 2))
    res.json({
        files: Object.keys(root['home/']['public/']),
        tree: root
    })
})
R.post('/simple*', async (req, res) => {
    const public_home = '/simple/home/public'
    const user_home = path.join('/simple/home', req.user || 'public')
    const url = req.url // req.url.replace(new RegExp('^'+user_dir), '/simple').replace(/^\/simple/, user_dir)
    console.debug(req.url, url, user_home, req.body)
    if (!url.startsWith(public_home) && !url.startsWith(user_home)) return res.json({ error: 'view-only' })
    const { command, args } = req.body
    const countItems = prefix => {
        const items = file.dir(prefix)
        return items ? items.reduce((count, item) => 1 + (item.endsWith('/') ? countItems(path.join(prefix, item)) : 0), 0) : 0
    }
    const limitItems = (prefix, additional_count, limit) => {
        if (countItems(prefix) + countItems(public_home) + additional_count > 1_000) {
            mail.send('jk.computer', 'cyrus@freshman.dev', 'computer limit hit', prefix)
            return true
        }
    }
    if(0){}
    else if (command === 'touch') {
        const file_paths = files.map(name => path.join(url, name))
        if (file_paths.includes(public_home)) return res.json({ error: 'view-only' })
        const files = args.filter(x => /[\w\d\-_.]+/.test(x))
        if (limitItems(user_home, files.count, 1_000)) return res.json({ error: '< 1_000' })
        file_paths.map(file_path => file.append(file_path, ''))
    }
    else if (command === 'write') {
        if (url === public_home) return res.json({ error: 'view-only' })
        const { file:name, output='', mode } = args
        if (!/[\w\d\-_.]+/.test(name)) return res.json({ error: 'invalid name' })
        if (limitItems(user_home, 1, 1_000)) return res.json({ error: '< 1_000' }) // 1_000 files/folders per user
        const dir = file.dir(url)
        if (dir && dir.filter(x=>!x.endsWith('/')).length > 100) return res.json({ error: '< 100' }) // 100 files per folder
        const file_path = path.join(url, name)
        if (output.length > 1_000) return res.json({ error: '< 1_000' })
        if (name.includes('/')) return res.json({ error: 'why' })
        const existing_append = mode !== 1 && file.file(file_path)
        if (existing_append && file.read(file_path).length > 3_000) return res.json({ error: '< 3_000' }) // 3_000 bytes per file
        // TOTAL 1_000 * 3_000 = 3_000_000 B (3MB)
        const new_text = output.trim()
        const data = (existing_append && new_text ? ' ' : '') + new_text
        file[existing_append ? 'append' : 'write'](file_path, data)
        
        if (new_text) {
            const resolved_location = file_path.split('/simple').slice(1).join('/simple')
            feed[existing_append ? 'delta' : 'snapshot'](resolved_location, convertLinks(data))
        }
    }
    const generic_file_location = url
    const public_example_file_location = path.join(staticPath, 'raw', url.replace('home/public/', ''))
    const file_location = 
        file.file(generic_file_location) ? generic_file_location : 
        file.file(public_example_file_location) ? public_example_file_location :
        false
    console.debug('file?', file_location)
    if (file_location) {
        console.debug(url, 'is a file:', file_location)
        return file.send(file_location, res)
    } else {
        let files
        try {
            files = file.dir(url) || []
            if (url.startsWith('/simple/home/public')) files.push(...(file.dir(public_example_file_location) || []))
            if (!files) throw 'is not a dir'
            console.debug(url, 'is a dir:', files)
        } catch (e) {
            console.debug(e)
            files = []
        }
        // return res.json({
        //     files: files.filter(x=>!ignore_files.has(x))
        // })
        const root = { 'home/': {} }
        const traverse = (parent, prefix, result) => {
            if (ignore_files.has(result)) return
            if (result.slice(-1) === '/') {
                const node = parent[result] = {}
                const node_prefix = path.join(prefix, result)
                const files = []
                try {
                    files.push(...file.dir(node_prefix))
                } catch {}
                if (node_prefix === 'simple/home/public/') files.push(...fs.readdirSync(path.join(staticPath, 'raw/simple')))
                // files.map(child_result => traverse(node, node_prefix, child_result))
                files.filter(x=>x.slice(-1)!=='/').map(child_result => traverse(node, node_prefix, child_result))
                files.filter(x=>x.slice(-1)==='/').map(child_result => traverse(node, node_prefix, child_result))
            } else {
                parent[result] = true
            }
        }
        traverse(root['home/'], 'simple/home/', 'public/')
        if (req.user) {
            traverse(root['home/'], 'simple/home/', req.user+'/')
            root['home/'][req.user+'/'] = Object.assign({ 'public/':{} }, root['home/'][req.user+'/'] || {})
        }
        console.debug(JSON.stringify(root, 0, 2))
        res.json({
            // files: Object.keys(root['home/']['public/']),
            files: files.filter(x=>!ignore_files.has(x)),
            tree: root,
        })
    }
})

export default {
    routes: R,
    io: I,
}
  
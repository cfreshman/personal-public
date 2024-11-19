import express from 'express';
import fs from 'node:fs';
import path from 'node:path';

const R = express.Router();
const FILE_DIR = path.resolve('./file/')
console.debug('uploaded files located at', FILE_DIR)

const getPath = filename => {
    if (file(filename, true) || dir(filename, true)) return filename
    else return path.join(FILE_DIR, filename)
}

const mkdir = (filepath) => {
    console.log('[FILE:MKDIR]', filepath)
    fs.mkdirSync(filepath.replace(/\/[^/]+$/, ''), { recursive: true })
}
const remove = (filename) => {
    console.log('[FILE:DELETE]', filename)
    const filepath = getPath(filename)
    if (fs.existsSync(filepath)) fs.rmSync(filepath)
    return filepath
}
const write = (filename, content) => {
    const filepath = getPath(filename)
    mkdir(path.dirname(filepath))
    console.log('[FILE:WRITE]', filename, content?.length)
    fs.writeFileSync(filepath, content)
    return filepath
}
const append = (filename, content) => {
    const filepath = getPath(filename)
    mkdir(path.dirname(filepath))
    console.log('[FILE:APPEND]', filename, content?.length)
    fs.appendFileSync(filepath, content)
    return filepath
}
R.post('/*', async (req, res) => {
    if (req.user !== 'cyrus') throw 'unauthorized'

    write(req.url, req.body)
    res.json({ success: true })
})

const send = (filename, res) => {
    console.log('[FILE:SEND]', filename)
    const filePath = getPath(filename)
    res.sendFile(filePath)
    return filePath
}
R.get('/*', async (req, res) => {
    console.log(`[FILE]`, req.user, req.url)
    if (!req.url.startsWith('/public-') && req.user !== 'cyrus') throw 'unauthorized'
    send(req.url, res)
})

const download = (filename, res, clientname=undefined) => {
    clientname = clientname || filename
    console.log('[FILE:DOWNLOAD]', filename, clientname)
    const filepath = getPath(filename)
    res.download(filepath)
    return filepath
}

const read = (filename) => {
    const fullpath = getPath(filename)
    console.log('[FILE:READ]', filename, fullpath)
    return fs.readFileSync(fullpath).toString()
}

const file = (path, absolute=false) => {
    try {
        const stats = fs.statSync(absolute ? path : getPath(path))
        return stats.isFile() && path.split('/').slice(-1)[0]
    } catch {
        return false
    }
}
const dir = (path, absolute=false) => {
    try {
        return fs.readdirSync(absolute ? path : getPath(path), { withFileTypes: true }).map(result => result.isDirectory() ? result.name+'/' : result.name)
    } catch {
        return false
    }
}

const full = (path) => {
    return `/api/file/${path}`
}

export default {
    routes: R,
    getPath,
    mkdir,
    write, append,
    send,
    download,
    read,
    file, dir, full,
    remove,
};
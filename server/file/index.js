const express = require('express')
// const M = require('./model')
const { J, U, isDevelopment } = require('../util.js')
const path = require('node:path')
const fs = require('node:fs')

const FILE_DIR =  path.resolve('./file/')
const R = express.Router();
R.post('/*', async (req, res) => {
    if (req.user !== 'cyrus') throw 'unauthorized'
    console.log('[FILE:WRITE]', req.url, req.body)
    const filePath = path.join(FILE_DIR, req.url)
    fs.mkdirSync(filePath.replace(/\/[^/]+$/, ''), { recursive: true })
    fs.writeFileSync(filePath, req.body)
    // res.sendFile()
    res.json({ success: true })
})
R.get('/*', async (req, res) => {
    console.log('[FILE:READ]', req.url)
    res.sendFile(path.join(FILE_DIR, req.url))
    // res.json({ success: true })
})

module.exports = {
    routes: R,
    // model: M,
}

import fs from 'fs'
import express from 'express';
import file from '../file';
import { isProduction, pick, hash } from '../../util';

const R = express.Router()

export const urlForDataUrl = (dataUrl, file_prefix='twitter', url_prefix='/api/integrations/twitter/card/image') => {
  if (/^data:image\/png;base64,/.test(dataUrl)) {
    const data = dataUrl.replace('data:image/png;base64,', '')
    const filename = `${file_prefix}-${hash(data)}.png`
    fs.writeFileSync(file.getPath(filename), data, 'base64', console.debug)
    return url_prefix + '/' + encodeURIComponent(filename)
  } else throw `unhandled dataUrl type ${dataUrl.split(',')[0]}`
}
export const url_for_data_url = (data_url) => urlForDataUrl(data_url, 'dataurl', '/api/integrations/dataurl')
export const clearUrl = (url) => {
  const filename = decodeURIComponent(url.split('/').slice(-1)[0])
  fs.unlinkSync(file.getPath(filename), console.debug)
}
export const clear_url_for_data_url = clearUrl

// why not a generic API which can return any HTML? huge security risk!
// in fact, this is still a security risk :) TODO fix
export const respondWithTwitterCard = (rs, query) => {
  console.debug('TWITTER CARD', pick(query, 'twitter:title twitter:url'))
  rs.send(`<html><head>${Object.entries(query).map(e => {
    // sadly, twitter cards do not work with dataURLs
    // instead, save to disk and return separately
    // TODO generate on the fly (requires graphics lib)
    if (/^data:image\/png;base64,/.test(e[1])) {
      e[1] = urlForDataUrl(e[1])
    }

    const tag = `<meta name="${e[0]}" content="${e[1]}"/>`
    // if suspicious, ignore
    // <*/*>*<*/*> is suspicious, there should only be one pair of start/close brackets
    return (/<.*\/.*>.*<.*\/.*>/.test(tag)) ? '' : tag
  }).join('')}</head><body onload="window.open('${query['twitter:url']}', '_self')"></body></html>`)
}

R.get('/twitter/card/image/:filename', async (rq, rs) => {
  const { filename } = rq.params
  console.debug('[INTEGRATIONS:TWITTER:CARD:IMAGE]', filename)
  if (!/^twitter-/.test(filename)) throw `unexpected twitter card image filename`
  file.send(filename, rs)
})
R.get('/twitter/card/:blob', async (rq, rs) => {
  respondWithTwitterCard(rs, JSON.parse(rq.params.blob))
})

R.get('/dataurl/:filename', async (rq, rs) => {
  const { filename } = rq.params
  console.debug('[INTEGRATIONS:DATAURL]', filename)
  if (!/^dataurl-/.test(filename)) throw `unexpected twitter card image filename`
  file.send(filename, rs)
})

export default {
  routes: R,
};

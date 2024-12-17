import fs from 'fs'
import readline from 'readline'
import {  readSecret, read_secret, writeSecret } from '../../secrets'
import { entryMap } from '../../util'
import { domains } from '../../domains'
import nodemailer from 'nodemailer'
import db from '../../db'

const C = db.of({
  mail: 'mail',
})

let mailer, sender

let ons = []
const is_ready = () => !!mailer
const on_ready = (fn) => {
  if (is_ready()) fn()
  else ons.push(fn)
}

read_secret('/mail/nodemailer.json').then(auth => {
  sender = auth.user
  mailer = nodemailer.createTransport({
    service: 'gmail',
    auth,
  })
  ons.forEach(fn => fn())
})


const linkRegex = /(?:https?:\/\/)?((?:[\w\-]+\.)+[\w\-/#~\+]{2,})/gi
const nestedLinkRegex = /href="<a href="(.+)">.+<\/a>"/gi
const convertLinks = str => {
  // console.log(str.split(linkRegex).filter(part => part))
  return str?.split(linkRegex).filter(part => part).map((part, i) => {
    if (linkRegex.test(part)) {
      return part
        .replace(linkRegex, `<a href="https://$1">$&</a>`)
        .replace(/href="https:\/\/((?:ht|f)tp(?:s?)\:\/\/|~\/|\/)/i, `href="$1`)
    } else {
      return part
    }
  }).join('').replace(nestedLinkRegex, 'href="$1"')
}

export const send = async (domain, to, subject, message) => {
  let item = await C.mail().findOne({ to, subject })
  const thread = item?.thread

  message = convertLinks(message)
  const request = {
    from: sender,
    to,
    inReplyTo: thread,
    subject,
    html: `<div style="white-space:pre">${message}</div>`,
  }
  console.debug('[MAIL:request]', request)
  const info = await mailer.sendMail(request)
  console.debug('[MAIL:mailed]', info)

  if (thread) {
    item.count += 1
    if (item.count > 95) {
      item.thread = undefined
      item.count = 0
    }
  } else {
    item = {
      to, subject,
      thread: info.messageId,
      count: 1,
    }
  }
  await C.mail().updateOne({ to }, { $set: item }, { upsert: true })
}

export default {
  is_ready, on_ready,
  send,
}
import db from '../../db';
import io from '../../io';
import secrets from '../../secrets';
import { isProduction, require } from '../../util';
import * as M from './model';

import { TwitterApi } from 'twitter-api-v2';
// const Twitter = require('twitter-v2')
import TelegramBot from 'node-telegram-bot-api';

const TWITTER = {
    Action: {
        SUBSCRIBE: 'subscribe'
    },
}
const TELEGRAM = {
    Action: {
        START: 'start',
        HELP: 'help',
    },
}
const DISCORD = {
    Action: {
        START: 'start'
    },
}
secrets.readSecret('/notify.json').then(secrets => {
    Object.assign(TWITTER, secrets.TWITTER)
    Object.assign(TELEGRAM, secrets.TELEGRAM)
    Object.assign(DISCORD, secrets.DISCORD)
}).catch(console.log)

const twitter = {
    bot: undefined,
    wordbase: { bot: undefined },
    init: async () => {
        {
            // twitter.bot = new Twitter({
            //     consumer_key: TWITTER.key,
            //     consumer_secret: TWITTER.secret,
            //     access_token_key: TWITTER.user.key,
            //     access_token_secret: TWITTER.user.secret,
            // })

            // let lastReadId = await db.simple.get('notify-methods-twitter-last')
            // setInterval(async () => {
            //     // TODO poll gmail instead

            //     const { data=[], ...other } = await twitter.bot.get('dm_events', {
            //         'dm_event.fields': 'dm_conversation_id,sender_id',
            //         'expansions': 'sender_id',
            //     })
            //     // read all new DMS
            //     const lastReadIndex = data.findIndex(x => x.id === lastReadId)
            //     const newDms = data.slice(0, lastReadIndex)
            //     if (newDms?.length) {
            //         lastReadId = newDms[0].id
            //         db.simple.set('notify-methods-twitter-last', lastReadId)
            //         const users = {}
            //         other.includes.users.forEach(user => users[user.id] = user)
            //         // console.debug(newDms)

            //         // verify user directly from message
            //         newDms.forEach(async x => {
            //             const { text, sender_id, dm_conversation_id: id } = x
            //             const twitter_username = users[sender_id].username
            //             console.debug('[NOTIFY:TWITTER:BOT]', twitter_username, text)
            //             let reply
            //             const isAction = text[0] === '/'
            //             if (isAction) {
            //                 const [action, ...args] = text.slice(1).split(' ')
            //                 console.debug('[NOTIFY:TWITTER:BOT:action]', action, args)
            //                 switch (action) {
            //                     case TWITTER.Action.SUBSCRIBE: {
            //                         const [token] = args
            //                         const { notify } = await M.verify(token, twitter_username)
            //                         if (notify) { // successful verification
            //                             reply = `verified: ${notify.domain ?? 'freshman.dev'}/notify`

            //                             const { user, methods } = notify
            //                             methods['twitter'] = twitter_username
            //                             console.debug(methods)
            //                             M.update(user, { methods })

            //                             const idQuery = { user, method: 'twitter' }
            //                             M.C.ids().updateOne(
            //                                 idQuery,
            //                                 {
            //                                     $set: { ...idQuery, id: sender_id }
            //                                 },
            //                                 { upsert: true })
            //                         } else {
            //                             reply = `unable to verify, try again at freshman.dev/notify`
            //                         }
            //                     } break
            //                 }
            //             }
            //             console.debug('[NOTIFY:TWITTER:BOT:reply]', reply)
            //             reply && twitter.bot.post(`dm_conversations/with/${sender_id}/messages`, { text: reply })
            //         })
            //     }
            // }, 15 * 60 * 1000 / 300) // 300 requests per 15m
            // twitter.bot.get('users/me').then(x => console.debug('[TWITER] logged in as', x.data.username))\
        }

        [
            ['default', twitter, TWITTER],
            ['wordbase', twitter.wordbase, TWITTER.wordbase],
        ].forEach(async ([variant, base, tokens]) => {
            if (!tokens?.user) return // dev environment ? idk we stopped testing this

            base.bot = new TwitterApi({
                appKey: tokens.key,
                appSecret: tokens.secret,
                accessToken: tokens.user.key,
                accessSecret: tokens.user.secret,
            })

            const lastReadKey = `notify-methods-twitter-${variant}-last`
            let lastReadId = await db.simple.get(lastReadKey)
            setInterval(async () => {
                // TODO poll gmail instead

                const { data=[], ...other } = await base.bot.v2.get('dm_events', {
                    'dm_event.fields': 'dm_conversation_id,sender_id',
                    'expansions': 'sender_id',
                })
                // read all new DMS
                const lastReadIndex = data.findIndex(x => x.id === lastReadId)
                const newDms = data.slice(0, lastReadIndex)
                if (newDms?.length) {
                    lastReadId = newDms[0].id
                    db.simple.set(lastReadKey, lastReadId)
                    const users = {}
                    other.includes.users.forEach(user => users[user.id] = user)
                    // console.debug(newDms)

                    // verify user directly from message
                    newDms.forEach(async x => {
                        const { text, sender_id, dm_conversation_id: id } = x
                        const twitter_username = users[sender_id].username
                        console.debug('[NOTIFY:TWITTER:BOT]', twitter_username, text)
                        let reply
                        const isAction = text[0] === '/'
                        if (isAction) {
                            const [action, ...args] = text.slice(1).split(' ')
                            console.debug('[NOTIFY:TWITTER:BOT:action]', action, args)
                            switch (action) {
                                case TWITTER.Action.SUBSCRIBE: {
                                    const [user, tokenRequest] = args
                                    console.debug(user, tokenRequest)
                                    if (!tokenRequest) return
                                    const [stage, token] = tokenRequest.split('-')
                                    if (stage === 'dev' && isProduction()) return
                                    const { notify } = await M.verify(token, twitter_username)
                                    if (notify) { // successful verification
                                        reply = `verified! return to ${notify.domain ?? 'freshman.dev'}/notify`

                                        const idQuery = { user, method: 'twitter' }
                                        await M.C.ids().updateOne(
                                            idQuery,
                                            {
                                                $set: { ...idQuery, id, variant }
                                            },
                                            { upsert: true })

                                        io.send([notify.user], 'rerender')
                                    } else {
                                        reply = `unable to verify, try again at freshman.dev/notify or message me @__freshman`
                                        // await update(notify.user, notify)
                                    }
                                } break
                            }
                        }
                        reply && console.debug('[NOTIFY:TWITTER:BOT:reply]', reply)
                        reply && base.bot.v2.post(`dm_conversations/${id}/messages`, { text: reply })
                    })
                }
            }, 15 * 60 * 1000 / 50) // 300 requests per 15m
            base.bot.v2.get('users/me').then(x => console.debug('[NOTIFY:TWITTER] logged in', x.data.username))
        })
    },
    send: async (user, message) => {
        const { id, variant } = (await M.C.ids().findOne({ user, method: 'twitter' })) ?? {}
        console.debug('[NOTIFY:TWITTER:SEND]', user, variant, id, message)
        if (!id) throw `could not find Twitter DM for user `+user
        ;(
            {
                wordbase: twitter.wordbase,
            }[variant] || twitter
        ).bot.v2.post(`dm_conversations/${id}/messages`, { text: message })
    },
}


const telegram = {
    bot: undefined,
    wordbase: { bot: undefined },
    init: () => {
        [
            ['default', telegram, TELEGRAM],
            ['wordbase', telegram.wordbase, TELEGRAM.wordbase],
        ].forEach(([variant, base, tokens]) => {
            base.bot = new TelegramBot(tokens.secret, { polling: true })
            base.bot.on('message', async msg => {
                const id = msg.chat.id
                let reply

                const text = msg.text
                const isAction = text[0] === '/'
                if (isAction) {
                    const [action, ...args] = text.slice(1).split(' ')
                    console.debug(action, args)
                    switch (action) {
                        case TELEGRAM.Action.START: {
                            // /start <user> <domain>
                            const [request] = args
                            const [user, _, token] = request.split('-') // <user>-request-<token>
                            const { notify } = await M.verify(token, msg.from.username)
                            if (!msg.from.username) {
                                reply = `no username! set one in your telegram settings and return to ${notify.domain ?? 'freshman.dev'}/notify to verify again`
                            } else if (notify) { // successful verification
                                reply = `verified! return to ${notify.domain ?? 'freshman.dev'}/notify`

                                const idQuery = { user, method: 'telegram' }
                                M.C.ids().updateOne(
                                    idQuery,
                                    {
                                        $set: { ...idQuery, id, variant }
                                    },
                                    { upsert: true })

                                io.send([notify.user], 'rerender')
                            } else {
                                reply = `unable to verify, try again at freshman.dev/notify or /contact me`
                            }
                        } break
                        case TELEGRAM.Action.HELP: {
                            M.send(['cyrus'], 'HELP', args.join(' '))
                        } break
                    }
                }
                console.debug('[TELEGRAM]', msg, reply)
                reply && base.bot.sendMessage(id, reply)
            })
            let errorStart
            base.bot.on('polling_error', x => {
                // ignore for an hour
                if (!errorStart || Date.now() - errorStart > 60 * 60 * 1000) {
                    errorStart = Date.now()
                    console.debug('[TELEGRAM] polling error')
                }
            })
            base.bot.getMe().then(x => console.debug('[NOTIFY:TELEGRAM] logged in', x.username))
        })
    },
    send: async (user, message) => {
        const { id, variant } = (await M.C.ids().findOne({ user, method: 'telegram' })) ?? {}
        console.debug('[NOTIFY:TELEGRAM:SEND]', user, variant, id, message)
        if (!id) throw `could not find Telegram chat for user `+user
        ;(
            {
                wordbase: telegram.wordbase
            }[variant] || telegram
        ).bot.sendMessage(id, message)
    },
}

const discord = {
    bot: undefined,
    init: () => {
        console.debug('[NOTIFY:DISCORD] skip until added to UI')
        return false

        const { REST, Routes } = require('discord.js');

        const commands = [
            {
                name: DISCORD.Action.START,
                description: 'Subscribe to notifications',
            },
        ];

        const rest = new REST({ version: '10' }).setToken(DISCORD.secret);
        (async () => {
        try {
            await rest.put(Routes.applicationCommands(DISCORD.key), { body: commands })
        } catch (error) {
            console.error(error)
        }
        })()

        const { Client, GatewayIntentBits } = require('discord.js')
        discord.bot = new Client({ intents: [GatewayIntentBits.Guilds] })
        discord.bot.on('ready', () =>  console.log(`[NOTIFY:DISCORD] logged in ${discord.bot.user.tag}`))
        discord.bot.on('interactionCreate', async interaction => {
            if (!interaction.isChatInputCommand()) return

            let reply
            console.debug('[DISCORD] interaction', interaction)
            switch (interaction.commandName) {
                case DISCORD.Action.START: {
                    // const [user, domain] = args
                    // const verify = randAlphanum(7)
                    // reply = `verify: ${domain}/notify#${verify}`
                } break;
            }

            reply && interaction.reply(reply)
        });
        discord.bot.login(DISCORD.secret)
    },
}

const methods = {
    twitter,
    telegram,
    discord,
}
const enabled = {
    twitter: false,
    telegram: isProduction(),
    discord: true,
}

db.queueInit(() => {
    console.debug(`NOTIFY METHODS for env ${process.env.NODE_ENV}`, enabled)
    Object.keys(enabled).map(method => {
        if (enabled[method]) {
            try {
                methods[method].init()
            } catch (e) {
                console.error('[NOTIFY] unable to start', method)
            }
        }
    })
}, 2000)

// as opposed to export, update model's internal method instances
M.setMethodInstances({
    twitter,
    telegram,
    discord,
})

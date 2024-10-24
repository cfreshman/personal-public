import db from '../../db'
import { send } from '../mail'
import * as chat from '../chat'
import { pick } from '../../util'

const C = db.of({
    default: 'msg',
        // content: string
        // contact: string
        // domain: string
})
const name = 'msg'

async function create(content, contact=undefined, domain=undefined) {
    const body = (contact || domain) ? { content, contact, domain } : content
    if (!body.content) body = { content: body }
    const msg = pick(body, 'content contact domain')
    console.debug('[CONTACT]', msg)
    await C.default().insertOne(msg)
    send(
        msg.domain,
        'cyrus+contact@freshman.dev',
        'message' + (msg.contact.length ? ' from ' + msg.contact : ''),
        `${msg.content}\n\n${msg.contact}`,
        msg.contact.includes('@') ? ['Reply-To: '+msg.contact] : [],
    )
    if (msg.contact.startsWith('u/')) chat.contact(msg.contact.slice(2), msg.content)
    return msg
}

export {
    name,
    create,
};

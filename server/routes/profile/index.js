import express from 'express';
import * as M from './model';
import { J, U, P } from '../../util';
import { siteChat } from '../chat/model';

const R = express.Router();
R.get('/', J(rq => M.get( U(rq) )));
R.post('/', J(rq => M.save( U(rq), rq.body)));
R.post('/bio', J(rq => M.save( U(rq), rq.body)));
R.post('/game', J(rq => M.game( U(rq), rq.body)));
R.post('/settings', J(rq => M.settings( U(rq), rq.body.settings)));
R.post('/checkin/:path', J(rq => M.checkin( U(rq), '/' + rq.params.path)));
R.delete('/checkin', J(rq => M.uncheckin( U(rq) )))
R.get('/:id', J(rq => M.get(rq.user, rq.params.id)));
R.post('/:id/follow', J(async rq => {
    const user = U(rq)
    const other = rq.params.id
    const result = await M.follow(user, other)
    siteChat(other, [
        `/u/${user} followed you` + (result.profile.followers?.includes(user) ? ' back' : ''),
        result.profile.followers?.includes(user)
        || result.profile.followers?.concat(result.profile.unfollowers || []).length > 1
        ? ''
        : 'follow them back to add as a friend for /wordbase challenges and more'])
    return result
}));
R.post('/:id/unfollow', J(rq => M.unfollow( U(rq), rq.params.id)));
R.post('/:id/deny', J(rq => M.deny(U(rq), rq.params.id)))

R.get('/invite/:id', J(rq => M.get_friend_link(rq.user, P(rq, 'id'))))
R.post('/invite/:id', J(rq => M.open_friend_link(U(rq), P(rq, 'id'))))
R.post('/randomize/invite', J(rq => M.randomize_friend_link(U(rq))))

async function requireProfile(rq) {
    return (await M.get( U(rq))).profile
}

async function requireFriend(rq, param='user') {
    const friend = isFriend(rq, param)
    if (!friend) throw `${U(rq)} not friends with ${P(rq, param)}`
    return friend
}
async function isFriend(rq, param='user') {
    const other = P(rq, param)
    if (!other) throw `no friend specified`
    const profile = await requireProfile(rq)
    if (!profile) throw `user not logged in`
    return [other, 'cyrus'].includes(profile.user) || profile.friends.includes(other)
        ? profile.user
        : false
}

async function hints(user, id=undefined, insert=false) {
    const  { settings } = await M._get(user)
    settings.hints = settings.hints || []
    if (id) {
        if (insert) {
            settings.hints = [...new Set(settings.hints), id]
            await M.update(user, { settings })
        }
        return settings.hints.includes(id)
    } else {
        return settings.hints
    }
}


export default {
    routes: R,
    model: M, ...M,
}
export {
    requireProfile,
    requireFriend,
    isFriend,
    hints,
};
export const F = requireFriend
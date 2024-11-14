import db from '../../db';
import { defer, entryMap, pick, randAlphanum, remove, unpick } from '../../util';
import { model as login } from '../login';
import notify from '../notify';
import { setlock } from '../counter/model';
import io from '../../io';
import { url_for_data_url } from '../integrations';

const names = {
    profile: 'profile',
        // user: string
        // bio: string
        // friends: string[]
        // follows: string[]
        // followers: string[]
        // unfollowers: string[]
        // settings: { string: any }
        // t: number (2023-02-18 or sign-up date)
        // icon string-dataurl
        // icon_url string-url
        // hidden { string:true }
        // invite: string
    profile_invite: 'profile_invite',
        // id: string
        // user: string
        // t: string
}
const C = db.of(names)

// freshman.dev/invite/0123456789ab
// => check profile.invite and profile_invite.id
// => follow each user from other
// => open user's profile
// freshman.dev/invite/0123456789ab/greet
// => open new greet meet w/ other



const computeStats = async () => {
    await setlock('cyrus', 'site', 'users', await C.profile().count())
}
db.queueInit(() => {
    setTimeout(computeStats, 3000);
    setInterval(computeStats, 1000 * 60 * 60 * 24); // 24hr
})

async function privileged(user) {
    let cyrus = await C.profile().findOne({ user: 'cyrus' })
    let isPrivileged = user === 'cyrus' || cyrus.friends.includes(user)
    console.log(`[PRIVILEGED] ${user} ${isPrivileged}`)
    return isPrivileged;
}

async function _get(user) {
    let profile = await C.profile().findOne({ user });
    // console.log(user, profile)
    if (!profile) {
        if (await login.get(user)) {
            profile = { user, bio: '', friends: [], follows: [], followers: [], t: Date.now() }
            await C.profile().insertOne(profile)
        }
    } else {
        if (!profile.t) {
            profile.t = Date.now()
            await C.profile().updateOne({ user }, { $set: profile })
        }
        if (!profile.invite) {
            await randomize_friend_link(user)
        }
    }
    if (profile && !profile.settings) profile.settings = {}
    if (profile && !profile.color && !profile.emoji) {
        // TODO move db declarations to separate file? db.js? unsure
        const capitals_profiles = db.of({ x:'capitals_profile' }).x()
        const capitals_profile = await capitals_profiles.findOne({ user })
        if (capitals_profile) {
            profile.color = capitals_profile.color
            profile.emoji = capitals_profile.icon
            await C.profile().updateOne({ user }, { $set: pick(profile, 'color emoji') })
        }
    }
    return profile
}
async function _getUser(user) {
    if (!user) throw 'user not signed in';
    return await _get(user);
}
async function get(user, other) {
    let viewer = user && await _getUser(user);
    other = other ?? user
    let profile = await _get(other)
    if (profile) {
        if (![other, 'cyrus', ...(profile.follows || [])].includes(user)) {
            delete profile.friends
            delete profile.follows
            delete profile.followers
        } else if (![other, 'site'].includes(user)) {
            const profile_hidden = profile.hidden || {}
            profile.friends = profile.friends?.filter(x => !profile_hidden[x] || (x === user && profile_hidden[user]))
            profile.follows = profile.follows?.filter(x => !profile_hidden[x] || (x === user && profile_hidden[user]))
            profile.followers = profile.followers?.filter(x => !profile_hidden[x] || (x === user && profile_hidden[user]))
        }
        delete profile.hidden
        return { viewer, profile }
    } else if (await privileged(user)) {
        let similar = (await C.profile().find({
            user: {
                $regex: `${other}`,
                $options: 'i',
            }
        }).toArray()).map(entry => entry.user).sort()
        return { viewer, similar }
    } else {
        return { viewer }
    }
}
async function update(user, props) {
    let profile = await _get(user);
    Object.assign(profile, unpick(props, '_id'));
    await C.profile().updateOne({ user }, { $set: profile });
    io.send([user], 'user:profile')
    return { profile };
}

async function follow(user, other) {
    let viewer = await _getUser(user);
    let profile = await _get(other);
    if (!viewer.follows.includes(other)) {
        let userUpdate = { follows: [other].concat(viewer.follows) }
        let otherUpdate = { followers: [user].concat(profile.followers) }
        let isFriend = profile.follows.includes(user);
        if (isFriend) {
            userUpdate.friends = [other].concat(viewer.friends);
            otherUpdate.friends = [user].concat(profile.friends);
        }
        viewer = (await update(user, userUpdate)).profile
        profile = (await update(other, otherUpdate)).profile
        if (!(profile.unfollowers || []).includes(user)) {
            notify.send(other, 'profile', `/u/${user} followed you`, `freshman.dev/u/${user}`)
        }
    }
    if (profile) {
        if (![other, 'cyrus', ...profile.follows].includes(user)) {
            delete profile.friends
            delete profile.follows
            delete profile.followers
        }
    }
    return {
        viewer,
        profile
    }
}
async function unfollow(user, other) {
    let viewer = await _getUser(user);
    let profile = await _get(other);
    if (viewer.follows.includes(other)) {
        let userUpdate = { follows: remove(viewer.follows, other) }
        let otherUpdate = {
            followers: remove(profile.followers, user),
            unfollowers: [user].concat(
                remove(profile.unfollowers || [], user))
        }
        let isFriend = profile.follows.includes(user);
        if (isFriend) {
            userUpdate.friends = remove(viewer.friends, other);
            otherUpdate.friends = remove(profile.friends, user);
        }
        viewer = (await update(user, userUpdate)).profile
        profile = (await update(other, otherUpdate)).profile
    }
    if (profile) {
        if (![other, 'cyrus', ...profile.follows].includes(user)) {
            delete profile.friends
            delete profile.follows
            delete profile.followers
        }
    }
    return {
        viewer,
        profile
    }
}
async function deny(user, other) {
    await unfollow(other, user)
    return { success:true }
}

async function bio(user, bio) {
    return await update(user, { bio })
}
async function save(user, body) {
    const { bio, icon } = body
    return await update(user, {
        ...(bio!==undefined?{bio}:{}),
        ...(icon!==undefined?{icon, icon_url:icon&&url_for_data_url(icon)}:{}),
    })
}
async function game(user, body) {
    let { color, emoji, icon } = body
    emoji = emoji || icon
    return await update(user, { color, emoji })
}

async function settings(user, settings) {
    return await update(user, settings ? { settings } : {})
}

const ignored_checkins = new Set(['undefined', 'search'])
async function checkin(user, path) {
    if (path?.slice(1) && !ignored_checkins.has(path.slice(1))) {
        let viewer = await _getUser(user);
        let recents = [path].concat(remove(viewer.recents || [], path)).slice(0, 3);
        let profile = await update(user, { recents });
        return { profile }
    } else {
        return { profile: await _get(user) }
    }
}
async function uncheckin(user) {
    await _getUser(user)
    let profile = await update(user, { recents:[] })
    return { profile }
}

async function set_hidden(a, b, hidden) {
    // console.debug('[set_hidden]', a, b, hidden)
    const user_groups = [[a,b],[b,a]]
    for (let i = 0; i < user_groups.length; i++) {
        const [user, other] = user_groups[i]
        const profile = await _get(user)
        if (profile) {
            const profile_hidden = profile.hidden || {}
            if (hidden) {
                profile_hidden[other] = true
            } else {
                delete profile_hidden[other]
            }
            await update(user, { hidden:profile_hidden })
        }
    }
}

async function _friend_link(id) {
    const item = (await C.profile().findOne({ invite:id })) || (await C.profile_invite().findOne({ id }))
    return item ? item.user : false
}
async function get_friend_link(viewer, id) {
    console.debug('[profile:get_friend_link]', {viewer,id})
    const user = await _friend_link(id)
    let profile
    if (user) {
        profile = await _get(user)
    }
    return { user, profile }
}
async function randomize_friend_link(viewer) {
    const profile = C.profile().findOne({ user:viewer })
    if (profile) {
        let invite
        do {
            invite = randAlphanum(12)
        } while (await _friend_link(invite))
        profile.invite = invite
        await C.profile().updateOne({ user:viewer }, { $set:profile }, { upsert:true })
    }
    return { profile }
}
async function open_friend_link(viewer, id) {
    const invite_user = await _friend_link(id)
    if (invite_user) {
        await follow(viewer, invite_user)
        await follow(invite_user, viewer)
    }
    return { success:!!invite_user }
}

export {
    names, C,
    _get,
    get,
    follow, unfollow, deny,
    checkin, uncheckin,
    privileged,
    bio, save, game,
    settings,

    set_hidden,
    get_friend_link, randomize_friend_link, open_friend_link,
};
// special functions for deleting a user
// removes user's items from various sub-apps

import * as M_login from "./model";
import * as M_profile from "../profile/model";
import * as M_greeter from "../greeter/model";
import db from "../../db";

const delete_user = async (user) => {
    const login = !!(await M_login.C.login().findOne({ user }))
    console.debug('DELETE USER', { user, login })
    if (!login) return

    // remove follows
    const profile = await M_profile._get(user)
    await Promise.all(profile.follows.map(async other => {
        await M_profile.unfollow(user, other)
    }))
    await Promise.all(profile.followers.map(async other => {
        await M_profile.unfollow(other, user)
    }))
    await M_profile.unfollow('cyrus', user)

    // delete profile
    await M_profile.C.profile().deleteOne({ user })

    // delete greeter
    const {list:meets} = await M_greeter.get_meets(user)
    const meet_ids = meets.map(meet => meet.id)
    await M_greeter.C.greeter().deleteOne({ user })
    await M_greeter.C.greeter_detail().deleteMany({ id:{$in:meet_ids} })
    await M_greeter.C.greeter_met().deleteMany({ id:{$in:meet_ids} })

    // delete login
    await M_login.C.login().deleteOne({ user })
}

db.queueInit(async () => {
    // const users = 'samuel'.split(' ')
    // for (let i = 0; i < users.length; i++) {
    //     await delete_user(users[i])
    // }
})

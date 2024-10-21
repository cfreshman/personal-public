import api from "src/lib/api"
import { useF, useRerender, useS } from "src/lib/hooks"
import { useRoom } from "src/lib/socket"

export const use_profile = ({ user }) => {
  const [profile, set_profile] = useS(undefined)
  const reload_profile = useRerender()
  useF(user, reload_profile, async () => {
    if (user) {
      const { profile } = await api.get(`/profile/${user}`)
      set_profile(profile)
    } else {
      set_profile(undefined)
    }
  })
  return { profile, reload_profile }
}

export const use_light_profile = ({ user }) => {
  const [profile, set_profile] = useS(undefined)
  const reload_profile = useRerender()
  useF(user, reload_profile, async () => {
    const { data } = await api.post(`/light/user/${user}`)
    set_profile(data)
  })
  useRoom({
    room: `light:user:${user}`,
    on: {
      [`light:user:${user}:update`]: () => reload_profile()
    },
  })
  return { light_profile:profile, reload_light_profile:reload_profile }
}

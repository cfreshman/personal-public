import api from "src/lib/api"
import { useF, useRerender, useS } from "src/lib/hooks"

export const use_profile = ({ user }) => {
  const [profile, set_profile] = useS(undefined)
  const reload_profile = useRerender()
  useF(user, reload_profile, async () => {
    const { profile } = await api.get(`/profile/${user}`)
    set_profile(profile)
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
  return { light_profile:profile, reload_light_profile:reload_profile }
}

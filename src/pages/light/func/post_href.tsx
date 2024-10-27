import { useF, useM, useS } from "src/lib/hooks"
import { extractLinks } from "src/lib/render"

export const use_post_href = ({ text }) => {
  const [href, set_href] = useS('')
  useF(text, () => {
    const links = extractLinks(text||'')
    let href = links.at(-1)
    if (href) {
      href = href.replace(location.origin, '').replace(location.host, '')
    }
    set_href(href)
  })
  const single = useM(text, href, () => {
    if (href && !text.replace(href.replace(/https?:\/\//, ''), '').replace(location.host, '').replace(/https?:\/\//, '').trim()) {
      return true
    }
    return false
  })
  const large = useM(text, href, () => {
    if (href && text.replace(href.replace(/https?:\/\//, ''), '').replace(location.host, '').replace(/https?:\/\//, '').trim().length < 64) {
      return true
    }
    return false
  })

  return { href, single, large }
}
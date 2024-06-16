import React from 'react'
import { useF } from 'src/lib/hooks'
import url from 'src/lib/url'

export default () => {
  useF(() => url.replace(location.href.replace(location.origin, '').replace('multipals', 'capitals')))
  return <></>
}

import React from 'react'
import styled from 'styled-components'
import { A, HalfLine, InfoBadges, InfoBody, InfoButton, InfoLoginBlock, InfoSection, InfoStyles, Reorderable } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { asInput, useF, useM, useR, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { store } from 'src/lib/store'
import { S, server } from 'src/lib/util'
import { RawWebsiteIcon, WebsiteIcon, WebsiteTitle, WebsiteTitleAndIcon } from 'src/components/website_title'
import GreeterLink from './greeter/GreeterLink'
import { openPopup } from 'src/components/Modal'
import url from 'src/lib/url'

const { named_log, copy, display_status, entries, defer, Q } = window as any
const log = named_log('collector')

const CollectorCollection = ({ viewer, item, handle }) => {
  const self = viewer === item?.user

  const [new_name, set_new_name, fill_new_name] = asInput(useS(''))
  const [url, set_url, fill_url] = asInput(store.use('collector-url'))

  handle = {
    ...handle,
    add_url: (new_url=url) => {
      log('add link', item, new_url)
      if (!new_url) return
      item.links.push(new_url)
      api.post(`/collector`, { item }).then(result => {
        log(`added url`, result)
        handle.load_item()
        set_url('')
      })
    },
    set_name: () => {
      log('set name', item, new_name)
      if (!new_name) return
      item.name = new_name
      set_other_mode(undefined)
      api.post(`/collector`, { item }).then(result => {
        log(`set name`, result)
        handle.load_item()
        handle.load_profile()
      })
    },
  }

  const [edit, set_edit] = useS(false)
  const [other_mode, set_other_mode] = useS<'rename'|'delete'>(undefined)
  const mode = {
    rename: other_mode === 'rename',
    delete: other_mode === 'delete',
  }
  useF(mode.rename, () => set_new_name(''))

  return <>
    <InfoSection labels={self ? [
      ...(mode.rename ? [
        { text: 'cancel', func: () => set_other_mode(undefined) },
        { text: 'save', func: () => handle.set_name() },
      ] : [
        { text: 'menu', href: '/collector' },
        { text: 'rename', func: () => set_other_mode('rename') },
      ])
    ] : []}>
      {mode.rename ? <>
        <input {...fill_new_name} placeholder='enter new name' className='collector-block collector-block-dark' onKeyDown={e => {
          if (e.key === 'Enter') handle.set_name()
        }} />
      </>
      : <div className='collector-block'><b>{item?.name}</b> collection{self ? '' : ` by ${item?.user}`}</div>}
    </InfoSection>
    {self ? <InfoSection labels={[
      url ? { add: () => handle.add_url() } : 'add',
      { 'paste clipboard': () => navigator.clipboard.readText().then(set_url) },
      url && { 'clear': e => {
        set_url('')
      }, label: !url },
    ]}>
      <input {...fill_url} placeholder='enter link' className='collector-block collector-block-dark' onKeyDown={e => {
        if (e.key === 'Enter') handle.add_url()
      }} />
    </InfoSection> : null}
    <InfoSection labels={[
      edit ? 'deleting links' : 'links',
      self && (edit ? { 'done': () => set_edit(false) } : { 'delete': () => set_edit(true) }),
      // { text: 'menu', href: '/collector' },
    ]}>
      <div className='column gap wrap wide'>
        {!item ? 'loading'
        : !item.links.length ? 'empty'
        // : <InfoBadges labels={item.links.map((url, i) => {
        //   const text = <>
        //     <WebsiteTitle href={url} />
        //     &nbsp;
        //     <RawWebsiteIcon href={url} style={S(`height: 1.5em`)} />
        //   </>
        //   return edit ? {
        //     func: () => {
        //       log('delete link', item, i, url)
        //       item.links = [].concat(item.links.slice(0, i), item.links.slice(i + 1))
        //       log('deleting link', item.links)
        //       api.post(`/collector`, { item }).then(result => {
        //         log(`removed url`, result)
        //         handle.load_item()
        //       })
        //     },
        //     text,
        //   } : {
        //     href: url,
        //     text,
        //   }
        // })} />
        : item.links.map((url, i) => {
          const text = <>
            <div style={S(`
            flex-shrink: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            `)}><WebsiteTitle href={url} /></div>
            &nbsp;
            <RawWebsiteIcon href={url} style={S(`height: 1.5em`)} />
          </>
          return <InfoBadges className='collector-list-item' labels={[
            (edit ? {
              func: () => {
                log('delete link', item, i, url)
                item.links = [].concat(item.links.slice(0, i), item.links.slice(i + 1))
                log('deleting link', item.links)
                api.post(`/collector`, { item }).then(result => {
                  log(`removed url`, result)
                  handle.load_item()
                })
              },
              text,
            } : {
              href: url,
              text,
            })
          ]} />
        })
        }
      </div>
      {/* {!item ? 'loading'
      : !item.links.length ? 'empty'
      : <Reorderable className='column gap' elements={item.links.map((url, i) => {
        const text = <>
          <WebsiteTitle href={url} />
          &nbsp;
          <RawWebsiteIcon href={url} style={S(`height: 1.5em`)} />
        </>
        return <InfoBadges labels={[edit ? {
          func: () => {
            log('delete link', item, i, url)
            item.links = [].concat(item.links.slice(0, i), item.links.slice(i + 1))
            log('deleting link', item.links)
            api.post(`/collector`, { item }).then(result => {
              log(`removed url`, result)
              handle.load_item()
            })
          },
          text,
        } : {
          href: url,
          text,
        }]} />
      })} reorder={order => {
        item.links = order.map(i => item.links[i])
        api.post(`/collector`, { item }).then(result => {
          log(`reordered links`, result)
          handle.load_item()
        })
      }} />} */}
    </InfoSection>
    {/* <InfoSection labels={['other']}>
      <InfoBadges labels={[
        { 'rename collection': () => set_other_mode('rename')}
      ]} />
      <InfoBadges labels={[
        { 'delete collection': () => set_other_mode('delete')}
      ]} />
    </InfoSection> */}
  </>
}

const open_popup = (closer) => {
  openPopup(close => <Style>
    <InfoBody>
      {closer(close)}
    </InfoBody>
  </Style>, `
  height: max-content;
  width: max-content;
  background: #000 !important;
  padding: 0;
  `)
}

const CollectorBase = ({ viewer, user, lists, handle }) => {
  const self = viewer === user

  const [edit, set_edit] = useS(false)

  const [list_search, set_list_search] = useS('')
  const filtered_lists = useM(lists, list_search, () => {
    if (!lists || !list_search) return lists

    // defer(() => {
    //   Q('#collector-search-input')?.scrollIntoView({ block:'start' })
    //   Q('#inner-index')?.scrollIntoView({ block:'end' })
    // })

    const lowercase_search = list_search.toLowerCase()
    return lists.filter(([id, name]) => name.toLowerCase().includes(lowercase_search))
  })

  return <>
    <InfoSection>
      <div className='collector-block'><b>collector:</b> lists of links</div>
    </InfoSection>
    <InfoSection labels={[
      edit ? 'deleting collections' : self ? 'your collections' : `${user}'s collections`,
      self && { 'new': () => {
        const CollectorNew = ({ close }) => {
          const [name, set_name, fill_name] = asInput(useS(''))
          const ref_name = useR()
          useF(() => ref_name.current.focus())

          const create_collection = () => {
            const CollectorLoad = ({ close }) => {
              useF(async () => {
                const { item } = await api.post('/collector', { item:{user, name} })
                close()
                url.push(`/collector/${user}/${item.id}`)
                await handle.load_profile()
              })
              return <>
                <InfoSection>
                  loading...
                </InfoSection>
              </>
            }
            close()
            defer(() => open_popup(close => <CollectorLoad close={close} />))
          }

          return <>
            <InfoSection>
              <input ref={ref_name} {...fill_name} placeholder='enter name' className='collector-block collector-block-dark' style={S(`
              min-width: 16em;
              `)} onKeyDown={e => {
                if (e.key === 'Enter') create_collection()
              }} />
              <HalfLine />
              <div className='row wide'>
                <InfoButton onClick={close}>CANCEL</InfoButton>
                <div className='spacer' />
                <InfoButton onClick={create_collection} disabled={!name}>CREATE</InfoButton>
              </div>
            </InfoSection>
          </>
        }
        open_popup(close => <CollectorNew close={close} />)
      }},
      self && (edit ? { view: () => set_edit(false) } : { 'delete': () => set_edit(true)}),
      viewer && {
        text: <>
          <span style={{fontSize:'.45em'}}>&nbsp;</span>search: <input id='collector-search-input' placeholder={'search lists'} style={S(`
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          `)} value={list_search} onChange={e => set_list_search(e.target.value)} />
        </>
      },
    ]}>
      {!lists ? 'loading...'
      : !lists.length ? 'empty'
      : !filtered_lists.length ? 'no matching lists'
      : <div className='column gap'>
        {filtered_lists.map(([id, name]) => {
          if (edit) {
            return <a onClick={async () => {
              await api.delete(`/collector/${user}/${id}`)
              await handle.load_profile()
            }}><b>{name}</b></a>
          } else {
            return <A bold href={`/collector/${user}/${id}`}>{name}</A>
          }
        })}
      </div>}
    </InfoSection>
  </>
}

export default () => {
  const [{user:viewer}] = auth.use()

  const [[user, list_id], set_path] = usePathState({
    from: (path) => {
      let [user, list_id] = path.split('/')
      return [user || viewer, list_id]
    },
    to: ([user, list_id]) => {
      if (!list_id) return '' // '/'+user
      if (!user) return ''
      return '/'+user+'/'+list_id
    },
  })

  const [profile, set_profile] = useS(undefined)
  const [item, set_item] = useS(undefined)

  const collection_view = user && list_id
  const base_view = !collection_view

  const handle = {
    set_path,
    load_profile: async () => {
      if (!viewer) {
        set_profile(undefined)
        return
      }
      const { profile } = await api.get('/collector/profile')
      log('fetched profile', profile)
      set_profile(profile)
    },
    load_item: async () => {
      if (!list_id) {
        set_item(undefined)
        return
      }
      const { item } = await api.get(`/collector/${user}/${list_id}`)
      log('fetched item', profile)
      set_item(item)
    },
    load: async () => {
      await Promise.all([
        handle.load_profile(),
        handle.load_item(),
      ])
    },
  }
  useF(viewer, handle.load_profile)
  useF(user, list_id, handle.load_item)

  usePageSettings({
    // background: '#1DB954',
    background: '#F7DC6F',
    // background: '#caffb8',
    // background: '#bbffa4',
    // background: '#c1ffa4',
    expand: true,
    title: (
      item ? item.name
      : '/collector'
    ),
  })
  return <Style id='page-collector'>
    <InfoBody className='column' style={S(`gap: .5em`)}>
      {collection_view ? <CollectorCollection {...{
        viewer,
        item,
        handle,
      }} />
      : !profile ? <InfoLoginBlock inline to='use' />
      : <CollectorBase {...{
        viewer, user,
        lists: entries(profile.lists),
        handle,
      }} />}
      <div className='spacer' />
      <InfoSection label='more'>
        <div>- add to your home screen for quick access</div>
        {/* <div>- read <A bold tab='/about' /> this website</div> */}
        <div>- <A bold tab='/contact' /> me</div>
        <div>- donate a <A bold tab='/coffee' /></div>
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`&#page-collector#page-collector#page-collector{
  .collector-block {
    border: 1px solid var(--id-color-text) !important;
    padding: .5em !important;
    border-radius: .25em !important;
  }
  .collector-block-dark {
    &:is(input) {
      background: #000 !important;
      color: #fff !important;

      background: #222 !important;
      color: var(--id-color) !important;
    }
    &:not(input) {
      background: #222;
      color: var(--id-color);
    }
  }

  .collector-list-item {
    width: 100%;
    &, .button {
      max-width: 100%;
    }
  }

  .pointer {
    cursor: pointer !important;
  }
  .button {
    background: #222 !important;
    color: var(--id-color) !important;
  }
}`
import React from 'react'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoStyles, InfoLoginBlock, InfoLabel, InfoBadges } from '../components/Info'
import { Tabbed, setTabbed, useCachedScript, usePageSettings, usePathState, useTabbed } from 'src/lib/hooks_ext'
import { useE, useF, useM, useR, useRerender, useS } from 'src/lib/hooks'
import { S, dev, server } from 'src/lib/util'
import api, { auth } from 'src/lib/api'
import { JSX } from 'src/lib/types'
import { openLogin } from 'src/lib/auth'


const { named_log, QQ, node, on, devices } = window as any
const log = named_log('audio_form')

type Post = {
  hash: string
  parent: string
  user: string
  t: number
  likes: Set<string>
  replies: string[]
  tags: string[]
  src: string
}

const PostTags = ({ tags, toggleTag }) => {
  return <div className='tag-list row'>
    {tags.map(tag => <span key={tag} className='button' onClick={e => toggleTag(tag)}>#{tag.replaceAll(' ', '_')}</span>)}
  </div>
}
const Post = ({ post: {hash, parent, src, user, likes, replies, tags}, reply_view=false, reload, toggleTag, setUser, setPost }) => {
  const [{ user:viewer }] = auth.use()
  const ref = useR()
  useE(src, () => {
    if (window['hydrate'] && ref.current) {
      const { hydrate, hydrates } = window as any
      const parent = ref.current.parentNode
      hydrate(QQ(parent, 'audio'), hydrates.audio)
      return () => QQ(parent, '.audio_visual').map(l => l.remove())
    }
  })
  const [confirm_delete, setConfirmDelete] = useS(false)
  return <div className='post column gap'>
    <div className='post-header row gap wide'>
      {/* <img src='/icon.png' style={S(`
      height: 1.4em;
      width: 1.4em;
      flex-grow: 0;
      `)} onClick={e => setUser(user)} className='clickable'/> */}
      <span onClick={e => setUser(user)} className='clickable'>@{user}</span>
      <span className='spacer'></span>
      {confirm_delete
      ? <>
        <span className='middle-row' style={S(`
        background: #000;
        color: #fff;
        border: 1px solid #000;
        padding: 0 .33em;
        min-width: 2.5em;
        border-radius: 1e9em;
        cursor: pointer;
        `)} onClick={e => {
          api.delete(`audio_form/${hash}`).then(result => {
            reload()
          })
        }}>
          really delete
        </span>
        <span className='middle-row' style={S(`
        background: #000;
        color: #fff;
        border: 1px solid #000;
        padding: 0 .33em;
        min-width: 2.5em;
        border-radius: 1e9em;
        cursor: pointer;
        `)} onClick={e => {
          setConfirmDelete(false)
        }}>
          cancel
        </span>
      </>
      : <>
        {/* <span>
          {likes.size} like{likes.size===1?'':'s'}
        </span> */}
        {viewer === user ? <span className='middle-row' style={S(`
        background: #000;
        color: #fff;
        border: 1px solid #000;
        padding: 0 .33em;
        min-width: 2.5em;
        border-radius: 1e9em;
        cursor: pointer;
        `)} onClick={e => {
          setConfirmDelete(true)
        }}>
          🚫
        </span> : null}
        <span className='middle-row' style={S(`
        background: #000;
        color: #fff;
        border: 1px solid #000;
        ${likes.has(viewer) ? `
        background: #fff; color: #000;
        ` : ''}
        padding: 0 .33em;
        min-width: 2.5em;
        border-radius: 1e9em;
        cursor: pointer;
        `)} onClick={e => {
          if (!viewer) {
            openLogin()
            return
          }
          api.post(`audio_form/${hash}/${likes.has(viewer) ? 'un' : ''}like`).then(result => {
            reload()
          })
        }}>
          {likes.size}👍
        </span>
        {parent || reply_view ? null : <span className='middle-row' style={S(`
        background: #000;
        color: #fff;
        border: 1px solid #000;
        padding: 0 .33em;
        min-width: 2.5em;
        border-radius: 1e9em;
        cursor: pointer;
        `)} onClick={e => {
          setPost(hash)
        }}>
          {replies.length || null}💬
        </span>}
      </>}
    </div>
    <audio ref={ref} data-hydrate controls src={src}></audio>
    <PostTags tags={tags} toggleTag={toggleTag} />
  </div>
}

const { lists, defer, set, strings } = window as any
const anycasenumspace_set = set(strings.anycasenum + ' ', '')
const EditPostTags = ({ tags, setTags }) => {
  const rerender = useRerender()
  return <div className='tag-list row'>
    <input type='text' autoCapitalize='off' style={S(`
    border: 1px solid #ddd;
    border-radius: 1e4em;
    padding: 0 .33em;
    `)} onChange={e => {
      const L = e.currentTarget
      L.value = L.value.split('').filter(x => anycasenumspace_set.has(x)).join('').slice(0, 256)
    }} onKeyDown={e => {
      const L = e.currentTarget
      defer(() => {
        if (e.key === 'Enter') {
          setTags(tags.concat([L.value]))
          L.value = ''
        }
      })
    }} placeholder='enter tag'></input>
    {tags.map(tag => <span key={tag} className='button' onClick={e => {
      // log('remove tag', tag, lists.remove(tags, tag))
      setTags(lists.remove(tags, tag))
      rerender()
    }}>#{tag.replaceAll(' ', '_')}</span>)}
  </div>
}
const EditPost = ({ user, setTabRef, reload, parent=undefined }) => {
  const ref = useR()
  const [tags, setTags] = useS([])

  const [recorder, setRecorder] = useS<MediaRecorder>(undefined)
  const [audio_src, setAudioSrc] = useS(undefined)
  const [audio_file, setAudioFile] = useS(undefined)
  useE(audio_src, () => {
    if (window['hydrate'] && ref.current) {
      const { hydrate, hydrates } = window as any
      const parent = ref.current.parentNode
      hydrate(QQ(parent, 'audio'), hydrates.audio)
      return () => QQ(parent, '.audio_visual').map(l => l.remove())
    }
  })
  const handle = {
    record: () => {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        const recorder = new MediaRecorder(stream)
        const recorder_chunks = []
        recorder.ondataavailable = e => recorder_chunks.push(e.data)
        recorder.onstop = e => {
          const audio_blob = new Blob(recorder_chunks, { type: 'audio/mpeg-3' })
          const audio_url = window.URL.createObjectURL(audio_blob)
          setAudioSrc(audio_url)
          setAudioFile(new File([audio_blob], 'audio.mp3'))
        }
        recorder.start()
        setRecorder(recorder)
      })
    },
    stop: () => {
      recorder?.stop()
      setRecorder(undefined)
    },
    delete: () => {
      setAudioSrc(undefined)
    },
    post: () => {
      log('new post', audio_file, tags)
      api.put(`/audio_form/file`, audio_file, {
        headers: { 'Content-Type': audio_file.type || 'multipart/form-data' },
      })
      .then(result => {
        log('upload result', result)
        api.put(`/audio_form`, {
          t: Date.now(),
          tags,
          ...(parent ? {parent} : {}),
        })
        .then(result => {
          log('create result', result)
          setAudioSrc(undefined)
          setAudioFile(undefined)
          setTags([])
          setTabRef.current('feed')
          reload()
        })
      })
      // const form = new FormData()
      // // form.append('audio', audio_file)
      // form.append('data', JSON.stringify({
      //   user,
      //   t: Date.now(),
      //   tags,
      // }))
      // // api.put('audio_form', { user, t:Date.now(), audio:audio_file, tags })
      // // api.put('audio_form', form)
      // // api.external('/api/audio_form', 'PUT', { form })
      // api.put('audio_form', {form})
    },
  }

  return <div className='post column gap'>
    {devices.is_mobile || dev
    ?
    <InfoLoginBlock inline to={'post on audio_form'}>
      <div className='post-header row gap wide'>
        {/* <span style={S(`
        display: inline-block;
        height: 1.4em;
        width: 1.4em;
        background: #000;
        `)}></span> */}
        {/* <img src='/icon.png' style={S(`
        height: 1.4em;
        width: 1.4em;
        flex-grow: 0;
        `)} /> */}
        <span>@{user}</span>
        <span className='spacer'></span>
        {audio_src ? <span className='middle-row' style={S(`
        background: #000;
        color: #fff;
        padding: 0 .33em;
        min-width: 2.5em;
        border-radius: 1e9em;
        cursor: pointer;
        `)} onClick={e => handle.post()}>
          post
        </span> : null}
      </div>
      {/* <audio ref={ref} data-hydrate controls src={src}></audio> */}
      <div className='row gap'>
        {
          audio_src
          ? <audio ref={ref} data-hydrate controls src={audio_src}></audio>
          : <span className='button' style={S(`
          font-size: 1.25em;
          `)}
          onClick={e => recorder ? handle.stop() : handle.record()}>
            {recorder ? <>stop recording OoO</> : <>record {parent ? 'reply' : 'post'} oOo</>}
          </span>}
        {/* {
          audio_src // || !devices.is_mobile
          ? null
          : <span className='button' style={S(`
          font-size: 1.25em;
          `)}
          onClick={e => {
            const file = node('<input type=file />')
            file.click()
          }}>
            upload recording
          </span>} */}
      </div>
      {audio_src ? <div>
        <span className='button' onClick={e => handle.delete()}>delete</span>
      </div> : null}
      <EditPostTags tags={tags} setTags={setTags} />
    </InfoLoginBlock>
    : <>
      you must record posts from a mobile device
    </>}
  </div>
}

export default () => {
  const reload = useRerender()
  const [{ user:viewer }] = auth.use()
  useCachedScript('/lib/2/hydrate-components/script.js')
  usePageSettings({
    professional: true,
    expand: true,
    icon: `/raw/audio_form/icon.png`,
  })

  const [{ desired_tab, user, tag, post }, setPath] = usePathState({
    prefix: 'audio_form/',
    from: path => {
      let user, post, tag, desired_tab = ''
      if (path.startsWith('u/')) {
        user = path.split('u/')[1]
      } else if (path.startsWith('t/')) {
        tag = path.split('t/')[1]
      } else if (path.startsWith('p/')) {
        post = path.split('p/')[1]
      } else {
        desired_tab = path === 'feed' ? '' : path
      }
      return { desired_tab, user, tag, post }
    },
    to: ({ desired_tab='', user, tag, post }) => {
      if (user) {
        return `u/${user}`
      }
      if (tag) {
        return `t/${tag}`
      }
      if (post) {
        return `p/${post}`
      }
      return desired_tab
    },
  })
  const setUser = user => setPath(user ? { user } : { tag, post, desired_tab })
  const setTag = tag => setPath(tag ? { tag } : { user, post, desired_tab })
  const setPost = post => setPath(post ? { post } : { user, tag, desired_tab })
  const setDesiredTab = desired_tab => setPath(desired_tab && desired_tab !== 'feed' ? { desired_tab } : { user, tag, post })

  const [posts, setPosts] = useS<Post[]>([
    // {
    //   hash: '0', parent: undefined,
    //   user: viewer,
    //   t: Date.now(),
    //   src: '/raw/index_cards/2023-11-22-02/a1.m4a',
    //   likes: new Set([viewer]),
    //   replies: [],
    //   tags: ['sorry', 'boss'],
    // },
    // {
    //   hash: '1', parent: undefined,
    //   user: viewer,
    //   t: Date.now(),
    //   src: '/raw/index_cards/2023-11-21-02/a1.m4a',
    //   likes: new Set([viewer, 'alice', 'bob', 'eve']),
    //   replies: [],
    //   tags: ['kinda hot'],
    // },
  ])
  const selected_post = useM(posts, post, () => {
    return posts.find(x => x.hash === post)
  })
  const filtered_posts = useM(posts, tag, user, post, () => (posts||[]).filter(x => {
    const is_tag = !tag || x.tags.find(x => x.toLowerCase() === tag.toLowerCase())
    const is_user = !user || x.user === user
    const is_post = !post || x.parent === post
    return is_tag && is_user && is_post
  }))
  const handle = {
    load: () => {
      let list_request
      if (post) {
        list_request = api.get(`audio_form/${post}/replies`)
      } else {
        list_request = api.get('audio_form')
      }
      list_request.then(data => {
        log(data)
        const posts = data.list.map(post => {
          return { 
            ...post,
            src:`${server}/api/file/${post.audio}`,
            likes: new Set(post.likes),
          }
        })
        if (posts.length) setPosts(posts)
      })
    }
  }

  // const [Tabbed, setTab] = <SetTabbed options={{
  //   feed: <div className='column' style={S(`
  //   width: 100%;
  //   border-radius: .25em;
  //   gap: .5em;
  //   `)}>
  //     {/* <Post user={user} src="/raw/index_cards/2023-11-22-02/a1.m4a" likes={0} tags={['sorry', 'boss']} />
  //     <Post user={user} src="/raw/index_cards/2023-11-21-02/a1.m4a" likes={3} tags={['kinda hot']} /> */}
  //     {posts
  //     ? posts.map((post, i) => <Post key={i} user={post.user} src={post.audio} likes={post.likes} tags={post.tags} />)
  //     : <>no posts available</>}
  //   </div>,
  //   // 'new post': <span>COMING SOON</span>,
  //   'new post': <EditPost user={user} recorder={recorder} />,
  //   about: <span>an audio-based social media</span>,
  // }} initial='feed' />
  const setTabRef = useR()
  const [tagEdit, setTagEdit] = useS(false)
  const [userEdit, setUserEdit] = useS(false)
  const toggleTag = (new_tag) => {
    setTag(new_tag === tag ? undefined : new_tag)
  }
  const StartTagEdit = () => {
    setUserEdit(false)
    setTagEdit(!tagEdit)
    setTabRef.current('feed')
    return null
  }
  const StartUserEdit = () => {
    setTagEdit(false)
    setUserEdit(!userEdit)
    setTabRef.current('feed')
    return null
  }
  const [install, setInstall] = useS(undefined)
  const [tab, setTab, tabbed_display] = useTabbed({
    feed: <div className='column' style={S(`
    width: 100%;
    border-radius: .25em;
    gap: .5em;
    `)}>
      {/* {user ? <div className='post column gap'>
        viewing user @{user} 
      </div> : null} */}
      {tagEdit ? <div className='row wide gap'>#<input type='text' placeholder='enter tag' autoCapitalize='off' style={S(`
      border: 1px solid #ddd;
      border-radius: 1e4em;
      padding: 0 .33em;
      `)} onKeyDown={e => {
        const L = e.currentTarget
        if (e.key === 'Enter') {
          toggleTag(L.value)
          setTagEdit(false)
        }
      }}/></div> : null}
      {userEdit ? <div className='row wide gap'>@<input type='text' placeholder='enter user' autoCapitalize='off' style={S(`
      border: 1px solid #ddd;
      border-radius: 1e4em;
      padding: 0 .33em;
      `)} onKeyDown={e => {
        const L = e.currentTarget
        if (e.key === 'Enter') {
          setUser(L.value)
          setUserEdit(false)
        }
      }}/></div> : null}
      {user ? <InfoLabel labels={[
        `viewing user @${user}`,
        { back: () => setUser(undefined) },
      ]} /> : null}
      {tag ? <InfoLabel labels={[
        `viewing tag #${tag.replaceAll(' ', '_')}`,
        { back: () => setTag(undefined) },
      ]} /> : null}
      {post ? <InfoLabel labels={[
        `viewing post replies`,
        { back: () => setPost(undefined) },
      ]} /> : null}
      {/* {tag ? <PostTags tags={[tag]} toggleTag={toggleTag} /> : null} */}
      {/* <Post user={user} src="/raw/index_cards/2023-11-22-02/a1.m4a" likes={0} tags={['sorry', 'boss']} />
      <Post user={user} src="/raw/index_cards/2023-11-21-02/a1.m4a" likes={3} tags={['kinda hot']} /> */}
      {selected_post ? <>
        <Post key={post.hash} 
        post={selected_post} reply_view
        reload={reload} toggleTag={toggleTag} setUser={setUser} setPost={setPost} />
        <span>{(count => {
          return `${count} repl${count===1?'y':'ies'}`
        })(filtered_posts.length)}</span>
      </> : null}
      {filtered_posts.map(post => <Post key={post.hash} 
        post={post}
        reload={reload} toggleTag={toggleTag} setUser={setUser} setPost={setPost} />)}
      {!filtered_posts.length
      ?
        selected_post
        ? null
        :
          posts
          ? <span>no posts to show</span>
          : <span>loading posts</span>
      : null}
      {selected_post ? <>
        <EditPost {...{ user:viewer, setTabRef, parent:post, reload }} />
      </> : null}
    </div>,
    // 'new post': <span>COMING SOON</span>,
    'new post': <EditPost {...{ user:viewer, setTabRef, reload }} />,
    about: <>
      <div>an audio-based social media</div>
      <div>&nbsp;</div>
      <div>
        install: <InfoBadges labels={[
          install === 'iOS' 
          ? 'iOS' 
          : { 'iOS': () => setInstall('iOS') },
          install === 'Android' 
          ? 'Android' 
          : { 'Android': () => setInstall('Android') },
          // install && { hide: () => setInstall(undefined) },
        ]} />
      </div>
      {install
      ? <div className='post'>
        {install === 'iOS'
        ?
        <span style={S(`display:inline-flex;align-items:center`)}>
          Safari →
          {/* https://www.svgrepo.com/svg/343284/share-alt */}
          <svg width="1.5em" height="1.5em" style={{ margin: '0 .25rem' }}
          viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
            <g fill="none" fillRule="evenodd" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" transform="translate(4 2)">
              <path d="m8.5 2.5-1.978-2-2.022 2"/>
              <path d="m6.5.5v9"/>
              <path d="m3.5 4.5h-1c-1.1045695 0-2 .8954305-2 2v7c0 1.1045695.8954305 2 2 2h8c1.1045695 0 2-.8954305 2-2v-7c0-1.1045695-.8954305-2-2-2h-1"/>
            </g>
          </svg>→ Add to Home Screen
        </span>
        : install === 'Android'
        ?
        <span style={S(`display:inline-flex;align-items:center`)}>
          Chrome →
          {/* https://www.svgrepo.com/svg/345223/three-dots-vertical */}
          <svg width="1em" height="1em" style={{ margin: '0 .25rem' }}
          viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
            <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
          </svg>→ Add to Home Screen
        </span>
        :''}
      </div>
      :''}
      <div>&nbsp;</div>
      <img src='/raw/audio_form/icon.png' style={S(`
      width: 10em;
      `)} />
    </>,
    // 'search tags': <span>coming soon</span>,
    // 'search tags': <InfoSection>
    //   <StartTagEdit />
    //   <input type='text' placeholder='enter tag' onKeyDown={e => {
    //     const L = e.currentTarget
    //     if (e.key === 'Enter') {
    //       toggleTag(L.value)
    //     }
    //   }}/>
    //   <div>
    //     enter a word or phrase to only show posts marked with that tag
    //   </div>
    // </InfoSection>,
    // 'search tags': <StartTagEdit />,
    // 'search users': <StartUserEdit />,
  }, desired_tab || 'feed', { className: 'audio_form-content', labels: [
    'search:',
    {
      tags: () => {
        setUserEdit(false)
        setTagEdit(!tagEdit)
        setTabRef.current('feed')
      },
      label: tagEdit,
    },
    {
      users: () => {
        setTagEdit(false)
        setUserEdit(!userEdit)
        setTabRef.current('feed')
      },
      label: userEdit,
    }
  ] })
  useF(tab, () => setDesiredTab(tab))
  useF(setTab, () => setTabRef.current = setTab)
  useF(viewer, tab, reload, post, handle.load)
  useF(user, tag, selected_post, () => {
    if (user || tag || selected_post) {
      setTagEdit(false)
      setUserEdit(false)
    }
  })
  useF(tab, () => {
    if (!['feed', 'search tags', 'search users'].includes(tab)) {
      setTagEdit(false)
      setUserEdit(false)
    }
  })

  return <Style>
    <InfoBody>
      {tabbed_display}
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
max-width: 40em !important;

.audio_form-content {
  .badges.header {
    font-size: 1em;
  }
}

.post {
  background: #fff;
  border: 1px solid #000;
  padding: .25em;
  border-radius: .25em;
  width: 100%;
}

.tag-list {
  flex-wrap: wrap;
  gap: .25em;
  width: 100%;

  & > * {
    flex-shrink: 0;
  }
  & > input {
    width: 100%;
  }
}
`
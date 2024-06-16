import React, { useState } from 'react';
import { meta } from 'src/lib/meta';
import { CodeBlock, InfoBody, InfoButton, InfoDeviceBlock, InfoSection, InfoStyles, Loader } from '../components/Info';
import api from '../lib/api';
import { asList, asToggle, useCached, useCachedSetter, useE, useEventListener, useF, useM, useR, useRerender, useS, useSkip, useStyle, withRef } from '../lib/hooks';
import { useAuth, usePageSettings } from '../lib/hooks_ext';
import { parseLogicalPath, parseSubdomain } from '../lib/page';
import { convertLinks, svg } from '../lib/render';
import { store } from '../lib/store';
import { JSX, anyFields, apply, consumer, functionOrOther, many, pass, props, transform, truthy } from '../lib/types';
import url from '../lib/url';
import { Q, S, defer, deletion, dev, entries, insecure, keys, list, merge, mobile, named_log, object, pick, range, sample, set, unpick } from '../lib/util';
import styled from 'styled-components';


const log = named_log('spot')

const REFRESH_INTERVAL = 5_000

const client_id = '80b12278f78a4ae590f0b716f5352a9b'
const scope = 'user-read-private user-read-email user-read-playback-state user-modify-playback-state playlist-read-private playlist-read-collaborative user-library-modify user-library-read playlist-modify-private playlist-modify-public'
const redirect_uri = dev ? location.origin + location.pathname.replace('/-', '/') : [
  'https://spot.freshman.dev',
  'https://spot.freshman.dev',
  'https://freshman.dev/spot',
  'https://freshman.dev/spot',
].find(x=>x===(location.origin + location.pathname).replace('/-', '/')) || 'https://spot.freshman.dev'
// log({ client_id, redirect_uri })
// const redirect_uri = location.origin + location.pathname.replace(/^\/-$/, '').replace('/-', '/')

// if (new URL(location.origin + location.pathname).host !== new URL(redirect_uri).host) url.external(redirect_uri)


interface UserProfile {
  country: string
  display_name: string
  email: string
  explicit_content: {
      filter_enabled: boolean,
      filter_locked: boolean
  },
  external_urls: { spotify: string; }
  followers: { href: string; total: number; }
  href: string
  id: string
  images: Image[]
  product: string
  type: string
  uri: string

  player: any
}
interface Image {
  url: string
  height: number
  width: number
}
const spotify = {
  oauth: async () => {
    // from https://developer.spotify.com/documentation/web-api/howtos/web-app-profile
    function generateCodeVerifier(length: number) {
      let text = '';
      let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

      for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      }
      return text;
    }
    async function generateCodeChallenge(codeVerifier: string) {
      const data = new TextEncoder().encode(codeVerifier);
      const digest = await window.crypto.subtle.digest('SHA-256', data);
      return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    }

    const verifier = generateCodeVerifier(128)
    const challenge = await generateCodeChallenge(verifier)
    store.local.set('spot-verifier', verifier)
    
    api.external('https://accounts.spotify.com/authorize', 'OPEN', {
      target: '_self',
      query: {
        client_id,
        response_type: 'code',
        redirect_uri,
        scope,
        code_challenge_method: 'S256',
        code_challenge: challenge,
      },
    })
  },
  grant: (code) => {
    store.local.set('spot-code', code)
    return api.external('https://accounts.spotify.com/api/token', 'POST', {
      form: {
        client_id,
        grant_type: 'authorization_code',
        code,
        redirect_uri,
        code_verifier: store.local.get('spot-verifier'),
      },
    }).then(grant => {
      store.local.set('spot-grant', grant)
      return grant
    })
  },
  refresh: () => {
    const { refresh_token } = store.local.get('spot-grant')
    return api.external('https://accounts.spotify.com/api/token', 'POST', {
      form: {
        client_id,
        grant_type: 'authorization_code',
        refresh_token,
      },
    }).then(grant => {
      store.local.set('spot-grant', grant)
      return grant
    })
  },
  disconnect: () => {
    store.local.set('spot-grant', undefined)
    location.reload()
  },

  request: (path, method='GET', options={}) => {
    const grant = store.local.get('spot-grant')
    return api.external('https://api.spotify.com/v1' + path, method, merge({
      query: { limit: 50 },
    }, options, {
      headers: { Authorization: `Bearer ${grant.access_token}` },
    })).catch(({ error }) => {
      console.error({ error })
      if (error.status === 401) return spotify.refresh().then(() => spotify.request(path, method, options))
    })
  },
  profile: () => spotify.request('/me'),
  state: () => spotify.request('/me/player'),
  // play: (uris=undefined, context_uri=undefined) => {
  //   return uris?.length ? spotify.request('/me/player/play', 'PUT', { query:{uris, context_uri} }) : spotify.first(context_uri)
  // },
  // // queue: (uri=undefined) => spotify.request('/me/player/queue', 'POST', { query:{uri} }),
  // queue: (uri=undefined) => {
  //   return uri.includes(':track:') 
  //   ? spotify.request('/me/player/queue', 'POST', { query:{uri} }) 
  //   : spotify.first(uri).with(log).then(({ uris, context_uri }) => spotify.queue(uris[0]))
  //   // spotify.request('/me/player/queue', 'POST', { query:{uri} })
  // },
  pause: () => spotify.request('/me/player/pause', 'PUT'),
  previous: () => spotify.request('/me/player/previous', 'POST'),
  next: () => spotify.request('/me/player/next', 'POST'),
  volume: (volume_percent:number|undefined=undefined) => 
  volume_percent === undefined 
  ? spotify.state().then(x => x.device.volume_percent) 
  : spotify.request('/me/player/volume', 'PUT', { query: { volume_percent } }).then(x => x.device.volume_percent).catch(e => e),

  _query: ({ type, ...rest }) => ({ ...rest, type:{
    'any': list('track album artist playlist'),
    'list': ['playlist'],
  }[type||'any']||[type] }),
  search: (query) => spotify.request('/search', 'GET', { query:spotify._query(query) }).then(({ tracks, albums, artists, playlists }) => {
    // return {
    //   uris: tracks?.items.length ? tracks.items.map(x => x.uri) : undefined,
    //   context_uri: [albums, artists, playlists].filter(truthy).flatMap(x => x.items).find(x => x.uri),
    // }
    // return [
    //   tracks?.items.length ? tracks.items.map(x => ['track', x]) : undefined,
    //   Object.entries({albums, artists, playlists}).filter(e=>e[1]).flatMap(e => e[1].items.map(x => [e[0], x])),
    // ].flatMap(pass).map(e => [e[0], pick(e[1], 'uri name external_urls')])
    log('search results', { tracks, albums, artists, playlists },
      tracks?.items.length ? tracks.items.map(x => ['track', x]) : undefined,)
    const uris = tracks?.items.length ? tracks.items.map(x => ['track', x]) : undefined
    const contexts = Object.entries({albums, artists, playlists}).filter(e=>e[1]&&e[1].items.length).flatMap(e => e[1].items.map(x => [e[0], x]))
    log(
      Object.fromEntries([uris, contexts].filter(pass).flatMap(pass)
      .map(e => [e[0], pick(e[1], 'uri name external_urls')])
      .map(e => [e[1].uri, unpick(e[1], 'uri')])
      .map(x => [x[0], x[1].name, x[1].external_urls.spotify])
      .map(x => [x[0], x.slice(1)]))
    )
    return Object.fromEntries([uris, contexts].filter(pass).flatMap(pass)
    .map(e => [e[0], pick(e[1], 'uri name external_urls')])
    .map(e => [e[1].uri, unpick(e[1], 'uri')])
    .map(x => [x[0], x[1].name, x[1].external_urls.spotify])
    .map(x => [x[0], x.slice(1)]))
  }),
  // get: (search, type='track') => spotify.search({ q:search, type:[type], limit: 1 }),
  get: (search, type='track') => spotify.search({ q:search, type, limit: 1 }).then((x:any) => {
    // return {
    //   uris: x.filter(e => e[0] === 'track').map(x => x.uri),
    //   context_uri: x.filter(e => e[0] !== 'track').map(x => x.uri),
    // }
    // x = Object.fromEntries(x)
    // return {
    //   uris: x.filter(x => x[0].includes(':track:')).map(x => x[0]),
    //   context_uri: Object.keys(merge(...Object.values(unpick(x, 'tracks')))),
    // }
    // return {
    //   uris: x.filter(x => x[0].includes(':track:')).map(x => x[0]),
    //   context_uri: x.filter(x => !x[0].includes(':track:')).find(x => x[0]),
    // }
    x = Object.entries(x)
    // log('get result', x, x.filter(x => x[0].includes(':track:')).map(x => x[0]), x.filter(x => x && !x[0].includes(':track:'))[0][0])
    log('get result', x)
    log('get result', x, x.filter(x => x[0].includes(':track:')).map(x => x[0]))
    log('get result', x, x.filter(x => x[0].includes(':track:')).map(x => x[0]), x.filter(x => x && !x[0].includes(':track:')).map(x => x[0])[0])
    const result = {
      results: x,
      uris: x.filter(x => x[0].includes(':track:')).map(x => x[0]),
      context_uri: x.filter(x => x && !x[0].includes(':track:')).map(x => x[0])[0],
    }
    return result
  }),
  first: (context) => {
    // it's stupid but it seems to be the only standard way to get the first track uri in a context (album/artist/list)
    return spotify.get(context, 'track').with(log)
  },
  y: (id) => spotify.request('/me/tracks', 'PUT', { json:{ids:[id]} }).with(log.bind(this, '?')),
  n: (id) => spotify.request('/me/tracks', 'DELETE', { json:{ids:[id]} }).with(log.bind(this, '?')),
  '?': (id) => spotify.request('/me/tracks/contains', 'GET', { query:{ids:[id]} }).with(log.bind(this, '?')),

  uris: async (context) => {
    const handler = {
      track: () => ({ items: [{ track:{uri: context} }] }),
      album: (id) => spotify.request(`/albums/${id}/tracks`),
      artist: (id) => spotify.request(`/artists/${id}/top-tracks`),
      playlist: (id) => spotify.request(`/playlists/${id}/tracks`),
    }

    const [_, type, id] = context.split(':')
    return Promise
    .resolve(handler[type](id)).with(result => log({ type, id, context, result }))
    .then(({ items }) => items.map(x => x.uri || x.track.uri)).with(log)
  },
  queue: async ({ uris=undefined, context_uri=undefined }) => {
    if (context_uri && !uris?.length) uris = await spotify.uris(context_uri)
    return Promise.all(uris.map(uri => spotify.request('/me/player/queue', 'POST', { query:{uri} })))
  },
  play: async ({ uris=undefined, context_uri=undefined }={}) => {
    // if (context_uri && !uris?.length) uris = await spotify.uris(context_uri)
    return spotify.request('/me/player/play', 'PUT', { json: uris?.length ? { uris } : { context_uri }  })
  },
}

export default () => {
  const rerender = useRerender()
  const {user} = useAuth()

  const [flip, setFlip] = store.local.use('spot-console-flip', { default:false })
  const [buttons, setButtons] = store.local.use('spot-console-buttons', { default:true })
  const [left, setLeft] = store.local.use('spot-console-left', { default:false })
  // const [image, setImage] = store.local.use('spot-console-image', { default:false })

  const [_id, reloadId] = useCached('/user_id'), id = _id && `spot-${_id}`
  const [sync={}, setSync, reloadSync] = useCachedSetter({
    name: 'spot-sync',
    fetcher: () => id && api.post('/state', { id }),
    setter: (x:{state?:anyFields,update?:anyFields,delete?:{[key:string]:boolean}}) => api.post('/state', {
      // delete:deletion(x.update||{}), 
      ...x, id,
    }).with(x=>log('synced',x)),
  })
  useF(user, reloadId)
  useF(id, reloadSync)
  useF('sync', id, sync, log)
  useF(id, sync, rerender)
  const { clips={}, image=false, image_override={} } = sync
  const setClips = (clips) => setSync({ update:{clips}, delete:{clips:!clips} })
  const setImage = (show=!image) => setSync({ update:{image:show}, delete:{image_override:true} })
  const setImageOverride = (id, override=!image) => setSync({ update:{image_override:{...image_override, [id]:override}}, delete:{[id]:override===undefined} })

  const [theme, setTheme] = store.local.use('spot-theme-color', {
    default: {
      // back: '#8299bb',
      back: '#00ff8a',//'#4f8',
      link: '#00ff8a',//'#8299bb', // '#ffec8e',
      button: '#000e',
      text: '#fff',
      name: '',
    },
    // default: '#8299bb', // '#4f8'
  })
  useM(theme, () => {
    log({...theme})
    Object.keys(theme).map(k => {
      theme[k] = /^#\S\S?$/.test(theme[k]) ? `#`+theme[k][1].repeat(3)+(theme[k][2]||'') : theme[k]
    })
    log({...theme})
  })

  const [connecting, setConnecting] = useState(false)
  const [state, setState] = store.local.use('spot-state')
  // insecure ? useState({
  //   player: {
  //     item: {
  //       name: 'test',
  //       uri: ':track:',
  //       album: { name: 'album', uri: ':album:' },
  //       artists: [{ name: 'artist', uri: ':artist:' }],
  //     }
  //   }
  // }) : 
  const { player, playlists } = state||{}
  const { item } = player||{}
  const { name:track, artists } = item||{}

  usePageSettings({
    title: 'spot',
    expand: true,
    background: image_override[item?.id]??image ? 'transparent' : theme.back, text_color: theme.button,
    popup: `status=no,toolbar=no,menubar=no,location=no,addressbar=no,${!flip && buttons ? `innerHeight=100,innerWidth=800,` : ''}`,
    hideLogin: true,
    uses: {
      'Spotify web api': ['https://developer.spotify.com/documentation/web-api'],
    },
  })
  useF(theme, () => meta.icon.set({
    x256: (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = theme.button
      ctx.fillRect(0, 0, 256, 256)

      ctx.fillStyle = theme.text
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.font = '32px monospace'
      ctx.fillText('(spot)', 0, 32)
    },
  }))

  const load_defer = useR()
  const handle = {
    auth: async (code) => {
      if (!code) return
      await spotify.grant(code)
    },
    load: async () => {
      try {
        // if (insecure) return
  
        const state = await spotify.profile()
        if (state.error) throw state.error
        state.player = await spotify.state()
        state.player.start = state.player.is_playing ? state.player.timestamp - state.player.progress_ms : undefined
        state.player.end = state.player.is_playing ? state.player.start + state.player.item.duration_ms : undefined
        state.playlists = await spotify.request('/me/playlists', 'GET', { query:{ limit:50 } })
        state.tracks = { contains: !state.player.item ? [] : await spotify.request('/me/tracks/contains', 'GET', { query:{ ids:[state.player.item.id] }})}
        log('loaded', { state })
        setState(state)
  
        load_defer.current?.interrupt()
        load_defer.current = defer(handle.load, state.player.is_playing ? state.player.item.duration_ms - state.player.progress_ms : REFRESH_INTERVAL)
  
        return state
      } catch (e) {
        log(e)
        runner('app', 'disconnect')()
      }

      state.player = await spotify.state()
      state.playlists = await spotify.request('/me/playlists')
      log('loaded', { state })
      setState(state)

      load_defer.current?.interrupt()
      load_defer.current = defer(handle.load, state.player.is_playing ? state.player.item.duration_ms - state.player.progress_ms : 30_000)
    },

    rerender: useRerender(),
  }
  useF(async () => {
    const code = new URLSearchParams(location.search).get("code")
    if (code) {
      await handle.auth(code)
      url.silent(parseLogicalPath())
    }
    if (code || state) await handle.load()
  })

  const [debug, toggleDebug] = asToggle(store.local.use('spot-debug'))

  const [history, setHistory, addHistory] = asList(store.local.use('console-spot-history', { default:[] }))
  useF(history, () => {
    const cleaned_history = history.filter((x,i) => x !== 'not a command' || !i)
    if (cleaned_history.length !== history.length) setHistory(cleaned_history)
  })
  const format_results = (results: {[key:string]:[string, string[], string]}, options:{ hide_type?:boolean, numbered?:boolean }={}) => {
    log('format', results)
    const parse_type = result => /:([^:]+):/.exec(result[0])[1]
    const heterogenous = set(Object.entries(results).map(parse_type)).size > 1
    const types = set()
    return Object.entries(results).flatMap(([uri, [name, artists, href]]) => {
      const lines = []
      const type = /:([^:]+):/.exec(uri)[1]
      if (heterogenous && !types.has(type)) lines.push(type)
      types.add(type)
      lines.push(`${heterogenous ? '  ' : `${type}: `}${name} (${'spotify://'+(href||artists/*TODO fix*/)})`)
      // lines.push(`${heterogenous ? '  ' : ''}${name}`)
      return lines
    }).join('\n')
  }
  const format_track = (player=state?.player) => player && (player.is_playing ? 'playing' : 'paused')+': '+format_results({ 
    [player.item.uri]: [
      player.item.name, player.item.artists.map(x => x.name), player.item.external_urls?.spotify
    ] 
  })
  const playlist_names = useM(state?.playlists, () => state?.playlists?.items?.map(x => x.name))
  useF(playlist_names, () => log('playlist names', {playlist_names}))
  const commands = useM(state, history, sync, () => {
    const search_commands = 
      playlist_names 
      && merge(Object.fromEntries(list('track album artist list any').map(x=>[x,{}])), {
      list: {
        commands: Object.fromEntries(playlist_names.map(x=>[x,{}])),
      },
    })
    log({ playlist_names, search_commands })

    return search_commands ? {
      // prev: () => spotify.previous(),
      // toggle: () => (state.player.is_playing ? spotify.pause() : spotify.play()).then(handle.load),
      // ...Object.fromEntries([
      //   // (x => [x, () => spotify[x]().then(handle.load)])(state.player.is_playing ? 'pause' : 'play'),
      //   state.player.is_playing && (x => [x, () => spotify[x]().then(handle.load)])(state.player.is_playing ? 'pause' : 'play'),
      // ].filter(truthy)),
      // next: () => spotify.next(),
      // playlist: {
      //   commands: state.playlists.items.map(x => x.name),
      //   run: (...x) => runner('play', 'playlist', ...x)(),
      // },
      play: {
        commands: merge({
          '': () => state.player.is_playing ? defer() : spotify.play(),
          skip: async (n=1) => {
            for (let i = 0; i < n; i++) await spotify.next()
          },
          pause: () => spotify.pause(),
          back: async (n=1) => { for (let i = 0; i < n; i++) await spotify.previous() },
          toggle: () => (state.player.is_playing ? spotify.pause() : spotify.play()),
        }, search_commands),
        run: (_type=undefined, ..._search) => {
          const base = !search_commands[_type] && commands.play.commands[_type||'']
          if (base) return base(..._search).then(handle.load).then(({ player }) => addHistory([format_track(player)]))

          const type = commands.see.commands[_type] ? _type : ''
          const search = (type ? _search : [_type, ..._search]).join(' ')
          
      //     let promise
      //     if(0)0
      //     else if (!type) promise = spotify.play()
      //     else {
      //       promise = Promise.resolve()
      //       .then(() => spotify.search({ q:search, type, limit:3 }))
      //       // .then(result => setHistory(history.concat([JSON.pretty(result)])))
      //       .then(results => setHistory(history.concat([format_results(results)])))
      //     }
      //     return promise.then(() => handle.rerender())
      //   },
      // },
      // queue: {
      //   commands: search_commands,
      //   run: (_type=undefined, ..._search) => {
      //     if (!_type) return spotify.request('/me/player/queue').with(log).then(({ queue }) => addHistory([format_results(Object.fromEntries(queue.map(x => [x.uri, [x.name, x.external_urls.spotify]])))]))

      //     const type = commands.open.commands[_type] ? _type : ''
      //     const search = (type ? _search : [_type, ..._search]).join(' ')

          return Promise.resolve()
          .then(() => spotify.get(search, type))
          .with(({ results }) => addHistory([format_results(Object.fromEntries(results))]))
          .then(({ uris, context_uri }) => spotify.play({uris, context_uri}))
        },
      },
      seek: {
        commands: {
          '-15': '',
          '+15': '',
          examples: ()=>addHistory(['seek forward 15\nseek +15\nseek +\nseek -1:28\nseek 30']),
        },
        run: async (seek_or_command='+', seek=undefined) => {
          const subcommand = commands.seek.commands[seek_or_command]
          if (subcommand) return subcommand()
          
          seek = seek ? { back:'-', forward: '+' }[seek_or_command]+seek : seek_or_command
          if (list('- +').includes(seek)) seek = seek + '15'
          
          await handle.load()
          const progress_ms = Date.now() - player.start
          const num_seek = commands.clip.ctomspl(seek)[0][1]
          const position_ms = Math.max(0, Math.min('-+'.includes(seek[0]) ? progress_ms + Number(seek[0] + num_seek) : num_seek, item.duration_ms))
          log('seek', {progress_ms, seek, ctomspl: commands.clip.ctomspl(seek), num_seek, position_ms, duration_ms:item.duration_ms})

          addHistory([
            `seek ${seek}: ${commands.clip.dtot(progress_ms)} => ${commands.clip.dtot(position_ms)}`,
          ])
          spotify.request('/me/player/seek', 'PUT', { query:{ position_ms } }).then(handle.load)
        },
      },
      save: {
        commands: {
          '': () => spotify.y(state.player.item.id).then((x) => addHistory(['saved'])),
          un: () => spotify.n(state.player.item.id).then(([saved]) => addHistory(['unsaved'])),
          status: () => spotify['?'](state.player.item.id).then(([saved]) => addHistory([`${state.player.item.name} is ${saved ? '' : 'not '}saved`])),
          list: {
            commands: merge(...list('un status').map(x => ({ [x]: { commands: playlist_names } })), {
              new: (name=`spot-${window['rand'].alphanum(4)}`) => spotify
              .request(`/users/${state.user}/playlists`, 'POST', {json:{name},public:false})
              .with(handle.load)
              .then(list => runner('save', ...list(`list ${list.name}`))()),
              ...object(playlist_names),
            }),
            run: async (y_n, ..._name) => {
              if (!commands.save.commands.list.commands[y_n]) {
                _name.unshift(y_n)
                y_n = ''
              }
              const playlist_name = _name.join(' ')
              const list = playlists.items.find(x => x.name === playlist_name)
              if (!list) return addHistory([`couldn't find ${playlist_name}`])
              const [method, options, print] = {
                '': ['POST', {json:{uris:[item.uri]}}, x => `added to ${list.name}`],
                'n': ['DELETE', {json:{tracks:[item]}}, x => `removed from ${list.name}`],
                'status': ['GET', {}, x => `${item.name} is ${x.items.find(y=>y.id===item.id) ? '' : 'not '}in ${list.name}`],
              }[y_n] as [string,any,consumer<any>]
              const result = await spotify.request(`/playlists/${list.id}/tracks`, method as string, options)
              log('saved', result)
              addHistory([print(result)])
            },
          },
          examples: () => Promise.resolve(addHistory([`save\nsave list new something something`])),
        },
        run: (command, ...x) => runner(commands.save.commands[command || ''], ...x)().then(handle.load),
      },
      clip: {
        dtot: (ms) => {
          if (ms === undefined) return ''
          const s = Math.ceil(ms / 1_000)
          return [s/(60*60), s/(60), s].slice(Math.min(-2, -1 - Math.floor(Math.log(s||1)/Math.log(60)))).map((x,i) => Math.floor(x%60).toString().padStart(i?2:0, '0')).join(':')
        },
        mspltoc: (mspl) => {
          return mspl.map(pair => pair.map(commands.clip.dtot).join('-')).join(',')
        },
        ctomspl: (clip) => {
          return clip.split(',').map(pair => {
            const [end, start=undefined] = pair.split('-').reverse().map((x,i)=>{
              if (!x) return undefined
              const [s,m,h] = ('0:0:'+x).split(':').reverse().map(Number)
              return ((((h * 60) + m) * 60) + s) * 1_000
            })
            return [start, end]
          })
        },
        clipped: (track) => {
          console.debug(clips)
          return clips[track] && clips[track] !== '-'
        },
        status: () => {
          const track = state.player.item.name
          if (commands.clip.clipped(track)) addHistory([`clipped: ${clips[track]}`])
        },
        list: () => {
          return Object.entries(clips).map(([track, clips], i, a) => `${String(i+1).padStart(String(a.length).length)} ${track} ${clips}`)
        },
        commands: {
          artist: (artist=artists[0].name, clip='-0')=>{
            clip = clip==='-'?undefined:commands.clip.mspltoc(commands.clip.ctomspl(clip))
            setClips({ ['artist:'+artist]:clip })
            addHistory([`${artist} ${clip}`])
          },
          list: ()=>addHistory([commands.clip.list().join('\n')]),
          clear: ()=>setClips(undefined),
          examples: ()=>addHistory(['clip -3:33\nclip 1:28-\nclip 0:30-1:30\nclip -1:00,2:00-\nclip -2:00,1:00-\nclip -0\nclip -']),
        },
        run: async (clip_or_command_or_track=undefined, clip=undefined, ...x) => {
          const subcommand = commands.clip.commands[clip_or_command_or_track]
          if (subcommand) return subcommand()

          const current_item = state.player.item
          let track = clip_or_command_or_track
          if (!clip) {
            clip = clip_or_command_or_track
            track = current_item.name
          }
          track = Object.keys(clips)[track - 1 /* naughty type coercion */] || track
          log('clip', {clip,track})
          if (clip) {
            // const ranges = commands.clip.ctospl(clip)
            clip = clip==='-'?undefined:commands.clip.mspltoc(commands.clip.ctomspl(clip))
            setClips({ [track]:clip })
          } else {
            clip = clips[track]
          }
          addHistory([`${track} ${commands.clip.dtot(Date.now()-state.player.start)}${clip ? ` / ${clip.split(',').map((x,i)=>i===clipped?`[${x}]`:x).join(',')}`:''} / ${commands.clip.dtot(current_item.duration_ms)}`])
        },
      },
      // see: {
      //   commands: search_commands,
      //   run: (_type=undefined, ..._search) => {
      //     if (!_type) return runner('play')()
      //     const type = commands.see.commands[_type] ? _type : ''
      //     const search = (type ? _search : [_type, ..._search]).join(' ')

      // //     const type = commands.play.commands[_type] ? _type : ''
      // //     const search = (type ? _search : [_type, ..._search]).join(' ')

      //     if (!search.length) return Promise.resolve(addHistory(['specify ' + type]))

      //     return Promise.resolve()
      //     .then(() => spotify.search({ q:search, type, limit:3 }))
      //     // .then(result => setHistory(history.concat([JSON.pretty(result)])))
      //     .then(results => addHistory([format_results(results)]))
      //   },
      // },
      queue: {
        commands: merge(search_commands, {
          // flush: {},
          // remove: search_commands,
        }),
        run: (_type=undefined, ..._search) => {
          if (!_type) return (
            spotify
            .request('/me/player/queue').with(log)
            .then(({ queue }) => addHistory([
              format_results(
                Object.fromEntries(queue.map(x => [x.uri, [x.name, x.artists?.map(y=>y.name), x.external_urls?.spotify]])),
                {
                  hide_type: true,
                  numbered: true,
                })
            ]))
          )

          const type = commands.open.commands[_type] ? _type : ''
          const search = (type ? _search : [_type, ..._search]).join(' ')

          if (!search.length) return Promise.resolve(addHistory(['specify ' + type]))

          let promise
          if(0)0
          else {
            let results, uri, index
            promise = Promise.resolve()
            .then(() => spotify.get(search, type))
            // .with(log)
            .with(({ results:_results }) => results = _results)
            .with(({ uris, context_uri }) => {
              uri = uris?.length ? uris[0] : context_uri
              // log(uri)
            })
            .with(log)
            // .with(() =>  addHistory([format_results(Object.fromEntries(results.filter(x => x[0] === uri)))]))
            .then(({ uris, context_uri }) => spotify.queue({ context_uri: uri }))
            .with(response => {
              log('queued', response)
              // uri = new URL(response.url).searchParams.get('uri')
              // spotify.play(response.uris, response.context_uri)
            })
            // .then(log)
            .then(() => spotify.request('/me/player/queue'))
            .then(({ queue }) => index = queue.findIndex(x => x.uri === uri))
            // .with(log)
            .then(() => {
              // log(results.filter(x => x[0] === uri))
              addHistory([
                `=> #${index + 1} in queue`,
                format_results(Object.fromEntries(results.filter(x => x[0] === uri))),
              ])
            })
          }
          return promise.then(() => handle.rerender())
        },
      },
      open: {
        commands: merge({
          spotify:{},
        }, search_commands),
        run: async (_type='spotify', ..._search) => {
          let href

          const type = commands.open.commands[_type] ? _type : ''
          const search = (type ? _search : [_type, ..._search]).join(' ')

          log('open', { type, search })
          if (type && !search.length) {
            if(0)0
            else if (type === 'spotify') href = state.external_urls.spotify
            else if (type === 'track') href = state.player.item.external_urls.spotify
            else if (type === 'album') href = state.player.item.album.external_urls.spotify
            else if (type === 'artist') href = state.player.item.artists[0].external_urls.spotify
            else if (type === 'playlist') href = state.player.context.external_urls.spotify
          } else {
            const { results, uris, context_uri } = await spotify.get(search, type || 'any')
            const uri = uris ? uris[0] : context_uri
            if (uri) href = results.find(x => x[0] === uri)[1][1]
            else href = state.external_urls.spotify
          }
          url.external('spotify://'+href)
        },
      },
      volume: {
        commands: Object.fromEntries(range(11).map(i => [i, {}])),
        run: (volume_tenth_percent:undefined|string=undefined) => {
          const expected = volume_tenth_percent && (
            volume_tenth_percent?.endsWith('%') 
            ? Number(volume_tenth_percent.slice(0, -1)) 
            : Number(volume_tenth_percent) * 10
          )

          return spotify
          .volume(expected)
          .then(handle.load)
          .then(state => addHistory([
            expected !== undefined && expected !== Number(state.player.device.volume_percent) ? `couldn't change volume` : undefined,
            `volume ${Math.ceil(state.player.device.volume_percent / 10)} (${state.player.device.volume_percent}%)`,
          ].filter(truthy)))
        },
      },
      app: {
        commands: {
          // '': () => addHistory([`smolify @ ${location.origin + (parseSubdomain()==='spot'?'':'/spot')}`]),
          '': () => addHistory([`you're running /spot @ ${location.host}`]),
          buttons: () => setButtons(!buttons),
          flip: () => setFlip(!flip),
          ...(mobile ? {
            left: () => setLeft(!left),
          } : {}),
          image: {
            commands: object('. list'),
            run: (id='') => {
              if(0){}
              else if (id === 'list') {
                addHistory([`app image ${image}`, ...entries(image_override).map(e => `app image ${e[0]} ${e[1]}`)])
              }
              else if (id) {
                id = id === '.' ? item.id : id
                setImageOverride(id, !(image_override[id]??image))
              }
              else {
                setImage(!image)
              }
            },
          },
          theme: {
            ...((examples, user=[]) => {
              const commands = Object.fromEntries([]
                .concat(
                  list('default list example random'),
                  Array.from(new Set([].concat(examples, user))).map(x => x.split(' ')[4]).filter(truthy))
                .map(x => [x,undefined]))
              log('theme', {commands})
              return { examples, user, commands }
            })([
              'white gold black magenta',
              'black pink gold pink',
              'blue red green yellow',
              '#c2f197 #1ac67d #f45d69 #aa1b78', // produced with `app theme random`!
              '#27684c #9cc392 #f26195 #53a3b3',
              '#fff magenta cyan #b300ff',
              // 'gold gold #342b07 gold banana',
              '#a #b #b #4 grayscale',
              '#f27e4f #b54d48 #7054fe #18e30a',
              '#1f2f3e #63bebd #474883 #df29e9',
            ], store.local.get('spot-themes')),
            run: (back=theme.back, link=theme.link, button=theme.button, text=theme.text, name='') => {
              ;[back, link, button, text] = [back, link, button, text].map(x => 
                (/^#((\S{3})|((\S\S){3}))$/.test(x) && set(x.slice(1),'').size === 1) ? '#'+x[1] :
                (/^#((\S{4})|((\S\S){4}))$/.test(x) && set(x.slice(1,1+(x.length-1)/3*2),'').size === 1 && set(x.slice(1+(x.length-1)/3*2),'').size === 1) ? '#'+x[1]+x.slice(-1)[0] :
                x)
              log('theme', {back,link,button,text,name})

              const themes = commands.app.commands.theme.user
              const and_defaults = [].concat(commands.app.commands.theme.examples, themes)
              const named = themes.find(x => x.split(' ')[4] === back)
              if (back === 'default') setTheme(undefined)
              else if (back === 'example') runner('app', 'theme', ...list(sample(and_defaults)))()
              else if (back === 'random') runner('app', 'theme', ...range(4).map(() => '#'+(n => Math.floor(Math.random() * Math.pow(16, n)).toString(16).padStart(n, '0'))(6)))()
              else if (back === 'list') addHistory([and_defaults.join('\n')])
              else {
                if (named) ([ back, link, button, text ] = list(named))
                setTheme({ back, link, button, text })
                const theme_string = `${back} ${link} ${button} ${text}`
                addHistory([`app theme ${theme_string}`])
                if (name) {
                  store.local.set('spot-themes', themes.filter(x => x.split(' ').slice(0, 4).join(' ') !== theme_string && x.split(' ').slice(4)[0] !== name).concat(theme_string+' '+name))
                }
              }
            },
          },
          disconnect: () => {
            setState(undefined)
          },
          debug: () => toggleDebug(),
        },
        run: (attr, ...x) => {
          runner(commands.app.commands[attr||''], ...x)()
        }
      },
      skip: (...x) => commands.play.run('skip', ...x),
      back: (...x) => commands.play.run('back', ...x),
    } : connecting ? {
      reload: () => {
        setConnecting(false)
        handle.load()
      },
    } : {
      connect: () => {
        setConnecting(true)
        spotify.oauth()
      },
    }
  })
  const letter = (command) => ({
    // coMmand: 'm',
    seek: 'k',
    save: 'v',
    volume: 'l',
    clear: 'e',
  }[command] || command[0])
  const runner = (command, ...args) => () => (x => x?.run || x)(typeof command === 'string' ? commands[Object.keys(commands).find(y => command === y || command === letter(y))] : command)(...args)

  // TRACK CLIPPING
  const [clipped, setClipped] = useS(0)
  useF(track, clips, () => setClipped())
  const re_clip = useRerender()
  useF(track, clips, clipped, re_clip, async () => {
    const ms_pair_list = clips[track] ? commands.clip?.ctomspl(clips[track] || artists.map(x=>clips['artist:'+x.name]).find(truthy))?.slice(clipped) : undefined
    log('clip?', {track,clipped,ms_pair_list})
    if (!track || !ms_pair_list?.length) return

    // const {player} = await handle.load()
    const [start, end] = ms_pair_list[0]
    const progress_ms = Date.now()-player.start
    log('clip active', {start,end,ms:progress_ms})
    let did_clip = false
    if (end < progress_ms) {
      if (ms_pair_list.length > 1) setClipped(clipped + 1)
      else spotify.next().then(handle.load)
      did_clip = true
    }
    else if (start > progress_ms) {
      await spotify.request('/me/player/seek', 'PUT', { query:{ position_ms:start } }).then(handle.load)
      did_clip = true
    }
    else {
      defer(re_clip, end - progress_ms)
    }
    if (did_clip) {
      addHistory([
        `seek: ${commands.clip.mspltoc([ms_pair_list[0]])} => ${ms_pair_list[1] ? commands.clip.mspltoc([ms_pair_list[1]]) : 'next'}`,
        format_track(),
      ])
      addHistory([''])
    }
  })


  const spotify_href = (item) => <a href={'spotify://'+item.external_urls?.spotify}>{item.name}↗</a>
  const spotify_item = (item) => <InfoButton inline key={item.href}>{spotify_href(item)}</InfoButton>
  // const spotify_item = (item) => <InfoButton inline key={item.href}><A frame href={item.external_urls.spotify}>{item.name}</A></InfoButton> // Spotify doesn't allow embedding
  const control = (command, label) => {
    const [action, ...args] = list(command)
    const handler = () => {
      console.debug('control', command)
      runner(action, args)().then(handle.load)
    }
    return <button className='control' onClick={handler}>{label}</button>
  }
  // const control = ([...command], label) => label

  useE(() => meta.viewport.set('width=device-width,initial-scale=1,maximum-scale=1'))

  // TODO minimal playlist UI, if any
  // const [selectedPlaylist, setSelectedPlaylist] = useState<string>(undefined)
  // useF(state?.player?.context, () => setSelectedPlaylist(undefined))
  // const [selected_context, setSelectedContext] = useState(undefined)
  // useF(state?.player?.context, () => {

  // })
  const main_control_element =
  <div id='controls-playlist' className='flex-column center' onClick={e=>e.stopPropagation()}>
    <InfoButton id='controls'>
      {control('play back', svg(<path d='M 0 .5  L 1 1  L 1 0  L 0 .5' />))}
      {control('play toggle', svg(<circle cx={.5} cy={.5} r={.5} />))}
      {control('play skip', svg(<path d='M 1 .5  L 0 1  L 0 0  L 1 .5' />))}
    </InfoButton>
    {/* <Select id='playlist' className='action' name={flip ? 'list' : 'select playlist'} value={selectedPlaylist} options={playlist_names} setter={value => {
      setSelectedPlaylist(value)
      const context_uri = state.playlists.items.find(x => x.name === value).uri
      console.debug(value, context_uri)
      spotify.uris(context_uri).with(log).then(({ uris }) => spotify.play({ uris, context_uri })).with(log).then(handle.load)
    }} /> */}
  </div>

  const console_markers = useM(state, sync, () => !state ? null : (() => {
    const markers = []
    if (state?.tracks?.contains[0]) markers.push(<span style={{color:'var(--base)'}}>(✓)</span>)
    if (commands.clip?.clipped(track)) markers.push(<span style={{color:'var(--base)'}}>({clips[track]})</span>)
    return markers.length ? markers : '/'
  })())
  useF('markers', console_markers, log)
  const console_app_name = useM(console_markers, () => null&&<>{console_markers === '/' ? <span>(spot)</span> : null}</>)
  useF('app_name', console_markers, log)
  const console_track_info = useM(state?.player?.item, console_app_name, () => <>
  {state?.player?.item ? [
    state.player.item, state.player.item.album, ...state.player.item.artists
  ].map(spotify_href).map((x,i)=> <>
    {i ? [(i===2?'/':null),x] : [x,console_markers]}
  </>) : null}
</>)
  useF('track_info', console_track_info, log)
  const console_label = buttons ? null : <div style={S(`display:flex;gap:.33em`)}>{console_app_name}{console_track_info}</div>
  useF('label', console_label, log)
  useF(() => buttons && setHistory([]))
  const console_control:any = useM(() => ({}))
  const console_element = <>
    {/* <Console id='console' {...{ simple:!mobile&&buttons, control:console_control, label:console_label, commands, history, setHistory }} /> */}
    <Console id='console' simple={!mobile&&buttons&&flip} control={console_control} label={console_label} commands={commands} letter={letter} history={history} setHistory={setHistory} />
  </>
  useF('console', console_label, log)
  // useF(sync, () => console_control.rerender())

  const detail_element = !buttons || !state?.player ? null :
  <div id='details' onClickCapture={pass}>
    {state.player.item
    ? <div className='group'>{spotify_item(state.player.item)}{spotify_item(state.player.item.album)}/{state.player.item.artists.map(spotify_item)}</div> 
    : <div>{spotify_item({ name: 'open Spotify', ...state })}</div>}
    {/* <div>{spotify_item(state)}</div> */}
    {/* <div><InfoButton inline onClick={runner('disconnect')}>disconnect {state.display_name}</InfoButton></div> */}
    {/* <InfoButton onClick={handle.disconnect}>disconnect {state.display_name}</InfoButton> */}
    {/* {flip ? console_element : <div><InfoButton inline className='alt' onClick={runner('app', 'disconnect')}>disconnect {state.display_name}</InfoButton></div>} */}
    {flip || mobile ? null : <div className='group'><InfoButton inline className='alt small' onClick={runner('app', 'disconnect')}>disconnect {state.display_name}</InfoButton></div>}
  </div>

  const connect_element = 
  <InfoButton style={S(`
  ${mobile ? 'font-size: 5vw;' : ''}
  `)} onClick={runner(connecting ? 'reload' : 'connect')}>{connecting ? 'reload' : 'connect'}</InfoButton>

  ;[
    useEventListener.bind(this, window, 'focus'),
    useF.bind(this),
  ].map(f => f(() => console_control?.focus?.call(true)))

  useStyle(`
  :root {
    --spot-back: ${theme.back};
    --spot-link: ${theme.link};
    --spot-button: ${theme.button};
    --spot-text: ${theme.text};
  }
  // #header * {
  //   color: var(--spot-button) !important;
  // }
  // #header .expand-true.dropdown-container *, #header#header .dropdown, #header .dropdown * {
  //   background: var(--spot-button) !important;
  //   color: var(--spot-text) !important;
  //   border: 0;
  // }
  // #header#header .dropdown hr {
  //   border-bottom: 1px solid currentcolor;
  // }
  `)
  useStyle(flip, flip ? `
  #player {
    align-items: start !important;
    flex-direction: column;
  }
  #player > .flex-row {
    width: 100%;
  }
  #lower {
    width: 100%;
    display: flex;
    flex-direction: row;
  }
  #controls {
    flex-direction: column;
    padding: 0 1em !important;
  }
  #console {
    margin: 0;
    flex-grow: 1;
  }
  #details {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: .5em;
  }
  ` : '')
  useStyle(image, image_override, item, theme, image_override[item?.id]??image ? `
  // #header, #main, #header * {
  //   background: #0000 !important;
  //   color: var(--spot-button) !important;
  // }
  #header, #main, #main .info {background:none!important}
  #header#header#header#header#header#header :is(.dropdown, .dropdown *) {
    background: var(--spot-button) !important;
    color: var(--spot-text) !important;
    &.dropdown {
      border: 0;
    }
  }
  #inner-index, .expand-true #main {
    background: url("${(x=>x?.player?.item?.album?.images?.slice(0,1)[0].url)(state)}") !important;
    background-repeat: repeat !important;
    background-size: 10px !important;
    background-color: var(--spot-back) !important;

    background-size: cover !important;
    background-position: center !important;
  }
  ` : '')
  useStyle(left, mobile && left ? `
  #player {
    #controls-playlist {
      right: unset !important;
      left: 0.33em !important;
    }
  }
  ` : '')
  useF(() => console_control.focus())

  return <InfoDeviceBlock devices={['mobile']}><Style id='spot'>
    <InfoBody onClick={e => {
      if (e.target===e.currentTarget) console_control.focus()
    }}>
      <InfoSection id='player'>
        {!state ? <>
          {connect_element}
          {console_element}
        </> : mobile ? <>
          {console_element}
          {detail_element}
          <div style={{flexGrow:1}} />
          {main_control_element}
        </> : !flip ? <>
          <div className='flex-row'>
            {main_control_element}
            {detail_element}
            <div style={{flexGrow:1}} />
          </div>
          {console_element}
        </> : <>
          {detail_element}
          <div className='flex-row'>
            {main_control_element}
            {console_element}
          </div>
        </>}
      </InfoSection>
      {dev && debug ? <CodeBlock>{JSON.pretty(state?.player || {})}</CodeBlock> : ''}
    </InfoBody>
  </Style></InfoDeviceBlock>
}

const Console = withRef(({ simple, label, history, setHistory, commands:_commands, letter, control, ...props }: props & { simple, label, history:(string|{input:string})[], setHistory, commands: { [key:string]: functionOrOther<many<any>, { commands:any, run:many<any> }> }, letter:transform<string,string> }) => {
  const [history_index, setHistoryIndex] = useState(-1)
  const [history_start, setHistoryStart] = store.local.use('console-spot-history-start', { default:0 })
  const [input, setInput] = store.local.use('console-spot-input', { default:'' })
  const [wait, setWait] = useState(false)
  const [completed, setCompleted] = useState<string>(undefined)
  const [options, setOptions] = useState([])
  const ref = useR()

  useF('completed', completed, log)
  useF(history, () => setHistoryIndex(-1))

  useF(_commands, () => {
    if (_commands.connect && history.length) {
      setHistory([])
      setHistoryStart(0)
    }
  })
  const commands = useM(_commands, completed, history, () => Object.assign(_commands, !history.slice(history_start).length || _commands.connect ? {} : {
    clear: {
      commands: {},
      run: () => setHistoryStart(history.length),
    },
  }, _commands))
  const runner = (command, ...args) => () => (x => x.run || x)(typeof command === 'string' ? commands[command] : command)(...args)

  const handle = {
    focus: (force=false) => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect()
        if (force || rect.y + rect.height/2 < window.innerHeight) ref.current.focus()
      }
    },
    options: (value) => {
      // determine commands
      const parts = value.split(' ')
      const resolve = command => command ? Object.entries(command.commands || {}).map(e => [e[0], resolve(e[1])]) : []
      let options = resolve({ commands })
      while (parts.length > 1) {
        const part = parts.shift()
        options = options.filter(x => x[0] === part || letter(x[0]) === part).flatMap(x => typeof(x[1]) === 'string' ? Object.fromEntries(list(x[1]).map(x=>[x,{}])) : x[1])
        // i += 1
      }
      options = options.filter(x => x[0] && (x[0].startsWith(parts[0]) || letter(x[0]) === parts[0])).map(x => x[0])
      // setOptions(options)
      return options
    },
    input: (value) => {
      console.debug(value)
      setCompleted(undefined)
      setInput(value)
      setOptions(handle.options(value))
      handle.focus()
    },
    complete: (option=undefined) => {
      const to_complete = completed ?? ref.current.value
      log({ to_complete })
      const options = handle.options(to_complete)
      const suffix = ref.current.value.split(' ').slice(-1)[0]
      log({ options, suffix, option, completed })
      if (!option) option = completed !== undefined ? options[(options.indexOf(suffix) + 1) % options.length] : options[0]
      setInput(to_complete.split(' ').slice(0, -1).concat([option]).join(' '))
      setOptions(options)
      if (!completed) setCompleted(to_complete)
    },
    run: async (_input=input) => {
      setInput('')
      setOptions([])
      for (let anded of _input.split(';').filter(truthy).map(x => x.trim())) {
        let individual_commands = []
        for (let input of anded.split('&&').filter(truthy).map(x => x.trim())) {
          const parts = input.split(' ').map((x,i) => i || commands[x] ? x : Object.keys(commands).find(y => letter(y) === x) || x)
          // const command = commands[parts[0]]
          individual_commands.push([parts.join(' '), runner(parts[0], ...parts.slice(1))])
        }

        if (individual_commands.length) {
          try {
            setHistory(history.concat([{ input:individual_commands.map(x=>x[0]).join(' && ') }]))
            setWait(true)
            for (let [_, runner] of individual_commands) {
              log(runner)
              await Promise.resolve(runner()).then(() => {
                setWait(false)
                ref.current && handle.input(ref.current.value)
              })
            }
          } catch (e) {
            setHistory(history.concat(`error running ${input}`))
            break
          }
        }
        else {
          setHistory(history.concat(`${input} not a command`))
          break
        }
      }
      setWait(false)
    },
  }
  // useF(commands, input, history, () => handle.input(input))
  // useF(() => handle.input(input))
  // useF(commands, input, () => setOptions(handle.options(input)))

  useF(() => {
    window['run'] = handle.run
    console.debug(`
    CONSOLE CONTROLS
    run(<cmd>)
    `)
  })

  const console_options = options.filter(x => !input?.endsWith(x)).map(x => <a key={x} style={S(`
  cursor: pointer;
  `)}
  onClick={e => input?.endsWith(x) ? handle.run() : handle.complete(x)}
  onContextMenu={e => {
    e.preventDefault()
    handle.input(input.split(' ').slice(0, -1).join(' '))
  }}
  dangerouslySetInnerHTML={{ __html:input.split(' ').length > 1 ? x.includes(' ')?'"'+x+'"':x : x.replace(letter(x), `<b><u>${letter(x)}</u></b>`) }}
  ></a>).concat([input && <a style={S(`
  cursor: pointer;
  `)}
  onClick={e => handle.input(input.trim().split(' ').slice(0, -1).join(' '))}
  >x</a>, input?.endsWith(' ') && <a style={S(`
  cursor: pointer;
  `)}
  onClick={e => handle.run()}
  >run</a>].filter(pass))

  Object.assign(control, {
    focus: () => handle.focus(),
    rerender: useRerender(),
  })
  useF('console label', label, log)

  // reorder history so outputs come after input
  // reverse = [output, output, input, output, input, input, output, input]
  // => [input, 1, 0, input, 0, input, input, 0]
  const input_outputs = useM(history, () => {
    let value = []
    for (let i = history.length - 1, outputs = []; i >= history_start; i--) {
      outputs.unshift(history[i])
      if (outputs[0].input) {
        value.push(...outputs.splice(0, outputs.length))
        if (simple) break
      }
    }
    return value
  })

  return (
    <CodeBlock {...props} className='console' copy={false} onClick={() => handle.focus(true)}>
      {label}
      <div style={S(`
      width: 100%;
      display: flex;
      `)}>
        {'> '}<input ref={ref} value={input}
        autoCapitalize='off'
        onChange={e => handle.input(ref.current.value)}
        onKeyDown={e => (x => x ? [() => e.preventDefault(), x].map(apply) : 0)({ 
          'Tab': handle.complete,
          'Enter': handle.run,
          'ArrowDown': () => {
            let new_history_index = history_index
            while (new_history_index < history.length - 1) {
              new_history_index += 1
              const entry = history[history.length - 1 - new_history_index]
              if (typeof entry !== 'string' && entry.input !== input) {
                setInput(entry.input)
                setHistoryIndex(new_history_index)
                return
              }
            }
          },
          'ArrowUp': () => {
            let new_history_index = history_index
            while (new_history_index > -1) {
              new_history_index -= 1
              const entry = history[history.length - 1 - new_history_index]
              if (typeof entry !== 'string' && entry?.input !== input) {
                setInput(entry?.input)
                setHistoryIndex(new_history_index)
                return
              }
            }
          },
        }[e.key])}
        style={S(`
        font-size: 1em; width: 0; flex-grow: 1;
        border: 0; background: none; outline: 0; color: inherit; padding: 0; resize: none;
        `)}/>
      </div>
      <div className='group'>
        {console_options}
      </div>

      {/* <div>{wait ? <Loader /> : ''}</div> */}
      {/* {convertLinks(history.slice(simple ? history.slice(0, -1).findLastIndex(x => x.input, -1) + 1 : history_start).reverse().map((x, i, arr) => typeof x === 'string' ? x : ((!i ? !wait : typeof arr[i-1] === 'string') ? '\n' : '')+'> '+x.input).join('\n'))} */}
      {/* {convertLinks(history.slice(simple ? history.length - 3 - history.slice(0, -1).reverse().map(x => !!x.input).indexOf(true) : history_start).reverse().map((x, i, arr) => typeof x === 'string' ? x : ((!i ? !wait : typeof arr[i-1] === 'string') ? '\n' : '')+'> '+x.input).join('\n'))} */}
      {input_outputs
      // .slice(simple 
      //   ? history.length - 3 - history.slice(0, -1).reverse().map(x => !!x.input).indexOf(true)
      //   : history_start)
      // .reverse()
      .map((x, i, arr) => typeof x === 'string' 
        ? convertLinks(x+'\n')
        : <div>
          {'\n'}
          {/* {(!i ? !wait : typeof arr[i-1] === 'string') ? '\n' : ''} */}
          {wait&&!i?<Loader />:<span><a onClick={e => {
            handle.input(x.input)
            defer(() => handle.run(x.input), 100)
          }}>{'>'}</a>&nbsp;</span>}
          {/* <Loader /> */}
          {x.input}
        </div>)}
    </CodeBlock>
  )
})

const Style = styled(InfoStyles)`
&#spot#spot#spot {
  color: var(--spot-button);
  max-width: unset !important;
  *::-webkit-scrollbar {
    display: none;
  }
  * {
    -webkit-tap-highlight-color: #0000;
  }

  .flex-column, .flex-row {
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    gap: .5em;
    flex-grow: 1;

    &.center {
      align-items: center;
    }
  }
  .flex-column {
    flex-direction: column;
    height: -webkit-fill-available;
  }
  .flex-row {
    flex-direction: row;
  }

  .section {
    white-space: pre-line;
    line-height: 2;
    
    display: flex;
    flex-direction: column;
    gap: .125em;
    br { display: none; }
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  .group {
    display: flex;
    flex-direction: row;
    gap: .33em;
  }

  #player {
    width: 100%;
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    gap: .33em;

    * {
      white-space: pre;
    }
    > * {
      // display: flex;
      // flex-direction: column;
      gap: .33em;
    }

    button {
      margin: 0;
    }
    .action {
      font-size: .8em;
      border-radius: 2em;
      background: #000e;
      color: #fff;
      background: var(--spot-button) !important;
      color: var(--spot-text) !important;

      padding: .5em;
      a {
        color: inherit !important;
      }    
    }
    .alt {
      color: #000e;
      border: 1px solid currentColor;
      background: none !important;
      color: var(--spot-button) !important;
    }
    .small {
      font-size: .67em;
    }
    // .group {
    //   gap: .25em;
    // }

    #controls-playlist {
      gap: .125em;
      z-index: 1;
    }
    
    #controls {
      width: max-content;
      padding: .25em 0;
      margin: 0;
      display: flex !important; align-items: center; justify-content: center; gap: 1em;
      border-radius: 10em;
    
      .control {
        font-size: 3em;
        font-size: 3.175em;
        margin: 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        position: relative; top: -.125em; filter: drop-shadow(0 .125em #fff8);
        &:active {
          top: 0;
          filter: none;
        }
    
        border: 0;
        background: none;
        svg {
          font-size: 1em !important;
          fill: #fff;

          fill: var(--spot-text);
        }
      }
    }

    #details {
      display: flex;
      flex-direction: column;
      gap: .167em;
      font-size: .9em;
      
      gap: .25em;
    }
  }

  .console {
    flex-shrink: 1;
    line-height: normal;
    * {
      white-space: pre !important;
    }
    .group {
      gap: .5em;
    }

    a {
      color: #ffec8e;
      color: var(--spot-link) !important;
    }

    .code-container {
      font-size: 1em;
    }

    .code input {
      border: none !important;
    }
  }

  .loader {
    @keyframes loader { to { transform: rotate(360deg) } }
    display: inline-block;
    box-sizing: border-box;
    width: 1em; height: 1em;
    border: .15em solid transparent;
    border-radius: 50%;
    border-left-color: currentcolor;
    animation: loader 3s infinite linear;
    display: inline-flex;
    align-items: center; justify-content: center;
    box-sizing: border-box;
    position: relative; top: .075em;

    &::before {
      display: none;
    }

    margin-right: .5em;
  }

  ${mobile ? `
  font-size: 14px;

  .flex-row, .flex-column {
    align-items: center;
  }
  .flex-row {
    justify-content: center;
  }

  height: 100%;
  #player {
    position: absolute; top: 0; left: 0; width: 100%; height: 70%; padding: 1em;

    display: flex; flex-direction: column-reverse; align-items: center; justify-content: center;
    #controls-playlist {
      position: absolute; top: 55%; right: 0.33em;
      font-size: 7vw;
    }
    #details {
      position: absolute; top: 30%; left: 0; width: 100%; height: 100%; margin: 1em;
      flex-wrap: wrap;
    }
  }
  #console {
    // display: none;
    flex-grow: 0;
    height: 30%;
    opacity: 1;
    position: absolute; top: 0; left: 0; margin: 1em; width: calc(100% - 2em);
  }
}
` : ''}

// const Style = styled(InfoStyles)`
// max-width: unset !important;
// *::-webkit-scrollbar {
//   display: none;
// }

// .section {
//   white-space: pre-line;
//   line-height: 2;
  
//   display: flex;
//   flex-direction: column;
//   gap: .25em;
//   br { display: none; }
// }

// a {
//   color: inherit;
//   text-decoration: none;
// }

// .group {
//   display: flex;
//   flex-direction: row;
//   gap: .5em;
// }

// #player {
//   display: inline-flex;
//   flex-direction: row;
//   align-items: center;
//   gap: .5em;

//   * {
//     white-space: pre;
//   }

//   button {
//     margin: 0;
//   }
//   button.action {
//     font-size: .8em;
//     border-radius: 2em;
//     background: #000;
//     color: #fff;
//     padding: .5em;
//   }
//   .group {
//     gap: .25em;
//   }

//   #controls {
//     font-size: 3em;
//     padding: .25em 0;
//     margin: 0;
  
//     .control {
//       position: relative; top: -.125em; filter: drop-shadow(0 .125em #fff8);
//       &:active {
//         top: 0;
//         filter: none;
//       }
  
//       display: flex;
//       border: 0;
//       background: none;
//       svg {
//         fill: #fff;
//       }
//     }
//   }

//   #details {
//     max-width: 100%;
//     display: flex;
//     flex-direction: column;
//     gap: .167em;
//     font-size: .9em;
    
//     gap: .125em;
//   }
// }

// .console {
//   flex-shrink: 1;
//   * {
//     white-space: pre !important;
//   }
// }

// .loader {
//   @keyframes loader { to { transform: rotate(360deg) } }
//   display: inline-block;
//   box-sizing: border-box;
//   width: 1em; height: 1em;
//   border: .15em solid transparent;
//   border-radius: 50%;
//   border-left-color: currentcolor;
//   animation: loader 3s infinite linear;
//   display: inline-flex;
//   align-items: center; justify-content: center;
//   box-sizing: border-box;
//   position: relative; top: .075em;

//   margin: -.05em;
//   box-sizing: border-box;
//   height: calc(1.1em - 4px);
//   width: calc(1.1em - 4px);
//   border-width: 2px;
//   margin-right: 0.5em;
//   margin-left: 0;
//   mix-blend-mode: unset !important;

//   &::before {
//     display: none;
//   }
// }

// ${mobile ? `
// font-size: 16px;

// .flex-row, .flex-column {
//   align-items: center;
//   width: 100%;
// }
// .flex-row {
//   justify-content: center;
// }

// #console {
//   margin: 0;
// }

// #player {
//   height: 100%;

//   #details {
//     width: 100%;
//     justify-content: flex-start;
//   }
//   #controls-playlist {
//     font-size: 7vw;
//     height: unset;
//     flex-grow: 0;
//   }
// }
// ` : ''}
// `
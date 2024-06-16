// spotify_client.js 0.0.1 @ https://freshman.dev/lib/2/spotify_client/script.js https://freshman.dev/copyright.js
Object.entries({
    'common.js': '/lib/2/common/script.js',
}).map(([key,src])=>!window[key]&&document.head.append((x=>Object.assign(x,{innerHTML:(src=>(x=>{x.withCredentials=false;x.open('GET',src,false);x.send();return x.responseText})(new XMLHttpRequest()))(new URL(src,location.port==='3030'/*local testing on port 3030*/?location.origin:'https://freshman.dev').toString())}))(document.createElement('script'))))  

// ignore reimport
{
    const names = lists.of('spotify_client spotify_client.js')
    if (names.some(name => !window[name])) {
        
        /* script
        */
        const version = `spotify_client.js v0.0.1`
        const log = named_log(version)
        const definition = {
            new: (name, client_id, scope, redirect_uri) => {
                if (dev) redirect_uri = location.origin + location.pathname
                redirect_uri = dev ? redirect_uri : redirect_uri
                const cookie_grant = `spotify-grant-${name}`
                Object.assign(this, { name, client_id, scope, redirect_uri, cookie_grant })
                const spotify = {
                    oauth: async () => {
                        // from https://developer.spotify.com/documentation/web-api/howtos/web-app-profile
                        function generateCodeVerifier(length) {
                            let text = '';
                            let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                            for (let i = 0; i < length; i++) {
                                text += possible.charAt(Math.floor(Math.random() * possible.length));
                            }
                            return text;
                        }
                        async function generateCodeChallenge(code_verifier) {
                        const data = new TextEncoder().encode(code_verifier);
                        const digest = await window.crypto.subtle.digest('SHA-256', data);
                        return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
                            .replace(/\+/g, '-')
                            .replace(/\//g, '_')
                            .replace(/=+$/, '');
                        }
        
                        const verifier = generateCodeVerifier(128)
                        const challenge = await generateCodeChallenge(verifier)
                        store.local.set('spot-verifier', verifier)
                        
                        apis.external('https://accounts.spotify.com/authorize', 'OPEN', {
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
                        return apis.external('https://accounts.spotify.com/api/token', 'POST', {
                            form: {
                                client_id,
                                grant_type: 'authorization_code',
                                code,
                                redirect_uri,
                                code_verifier: store.local.get('spot-verifier'),
                            },
                        }).then(grant => {
                            store.local.set(cookie_grant, grant)
                            return grant
                        })
                    },
                    granted: () => {
                        return !!store.local.get(cookie_grant)
                    },
                    code: () => {
                        return new URLSearchParams(location.search).get('code')
                    },
                    uncode: () => {
                        const search = new URLSearchParams(location.search)
                        search.delete('code')
                        url.replace(location.origin + location.pathname + (x => x && ('?'+x))(search.toString()) + location.hash)
                    },
                    autogrant: async () => {
                        const code = spotify.code()
                        if (code) {
                            await spotify.grant(code)
                            spotify.uncode()
                        }
                    },
                    refresh: () => {
                        const { refresh_token } = store.local.get(cookie_grant)
                        return apis.external('https://accounts.spotify.com/api/token', 'POST', {
                            form: {
                                client_id,
                                grant_type: 'authorization_code',
                                refresh_token,
                            },
                        }).then(grant => {
                            store.local.set(cookie_grant, grant)
                            return grant
                        })
                    },
                    disconnect: () => {
                        store.local.set(cookie_grant, undefined)
                        location.reload()
                    },
        
                    request: (path, method='GET', options={}) => {
                        const grant = store.local.get(cookie_grant)
                        return apis.external(path.startsWith('https://') ? path : 'https://api.spotify.com/v1' + path, method, merge({
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
                    volume: (volume_percent=undefined) => 
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
                    get: (search, type='track') => spotify.search({ q:search, type, limit: 1 }).then((x) => {
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
                    
                    playlists: async () => {
                        const profile = await spotify.profile()
                        let playlists = [], result
                        do {
                            result = await spotify.request(result?.next || `/users/${profile.id}/playlists`, 'GET')
                            log(result)
                            playlists.push(...result.items)
                        } while (result.next)
                        return playlists
                    },
                    added_tracks: async () => {
                        let tracks = [], result
                        do {
                            result = await spotify.request(result?.next || `/me/tracks`, 'GET')
                            log(result)
                            tracks.push(...result.items)
                        } while (false && result.next)
                        log({ tracks })
                        return tracks
                    },
                    added_tracks_parallel: async () => {
                        const result = await spotify.request(`/me/tracks`, 'GET')
                        const n_remaining = result.total - result.items.length
                        const n_queries = Math.ceil(n_remaining / result.limit)
                        const queries = range(n_queries).map(i => ({ offset: (i + 1) * result.limit }))
                        let tracks = result.items
                        await Promise.all(queries.map(async (query, i) => {
                            let result, count = 0
                            while (!result && count < 4) {
                                try {
                                    result = await spotify.request(`/me/tracks`, 'GET', { query })
                                } catch {}
                                count += 1
                            }
                            if (result) tracks.push(...result.items)
                        }))
                        return tracks
                    },
                    playlists_parallel: async () => {
                      const result = await spotify.request(`/me/playlists`, 'GET')
                      const n_remaining = result.total - result.items.length
                      const n_queries = Math.ceil(n_remaining / result.limit)
                      const queries = range(n_queries).map(i => ({ offset: (i + 1) * result.limit }))
                      let playlists = result.items
                      await Promise.all(queries.map(async (query, i) => {
                          let result, count = 0
                          while (!result && count < 4) {
                              try {
                                  result = await spotify.request(`/me/playlists`, 'GET', { query })
                              } catch {}
                              count += 1
                          }
                          if (result) playlists.push(...result.items)
                      }))
                      return playlists
                    },
                    playlist_tracks_parallel: async (playlist_id) => {
                      const result = await spotify.request(`/playlists/${playlist_id}/tracks`, 'GET')
                      const n_remaining = result.total - result.items.length
                      const n_queries = Math.ceil(n_remaining / result.limit)
                      const queries = range(n_queries).map(i => ({ offset: (i + 1) * result.limit }))
                      let tracks = result.items
                      await Promise.all(queries.map(async (query, i) => {
                          let result, count = 0
                          while (!result && count < 4) {
                              try {
                                  result = await spotify.request(`/playlists/${playlist_id}/tracks`, 'GET', { query })
                              } catch {}
                              count += 1
                          }
                          if (result) tracks.push(...result.items)
                      }))
                      return tracks
                    },
                    playlist: async (playlist_id) => {
                      const result = await spotify.request(`/playlists/${playlist_id}`, 'GET')
                      result.tracks = await spotify.playlist_tracks_parallel(playlist_id)
                      return result
                    },
                }
                return spotify
            }
        }
        names.map(name => window[name] = merge(definition, {
            version, [name]:version, t:Date.now()
        }))

    }
}

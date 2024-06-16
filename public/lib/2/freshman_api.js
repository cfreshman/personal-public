// freshman_api.js 0.0.1 @ https://freshman.dev/lib/2/ https://freshman.dev/copyright.js
// obscured, normalized requests with basic authentication
// X-Freshman-User - auth user
// X-Freshman-Token - auth token (hashed password or token generated & returned by server)

Object.entries({
  'common.js': '/lib/2/common/script.js',
}).map(([key,src])=>!window[key]&&document.head.append((x=>Object.assign(x,{innerHTML:(src=>(x=>{x.withCredentials=false;x.open('GET',src,false);x.send();return x.responseText})(new XMLHttpRequest()))(new URL(src,location.port==='3030'/*local testing on port 3030*/?location.origin:'https://freshman.dev').toString())}))(document.createElement('script'))))  

// ignore reimport
{
  const names = lists.of('freshman_api.js FA')
  if (names.some(name => !window[name])) {
    /* script
    */
    const version = `freshman_api.js v0.0.1`
    const log = named_log(version)
    
    const API_HEADER_PREFIX = 'X-Freshman'
    const API_USER_AUTH_HEADER = API_HEADER_PREFIX + '-Auth-User'
    const API_TOKEN_AUTH_HEADER = API_HEADER_PREFIX + '-Auth-Token'

    const definition = {
      API_HEADER_PREFIX,
      API_USER_AUTH_HEADER,
      API_TOKEN_AUTH_HEADER,
      user: localStorage.getItem(API_USER_AUTH_HEADER),
      token: localStorage.getItem(API_TOKEN_AUTH_HEADER),
      fetch: (path, options={method:'GET',ms:undefined}) => {
  
        if (options.ms !== undefined) options.signal = (x => {
          setTimeout(() => x.abort(), options.ms)
          return x.signal
        })(new AbortController())
  
        log(path, options)

        return fetch(window.server + path, {...options, headers:{
          ...options.headers,
        }}).then(rs => {
          localStorage.setItem(API_USER_AUTH_HEADER, definition.user = rs.headers[API_USER_AUTH_HEADER] ?? definition.user)
          localStorage.setItem(API_TOKEN_AUTH_HEADER, definition.token = rs.headers[API_TOKEN_AUTH_HEADER] ?? definition.token)
          return rs
        })
      },
      json: (path, options={method:'GET',ms:undefined}) => definition.fetch(path, options).then(rs=>rs.json()),
      text: (path, options={method:'GET',ms:undefined}) => definition.fetch(path, options).then(rs=>rs.text()),
    }
    names.map(name => window[name] = merge(definition, {
      version, v:version, [name]:version, t:Date.now()
    }))
  }
}

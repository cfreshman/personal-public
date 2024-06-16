// O.js 0.0.1 @ https://freshman.dev/lib/2/ https://freshman.dev/copyright.js
// obscured, normalized requests with basic authentication
// X-O-Path - actual HTTP path
// X-O-Method - actual HTTP method
// X-O-User - auth user
// X-O-Token - auth token (hashed password or token generated & returned by server)

Object.entries({
  'common.js': '/lib/2/common/script.js',
}).map(([key,src])=>!window[key]&&document.head.append((x=>Object.assign(x,{innerHTML:(src=>(x=>{x.withCredentials=false;x.open('GET',src,false);x.send();return x.responseText})(new XMLHttpRequest()))(new URL(src,location.port==='3030'/*local testing on port 3030*/?location.origin:'https://freshman.dev').toString())}))(document.createElement('script'))))  

// ignore reimport
{
  const names = lists.of('O.js O')
  if (names.some(name => !window[name])) {
    /* script
    */
    const version = `O.js v0.0.1`
    const definition = {
      endpoint: window.server + '/api/O',
      user: localStorage.getItem('X-O-User'),
      token: localStorage.getItem('X-O-Token'),
      fetch: (path, options={method:'GET',ms:undefined}) => {
  
        if (options.ms !== undefined) options.signal = (x => {
          setTimeout(() => x.abort(), options.ms)
          return x.signal
        })(new AbortController())
  
        return fetch(this.endpoint, {...options,method:'POST',headers:{
          'X-O-Path': path,
          'X-O-Method': options.method||'GET',
          ...options.headers,
        }}).then(rs => {
          localStorage.setItem('X-O-User', O.user = rs.headers['X-O-User'] ?? O.user)
          localStorage.setItem('X-O-Token', O.token = rs.headers['X-O-Token'] ?? O.token)
          return rs
        })
      },
      json: (path, options={method:'GET',ms:undefined}) => O.fetch(path, options).then(rs=>rs.json()),
      text: (path, options={method:'GET',ms:undefined}) => O.fetch(path, options).then(rs=>rs.text()),
    }
    names.map(name => window[name] = merge(definition, {
      version, v:version, [name]:version, t:Date.now()
    }))
  }
}

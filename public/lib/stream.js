(() => {
  window.stream = (name) => {
    fetch('/raw/stream').then(x=>x.text()).then(x => {
      const y = x.replace(`stream_name = ''`, `stream_name = '${name}'`)
      document.write(y) // shouldn't really do that
      console.debug(name, y)
    })
  }
})()

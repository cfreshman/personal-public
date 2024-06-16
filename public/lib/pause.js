(() => {
  const hint = (() => {
    const temp = document.createElement('div')
    temp.innerHTML = `
    <div class='hint hint-false'>
      <span class='hint-text'>tap to unpause</span>

      <style>
        .hint {
          position: absolute;
          top: 2rem;
          padding: .15em 0;
          color: white;
          background: black;
          transition: .5s;
          font-family: monospace;
          cursor: pointer;
        }
        .hint-false {
          opacity: 0;
          top: 1rem;
        }
      </style>
    </div>
    `
    return temp.children[0]
  })()
  document.body.append(hint)

  let paused = false
  window.togglePauseHint = (force=undefined) => {
    paused = force ?? !paused
    hint.classList.toggle('hint-false', !paused)
  }
  window.relabelPauseHint = (text='tap to unpase') => {
    hint.querySelector('.hint-text').textContent = text
  }
})()
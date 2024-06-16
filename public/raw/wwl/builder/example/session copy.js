wwl.attach({
  title: 'session', subtitle: 'wwl.js skeleton',
  author: 'edit@wwl-builder.tu.fo',
  state: 0,
  style: `
  text-align: center;
  `,
  states: {
    0: {
      state: app => {
        app.session.default({
          visits: 0,
          clicks: 0,
          max: { visits: 0, clicks: 0 },
        })
        app.session.update({
          visits: app.session.value.visits + 1,
        })
        return 'visited'
      },
    },
    visited: {
      html: app => (({ name, visits, clicks, max }) => `
      <input id=name placeholder="introduce yourself" onchange="
      app.session.update({ name: event.target.value }).then(_=> app.rerender())
      " value="${name||''}"></input>
      ${name ? `
      <br/>
      <span class=large>visit: ${visits}</span>
      <button id=click class=large>click: ${clicks}</button>
      <span>highscore: ${Math.max(visits, max.visits)} / ${Math.max(clicks, max.clicks)}</span>
      <div class=row>
        <button id=reset>reset</button>
        <button onclick="app.reload()">reload</button>
      </div>` : ''}`)(app.session.value)
    },
    click: {
      state: app => {
        app.session.update({ clicks: app.session.value.clicks + 1 })
        return 'visited'
      }
    },
    reset: {
      state: app => {
        const { visits, clicks, max } = app.session.value
        app.session.update({ visits: 1, clicks: 0, max: { visits: Math.max(visits, max.visits), clicks: Math.max(clicks, max.clicks) } })
        return 'visited'
      }
    }
  }
})
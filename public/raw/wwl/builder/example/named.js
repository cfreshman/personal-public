wwl.attach({
  title: 'colors', subtitle: 'wwl.js skeleton',
  author: 'edit@wwl-builder.tu.fo',
  state: 0,
  style: app => app.state() != 0 ? `
  background: ${app.state()};
  ` : '',
  states: {
    0: `
    <button>red</button>
    <button>yellow</button>
    <button>blue</button>
    `,
    red: `
    <button id=0>red</button>
    <button>yellow</button>
    <button>blue</button>
    `,
    yellow: `
    <button>red</button>
    <button id=0>yellow</button>
    <button>blue</button>
    `,
    blue: `
    <button>red</button>
    <button>yellow</button>
    <button id=0>blue</button>
    `,
  },
})
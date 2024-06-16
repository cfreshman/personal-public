wwl.attach({
  title: 'guide', subtitle: 'wwl.js skeleton',
  author: 'edit@wwl-builder.tu.fo',
  state: 0,
  states: {
    0: 
`wwl.js guide
<button id=css>safe area</button>
<button id=unsafe>mostly safe area</button>`,
    css: {
      style: `
      background: #bfd;
      /* by default, the safe area has .5em of side padding */
      padding-left: 0; padding-right: 0;
      `,
      html: 
`<div style="
background: #4f8;
padding: 0 .5em;
flex-grow: 1;
white-space: pre-line;
display: flex; flex-direction: column; align-items: stretch;
"><button id=0>back</button>
<div style="display: flex; flex-direction: row; justify-content: space-between">
  <div style="
  text-align: left;
  ">var(--width)
  var(--height)
  var(--aspect)
  var(--corner-ratio)
  var(--corner)
  var(--safe)
  var(--safe-aspect)</div>
  <div style="
  text-align: left;
  ">browser width
  browser height
  browser aspect ratio
  corner radius ratio
  width * corner ratio
  rectangular height
  safe aspect ratio</div>
</div>
</div>`,
    },
    unsafe: {
      style: `
      padding: calc(var(--corner) - 2.1em) 0;
      `,
      html: 
      `<div style="
      background: #f44;
      flex-grow: 1;
      white-space: pre-line;
      display: flex; flex-direction: column; align-items: stretch;
      "><button id=0>back</button>use more of the screen:\npadding: calc(var(--corner) - 2.1em) 0
        <br class=full />
        <button id=unsafer>even more</button>
      </div>`,
    },
    unsafer: {
      style: `
      padding: calc(var(--corner) - 2.1em) 0 .5em;
      `,
      html: 
      `<div style="
      background: #f44;
      flex-grow: 1;
      white-space: pre-line;
      display: flex; flex-direction: column; align-items: stretch;
      "><button id=0>back</button>even more:\npadding: calc(var(--corner) - 2.1em) 0 .5em
        <br class=full />
        <button id=unsafe>okay less</button>
        <button id=unsafest>even even more</button>
      </div>`,
    },
    unsafest: {
      title: '',
      subtitle: '',
      style: `
      padding: .5em 0;
      `,
      html: 
      `<div style="
      background: #f44;
      flex-grow: 1;
      white-space: pre-line;
      display: flex; flex-direction: column; align-items: stretch;
      "><button id=0>back</button>even even more:\npadding: .5em 0
        <br class=full />
        <button id=unsafer>okay less</button>
      </div>`,
    },
  },
})
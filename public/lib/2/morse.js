// morse.js 0.0.1 @ https://freshman.dev/lib/2/ https://freshman.dev/copyright.js
;[
  '/lib/2/common/script.js',
].map(src => (xhr => {
  xhr.open('GET', src, false)
  xhr.send()
  document.head.append((x => Object.assign(x, { innerHTML:xhr.responseText }))(document.createElement('script')))
})(new XMLHttpRequest()))

{
  const morse = window['morse'] = {
    code: {
      'A': '01',
      'B': '1000',
      'C': '1010',
      'D': '100',
      'E': '0',
      'F': '0010',
      'G': '110',
      'H': '0000',
      'I': '00',
      'J': '0111',
      'K': '101',
      'L': '0100',
      'M': '11',
      'N': '10',
      'O': '111',
      'P': '0110',
      'Q': '1101',
      'R': '010',
      'S': '000',
      'T': '1',
      'U': '001',
      'V': '0001',
      'W': '011',
      'X': '1001',
      'Y': '1011',
      'Z': '1100',
      '0': '11111',
      '1': '01111',
      '2': '00111',
      '3': '00011',
      '4': '00001',
      '5': '00000',
      '6': '10000',
      '7': '11000',
      '8': '11100',
      '9': '11110',
      '.': '010101',
      ',': '110011',
      '/': '10010',
      ':': '111000',
      '@': '011010',
      '%': '111111001011111',
      '-': '100001',
      '+': '01010',
      '=': '10001',
      '&': '01000',
      '!': '101011',
      '?': '001100',
      '"': '010010',
      '\'': '011110',
      '(': '10110',
      ')': '101101',

      '': '000',
      ' ': '0000000',
    },
    // raw: (parts) => {
    //   return (
    //     parts
    //     .map(x => 
    //       x
    //       .split('')
    //       .map(x => ({'0':1,'1':3}[x])).join('1'))
    //     .join('')
    //   )
    // },
    for: function(str, opts={
      element=undefined,
      on_style=`background: #fff`, off_style='background: #000',
      unit_ms=100,
    }={}) {
      opts = merge({
        element: undefined,
        on_style: `filter: invert(1) !important`, off_style: 'filter: none !important',
        unit_ms: 500,
      }, opts)
      // const morse_code = str.split(' ').map(word => word.split('').map(c => this.code[c]).join())
      const lengths = str.toUpperCase().split(' ').map(word => word.split('').map(c => {
        try {
          return this.code[c].split('').map(x => ({0:1,1:3}[x])).join(1)
        } catch {
          throw c
        }
      }).join(3)).join(7).split('').map(Number)
      if (opts.element) {
        let ls = opts.element
        if (typeof opts.element === 'string') ls = QQ(ls)
        else if (!Array.isArray(ls)) ls = [ls]
      
        ;(async ms_sequence => {
          const css_list = ls.map(l => l.style.cssText)
          let on = false
          console.debug('transmit morse code', ms_sequence)
          ms_sequence.unshift(0, opts.unit_ms * 2)
          while (ms_sequence.length) {
            on = !on
            const ms = ms_sequence.shift()
            // console.debug('toggle', {on,ms}, ls, 
              css_list.map((css, i) => ls[i].style.cssText = css + `;${on ? opts.on_style : opts.off_style};`)
              // )
            await sleep(ms)
          }
          css_list.map((css, i) => ls[i].style.cssText = css)
        })(lengths.map(x => x * (opts.unit_ms||100)))
      }
      return lengths
    },
  }
}

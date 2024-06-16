// Decode 1d streams (audio, video) as Morse Code
import React, { useState } from 'react'
import { useF, useInput, useM, useR } from '../lib/hooks'
import { JSX, pass, truthy } from '../lib/types'
import { group, isMobile, node, toStyle, transposeMap } from '../lib/util'
import styled from 'styled-components'
import { CodeBlock, HalfLine, InfoBadges, InfoBody, InfoButton, InfoEntry, InfoLabel, InfoSection, InfoStyles } from '../components/Info'


export default () => {
  const example = '81 84 98 a8 82 98 ec cd f1 ec'
  const [input, setInput, bindInput] = useInput(example)
  const [output, setOutput] = useState<string>(undefined)
  const [history, setHistory] = useState<[string,string][]>([])

  const handle = {
    decode: input => {
      const str_bytes = group(input.split(' ').join('').split(''), 2).map(x => x.join(''))
      let bytes = str_bytes.map(x => parseInt(x, 16))
      console.debug('DECODE', str_bytes, bytes)
      const recv = n => {
        const value = bytes.slice(0, n)
        bytes = bytes.slice(n)
        return value
      }
      const decode_bytes = bytes => parseInt(bytes.map(x => x.toString(2)).join(''), 2)
      let bAB = recv(2)
      console.debug('WebSocket frame read: header', bAB)
      let raw = []
      raw.push(...bAB)
      let bA = bAB[0]
      let final = bA & 0b1000_0000
      let opcode = bA & 0b0000_1111
      let bB = bAB[1]
      let mask_flag = bB & 0b1000_0000
      let len = bB & 0b0111_1111
      let ext = 0
      if (len == 126) ext = 2
      if (len == 127) ext = 8
      if (ext) {
        let len_bytes = recv(ext)
        raw.push(...len_bytes)
        len = decode_bytes(len_bytes)
      }

      let mask = mask_flag ? recv(4) : []
      raw.push(...mask)
      let data_bytes = recv(len)
      raw.push(...data_bytes)
      let data = data_bytes.slice()
      if (mask_flag) {
        for (let i = 0; i < data.length; i++) {
          let j = i % 4
          data[i] = data[i] ^ mask[j]
        }
      }
      console.debug('DECODED', input, '0x'+opcode.toString(16), data.map(x => x.toString(16)), raw)
      return data.map(x => String.fromCharCode(x)).join('')
    },
    encode: input => {
      console.debug('ENCODE', input)

      const encode_bytes = (x, n_bytes=undefined) => {
        const result = typeof(x) === 'string'
          ? unescape(encodeURIComponent(x)).split('').map(x => x.charCodeAt(0).toString(16).padStart(2, '0')).join('')
          : x.toString(16)
        return n_bytes ? result.padStart(n_bytes * 2, '0') : result
      }

      let header = ''
      let data = encode_bytes(input)

      let FIN_RSV_opcode = 1 << 7 | 0x1 // opcode for text
      header += encode_bytes(FIN_RSV_opcode, 1)
      console.debug(header)

      let payload_len = data.length / 2 // two hex digits per byte
      let ext_payload_len_bytes = ''
      if (payload_len > 2 << 15 - 1) {
        ext_payload_len_bytes = encode_bytes(payload_len, 8)
        payload_len = 127
      } else if (payload_len > 125) {
        ext_payload_len_bytes = encode_bytes(payload_len, 2)
        payload_len = 126
      }
      header += encode_bytes(payload_len, 1) + ext_payload_len_bytes
      console.debug(header)
      
      console.debug('ENCODED', input, header + data)
      return group((header + data).split(''), 2).map(x => x.join('')).join(' ')
    },
  }

  useF(output, () => {
    output && setHistory(history.concat([[input, output]]))
  })
  useF(() => setOutput(handle.decode(input)))

  const history_element = useM(history, () => {
    return history.slice().reverse().map(([history_input, history_output], i) => {
      return <>
        <InfoSection labels={[
          'input'
        ]}>
          <CodeBlock text={history_input.toString()} />
        </InfoSection>
        <InfoSection labels={[
          'output'
        ]}>
          <CodeBlock lines={[
            history_output,
          ]} />
        </InfoSection>
        <br/><br/>
      </>
    })
  })
  useF(() => input && handle.decode(input)[0])

  return <Style id='morse'>
    <InfoBody>
      {/* <u>WebSocket text frame translator</u>
      <br/><br/> */}
      <InfoSection labels={[
        'WebSocket text frame',
      ]}>
        <textarea {...bindInput} />
        <InfoLabel labels={[
          // 'WebSocket text frame',
          { text: 'decode', func: () => setOutput(handle.decode(input)) },
          { text: 'encode', func: () => setOutput(handle.encode(input)) },
        ]} />
      </InfoSection>
      <InfoSection labels={[
        'output'
      ]}>
        <CodeBlock lines={[
          output,
        ]} />
      </InfoSection>
      <br/><br/>
      {history_element}
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
&#morse {
  input, select, .select {
    border-color: black;
    color: black;
  }
  button, .button, .action {
    background: black;
    color: white;
  }
}
`
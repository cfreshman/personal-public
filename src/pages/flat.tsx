import React, { useState } from 'react'
import styled from 'styled-components'
import { HalfLine, InfoBody, InfoButton, InfoLabel, InfoSection, InfoStyles } from '../components/Info'
import { node, strToStyle, toStyle } from '../lib/util'
import { useF, useInput } from '../lib/hooks'
import { store } from '../lib/store'
import { copy } from '../lib/copy'


const group = (sliceable, n) => {
  const value = []
  for (let i = 0; i < sliceable.length; i += n) {
    value.push(sliceable.slice(i, i + n))
  }
  return value
}

export default () => {
  const persisted = store.persist('flatten-persisted', {
    default: {
      columns: 80,
      input: '',
    },
  })
  const [columns, setColumns, bindColumns] = useInput(persisted.get().columns)
  const [input, setInput, bindInput] = useInput(persisted.get().input)
  const [output, setOutput] = useState('')
  useF(columns, input, () => {
    persisted.set({ columns, input })

    let output = '', line = '', word = ''
    // const initial = input.split(/\n{2,}/).map(x => x.replace(/\n/g, ' ').replace(/\n /g, '')).map(x => group(x, columns).join('\n')).join('\n\n')
    // setOutput(initial)
    for (let i = 0; i < input.length; i += 1) {
      if (input[i] === '\n') {
        if (input[i+1] === '\n') {
          output += line + word + '\n'
          line = word = ''
          while (input[i+1] === '\n') {
            output += '\n'
            i += 1
          }
          continue
        } else {
          word += ' '
        }
      }
      else word += input[i]

      if (word.slice(-1) === ' ') {
        line += word
        word = ''
      }

      if (line.length + word.length === columns) {
        if (word.length === columns) {
          output += word + '\n'
          word = ''
        } else {
          output += line + '\n'
          line = ''
        }
        // if (input[i + 1] === ' ') i += 1
      }
    }
    output += line + word
    setOutput(output)
  })

  return <Style>
    <InfoBody>
      <InfoSection labels={[
        // 'template'
        ]}>
        <input type='number' placeholder='columns' min={1} {...bindColumns}></input>
        <HalfLine />
        <textarea placeholder='text to wrap' {...bindInput} rows={20}></textarea>
        <InfoLabel labels={[{ copy: () => copy(output, '#wrap-output', 500) }]} />
        <div id="wrap-output" style={toStyle(`
        white-space: pre;
        font-size: .8em;
        `)}>{output}</div>
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
textarea {
  resize: vertical;
}
`
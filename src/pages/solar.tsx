import React from 'react'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { S } from 'src/lib/util'

const { named_log } = window as any
const NAME = 'template-reduced'
const log = named_log(NAME)

export default () => {
  return <Style>
    <div id="solar-fill">
      <div style={S(`background: #ffd956`)}>sun</div>
      <div style={S(`background: #eeebe6`)}>ground</div>
    </div>
  </Style>
}

const common_css = `
input, select {
  height: 1.5em;
  font-size: 1em;
  border: 1px solid currentcolor;
  border-radius: .25em;
  &[type=number] {
    max-width: 5em;
  }
}

ul {
  padding-left: 1em;
}

button {
  color: var(--id-color-text);
  border-radius: 10em;
  border: 1px solid var(--id-color-text);
  box-shadow: 0 1px var(--id-color-text);
  min-width: 2em;
  display: flex; align-items: center; justify-content: center;
  translate: 0 -1px;
  &:not(:disabled) {
    cursor: pointer;
    &:active {
      translate: 0;
      box-shadow: none;
    }
  }
  &:disabled {
    cursor: default;
    color: #888;
    // background: #ccc;
  }
  &.on {
    background: var(--id-color-text);
    color: var(--id-color-text-readable);
    translate: 0;
    box-shadow: none;
  }
  line-height: 1.3em;
}

--id-color: #eee;
--id-color-text: #222;
--id-color-text-readable: #eee;
background: var(--id-color) !important;
color: var(--id-color-text) !important;
// padding: .5em;
font-size: .8em;
font-family: monospace;
`
const Style = styled.div`
width: 100%;
margin: .5em;
border: 1px solid #000;
border-radius: .25em;
overflow: auto;

${common_css}

box-shadow: none !important; /* to undo expand style (bad code) */

#solar-fill {
  height: 100%; width: 100%;

  > div {
    height: 50%; width: 100%;
    display: flex; align-items: center; justify-content: center;
  }
}
`
const PopupStyle = styled.div`
border: 1px solid var(--id-color-text);
box-shadow: 0 2px var(--id-color-text);
${common_css}
`
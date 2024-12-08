import React from 'react'
import styled from 'styled-components'
import { HalfLine, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { asInput, useF, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { S } from 'src/lib/util'
import { InputLabelled } from 'src/components/inputs'
import { store } from 'src/lib/store'

const { named_log } = window as any
const NAME = 'binary'
const log = named_log(NAME)

export default () => {
  const [start, set_start, fill_start] = asInput(store.use('binary-start', { default:0 }))
  const [end, set_end, fill_end] = asInput(store.use('binary-end', { default:100 }))

  const [run, set_run] = useS(undefined)

  const handle = {
    start: () => {
      const run = {
        start,
        end,
        i: Math.floor((end - start + 1) / 2),
        step: Math.ceil((end - start + 1) / 2),
      }
      set_run(run)
    },
    step: (lower) => {
      const step  = Math.ceil(run.step / 2)
      const i = lower ? run.i - step : run.i + step
      const new_run = {
        ...run,
        i,
        step,
        done: step === 1,
      }
      log('step', new_run)
      set_run(new_run)
    }
  }

  usePageSettings({
    professional: true,
    expand: true,
  })
  return <Style>
    <InfoBody>
      <InfoSection labels={[
        'binary search',
      ]} className='column gap' style={S(`font-size: 1.25em`)}>
        <HalfLine />
        {run ? run.done ? <>
          <div>answer: {run.i}</div>
          <HalfLine />
          <button onClick={e => handle.start()}>restart</button>
        </> : <>
          <div className='row spaced'><button onClick={e => handle.step(true)}>lower</button> <button onClick={e => set_run({ ...run, done:true })}>{run.i}?</button> <button onClick={e => handle.step(false)}>higher</button></div>
          <HalfLine />
          <button onClick={e => set_run(undefined)}>exit</button>
        </> : <>
          <div className='description'>find a value quickly when all you can ask is if it is lower or higher than your guess (e.g. minutes through video something appears)</div>
          <HalfLine />
          <div className='row spaced'>
            <InputLabelled type='number' label='start' {...fill_start} width={'6em'} />
            <InputLabelled type='number' label='end' {...fill_end} width={'6em'} />
          </div>
          <HalfLine />
          <button onClick={e => handle.start()}>start</button>
        </>}
      </InfoSection>
    </InfoBody>
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
    &:active, &.active {
      translate: 0;
      box-shadow: none;
    }
  }
  &:disabled {
    cursor: default;
    color: #888;
    // background: #ccc;
  }
  min-height: 1.5em;
  padding: 0 .67em;
}

.section.h100 {
  margin: 0;
}

--id-color: #eee;
--id-color-text: #222;
--id-color-text-readable: #eee;
background: var(--id-color) !important;
color: var(--id-color-text) !important;
padding: .5em;
font-family: monospace;
`
const Style = styled(InfoStyles)`
margin: .5em;
width: calc(100% - 1em);
height: calc(100% - 1em);
border: 1px solid #000;
border-radius: .25em;

${common_css}

box-shadow: none !important; /* to undo expand style (bad code) */
`
const PopupStyle = styled(InfoStyles)`
border: 1px solid var(--id-color-text);
box-shadow: 0 2px var(--id-color-text);
${common_css}
`
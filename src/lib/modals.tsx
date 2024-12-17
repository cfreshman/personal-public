import React from 'react'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useM, useR, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { Modal } from 'src/components/Modal'
import { S } from 'src/lib/util'
import { trigger } from './trigger'

const { named_log, rand, values } = window as any
const NAME = 'modals lib'
const log = named_log(NAME)

export const useModals = ({ target='#main .body', style=undefined }={}) => {
  const [modals, set_modals] = useS([])

  const modal_handle = {
    open: (Element:(props:{ handle?, close?, modal_handle?, box? })=>any, { outer_close=true }={}) => {
      const id = rand.anycasenum(12)
      const box = trigger.cache() // persistent storage for modal while not open
      set_modals(modals.concat([{
        id, box,
        Element,
        outer_close
      }]))
    },
    close_closure: (id) => () => {
      set_modals(modals.filter(modal => modal.id !== id))
    },
    example: () => {
      let background = `hsl(${rand.i(360)}deg, 50%, 90%)`
      modal_handle.open(({ handle, close, modal_handle, box }) => {
        const [count, set_counter] = box.use('counter', { default:0 })

        return <div style={S(`
        background: ${background};
        padding: .5em;
        `)}>
          <InfoSection labels={['modal']}>
            <div>modal test</div>
            <button onClick={close}>close modal</button>
            <button onClick={modal_handle.example}>another modal</button>
            <button onClick={() => set_counter(count + 1)}>count: {count}</button>
          </InfoSection>
        </div>
      })
    }
  }

  return {
    open: modal_handle.open,
    example: modal_handle.example,
    Element: ({ handle=undefined }={}) => modals.slice(-1).map((modal, i) => {
      const close = modal_handle.close_closure(modal.id)
      return <Modal key={modal.id} target={target} outerClose={modal.outer_close ? close : undefined}><div style={style || S(`
      background: var(--id-color);
      border: 1px solid var(--id-color-text);
      box-shadow: 0 2px var(--id-color-text);
      `)}><modal.Element {...{ handle, close, modal_handle, box:modal.box }} /></div></Modal>
    })
  }
}

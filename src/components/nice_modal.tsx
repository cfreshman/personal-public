import React from 'react'
import { Modal } from "./Modal"
import { S } from 'src/lib/util'
import { InfoBody, InfoStyles } from './Info'

export const NiceModal = ({ children, on_close=undefined, block=true }) => {
  return <Modal outerClose={on_close} block={block}>
    <div style={S(`
    width: max-content;
    height: max-content;
    max-width: calc(100% - 1em);
    max-height: calc(100% - 6em);
    border: 1px solid #000;
    box-shadow: 0px 2.5px 1px var(--id-color-text), 0px 0px 1px var(--id-color-text) !important;
    pointer-events: all;
    `)}>
      <InfoStyles>
        <InfoBody>
          {children}
        </InfoBody>
      </InfoStyles>
    </div>
  </Modal>
}
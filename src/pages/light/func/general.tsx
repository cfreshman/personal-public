import { openPopup } from "src/components/Modal"
import { Style } from "../style"
import { InfoBody } from "src/components/Info"
import { S } from "src/lib/util"

const { named_log, datetimes } = window as any
const log = named_log('light general')

export const open_popup = (closer, { naked=0 }={}) => {
  openPopup(close => <Style>
    <InfoBody style={S(`
    ${naked ? `
    padding: 0;
      ` : ''}
    `)}>
      {closer(close)}
    </InfoBody>
  </Style>, `
  height: max-content;
  width: max-content;
  max-width: min(50em + 4em, 100% - 2em);
  background: #000 !important;
  padding: 0;
  `)
}

export const compute_edit_time = (post) => post ? Math.max(post.user === 'cyrus' ? 1 : 0, post.t + datetimes.duration({ m:15 }) - Date.now()) : 0

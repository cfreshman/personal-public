import { InfoBody, InfoStyles } from "src/components/Info"
import { openPopup } from "src/components/Modal"
import styled from "styled-components"
const { devices } = window as any

export const BACK = '#181923' // '#07072e' // '#111' // '#120e23' // '#1e1c28'
export const TEXT = '#dcfeff' // '#fffadc' // '#f8f8f8'
export const ACCENT = '#2b00ff'

const common_css = `
.accented {
  text-shadow: 0 1px var(--id-color-accent);
}

.backed {
  background: var(--id-color) !important;
}
.float {
  background: var(--id-color) !important;
  border: 1px solid var(--id-color-accent);
  padding: .5em;
}

.tall {
  height: 0;
  flex-grow: 1;
}

.badges.badges.badges {
  > :is(button, .button) {
    background: var(--id-color-accent) !important;
    color: var(--id-color-text) !important;
    text-shadow: 1px 1px var(--id-color), -1px 1px var(--id-color), 1px -1px var(--id-color), -1px -1px var(--id-color) !important;
  }
}

.body .section > :is(.action,input,textarea,.code-container) {
  margin-bottom: 0 !important;
}

${devices.is_mobile ? `
.badges {
  font-size: max(1em, 14px);
}
` : ``}
`

export const Style = styled(InfoStyles)`&#vibe{
  
${common_css}

#vibe-nav {
  font-size: 1.5em;
  margin-bottom: 2px;
  > * {
    // box-shadow: 0 2px var(--id-color-accent);
    background: var(--id-color-accent) !important;
    color: var(--id-color-text) !important;
  }
}

}`

export const PopupStyle = styled(InfoStyles)`&#vibe-popup{

height: min-content; width: min-content;
min-height: 256px; min-width: 256px;
max-width: min(50em + 4em, 100% - 2em);
max-height: min(80vh + 4em, 100% - 2em);
background: #000 !important;
padding: 0;

border: 1px solid var(--id-color-accent);
box-shadow: 0 2px var(--id-color-accent);
background: var(--id-color) !important;
color: var(--id-color-text) !important;

${common_css}
}`
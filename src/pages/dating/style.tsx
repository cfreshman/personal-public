import { InfoStyles } from "src/components/Info"
import styled from "styled-components"

const { devices } = window as any

export const Style = styled(InfoStyles)`&#dating#dating#dating,&{
max-width: unset !important;
width: 100vw !important;

.body {
  margin: .25em;
  width: calc(100% - .5em);
  height: calc(100% - .5em);
  --id-color: #eee;
  --id-color-text: #000;
  --id-color-text-readable: #fff;
  --id-color-label: #0002;
  background: var(--id-color) !important;
  color: var(--id-color-text) !important;
  border: 1px solid currentcolor !important;
}

.bordered {
  border: 1px dashed currentcolor;
  border-radius: .25em;
  padding: .25em .5em;
}

input:not([type=checkbox]), textarea, .select {
  &:not(textarea) {
    height: 1.5em !important;
  }
  width: fit-content !important;
  min-width: 6em !important;
  &[type=number] {
    max-width: 3em !important;
  }
  display: flex; align-items: center; justify-content: flex-start;
  background: var(--id-color) !important;
  color: var(--id-color-text) !important;
  &::placeholder {
    color: inherit !important;
    opacity: .5 !important;
  }
  border: 1px solid currentcolor !important;
  border-radius: .25em !important;
  padding: .25em !important;
  ${devices.is_mobile ? `
  font-size: max(1em, 16px) !important;
  ` : ''}
}
textarea {
width: 100% !important;
}
input[type=checkbox] {
    -webkit-appearance: checkbox !important;
}

.dating-profile {
  .row {
    flex-wrap: wrap;
    align-items: stretch;
  }
  .img {
    height: 27.5vh; max-width: 100%; width: auto !important; flex-grow: 0 !important; flex-shrink: 0 !important;
    min-width: fit-content;
  }
  .img:nth-child(1) {
    width: 100%; max-width: 400px;
    max-height: unset;
  }
  img {
    height: unset !important; width: unset !important;
    max-height: 100%; max-width: 100%;
  }
  .column {
    min-height: max-content;
  }
  .unloaded .row {
    flex-direction: column !important;
    align-items: flex-start;
  }
  .unloaded .img {
    height: auto;
  }
  .hidden {
    display: none;
  }
}

.dating-photos {
  .dating-photo-container {
    height: 27.5vh; max-width: 100%; width: auto !important; flex-grow: 0 !important; flex-shrink: 0 !important;
    min-width: fit-content;
    position: relative;

    .dating-photo {
      height: unset !important; width: unset !important;
      max-height: 100%; max-width: 100%;
    }
    .dating-photo-label {
      position: absolute; bottom: 0; right: 0;
      margin: 2px; background: #000; color: #fff; mix-blend-mode: unset;
      text-align: right;
    }
  }

  .dating-photo-hidden {
    border: 1px dashed currentcolor;
    border-radius: 10em;
    padding: 0 .5em;
  }
}

}`
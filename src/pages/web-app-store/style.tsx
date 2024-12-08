import React from "react"
import { InfoStyles } from "src/components/Info"
import styled from "styled-components"

const common_css = `
max-width: calc(25rem * 3 + 2rem) !important;

.body {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.section-max {
  // max-width: 70em;
}

.app-grid {
  // display: grid;
  // grid-template-columns: 1fr 1fr 1fr;

  gap: 1rem;
}

.app-tile {
  width: 100%;
  border: 1px solid currentcolor;
  box-shadow: 2px 2px 0 0 #12b7fa;
  border-radius: 2px;
  padding: .5em;
  background: var(--id-color-text-readable);
}

.app-item {
  // width: 25em;
  // width: calc(50% - 1em);
  // width: 100%;
  // min-width: calc(33.3% - (2/3)*1em);
  // width: min-content;
  width: var(--app-item-width);
  max-width: 25rem;
  &:is(.mobile *), &:has(.mobile) {
    width: 100%;
  }
  border: 1px solid currentcolor;
  box-shadow: 2px 2px 0 0 currentcolor;
  box-shadow: 2px 2px 0 0 #12b7fa;
  // box-shadow: 2px 2px 0 0 #bbb;
  // border-radius: .25em;
  border-radius: 2px;
  padding: .5em;
  background: var(--id-color-text-readable);
}

.app-edit {
  width: 100%;
  border: 1px solid currentcolor;
  box-shadow: 2px 2px 0 0 #12b7fa;
  border-radius: 2px;
  padding: .5em;
  background: var(--id-color-text-readable);
}

.app-review {
  width: 100%;
  border: 1px solid currentcolor;
  box-shadow: 2px 2px 0 0 #12b7fa;
  border-radius: 2px;
  padding: .5em;
  background: var(--id-color-text-readable);
}

.badges > .label {
  backdrop-filter: invert(1) opacity(.15) !important;
  // text-shadow: 0px 0px 3px var(--id-color-text-readable);
  // background: #12b7fa !important;
  // color: var(--id-color-text-readable) !important;
  // text-shadow: 1px 1px var(--id-color-text), -1px -1px var(--id-color-text);
}

input, select {
  height: 1.5em;
  font-size: max(16px, 1em);
  border: 1px solid currentcolor;
  color: var(--id-color-text) !important;
  &[type=number] {
    max-width: 5em;
  }
}

input[type=text], textarea {
  border-radius: 2px;
  background: var(--id-color) !important;
  color: var(--id-color-text) !important;
  border: .75px solid currentcolor !important;
}

ul {
  padding-left: 1em;
}

img {
  image-rendering: pixelated;
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
.section.section.spaced {
  gap: 1em !important;
}

.large {
  font-size: 1.5em;
}
.larger {
  font-size: 2.25em;
}
.largest {
  font-size: 3em;
}

--id-color: #eee;
--id-color-text: #222;
--id-color-text-readable: #f8f8f8;
background: var(--id-color) !important;
color: var(--id-color-text) !important;
padding: .5em;
font-family: monospace;
`
export const Style = styled(InfoStyles)`&#web-app-store#web-app-store#web-app-store{
margin: .5em;
width: calc(100% - 1em);
height: calc(100% - 1em);
border: 1px solid #000;
border-radius: .25em;

${common_css}

box-shadow: none !important; /* to undo expand style (bad code) */
}`
export const PopupStyle = styled(InfoStyles)`
border: 1px solid var(--id-color-text);
box-shadow: 0 2px var(--id-color-text);
${common_css}
`
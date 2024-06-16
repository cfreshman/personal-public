import { ReactFragment } from "react";
import { props, truthy } from "../../lib/types";
import { S } from "../../lib/util";
import styled from "styled-components";
import { useF, useS } from "src/lib/hooks";
import url from "src/lib/url";
import { usePage } from "src/lib/hooks_ext";
import { message } from "../Messages";

let dropdown_open_count = 0
export const Dropdown = ({
  label, children, position='s e', indicator=false,
  open:initialOpen, expand=false,
  control={}, set_open=undefined,
  clear_messages,
  ...props
}: props & {
  label: ReactFragment | 'lines' | 'icon',
  position: 'n'|'w'|'e'|'s'|'n w'|'n e'|'s w'|'s e',
  indicator: false|'left'|'right',
  open?: boolean, expand?: false|number,
  control?: {
    open?,
    toggle?,
  },
  clear_messages?: boolean,
}) => {

  label = {
    lines: '☰',
    // lines: <div id="badges" style={S(`
    // display: flex;
    // flex-direction: row;
    // gap: 0.33em;
    // /* font-weight: bold; */
    // font-size: 1em !important; 
    // height: 1em;
    // width: 1.1em; display: inline-flex; justify-content: flex-end; align-items: center;
    // filter: drop-shadow(px 4px 6px black);
    // overflow: visible;
    // text-shadow: -1px 0 #000, -2px 0 #000, -3px 0 #000, -4px 0 #000, -5px 0 #000, -6px 0 #000, -7px 0 #000, -8px 0 #000, -9px 0 #000, -10px 0 #000;
    // scale: 1.05;`)}>⋮</div>,
    icon: <img id="home" className="profile-false" alt="profile" src="/raw/freshman.dev/icon.png" style={S(`
    width: 1em;
    height: 1em;
    `)}></img>
  }[label] || label

  if (typeof expand !== 'number') expand = undefined
  if (expand !== undefined) position = 's w'

  const [open, setOpen] = useS(!!initialOpen)
  useF(open, () => dropdown_open_count += 1)
  useF(open, () => {
    if (open && clear_messages) {
      message.trigger({ clear:true })
    }
  })
  useF(open, () => set_open && set_open(open))

  const handle = {
    toggle: (value=!open) => setOpen(value)
  }

  const [page] = usePage()
  useF(page, () => setOpen(false))

  Object.assign(control, {
    open: (value=true) => setOpen(value),
    close: (value=true) => setOpen(!value),
    toggle: handle.toggle,
  })
  return <Style className={`dropdown-container open-${open} expand-${expand!==undefined} ${props.className||''}`} style={S(`
  ${expand !== undefined ? `
  top: calc((1.5em + 1px) * ${expand} - 2px);
  border: 1px solid currentcolor;
  `:''}
  `)}>
    <div className={`dropdown-label indicator-${indicator}`} onClick={e => handle.toggle()}>{label}</div>
    <div {...props} className={['dropdown', position, props.className].filter(truthy).join(' ')} style={S(`
    z-index: calc(100100 + ${dropdown_open_count});
    `)}>{children}</div>
  </Style>
}

const Style = styled.div`
position: relative; width: fit-content;
display: inline-flex; align-items: center; justify-content: center;

.dropdown-label {
  height: 100%;
  display: inline-flex; justify-content: center; align-items: center;
  white-space: pre;
  cursor: pointer;
  user-select: none;
  color: inherit;
  position: relative;
  > * {
    height: 1em;
  }

  &.indicator-left {
    &::before { content: "" }
    &:hover {
      &::before { content: "> " }
    }
    &:active {
      &::before { content: "– " }
    }
  }
  &.indicator-right {
    &::after { content: "" }
    &:hover {
      &::after { content: " <" }
    }
    &:active {
      &::after { content: " –" }
    }
  }
}
.dropdown {
  z-index: 100100;
  position: absolute;
  min-width: 6.5em;

  box-shadow: rgba(136, 136, 136, 0.067) 0px 0px 0px .75px, rgba(136, 136, 136, 0.03) 0px 0px 0px 1.25px;
  border: 1px solid currentColor;
  border-radius: .25em;
  background: var(--id-color-text-readable); color: var(--id-color-text);
  border: 0;

  display: flex; flex-direction: column;
  align-items: center; text-align: left;
  overflow: hidden;
  --item-padding: .5em;
  > * {
    display: block;
    width: 100%;
    padding: calc(.125 * var(--item-padding)) var(--item-padding);
    white-space: pre;
    input:not(:is([type=checkbox], [type=radio])) {
      color: inherit;
      border: 1px solid currentColor;
      outline: none;
      border-radius: .25em;
      width: -webkit-fill-available;
    }
  }
  > :first-child {
    padding-top: calc(.5 * var(--item-padding));
  }
  > :last-child {
    padding-bottom: calc(.5 * var(--item-padding));
  }
  > hr {
    display: inline-block;
    width: calc(100% - 2 * var(--item-padding));
    margin: calc(.5 * var(--item-padding)) 0;
    border: 0;
    border-bottom: 1px solid currentColor;
  }

  &.n {
    bottom: calc(100% + 2px);
  }
  &.s {
    top: calc(100% + 2px);
  }
  &.w {
    right: calc(100% + 2px);
    &:is(.n, .s) { right: 0 }
  }
  &.e {
    left: calc(100% + 2px);
    &:is(.n, .s) { left: 0 }
  }

  a {
    color: inherit;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
}

&.open-false {
  .dropdown {
    display: none;
  }
}
&.expand-true {
  visibility: visible;
  position: fixed;
  bottom: 0; right: 0; margin: .25rem;
  z-index: 100100;
  display: flex; align-items: center; justify-content: center;
  height: fit-content; width: fit-content;
  // border-radius: .25em;
  background: inherit !important;

  .dropdown-label {
    height: fit-content;
    // border-radius: 0;
    border: 1px solid currentcolor;
    padding: .25em;
    background: inherit !important;
    background-clip: border-box;
    color: currentcolor;

    &:active {
      // translate: -.5px -.5px;
      // box-shadow: .5px .5px 0px currentcolor;
      filter: invert(1);
    }

    svg {
      height: 1em;
      width: 1em;
      fill: currentColor;
      stroke: currentColor;
      background: none;
      overflow: visible;
    }
  }

  .dropdown {
    border-radius: 0;
  }
}
`
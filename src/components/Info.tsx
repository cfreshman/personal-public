import React, { forwardRef, Fragment, useEffect, useRef, useState } from 'react'
import { Link, useHistory } from 'react-router-dom'
import styled from 'styled-components'
import * as DOMPurify from 'dompurify';
import { marked } from 'marked';
import { cleanTimeout, InputL, useCached, useE, useEventListener, useF, useGrab, useInterval, useM, useR, useS, useSkip, useStyle, useTimeout, withRef } from '../lib/hooks'
import { useAuth, useCachedScript, usePage, useSupporter } from '../lib/hooks_ext'
import { JSX, jsx, legacyRef, pass, printable, props, stringable, transform, functionOrOther, action, consumer, printable_types } from '../lib/types'
import url from '../lib/url'
import { randAlphanum, rands, toClass, toStyle, isMobile, S, isWatch, eventToRelative } from '../lib/util'
import { A } from './A';

const { Q, node, defer, set, on, ons, pick, unpick, merge, named_log, elements:window_elements, V, range, hydrate, hydrates, strings } = window as any
const log = named_log('info')

export type InfoLabelType = printable | {
  [name:string]: ()=>void,
} | {
  text?: any, element?: any,
  func?: ()=>void, href?: string,
  dot?: string | true,
  style?: React.CSSProperties | string,
  disabled?: boolean,
  classes?: string,
  label?: boolean | action,
  spacer?: boolean | string,
  // shrink?: boolean | string,
}
export type InfoEntryType = printable | { text: any, data }
export type InfoLineType = { content, labels: InfoLabelType[] }

const InfoEntryToText = entry => entry.text ?? entry
const InfoEntryToData = entry => entry.data ?? entry

// const background = 'white' //'rgb(251 250 247)'
const _InfoStyles = styled.div`
${css.common.base}
// font-family: Duospace, monospace, system-ui, sans-serif;
height: 100%; width: 100%;
display: flex; flex-direction: column;
.body {
  flex-grow: 1;
  overflow-y: auto;
  // padding: .8em 1em;
  padding: .5em;
  .section {
    width: 100%;
    > :is(form, iframe) { width: -webkit-fill-available }
  }
  > *:not(:last-child) {
    margin-bottom: .25em;
  }

  .section {
    ${css.mixin.column};
    font-size: .9em;
    // gap: 2px;
    // > :first-child:is(.badges) {margin-bottom:-2px}
    > .badges.header-true {
      // margin-bottom: calc(.25em - 2px);
      margin-bottom: 2px; //calc(.25em);
      > * {
        position: unset !important;
        margin: 0 !important;
      }
    }
    br {display:none}
    .action {margin-bottom:0!important}
    > :is(.action, input, textarea, .code-container) {
      margin-bottom: 2px !important;
    }
    gap: 2px;
    margin-bottom: .25em;

    > * .badges.badges, > .badges:not(.header-true) {
      font-size: 1em;
    }
  }

  .badges {
    display: inline-flex;
    align-items: flex-start;
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 2px;
    &.inline { margin-left: .5em }
    &:not(.inline) {
      margin-bottom: .25em;
    }
    &:last-child { margin-right: 0 }
    &.nowrap {
      flex-wrap: nowrap;
      max-width: 100%;
    }
    &.full {
      max-width: 100%;
      > .label { flex-shrink: 0 }
    }

    font-size: .8em;
    > * {
      font-size: 1em !important;
      margin: 0;
      min-width: 1.5em;
      // margin-top: .5em;
      // margin-left: .5em;
      flex-shrink: 0;
      text-decoration: none;
      &, &.action.action.action > * {
        font-size: 1em !important;
      }
    }
    .label, .button {
      display: flex; align-items: center;
      white-space: pre;
      color: inherit;
      text-decoration: none;
      &.inline {
        display: inline-flex;
        position: relative;
        // bottom: -0.1em;
      }
      &.action {
        // margin-bottom: -.1em;
      }
      width: fit-content;
      min-width: 1em;
      // justify-content: flex-start;
      justify-content: center;
      padding: 0 .3em;
      &:has(input) { padding:0 }
      border-radius: .2em;
    }
    .label {
      opacity: .7;
      background: #00000022;
      border: 0.1rem solid #00000033;
      border-top-color: transparent;
      border-color: transparent;
      border-left: none;
      border-right: none;
    }
    .label.dot {
      opacity: 1;
      padding: 0;
      margin: 0;
      background: none;
      left: .5em;
    }
  }

  .entry-line {
    min-height: 3em;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    min-height: 0; // overrides 3em above
    padding-top: 1px;
    > *:not(.button), .entry {
      &:not(:last-child) { margin-right: .5em }
      color: var(--id-color-text);
      &.link, a {
        cursor: pointer;
        user-select: all;
        color: var(--id-color-text);
        // :hover { text-decoration: underline; }
      }
    }
  }
}
.button, .button.action {
  display: block;
  white-space: pre;
  &.inline {
    display: inline-flex;
    position: unset;
  }
  width: fit-content;
  min-width: 1em;
  justify-content: flex-start;
  font-size: .8em;
  padding: 0 .3em;
  border-radius: .3em;

  cursor: pointer; user-select: none;
  display: inline-block;
  width: fit-content;
  padding: 0 .3em;
  background: inherit;
  border: .1rem solid currentColor;
  &.disabled {
    opacity: .5;
    pointer-events: none;
  }
}
.button, .label, .action.inline {
  width: fit-content;
  // & + .button, & + .label, & + .action.inline {
  //   // margin-left: .25em;
  // }
  &.action + .action.inline {
    // margin-left: .25em;
  }

  user-select: none !important;
}

input {
  line-height: 1;
  margin: 0;
}
input:not([type=color], [type=checkbox], [type=radio]), textarea {
  width: 100%;
  color: black;
  background: white;
  padding: .25em;
  // height: 1.5em;
  font-size: max(16px, 1em);
  border: 0.1rem solid var(--id-color-text) !important;
  outline: 0 !important;
  border-radius: .2em;
  border-radius: 0;
  box-shadow: none;
  // margin: .25em 0;
  -webkit-appearance: none;
  &:read-only {
    border-color: transparent;
    background: #00000011;
  }
  &[type=file] {
    background: transparent;
    cursor: pointer;
  }
}
textarea {
  padding: .25em;
}
.edit-container {
  // width: 66%;
  // width: 17.6em;
  input {
    height: 2.0em;
    line-height: 1;
  }
  input, textarea {
    width: 100%;
    color: black;
    border: .15rem solid transparent;
    padding: 0 .25em;
    border-color: #00000022;
    border-radius: .2em;
    box-shadow: none;
    margin: .25em 0;
    -webkit-appearance: none;
    &:read-only {
      border-color: transparent;
      background: #00000011;
    }
  }
  .button {
    float: right;
  }
}
.search {
  padding: .3em .3em;
  // background: black;
  // background: #a2ddff;
  display: flex;

  input {
    width: 8em;
    width: 100%;
    // font-size: .8em;
    font-size: max(16px, .8em);
    &::placeholder {
      font-size: .8em;
      color: #0005;
    }
    background: white;
    // border: white;
    // border: 1px solid var(--id-color) !important;
    color: black;
    padding: 0 .3em;
    border-radius: .3em;
    min-width: 42%;

    &:focus-visible {
      // outline-style: solid;
      // outline-width: medium;
    }
  }
  &:focus-within .submit {
    display: inline-flex;
  }
  .submit {
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    display: none;
    // color: white;
    padding: 0 .3em;
    border-radius: .3em;
    margin-left: .3em;
    white-space: pre;
    font-size: .9em;
    span {
      &::before { content: "→ " }
      // &::before { content: "[ " }
      // &::after { content: " ]" }
    }
    // &:hover span {
    //   text-decoration: none;
    //   &::before { content: "> " }
    //   &::after { content: " <" }
    // }
    // &:active span {
    //   &::before { content: "– " }
    //   &::after { content: " –" }
    // }
  }

  // floating styles
  // z-index: 1;
  // background: transparent;
  // position: absolute;
  // border: 0;
  // right: 0;
  // margin: 0;
  // input {
  //   min-width: 6rem;
  //   &:focus-within { min-width: 14rem }
  //   background: white;
  //   border-radius: 2px;
  //   border: 1.5px solid #404040;
  //   &::placeholder {
  //     color: #000;
  //     // text-align: center;
  //   }
  //   &:focus-within::placeholder { color: #0006; text-align: left; }
  // }
  // &:not(:focus-within) .submit { display: none }
  // .submit {
  //   min-width: 2rem;
  //   border: 0;
  //   background: #404040;
  //   color: white;
  //   // height: fit-content;
  //   height: calc(100% - 4px - 0.75rem);
  //   font-size: .8rem;
  //   align-self: center;
  //   position: absolute;
  //   right: calc(0.4rem + 1.5px);
  //   border-radius: 2px;
  // }
}

.login-block .entry, .login-block {
  user-select: none !important;
}


// input styles
label {
  margin: 0;
}

.group {
  // max-width: 40rem;
  .description {
    white-space: pre-wrap;
    font-size: .7rem;
    opacity: .5;
    padding: 0.2rem 0.4rem;
    padding-top: 0;
  }
  .group-items {
    display: flex;
    flex-wrap: wrap;
    margin-left: 1rem;
    > * {
      display: inline-flex;
    }
  }
}
.action {
  color: black;
  background: #eee;
  border: none;
  border-radius: .2em;
  width: fit-content;
  padding: 0em .3em;
  cursor: pointer;
  user-select: none;
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: .25em !important;
  // &:last-child { margin-bottom: 0; }
  white-space: pre-wrap;
  text-shadow: none;
  -webkit-appearance: none;

  &.inline {
    display: inline-flex;
    margin: 0;
    margin-right: .25rem;
    &:last-child { margin-right: 0 }
    display: inline-flex;
    &input {
      width: 12em;
      &[type=number] {
        width: 4em;
      }
    }
  }
  &[disabled][disabled][disabled][disabled][disabled][disabled][disabled][disabled] {
    &, * {
      // color: #0008 !important;
      // background: #ddd !important;
      opacity: .5 !important;
      
      // pointer-events: none;
      cursor: default;
    }
  }
  input {
    font-size: 1em;
  }
}
.inline:not(:is(.button, .action, .label)) {
  display: inline-flex;
  align-items: stretch;
}
.inline > .action + .action {
  margin-left: .25rem;
}
input.action, input:not([type=color]), textarea {
  font-size: max(16px, 1em);
  background: white;
  border: .1rem solid #000; outline: 0 !important;
  border-radius: .2em;
  cursor: default;
  box-shadow: none;
  user-select: all;
  -webkit-appearance: none;
  // user-select: none;
  &.long {
    width: 100%;
    margin-right: 0;
  }
  &::placeholder {
    // color: #000;
    color: #0008;
    opacity: 1;
  }
  &:focus-within::placeholder {
    // color: #0003;
    color: #0002;
  }
}
input[type=text], input[type=number], textarea {
  &, &.action {
    cursor: text;
    line-height: 1.4;
  }
}
input.action[type=checkbox], input.action[type=radio], input.info-checkbox[type=checkbox], input.info-checkbox[type=radio] {
  -webkit-appearance: checkbox;
  display: inline-block;
  margin: .15em;
  margin-right: 0.75em;
  font-size: 1em;
  height: 1em;
  width: 1em;
  vertical-align: middle;
}
input.action[type=radio], input[type=radio] {
  -webkit-appearance: radio;
}
.action > input[type=number] {
  width: 3.5em;
  // font-size: 1em;
  padding: 0 .2em;
  vertical-align: middle;
  height: 1.5em;
  min-height: 100%;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: -.3em;
}
.action > input[type=date] {
  padding: 0 0.15em;
}

select {
  -webkit-appearance: none;
  text-align: center;
  border: none;
  // text-decoration: underline;
  cursor: pointer;
}
.select {
  font-size: 1em;
  &.select-upper-true { text-transform: uppercase; }
  padding: .2em;
  vertical-align: middle;
  height: 1.5em;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  position: relative;
  border-radius: 0.1em;
  margin: 0.15em -.15em;
  min-width: 2rem;

  position: relative !important;
  select {
    opacity: 0;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
  }
}
.pointer-target {
  cursor: pointer;
}
.group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.inline-group {
  display: inline-flex;
  align-items: stretch;
  gap: 2px;
}

.scrolled {
  overflow: hidden;
}
`
export const InfoStyles = ({children, ...props}) => <_InfoStyles {...props} className={`${props.className} info`}>{children}</_InfoStyles>

const _EXPECTED_INFO_BADGE_FIELDS = set('text func dot style')
const _a = styled.a``
const _span = styled.span``
const _InfoBadge = ({label}: {label: InfoLabelType}) => {
  let func, text
  if (typeof label !== 'string') {
    ;((label: any) => {
      text = label.text || label.href || Object.keys(label).filter(x => !_EXPECTED_INFO_BADGE_FIELDS.has(x))[0]
      func = (label.label && label.label['apply']) ? label.label : label.func || label[text?.toString()]
    })(label)
  }
  if (typeof label === 'object') {
    if (text === '$$typeof') return label

    if (label.element) return label.element
    if (label.dot) return <div className='label dot inline' onClick={label.func}>{'>'}</div>
    if (label.spacer) return <div style={S(`
    flex-shrink: 1;
    overflow: hidden;
    flex-basis: 100%;
    `)}>{(label.spacer === true ? <Dangerous html={'&nbsp;'.repeat(1000)} /> : (label.spacer as string).repeat(1000))}</div>

    const className = `${label.label||!(func||label.href) ? (`label ${func ? 'clickable' : ''}`) : 'button'} inline ${label.disabled?'disabled':''} ${label.classes||''}`
    const L:any = label.href ? A : /* set(className).intersects(set('button clickable')) */ className.includes('button') || className.includes('clickable') ? _a : _span
    return <L href={label.href as string} className={className} onClick={func} style={toStyle(label.style)}>{text}</L>
  }
  return <ScrollText on={[label]} className='label inline'>{label}</ScrollText>
}

export const InfoBadges = withRef((props: props & {
  labels: InfoLabelType[],
  inline?: boolean, nowrap?: boolean, full?:boolean, header?: boolean,
  label_func: ()=>void,
  [key:string]: any,
}) => {
  const { labels=[], inline=false, nowrap=false, full=false, header=false, label_func=false } = props
  props = useM(props, () => unpick(props, 'inline nowrap labels label'))
  return labels.length ? <>
    <div {...props} className={`badges ${toClass({ inline, nowrap, full, header })} ${props.className}`}>
      {labels.filter(l => l).map((l, i) => <_InfoBadge key={i} label={label_func && printable_types.has(typeof(l)) ? { text:l, label:true, func:label_func } : l} />)}
    </div>
  </> : <></>
})

export const InfoLabel = ({labels, nowrap, header}: {
  labels: InfoLabelType[], nowrap?: boolean, header?: boolean,
}) => {
  return <>
    <InfoBadges {...{ labels, inline: false, header, nowrap }}/>
    <br/>
  </>
}

export const InfoUser = ({user, labels, userLabels}: {
  user: string,
  labels?: InfoLabelType[],
  userLabels?: InfoLabelType[],
}) => {
  const history = useHistory()
  labels = labels || ['user']
  userLabels = userLabels || []

  return <InfoLinks {...{
    labels,
    entries: [user],
    entryFunc: () => history.push(`/u/${user}`),
    entryLabels: [userLabels]
  }}/>
}

export const InfoSection = withRef((props: props & {
  label?: InfoLabelType,
  labels?: InfoLabelType[],
  nowrap?: boolean, under?: boolean,
  [key:string]: any,
}) => {
  const { labels=[], label, nowrap, under } = props
  if (label) labels.push(label)
  props = useM(props, () => unpick(props, 'labels label'))
  const labels_element = labels.length ? <InfoLabel {...{ labels, nowrap, header:true }} /> : null
  return <div {...props} className={'section '+(props?.className || '')}>
    {under ? null : labels_element}
    {props.children}
    {under ? labels_element : null}
  </div>
})
export const InfoLine = withRef((props: props & {
  label?: InfoLabelType,
  labels?: InfoLabelType[],
  prefix?: boolean, justify?: 'left' | 'center' | 'right',
  [key:string]: any,
}) => {
  const { labels=[], label, prefix, justify } = props
  if (label) labels.push(label)
  props.style = Object.assign(props.style || {}, justify ? toStyle(`
  width: 100%;
  display: flex;
  justify-content: ${{ left: 'start', center: 'center', right: 'end' }[justify]};
  `) : {})
  return <div {...props}
  className={`entry-line ${props.className || ''}`}>
    {prefix ? '' : props.children}
    {labels
    ? <InfoBadges {...{ labels }} inline={!prefix} />
    : ''}
    {prefix ? props.children : ''}
  </div>
})
export const InfoLines = withRef((props: props & {
  labels?: InfoLabelType[],
  lines: InfoLineType[],
  classes?: string[],
  [key:string]: any,
}) => {
  const {labels, lines, classes=[]} = props
  return <InfoSection labels={labels} {...props}>
    {lines.map((line, i) => (
      <InfoLine key={i} labels={line.labels} className={classes[i]}>
        {line.content || line}
      </InfoLine>
    ))}
  </InfoSection>
})

export const InfoEntry = withRef((props: props) => {
  return <div className='entry' {...props}>
    {props.children}
  </div>
})
export const InfoLink = withRef((props: props & {
  to?: string,
  text?: string,
  local?: boolean,
  [key:string]: any,
}) => {
  const { to, text, local: _local } = props
  const local = _local || (to && to[0] === '/')
  const className = 'entry link ' + (props.className || '')
  return (!to ?
  <a {...props} className={className}>
    {props.children || text}
  </a>
  : local || to.match(`^${window.origin}`) ?
  <Link {...props} className={className} to={to.replace(`${window.origin}`, '')} >
    {props.children || text || to}
  </Link>
  :
  <A href={to} {...props} className={className}>
    {props.children || text || to}
  </A>
  )
})
export { A }

export const InfoList = withRef((props: {
  entries: InfoEntryType[],
  labels?: InfoLabelType[],
  entryLabels?: InfoLabelType[][],
  classes?: string[],
  [key:string]: any,
}) => {
  const {entries, labels, entryLabels=[], classes} = props
  return <InfoLines {...props} {...{
    labels, classes, lines: entries.map((entry, i) => ({
      labels: entryLabels[i],
      content: (
      <InfoEntry>
        {InfoEntryToText(entry)}
      </InfoEntry>),
    }))
  }} />
})
export const InfoLinks = withRef((props: {
  entries: InfoEntryType[],
  labels?: InfoLabelType[],
  entryLabels?: InfoLabelType[][],
  classes?: string[],
  [key:string]: any,
}) => {
  const {entries, labels, entryLabels=[], classes} = props
  return <InfoLines {...props} {...{
    labels, classes, lines: entries.map((entry, i) => ({
      labels: entryLabels[i],
      content: (
      <InfoLink to={InfoEntryToData(entry)}>
        {InfoEntryToText(entry)}
      </InfoLink>),
    }))
  }} />
})
export const InfoFuncs = withRef((props: {
  entries: InfoEntryType[],
  entryFunc: (entry: InfoEntryType) => void,
  labels?: InfoLabelType[],
  entryLabels?: InfoLabelType[][],
  classes?: string[],
  [key:string]: any,
}) => {
  const {entries, entryFunc, labels, entryLabels=[], classes} = props
  return <InfoLines {...props} {...{
    labels, classes, lines: entries.map((entry, i) => ({
      labels: entryLabels[i],
      content: (
      <InfoLink onClick={() => entryFunc(InfoEntryToData(entry))}>
        {InfoEntryToText(entry)}
      </InfoLink>),
    }))
  }} />
})

export const InfoSearch = ({searchRef, placeholder, search, redirect=false}: {
  searchRef: legacyRef,
  placeholder: string,
  search?: () => void,
  redirect?: boolean
}) => {
  const page = usePage()
  return <div className='search' onFocus={redirect ? () => url.push('/search') : undefined}>
    <input ref={searchRef} type='text' placeholder={placeholder}
      autoCorrect='off' autoCapitalize='off'
      onFocus={redirect ? () => url.push('/search') : undefined}
      onKeyDown={e => e.key === 'Enter' && search()}/>
    {/* <span className='submit' onClick={search}><span>go</span></span> */}
    {/* <span className='submit' onClick={search}>go</span> */}
  </div>
}
export const InfoAutoSearch = ({searchRef, placeholder, term, search, go, tab}: {
  searchRef: legacyRef,
  placeholder: string,
  term: string,
  search: () => void,
  go: () => void,
  tab?: (dir: number) => void,
}) => {

  return <div className='search'>
    <input ref={searchRef} type='text' placeholder={placeholder}
        autoCorrect='off' autoCapitalize='off'
        value={term} onChange={search}
        onKeyDown={e => {
          if (e.key === 'Enter') go()
          if (tab && e.key === 'Tab') {
            tab(e.shiftKey ? -1 : 1)
            e.preventDefault()
          }
        }}/>
    {/* <span className='submit' onClick={go}><span>go</span></span> */}
    {/* <span className='submit' onClick={go}>go</span> */}
  </div>
}
export const InfoPageSearch = () => {
  const searchRef = useR<InputL>()
  useF(() => {
    searchRef.current?.focus()
  })
  const handle = {
    search: () => {
      const search = searchRef.current?.value
      search && url.push(`/search#${search}`)
    },
  }
  return <InfoSearch {...{searchRef, placeholder: 'find a page', search: handle.search}}/>
}

export const InfoBody = withRef((props:props) => {
  return <div {...props} className={`body ${props.className || ''}`}>
    {props.children}
  </div>
})

export const InfoLoginBlock = (props: {
  to?: string, text?: string,
  inline?: boolean, user?: string,
  [key:string]: any,
}): jsx => {
  const auth = useAuth()
  const text = props.text || `log in to ${props.to || 'view page'}`
  return (
  props.user ?? auth.user
  ? <>{props.children}</>
  : props.inline
  ? <InfoLink className={'login-block '+(props.className||'entry link')} onClick={e => openLogin()}>{text}</InfoLink>
  : <InfoStyles>
    <InfoBody>
      <InfoLine className={'login-block '+(props.className||'')} onClick={e => openLogin()}>
        <InfoLink>{text}</InfoLink>
      </InfoLine>
    </InfoBody>
  </InfoStyles>)
}
export const InfoRequireMe = withRef((props: props & {
  fallback?, [key:string]: any,
}) => {
  const searchRef = useR<HTMLInputElement>()
  const auth = useAuth()
  return (
  auth.user === 'cyrus'
  ? props.children
  : props.fallback || <InfoStyles>
      <InfoSearch {...{ searchRef, placeholder: 'find a page', redirect: true }}/>
      <InfoBody className='personal'>
          you aren't cyrus, sorry :/
      </InfoBody>
  </InfoStyles>)
})

export const InfoDeviceBlock = withRef((props: props & {
  devices: ('desktop'|'mobile'|'watch')[],
  to?: string, text?: string, key?: string
  inline?: boolean,
  [key:string]: any,
}): jsx => {
  const [unblocked, setUnblocked] = store.local.use(['device-block', props.key].filter(pass).join('-'))
  const unblock = () => setUnblocked(true)

  const text = props.text || `not intended for ${props.devices.join(' / ')} devices`
  const unblock_element = <a onClick={unblock} style={S(`
  padding: .25em; border-radius: 1em;
  background: #000e; color: #fff;
  text-decoration: none;
  white-space: pre;
  `)}> ...anyways </a>
  return (
  unblocked || !props.devices.some(device => ({ mobile:isMobile, watch:isWatch, desktop:!isMobile }[device]))
  ? <>{props.children}</>
  : props.inline
  ? <>{text}. {unblock_element}</>
  : <InfoStyles>
    <InfoBody style={S(`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    `)}>
      {text}
      <br/><br/>
      {unblock_element}
    </InfoBody>
  </InfoStyles>)
})

export const InfoButton = ({ onClick, children, inline, disabled, ...props }: {
  onClick?, children?, disabled?, inline?, [key:string]: any
}) => {
  return <button {...props} disabled={disabled} className={`action ${inline?'inline':''} ${disabled?'disabled':''} ${props.className ?? ''}`} onClick={onClick}>
    {children}
  </button>
}
export const InfoGroup = withRef((props: props) => {
  return <div {...props} className={`inline-group ${props.className??''}`}>
    {props.children}
  </div>
})

export const InfoSelect = withRef(<T,>({ label, name, value, options, setter, onChange, display=pass, inline=false, preserveCase=false, requireOption=false, ...props }: {
  label?: string, name?: string, value: T, options: T[], display?: (option:T)=>string
  onChange?: React.ChangeEventHandler<HTMLSelectElement>, setter?,
  inline?: boolean, preserveCase?: boolean, requireOption?: boolean
  [key:string]: any,
}) => <label {...props} className={'action'+(inline ? ' inline':'')}>
  {label ? `${label}: ` : ''}
  <Select {...{ name, value, options, setter, onChange, display, preserveCase, requireOption }} />
</label>)

export const Select = withRef(<T,>({
  name, value, options, setter, onChange, display=pass, preserveCase=false, requireOption=false, ...props
}: Omit<props, 'value'> & {
  name?: string, value: T, options: T[],
  onChange?: React.ChangeEventHandler<HTMLSelectElement>, setter?,
  display?: transform<T, printable>, preserveCase?: boolean
  [key:string]: any,
}) => {
  const _onChange = onChange
  onChange = e => {
    _onChange && _onChange(e)
    setter && setter(e.target.value)
  }

  // enhanced <select> UI - support for undefined, true option event values, render value as string for display
  // TODO full HTML options list
  // by default: Select displays a defined value or name if undefined, allows selection from list of options

  // include current value in options
  // if value defined and not in options
  //   if requireOptions, reassign to first option (doesn't change underlying value TODO do change?)
  //   else insert at front
  options = options || []
  let valueIndex = options.indexOf(value)
  const isOption = valueIndex > -1
  if (value && !isOption)
    if (requireOption) valueIndex = 0
    else if (value) options = [value as T].concat(options)

  // console.debug('SELECT', name, value, valueIndex, options)

  // render options
  // if 'name' defined, always insert undefined option
  // else, insert only if 'value' is undefined
  const undefinedOptionJSX = !isOption && (name !== undefined || value === undefined) ? <option value={-1}>{name ?? ''}</option> : ''
  const definedOptionsJSX = options.map((v, i) => <option key={i} value={i}>{display(v)}</option>)
  const optionsJSX = [undefinedOptionJSX, ...definedOptionsJSX]
  // <option> values are set to option indices, which then get converted to strings
  const _resolveEventValueToOption = e => {
    e.target = Object.assign({}, e.target, { value: options[Number(e.target.value)] })
    return e
  }

  // label: display value OR name
  const label = value ? display(value) : name || display(value)
  useF('SELECT LABEL', label, isOption, value, name, console.debug)
  return <label {...props} className={`select select-upper-${!preserveCase} ${props.className || ''}`}>
    {label || <>&nbsp;</>}
    <select value={valueIndex} ref={props.ref as any}
      onChange={e => onChange(_resolveEventValueToOption(e))}>
      {optionsJSX}
    </select>
    {props.children ?? ''}
  </label>
})


const groups = {}
export const InfoCheckbox = withRef(({ label, value, initial, group, inline, setter, onChange, children, ...props }: {
  label?: string, value?: boolean, initial?: boolean, group?, inline?,
  onChange?: React.ChangeEventHandler<HTMLInputElement>, setter?,
  children?, [key:string]: any,
}) => {
  return <label {...props} className={'action '+(inline?'inline ':'')+(props.className??'')}>
    <Checkbox {...{ value, initial, group, setter, onChange, ...props }} />
    {label}{label && children ? ' ' : ''}{children}
  </label>
})
export const Checkbox = withRef(({ value, initial, group, unselectable, nonexclusive, disabled, setter, onChange, ...props }: {
  value?: boolean, initial?: boolean, group?, unselectable?: boolean, nonexclusive?: boolean, // TODO range of # selected in group
  onChange?: React.ChangeEventHandler<HTMLInputElement>, setter?,
  [key:string]: any,
}) => {
  const _onChange = onChange
  onChange = e => {
    _onChange && _onChange(e)
    setter && setter(e.target.checked)
  }

  let setValue: any
  if (value === undefined) {
    [value, setValue] = useState(initial || false)
  } else useState(initial || false) // ignore
  useF(initial, () => setValue && setValue(initial))
  const [groupTrigger, id] = useM(0, 0, () => {
    if (group) {
      groups[group] = groups[group] ?? 0
      return [trigger.single(`info-checkbox-${group}`), groups[group]++]
    } else return [undefined, 0]
  })
  groupTrigger?.use((selectedId) => {
    if (!nonexclusive) {
      const checked = id === selectedId
      setValue && setValue(checked)
      onChange({ target: { checked, value: checked }} as any)
    }
  })
  return <input
  type={group && (!value || !unselectable) ? 'radio' : 'checkbox'}
  {...props} className={(props.className||'')+` info-checkbox`}
  disabled={false} checked={value}
  style={Object.assign({}, props.style, disabled ? { opacity:.5 } : undefined)}
  onChange={(e: any) => {
    if (disabled) {
      e.target.value = e.target.checked = value
      return
    }
    e.target.value = e.target.checked
    console.debug('UPDATE CHECKBOX', e.target.checked, group, !!setValue)
    onChange(e)
    // if setValue && already checked, set false
    if (setValue && value) setValue(false)
    // elif not checked && group, trigger group
    else if (groupTrigger) groupTrigger.trigger(id)
    // else if setValue, set true
    else if (setValue) setValue(true)
  }}
  name={group} />
})
export const Toggle = ({ value, initial, group, unselectable, nonexclusive, disabled, setter, onChange, ...props }: {
  value?: boolean, initial?: boolean, group?, unselectable?: boolean, nonexclusive?: boolean, // TODO range of # selected in group
  onChange?: React.ChangeEventHandler<HTMLInputElement>, setter?,
  [key:string]: any,
}) => {
  const _onChange = onChange
  onChange = e => {
    _onChange && _onChange(e)
    setter && setter(e.target.checked)
  }

  let setValue: any
  if (value === undefined) {
    [value, setValue] = useState(initial || false)
  } else useState(initial || false) // ignore
  useF(initial, () => setValue && setValue(initial))
  const [groupTrigger, id] = useM(0, 0, () => {
    if (group) {
      groups[group] = groups[group] ?? 0
      return [trigger.single(`info-checkbox-${group}`), groups[group]++]
    } else return [undefined, 0]
  })
  groupTrigger?.use((selectedId) => {
    if (!nonexclusive) {
      const checked = id === selectedId
      setValue && setValue(checked)
      onChange({ target: { checked, value: checked }} as any)
    }
  })
  const ref = useR()
  useF(async () => {
    const L = ref.current
    log('toggle', L)
    try {
      await hydrate([L], hydrates.switch)
      log('toggle hydrated', L)
    } catch (e) {
      log('toggle hydrate failed', e)
    }
  })
  return <input ref={ref}
  type={group && (!value || !unselectable) ? 'radio' : 'checkbox'}
  {...props}
  disabled={false} checked={value}
  style={Object.assign({}, props.style, disabled ? { opacity:.5 } : undefined)}
  onChange={(e: any) => {
    if (disabled) {
      e.target.value = e.target.checked = value
      return
    }
    e.target.value = e.target.checked
    console.debug('UPDATE CHECKBOX', e.target.checked, group, !!setValue)
    onChange(e)
    // if setValue && already checked, set false
    if (setValue && value) setValue(false)
    // elif not checked && group, trigger group
    else if (groupTrigger) groupTrigger.trigger(id)
    // else if setValue, set true
    else if (setValue) setValue(true)
  }}
  name={group} />
}

export const InfoSlider = ({
  value=0, setValue, onChange=pass,
  range=[0, 1],
  label=true,
  snap=undefined,
  vertical=false,
  color='#000',
  ...props
}: props & {
  snap?: number,
}) => {

  const ref = useR()

  const [_value, _setValue] = useS(value)
  useF(value, () => _setValue(Math.max(range[0], Math.min(value, range[1]))))
  setValue = setValue ?? _setValue

  const [down, setDown] = useS()
  useEventListener(window, 'pointerup', () => setDown(false))
  useEventListener(window, 'pointermove', e => {
    if (down) {
      handle.move(e)
    }
  })

  const absolute_range = range[1] - range[0]
  useF({}, () => {
    const slider_handle_label = ref.current.querySelector('.slider-handle-label')
    const slider_handle_container = ref.current.querySelector('.slider-handle-container')
    slider_handle_container.style.padding = `0 ${slider_handle_label.getBoundingClientRect().width / 2}px`
  })
  const handle = {
    move: (e) => {
      console.debug('slider', ref.current)
      const relative = eventToRelative(e, ref.current.querySelector('.slider-track-reference'))
      const raw_value = relative.normalized_bounded.x * absolute_range
      const snapped_value = snap ? Math.round((raw_value - range[0]) / snap) * snap + range[1] : raw_value
      _setValue(snapped_value)
      onChange({
        target: {
          value: snapped_value,
        },
      })
      console.debug('slider', ref.current, {relative})
    },
  }

  useGrab(down)
  return <_InfoSliderStyle ref={ref} {...props} className={`slider ${props.className??''}`} style={S(`
  color: ${color};
  ${props.style??''}
  `)}>
    <div className='slider-track' onClick={handle.move}></div>
    <div className='slider-handle-container'>
      <div className='slider-track-reference'>
        <div className='slider-handle'
        style={S(`
        color: ${readable_text(color)};
        background: ${color};
        left: ${Math.max(0, Math.min(Math.round(_value/absolute_range * 100), 100))}%;
        `)}
        onPointerDown={e => {
          setDown(true)
        }}>
          <span className='slider-handle-label'>
            {label ? <>
              <span style={S(`
              position: absolute;
              background: ${with_opacity(color, .33)};
              line-height: 1;
              height: 1em;
              `)}>
                {absolute_range > 1 ? Math.round(_value) : Math.round(_value * 100)/100}
              </span>
              <span style={S('visibility:hidden')}>{(([min, max]) => min.length > max ? min : max)(range.map(String))}</span>
            </> : null}

          </span>
        </div>
      </div>
    </div>
  </_InfoSliderStyle>
}
const _InfoSliderStyle = styled.div`
&.slider {
  width: -webkit-fill-available;
  position: relative;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  height: 1em;
  background: #0000;
  user-select: none;
  border: 0 solid currentcolor; border-width: 0 .33em;

  .slider-track {
    position: absolute;
    left: 0;
    width: 100%;
    height: .33em !important;
    opacity: .33;
    cursor: pointer;
    background: currentcolor;
  }
  .slider-handle-container {
    height: 100%; width: 100%;

    .slider-track-reference {
      position: relative;
      height: 100%; width: 100%; pointer-events: none;
      .slider-handle {
        pointer-events: all;
        position: absolute;
        height: 100%;
        width: 0;
        cursor: pointer;

        display: flex;
        align-items: center; justify-content: center; color: #fff;
        z-index: 1;

        .slider-handle-label {
          width: max-content;
          height: 1em;
          background: inherit;
          color: inherit;
          display: flex; align-items: center; justify-content: center;
          padding: .125em;
        }
        ::after {
          // content: "";
          display: block;
          position: absolute; bottom: 100%;
          width: .33em; height: 100%;
          background: #f00;
          // z-index: -1;
        }
      }
    }
  }
}
`

const _InfoFile = withRef(({
  image=false, audio=false, accept, label, setValue, multiple=false, inline, onChange, children, ...props
}: props & {
  image?:boolean, audio?:boolean, accept?:string, label?:string, multiple?:boolean,
  setValue?: consumer<File | File[]>, onChange?,
  inline?,
}) => {
  const log = useM(() => named_log('file-picker'))
  const [files, _setFiles] = useState(undefined)
  label = (files && files[0]?.name) ?? label ?? 'upload'
  props.className = `action ${inline?'inline':''} ${props.className||''}`
  props.style = merge(S(`
  height: 100%; max-height: 2em;
  font-size: 1em;
  line-height: inherit;
  `),  props.style || {})
  return <label {...props}>
    {label}{label && children ? ' ' : ''}{children}
    <input type='file' accept={accept ?? (image ? 'image/*' : audio ? 'audio/*' : '*')} style={{ visibility:'hidden', pointerEvents:'none', position:'absolute', left:0 }}
    multiple={multiple}
    onChange={e => {
      named_log(e.target.files)
      _setFiles(e.target.files)
      onChange && onChange(e)
      setValue && setValue(multiple ? [...e.target.files] : e.target.files[0])
    }} />
  </label>
})
export const InfoFile = withRef((props: props & {
  image?:boolean, accept?:string, label?:string, multiple?:boolean,
  setValue?: consumer<File>, onChange?,
  inline?,
}) => <_InfoFile {...props} multiple={false} />)
export const InfoMultiFile = withRef((props: props & {
  image?:boolean, accept?:string, label?:string, multiple?:boolean,
  setValue?: consumer<File[]>, onChange?,
  inline?,
}) => <_InfoFile {...props} multiple={true} />)


export const Countdown = ({ timestamp }) => {
  const ref = useR()
  useInterval(() => {
    if (!ref.current) return
    let diff = (timestamp - Date.now()) / 1000
    let unit = 's'
    if (diff > 60) {
      diff /= 60
      unit = 'm'
      if (diff > 60) {
        diff /= 60
        unit = 'h'
        if (diff > 24) {
          diff /= 24
          unit = 'd'
          if (diff > 7) {
            diff /= 7
            unit = 'w'
          }
        }
      }
    }
    ref.current.textContent = Math.floor(Math.max(0, diff))+unit
  }, 1000)
  return <span ref={ref} />
}

import Color from 'color'
import { trigger } from '../lib/trigger'
import { store } from '../lib/store';
import { Tooltip } from './Modal';
import { Contact } from './base/Contact';
import api, { auth } from '../lib/api';
import { copy } from '../lib/copy';
import { convertLinks } from '../lib/render';
import { download, download_text } from '../lib/download';
import css from 'src/lib/css';
import { hex, hexToRgb, readable_text, rgbToHex, with_opacity } from 'src/lib/color';
import { meta } from 'src/lib/meta';
import { Dangerous } from './individual/Dangerous';
import { openLogin } from 'src/lib/auth';
window['Color'] = Color
export const Loader = ({ color=undefined, speed=2, invert=false, ...props}) => <_Loader className='loader' style={{
  ...(color ? { color } : {}),
  animationDuration: `${speed}s`,
  mixBlendMode: 'difference',
}} {...props} />
const _Loader = styled.div`
@keyframes loader { to { transform: rotate(360deg) } }
&, &::before {
  display: inline-block;
  box-sizing: border-box;
  width: 1em; height: 1em;
  border: .2em solid transparent;
  border-radius: 50%;
  font-size: 1em;
}
& {
  border-left-color: currentcolor;
  animation: loader 2s infinite linear;
  display: inline-flex;
  align-items: center; justify-content: center;
}
&::before {
  content: "";
  position: absolute;
  border-color: currentcolor;
  opacity: .125;
}
`

export const Typed = withRef(({ text, letterMs=100, totalMs, ...props }: props & {
  text?: string, letterMs?: number, totalMs?: number
}) => {
  // return <span>{text}</span>

  text = props.children.toString() || text
  letterMs = totalMs ? totalMs / (text.length || 1) : letterMs
  const [typed, setTyped] = useState('')
  const [n, setN] = useState(0)
  useEffect(() => setN(0), [text])
  useEffect(() => {
    if (n < text.length) {
      const typed = text.slice(0, n)
      // setTyped(typed + '_')
      const timeout = setTimeout(() => {
        setTyped(typed + text[typed.length])
        setN(n + 1)
      }, rands(letterMs * .5, letterMs))
      return () => clearTimeout(timeout)
    }
  }, [n])
  return <span {...props}>{typed}</span>

  // text = props.children || text
  // letterMs = totalMs ? totalMs / (text.length || 1) : letterMs
  // const typedRef = useR()
  // const typedStateRef = useR('')
  // useF(text, () => typedStateRef.current = '')
  // useInterval(text, () => {
  //   if (text.length > typedStateRef.current.length) {
  //     typedStateRef.current += text[typedStateRef.current.length]
  //     typedRef.current.textContent = typedStateRef.current
  //   }
  // }, letterMs, 0)
  // return <span ref={typedRef}>{typedStateRef.current}</span>
})

export const WithIcon = ({
  children, icon, viewBox=undefined, ...props
}: props) => {
  return <a {...unpick(props, 'children icon')} style={S(`
  cursor: pointer;
  `)}>
    {children}
    {typeof(icon) === 'string'
    ? <span dangerouslySetInnerHTML={{__html:icon}} />
    : icon}
  </a>
  // const ParentElement = useM(() => styled.a`
  // cursor: pointer;
  // svg {
  //   height: 1em;
  // }
  // `)
  // return <ParentElement {...unpick(props, 'children icon')}>
  //   {children}
  //   {typeof(icon) === 'string'
  //   ? <span dangerouslySetInnerHTML={{__html:icon}} />
  //   : icon}
  // </ParentElement>
}

export const External = ({
  to, href, spaced=false, children, alt=false, func=url.new, target='_blank', onClick=e=>{}, ...props
}: { to?: string, href?: string, spaced?, children?, alt?, func?, target?, onClick?, [key:string]:any }) => {
  href = to || href
  if (!/https?:\/\//.test(href)) href = 'http://'+href
  const icon = useM(() => <ExternalIcon alt={alt} style={{marginLeft:spaced&&(children||to)?'.25em':''}} />)
  return <A href={href} func={func} className='center-row'>{icon}</A>
  // return <WithIcon
  // className='external'
  // target={target} rel='noreferrer'
  // href={href} {...props} style={{
  //   display:'inline-flex',
  //   alignItems:'center',
  //   justifyContent:'center',
  //   ...(props.style||{})
  // }}
  // onPointerDown={e => {
  //   if (func) {
  //     e.preventDefault()
  //     e.stopPropagation()
  //     func(href)
  //   }
  //   onClick()
  // }}
  // icon={icon}
  // >
  //   {(children || to) ? (children || to.replace(/https?:\/\//, '')) : ''}
  // </WithIcon>
}
export const ExternalIcon = ({ alt=false, ...props }) => (
  alt
  ?
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentcolor" xmlns="http://www.w3.org/2000/svg"
  {...props}
  >
    <Comment text='https://www.svgrepo.com/svg/471879/share-03' />
    <path d="M21 9.00001L21 3.00001M21 3.00001H15M21 3.00001L12 12M10 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V16.2C3 17.8802 3 18.7202 3.32698 19.362C3.6146 19.9265 4.07354 20.3854 4.63803 20.673C5.27976 21 6.11984 21 7.8 21H16.2C17.8802 21 18.7202 21 19.362 20.673C19.9265 20.3854 20.3854 19.9265 20.673 19.362C21 18.7202 21 17.8802 21 16.2V14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  :
  <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 24 24"
  {...props}
  style={{fill:'currentcolor', width:'1em', height:'1em', ...(props?.style||{})}}
  >
    <Comment text='from https://icons8.com/icons/set/external-link' />
    <path d="M 5 3 C 3.9069372 3 3 3.9069372 3 5 L 3 19 C 3 20.093063 3.9069372 21 5 21 L 19 21 C 20.093063 21 21 20.093063 21 19 L 21 12 L 19 12 L 19 19 L 5 19 L 5 5 L 12 5 L 12 3 L 5 3 z M 14 3 L 14 5 L 17.585938 5 L 8.2929688 14.292969 L 9.7070312 15.707031 L 19 6.4140625 L 19 10 L 21 10 L 21 3 L 14 3 z" />
  </svg>)

export const Comment = ({ text }: { text: string }) => {
  const ref = useR<HTMLDivElement>();
  useF(() => {
    try {
      if (ref.current.parentNode) {
        ref.current.outerHTML = `<!-- ${text} -->`
      }
    } catch {
      // Safari doesn't like that
      ref.current.innerHTML = `<!-- ${text} -->`
    }
  })
  return <div ref={ref} style={{ display:'none' }} />
};


export const Markdown = ({ text }) => {
  const __html = useM(text, () => DOMPurify.sanitize(marked.parse(text || '')) )
  return <div dangerouslySetInnerHTML={{ __html }} />
}


let darkMode = store.local.single('darkmode')
export const DarkMode = withRef(({ setDarkMode, ...props }: props & { setDarkMode? }) => {
  darkMode.use()
  useF(() => setDarkMode(darkMode.get()))
  const toggleDarkMode = () => {
    const opposite = !darkMode.get()
    darkMode.set(opposite)
    setDarkMode(opposite)
  }

  return <span onClick={toggleDarkMode} {...props} style={{
    fill: 'currentcolor',
    display: 'flex',
    alignSelf: 'center',
    cursor: 'pointer',
    ...(props.style||{})
    }}>
    {darkMode.get()
    ?
    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px"
    width="1em" height="1em"
    viewBox="0 0 30 30">    <path d="M 14.984375 0.98632812 A 1.0001 1.0001 0 0 0 14 2 L 14 5 A 1.0001 1.0001 0 1 0 16 5 L 16 2 A 1.0001 1.0001 0 0 0 14.984375 0.98632812 z M 5.796875 4.7988281 A 1.0001 1.0001 0 0 0 5.1015625 6.515625 L 7.2226562 8.6367188 A 1.0001 1.0001 0 1 0 8.6367188 7.2226562 L 6.515625 5.1015625 A 1.0001 1.0001 0 0 0 5.796875 4.7988281 z M 24.171875 4.7988281 A 1.0001 1.0001 0 0 0 23.484375 5.1015625 L 21.363281 7.2226562 A 1.0001 1.0001 0 1 0 22.777344 8.6367188 L 24.898438 6.515625 A 1.0001 1.0001 0 0 0 24.171875 4.7988281 z M 15 8 A 7 7 0 0 0 8 15 A 7 7 0 0 0 15 22 A 7 7 0 0 0 22 15 A 7 7 0 0 0 15 8 z M 2 14 A 1.0001 1.0001 0 1 0 2 16 L 5 16 A 1.0001 1.0001 0 1 0 5 14 L 2 14 z M 25 14 A 1.0001 1.0001 0 1 0 25 16 L 28 16 A 1.0001 1.0001 0 1 0 28 14 L 25 14 z M 7.9101562 21.060547 A 1.0001 1.0001 0 0 0 7.2226562 21.363281 L 5.1015625 23.484375 A 1.0001 1.0001 0 1 0 6.515625 24.898438 L 8.6367188 22.777344 A 1.0001 1.0001 0 0 0 7.9101562 21.060547 z M 22.060547 21.060547 A 1.0001 1.0001 0 0 0 21.363281 22.777344 L 23.484375 24.898438 A 1.0001 1.0001 0 1 0 24.898438 23.484375 L 22.777344 21.363281 A 1.0001 1.0001 0 0 0 22.060547 21.060547 z M 14.984375 23.986328 A 1.0001 1.0001 0 0 0 14 25 L 14 28 A 1.0001 1.0001 0 1 0 16 28 L 16 25 A 1.0001 1.0001 0 0 0 14.984375 23.986328 z"></path></svg>
    :
    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px"
    width="1em" height="1em"
    viewBox="0 0 48 48"><path d="M25,44C13.972,44,5,35.028,5,24S13.972,4,25,4c0.39,0,0.772,0.026,1.155,0.053l0.2,0.014	c0.493,0.034,0.937,0.307,1.188,0.731c0.252,0.424,0.279,0.945,0.072,1.393C26.544,8.517,26,10.976,26,13.5	c0,8.973,6.72,16.452,15.632,17.397c0.491,0.052,0.925,0.343,1.161,0.777c0.235,0.435,0.242,0.957,0.017,1.396	C39.37,39.812,32.545,44,25,44z"></path></svg>
    }
  </span>
})


export const Verified = ({ reason='' }) => {
  return <Tooltip of={reason} position={'bottom'} justify={'start'}>
    <svg fill="#000000" width="1em" height="1em" style={{fill:'currentcolor',stroke:'currentcolor',strokeWidth:'.5'}} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <Comment text={'https://www.svgrepo.com/svg/347693/check-circle'} />
      <path d="M17.28 9.28a.75.75 0 00-1.06-1.06l-5.97 5.97-2.47-2.47a.75.75 0 00-1.06 1.06l3 3a.75.75 0 001.06 0l6.5-6.5z"/><path fill-rule="evenodd" d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1zM2.5 12a9.5 9.5 0 1119 0 9.5 9.5 0 01-19 0z"/>
    </svg>
  </Tooltip>
}


export const Help = ({ children=undefined, href='', func=undefined, click=undefined, linger=undefined, tooltipStyle=undefined }) => {
  const icon =
  <svg
  width="1em" height="1em" fill="none" stroke="currentcolor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
  // style={{translate: '0 0.1em'}}
  >
    <Comment text={'https://www.svgrepo.com/svg/471510/help-circle'} />
    <path d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13M12 17H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
  return <Tooltip of={children} position={'bottom'} justify={'start'} click={click} linger={linger} tooltipStyle={tooltipStyle}>
    {func ? <span onClick={func} style={{display:'inline-flex'}}>{icon}</span> : href ? <A href={href}>{icon}</A> : icon}
  </Tooltip>
  // <svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  // </svg>
}


export const Bookmark = ({ value, setValue }) => {
  // const [checked, setChecked] = useState(false)
  return (
  <svg width="1em" height="1em" viewBox="0 0 24 24"
  stroke="currentcolor"
  preserveAspectRatio="xMinYMin"
  xmlns="http://www.w3.org/2000/svg"
  style={{
    cursor: 'pointer',
    fill: value ? 'currentcolor' : 'none',
  }}
  onClick={e => {
    // if (!value) {
    //   setChecked(true)
    //   setTimeout(() => setChecked(false), 2500)
    // }
    setValue(!value)
  }}>
    <Comment text={'https://www.svgrepo.com/svg/471100/bookmark'} />
    <path d="M5 7.8C5 6.11984 5 5.27976 5.32698 4.63803C5.6146 4.07354 6.07354 3.6146 6.63803 3.32698C7.27976 3 8.11984 3 9.8 3H14.2C15.8802 3 16.7202 3 17.362 3.32698C17.9265 3.6146 18.3854 4.07354 18.673 4.63803C19 5.27976 19 6.11984 19 7.8V21L12 17L5 21V7.8Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    {/* {checked
    ? // v
    <path d="M10.5 10.5L11.5 11.5L14 9M8.25 5H15.75C16.4404 5 17 5.58763 17 6.3125V19L12 15.5L7 19V6.3125C7 5.58763 7.55964 5 8.25 5Z" stroke-linecap="round" stroke-linejoin="round"/>
    : value
    ? // x
    <path d="M10.5 8.56L12 10.06M12 10.06L13.5 11.56M12 10.06L13.5 8.56M12 10.06L10.5 11.56M8.25 5H15.75C16.4404 5 17 5.58763 17 6.3125V19L12 15.5L7 19V6.3125C7 5.58763 7.55964 5 8.25 5Z" stroke-linecap="round" stroke-linejoin="round"/>
    : // +
    <path d="M10 10.5H14M12 8.5V12.5M8.25 5H15.75C16.4404 5 17 5.58763 17 6.3125V19L12 15.5L7 19V6.3125C7 5.58763 7.55964 5 8.25 5Z" stroke-linecap="round" stroke-linejoin="round"/>} */}
  </svg>
  )
}


export const Share = () => {
  return <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentcolor" xmlns="http://www.w3.org/2000/svg">
    <Comment text='https://www.svgrepo.com/svg/471878/share-02' />
    <path d="M7 11C6.07003 11 5.60504 11 5.22354 11.1022C4.18827 11.3796 3.37962 12.1883 3.10222 13.2235C3 13.605 3 14.07 3 15V16.2C3 17.8802 3 18.7202 3.32698 19.362C3.6146 19.9265 4.07354 20.3854 4.63803 20.673C5.27976 21 6.11984 21 7.8 21H16.2C17.8802 21 18.7202 21 19.362 20.673C19.9265 20.3854 20.3854 19.9265 20.673 19.362C21 18.7202 21 17.8802 21 16.2V15C21 14.07 21 13.605 20.8978 13.2235C20.6204 12.1883 19.8117 11.3796 18.7765 11.1022C18.395 11 17.93 11 17 11M16 7L12 3M12 3L8 7M12 3V15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
}


export const Feedback = () => {
  const Style = styled.div`
  padding: 0 !important; padding-bottom: .5em !important;
  min-width: min(30em,calc(100vw - 3rem));
  * { font-size: 16px; }
  #contact-container a, #contact-container button {
    border-bottom: 1px solid currentColor;
    text-decoration: none !important;
  }
  #contact-container a:hover, #contact-container a:active {
    text-decoration: none;
    border-color: transparent;
    box-shadow: none;
  }
  #contact-container .content, #contact-container .contact, #contact-container .send:not(:hover), #contact-container .confirmation {
    background: #fff1 !important;
  }
  #contact-container .send:not(:hover) {
    background: none !important;
    font-size: 1em;
  }
  #contact-container * {
    text-shadow: none !important;
  }
  #contact-container :is(textarea, input) {
    color: black !important;
    border: 1px solid black !important;
    font-size: 1em;
    border-radius: 2px;
    &::placeholder {
      opacity: 1;
      color: black;
      font-size: 1em;
    }
    &:focus-visible {
      outline-color: none !important;
      outline: 0 !important;
      box-shadow: 1px 1px 1px #888;
    }
  }
  #contact-container textarea {
    min-height: 20em;
  }
  #contact-container a {
    align-self: flex-end;
    border-radius: 0;
    font-size: 1.25em;
    text-transform: uppercase;
  }
  `

  return <Style className='body feedback'>
    FEEDBACK{/* {location.host + location.pathname + location.search + location.hash} feedback: */}
    <Contact newStyles />
  </Style>
}


export const Sponsor = ({ hideForSupporter=false, dark=false }) => {
  const isSupporter = useSupporter()
  const [darkmode] = store.use('darkmode')
  dark = dark || darkmode

  return (
    hideForSupporter && isSupporter
    ? null
    : <iframe
    src="https://github.com/sponsors/cfreshman/button"
    title="Sponsor cfreshman"
    height="32" width="114"
    style={{
      border: 0, borderRadius: '6px',
      filter: dark ? 'invert(1)' : '',
    }}
    ></iframe>
  )
}


export const HalfLine = ({ ratio=.5, fontSize=undefined }) => <div style={{ fontSize: fontSize ?? `${ratio}em` }}>&nbsp;</div>


export const Reorderable = ({ elements, reorder=pass, ...props }: {
  elements: any[], reorder: (order: number[])=>void, [key:string]:any
}) => {
  const source = useR()
  const [drag_i, set_drag_i] = useS(-1)
  const [move_i, set_move_i] = useS(-1)
  const drag_display = useR()
  const drag_start_ms = useM(drag_i, () => Date.now())

  const handle = {
    _reorderable: (node) => {
      while (node && !node.classList?.contains('reorderable-item')) node = node.parentNode
      return node
    },
    _target: (e:any) => {
      if (e.targetTouches) {
        return handle._reorderable(e.targetTouches[0].target)
      } else {
        return handle._reorderable(e.target)
      }
    },
    _move_drag_display: (e) => {
      let x, y
      if (e.targetTouches) {
        const touch = e.targetTouches[0]
        x = touch.clientX
        y = touch.clientY
      } else {
        x = e.clientX
        y = e.clientY
      }
      const rect = drag_display.current.getBoundingClientRect()
      drag_display.current.style.position = 'fixed'
      drag_display.current.style.left = `${x - rect.width/2}px`
      drag_display.current.style.top = `${y - rect.height/2}px`
      drag_display.current.style['pointer-events'] = 'none'
      drag_display.current.style['z-index'] = '2'
      // log(drag_display.current)
    },
    start: (e:any) => {
      const target = handle._target(e)
      source.current = target
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/html', e.currentTarget.innerHTML)
      } else {
        drag_display.current = node(target.innerHTML)
        target.parentNode.append(drag_display.current)
        handle._move_drag_display(e)
      }
    },
    reset: () => {
      if (source.current) {
        if (Date.now() - drag_start_ms < 150) {
          const element = Q(source.current, '.reorderable-item > *')
          element?.click()
        }

        source.current = undefined
        
        drag_display.current?.remove()
        drag_display.current = undefined

        set_drag_i(-1)
        set_move_i(-1)
      }
    },
    drop: (e:any, i) => {
      e.stopPropagation()

      log(e)
      if (source.current) {
        // source.current.innerHTML = e.currentTarget.innerHTML
        // e.currentTarget.innerHTML = e.dataTransfer.getData('text/html')

        const j = Number(source.current.dataset.order)
        handle.reset()

        // insert into new position, remove from old
        let order = elements.map((x, i) => i).filter(x => x !== j)
        order.splice(i, 0, j)
        log({j, order})
        reorder(order)
      }
    },
  }

  const ref = useR()
  
  useEventListener(window, 'mousemove', e => {
    if (drag_display.current) {
      handle._move_drag_display(e)
      
      const inside = window_elements.inside(ref.current, V.ne(e.clientX, e.clientY))
      if (move_i > -1 && !inside) {
        log('not over reorderable')
        set_move_i(-1)
      }
    }
  })
  useEventListener(window, 'mouseup', e => {
    if (drag_display.current) {
      if (drag_i === move_i) {
        handle.reset()
      } else if (move_i > -1) {
        handle.drop(e, move_i)
      } else {
        handle.reset()
      }
    }
  })
  const displayed_elements = elements.filter((_, i) => i !== drag_i)
  const element_order = useM(elements, drag_i, move_i, () => {
    let order = range(elements.length)
    if (move_i > -1) {
      order = order.filter(i => i !== drag_i)
      order.splice(move_i, 0, drag_i)
    }
    return order
  })
  return <_ReorderableStyle {...props} className={`reorderable ${props.className||''}`} ref={ref}
  onTouchMove={e => handle._move_drag_display(e)}>
    {element_order.map((element_i, i) => {
      const element = elements[element_i]
      return <span
      data-order={i}
      className={`reorderable-item reorderable-item-${element_i}`}
      style={element_i === drag_i ? S(`
      visibility: hidden;
      `) : undefined}
      onMouseDown={e => {
        set_drag_i(i)
        set_move_i(i)
        handle.start(e)
        handle._move_drag_display(e)
      }}
      onTouchStart={e => {
        set_drag_i(i)
        set_move_i(i)
        handle.start(e)
        handle._move_drag_display(e)
      }}
      onMouseOver={e => {
        if (!source.current) return
        set_move_i(i)
      }}
      onTouchMove={e => {
        if (!source.current) return
        const touch = e.targetTouches[0]
        const over = handle._reorderable(document.elementFromPoint(touch.clientX, touch.clientY))
        if (over) {
          log(Number(over.dataset['order']))
          set_move_i(Number(over.dataset['order']))
        } else if (!window_elements.inside(ref.current, V.ne(touch.clientX, touch.clientY))) {
          set_move_i(-1)
        }
      }}
      onTouchEnd={e => {
        if (move_i > -1 && move_i !== i) {
          handle.drop(e, move_i)
        } else {
          handle.reset()
        }
      }}
      >{element}</span>
    })}
  </_ReorderableStyle>
}
const _ReorderableStyle = styled.div`
display: flex;
flex-wrap: wrap;
row-gap: .25em;
user-select: none;
> .reorderable-item {
  cursor: pointer;
  display: flex;
}
`


export const ScrollText = withRef(({
  ms=10_000, buffer=1_000, hover=true, hoverSelector='', ...props
}: props & {
  ms:number, buffer:number, hover:boolean, hoverSelector:string, className
}) => {
  const ref = useR()
  const scrolled = useR()
  const scrolling = useR()

  const handle = {
    scroller: () => ref.current?.querySelector('.scrolled-inner'),
    reset: ms => {
      let clean = cleanTimeout(() => {
        const scroller = handle.scroller()
        if (!scroller) return
        scroller.style.transition = ''
        scroller.style.left = `0`
        scrolled.current = true
        scrolling.current = false

        if (isMobile) clean = cleanTimeout(() => clean = handle.scroll(), buffer * 2)
      }, ms)
      return () => clean()
    },
    scroll: () => {
      const scroller = handle.scroller()
      if (!scroller) return
      scroller.style.transition = ''
      scroller.style.left = `0`
      scroller.style.transition = `left ${ms}ms linear ${buffer}ms`
      scroller.style.left = `-${scroller.clientWidth - scroller.parentNode.clientWidth}px`

      scrolled.current = false
      scrolling.current = true

      return handle.reset(ms + buffer * 2)
    },
    init: () => {
      const scroller = handle.scroller()
      if (!scroller) return

      if (hover) {
        return ons(hoverSelector ? Q(hoverSelector) : scroller, {
          pointerover: (e:any) => {
            if (!scrolling.current && e.target === scroller) {
              scrolling.current = true
              scroller.style.transition = `left ${ms}ms linear`
              scroller.style.left = `-${scroller.clientWidth - scroller.parentNode.clientWidth}px`
              return handle.reset(ms + buffer)
            }
          },
          // pointerout: e => (scrolling.current && scrolled.current) && handle.reset(0),
        })
      }
    },
  }

  useTimeout(() => {
    handle.init()
    handle.scroll()
  }, 500)
  useSkip(useE, props.children, () => {
    handle.reset(0)
    handle.init()
    return handle.scroll()
  })

  return <span {...props} ref={ref} className={'scrolled '+props.className}>
    <span className='scrolled-inner' style={toStyle(`
    position: relative;
    display: inline-block;
    `)}>{props.children}</span>
  </span>
})


export const StaticImage = withRef(({
  src, ...props
}: props & {
  src: string,
}) => {
  const [loaded, setLoaded] = useState(false)
  return <img {...props} style={{
    visibility: loaded ? 'hidden' : undefined,
    ...(props.style || {}),
  }} src={src} onLoad={e => {
    setTimeout(() => setLoaded(true))
  }} />
})


export const ColorPicker = withRef(({ value, ...props }: props & { value: string }) => {
  const [_value, setValue] = useS(value)
  useF(value, setValue)

  const ref = useR()
  useF(() => console.debug('colorpicker', ref.current))
  return <div {...props} style={{
    background: _value,
    color: readable_text(_value),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    border: 0,
    ...(props.style || {}),
  }}>
    {_value}
    <input
    ref={ref}
    {...props}
    onInput={e => {
      setValue(e.currentTarget.value)
      props.onInput?.cal;(e.currentTarget.value)
    }}
    type='color'
    value={hex(_value)}
    style={{
      // visibility: 'hidden',
      opacity: .01,
      WebkitAppearance: 'none',
      position: 'absolute', top: 0, left: 0,
      width: '100%', height: '100%',
      padding: 0,
      cursor: 'pointer',
    }}/>
  </div>
})


export const Multiline = (({ ref=useR(), children, value, setValue, extra_height='0px', ...props }: props) => {
  useF(value, () => {
    const area = ref.current
    area.style.height = 0
    area.style.height = `calc(${area.scrollHeight}px + ${extra_height})`
    area.textContent = area.value = value
  })
  return setValue ? <textarea autoCapitalize={false} ref={ref} {...props} style={{...S(`
  resize: none;
  `), ...(props.style||{})}} onChange={e => {
    props.onChange && props.onChange(e)
    const l = e.currentTarget
    setTimeout(() => {
      setValue && setValue(l.value ?? l.textContent)
    })
  }}>{value}</textarea> : <div ref={ref} {...props}>{children || value}</div>
})


export const CodeBlock = withRef(({
  text=undefined, lines=[], commands=[], copy:_copy=true, download:_download=true, lang=undefined, value, setValue, children, ...props
}: props & {
  text?: string,
  lines?: (string | { result: string })[],
  commands?: { [key:string]: string }[],
  lang?: string,
  download?: boolean | string,
}) => {
  const ref = useR()
  lines = lines.length
    ? lines
    : commands.flatMap(x => Object.entries(x).flatMap(([k,v]) => [k, { result: v }, '']))
  text = text || lines.map((x:any) => x?.result ? '⇒ '+x.result : x || '').join('\n')
  text = text.replace(/^\n+/, '').replace(/\n+$/, '')

  const BUTTON_TEXT_MS = 5_000
  const [showSave, setShowSave] = useState(false)
  const copyRef = useR()
  useF(showSave, () => {
    if (showSave) copyRef.current.classList.add('active')
  })
  useTimeout(showSave, () => {
    copyRef.current?.classList.remove('active')
    setShowSave(false)
  }, BUTTON_TEXT_MS)

  const copy_content = (
    commands
    .flatMap(x => Object.keys(x))
    .join('\n').split('\n').filter(x => x[0]!=='#').join('\n')
    || ref.current?.textContent)

  useF(() => defer(() => ref.current && (ref.current.scrollLeft = 0)))

  return <_CodeBlock {...props} className={'code-container ' + (props.className || '')}>
    <div className='code-controls'>
      {showSave && _download
      ?
      <span onClick={e => {
        download_text(copy_content, _download === true ? 'index.html' : _download, e.currentTarget, BUTTON_TEXT_MS, 'saved')
      }}>save</span>
      :''}
      {_copy
      ? <span ref={copyRef} onClick={e => {
        try {
          copy(copy_content, e.currentTarget, BUTTON_TEXT_MS, 'copied')
          setShowSave(true)
        } catch {}
      }}>copy</span>
      :''}
    </div>
    <div ref={ref} className='code'>
      {convertLinks(text) || children || ' '}
    </div>
  </_CodeBlock>
})
const _CodeBlock = styled.div`
user-select: default;
overflow: auto;
::-webkit-scrollbar {
  display: none !important;
}

&.code-container {
  white-space: pre !important;
  font-size: .6rem;
  margin: .5rem 0; margin-top: 0;
  padding: .5rem;
  background: #000c;
  color: #fff;
  border-radius: .2rem;
  width: 100%;

  display: flex;
  position: relative;
  .code-controls {
    position: absolute;
    top: 0; right: 0;
    background: none;
    color: #fff;
    display: flex;
    margin: .25em;
    gap: .25em;
    overflow: visible;
  }
  .code-controls > * {
    cursor: pointer;
    border: .5px solid #fff;
    padding: 0 .25em;
    border-radius: 2px;

    &:hover, &.active {
      background: #fff;
      color: #000;
      border-color: transparent;
    }
  }
  .code {
    width: 0; flex-grow: 1;
    height: 100%;
    overflow-x: scroll;
    display: contents;
    display: inline-block;
    word-break: break-all;
    margin: 0 -.5rem; width: calc(100% + 1rem);
    padding: 0 .5rem;

    a {
      color: #8df;
    }
  }
}
`
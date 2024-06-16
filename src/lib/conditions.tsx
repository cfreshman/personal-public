import React, { useState } from 'react'
import { Checkbox, HalfLine, InfoBody, InfoButton, InfoSection, InfoStyles, Toggle } from '../components/Info'
import { Modal, openPopup } from '../components/Modal'
import api from './api'
import { auth } from './auth'
import { useE, useEventListener, useF, useM, useR, useStyle } from './hooks'
import page, { parseLogicalPath, parsePage, parseSubdomain, parseSubpage } from './page'
import { store } from './store'
import { JSX, pass } from './types'
import { S, toStyle } from './util'
import { convertLinksAndHtml } from './render'
import { usePageSettings } from './hooks_ext'

const { keys, from, entries, QQ, set, list, strings } = window as any

// I (<a href="/about">/about</a>) host this site for free. To legally protect myself:
// This is part of my personal website. To legally protect myself:
const PP_EXAMPLE = {
  'crowdmeal': [
    '<a href="/crowdmeal">/crowdmeal</a> delivery information',
    '<a href="/crowdmeal">/crowdmeal</a> deliverers'],
  'dinder': [
    '<a href="/dinder">/dinder</a> choices',
    '<a href="/dinder">/dinder</a> matches'],
  'pico-repo': [
    '<a href="/pico-repo">/pico-repo</a> posts',
    '<a href="/pico-repo">/pico-repo</a> viewers'],
}[parsePage()] || [
  '<a href="/wordbase">/wordbase</a> games & chat',
  '<a href="/wordbase">/wordbase</a> opponents']

const pptc_text = `<u>Terms of Use</u>
<i><b>site</b> refers to this website, its administration, and downstream services such as <a href="https://freshman.dev/fishbowl">wwl-watchOS</a></i>

You must ask a parent/guardian for permission to use this site if under 13

This site is provided as-is. It may go offline without notice. It may block, moderate, or delete your account. You are responsible for your conduct

<u>Privacy Policy</u>

This site stores your:
• Account information
• Page-related data (such as ${PP_EXAMPLE[0]})

To:
• Provide you access
• Show others (such as ${PP_EXAMPLE[1]})
• Send you notifications
`
// You can (under /settings):
// • Delete: Your account will erased in ≤ 5 days (excludes shared data, such as /wordbase games)
// • Download: Receive your account data in ≤ 5 days

// ${[
//   // `The site is provided without warranty or guarantee`,
//   // `It may go offline without notice`,
//   // `The site reserves the right to block or delete your account & data`,
//   // `Don't use the site if under 13 or otherwise not legally allowed to`,
//   // `It is administered from Massachusetts, USA`,
//   // `You are responsible for your conduct and for preventing yourself from harm`,
// ].map(x => `<div style="
// // margin-bottom: .5em;
// display: flex;
// ">•&nbsp;<span>${x}</span></div>`).join('')}

const stored = Object.assign({}, localStorage)
const cookie_text = `<u>Cookie Notice</u>

<b>This site stores info on your device for login and page functionality</b>

• View current items at <a href="/cookies">/cookies</a>
• What are cookies? <a href="https://gdpr.eu/cookies#:~:text=to%20the%20user.-,Preferences%20cookies,-%E2%80%94%20Also%20known%20as" target="_blank" rel="noreferrer">gdpr.eu/cookies</a> (first-party functionality cookies)

<b>The EU requires websites to ask you before storing cookies</b>

This is a sorta good thing - <b>sometimes they're used to track you</b>

But not here. Sorry for the annoying notice!
`

const conditionContents = {
  pptc: convertLinksAndHtml(pptc_text),
  cn: <div dangerouslySetInnerHTML={{ __html: cookie_text }} />,
}

/**
 * When item == false, intercepts first cookie set or login without conditions accepted
 * When item == true, returns menu item
 */
export const Conditions = ({ item=false, display=false, setChecks: outerSetChecks=pass, outerNext=undefined, ...props }) => {

  const [{ user, conditions: existing={} }] = auth.use()
  // Object.assign(existing, { conditions: {} }) // debug
  const conditionsToShow = [
    ['pptc', 'terms & privacy'],
    ['cn', 'cookies'],
    // ['is_21', '21+ (not required)'],
  ].filter(x => !existing[x[0]] && !(x[0] === 'pptc' && !user && !item)) // only show cookie policy for non-users
  const non_conditions_to_show = [
    // ['is_21', '21+'],
  ]
  // const conditionsToShow = [
  //   ['pptc', 'terms & privacy'],
  //   ['cn', 'cookies'],
  //   ['is_21', '21+ (not required)']
  // ].filter(x => !existing[x[0]] && !(['pptc', 'is_21'].includes(x[0]) && !user && !item)) // only show cookie policy for non-users
  console.debug('CONDITIONS', item, existing, conditionsToShow)

  // accepted condition state
  const [checks, setChecks] = useState({
    pptc: existing.pptc,
    cn: existing.cn,
    // is_21: existing.is_21,
  })
  useF(checks, () => outerSetChecks(checks))
  outerNext = useM(outerNext, () => outerNext || (newChecks => {
    if (user) {
      api.post('login/accept', newChecks)
    } else {
      setCookies(newChecks.cn)
    }
  })).bind(this)

  // cookies stored separately in addition to user conditions
  const cookies = existing.cn || store.local.get('accept-cookies')
  const setCookies = cookies => auth.set({ ...auth.get(), conditions: { ...existing, cn: cookies } })
  useF(cookies, () => {
    // console.debug('INNER COOKIES', value, cookies, cookieTriggerValue.get(), cookieTriggerValue)
    store.local.set('accept-cookies', cookies)
    if (!cookies) Object.keys(localStorage).forEach(k => store.local.clear(k))
  })

  const conditionsOuterStyle = `
  max-width: min(40rem, calc(100vw - 2em));
  background: var(--id-color);
  height: fit-content;`
  useStyle(`
  #conditions-container .body {
    position: relative;
    font-size: 1.1rem;
  }
  #conditions-container label {
    display: flex;
    align-items: center;
  }
  #condition-pptc, #condition-cn {
    white-space: pre-wrap;
    width: 100%;
    font-size: .75rem;
    font-family: Duospace, Courier, monospace !important;
    position: relative;
    max-width: min(40rem, calc(100vw - 2em));
    display: block;
    height: fit-content;
  }
  :is(#condition-pptc, #condition-cn) a {
    color: inherit;
  }
  :is(#conditions-container, #conditions, #condition-pptc, #condition-cn) button {
    margin: 0;
    font-size: max(1.25em, 20px);
    // border: 1px solid currentColor;
    &:last-child {
      margin-left: auto;
    }
  }
  #conditions.conditions-item {
    // font-size: .8em;
  }
  #conditions.conditions-item > div {
    display: flex;
    align-items: center;
  }
  #conditions.conditions-item > div input {
    margin: 0;
  }
  `)

  // only enable checkbox after condition has been viewed
  const [opened, setOpened] = useState({
    ...existing,
    ...(from(keys(checks).filter(k => !conditionContents[k]).map(k => [k, true]))),
  })
  const handle = {
    open: (condition) => {
      setOpened({ ...opened, [condition]: true })
      if (conditionContents[condition]) {
        openPopup(close =>
          <InfoStyles id={`condition-${condition}`}>
            {conditionContents[condition]}
            <br/><br/>
            <InfoButton id='condition-close' onClick={close} style={{
            }}>CLOSE</InfoButton>
          </InfoStyles>, conditionsOuterStyle, { block: !item })
      }
    },
  }

  // display for header menu item
  const itemContents = <div id='conditions' className={item ? 'conditions-item item info' : ''} {...props} tabIndex={0} onKeyDown={e => {
    if (e.key === 'Enter') {
      const query = () => {
        const base = document.querySelector('#conditions')
        if (!base) return
        return {
          base: [base] as HTMLElement[],
          close: [document.querySelector('#condition-close')] as HTMLElement[],
          contents: Array.from(base.querySelectorAll('#conditions > div > *')) as HTMLElement[],
        }
      }
      const L = query()
      if (!L) return
      const timeoutFocus = (type, i=0) => setTimeout(() => {
        const L = query()
        if (!L) return
        L[type][i].focus()
      })
      if (checks.cn) { // done
        outerNext()
      } else if (opened.cn) { // focus/click CN box
        if (L.contents[2] === document.activeElement) {
          L.contents[2].click()
          timeoutFocus('base')
        } else L.contents[2].focus()
      } else if (checks.pptc) { // focus/open CN link
        if (L.contents[3] === document.activeElement) {
          L.contents[3].click()
          item
          ? timeoutFocus('close')
          : timeoutFocus('contents', 2)
        } else L.contents[3].focus()
      } else if (opened.pptc) { // focus/click PPTC box
        if (L.contents[0] === document.activeElement) {
          L.contents[0].click()
          timeoutFocus('contents', 3)
        } else L.contents[0].focus()
      } else { // focus/open PPTC link
        if (L.contents[1] === document.activeElement) {
          L.contents[1].click()
          item
          ? timeoutFocus('close')
          : timeoutFocus('contents', 0)
        } else {
          L.contents[1].focus()
        }
      }
    }
  }}>
    {entries({
      'read & accept': conditionsToShow,
      // 'not required': non_conditions_to_show,
    }).map(([label, items]) => {
      return <>
        {label}:
        {/* <div dangerouslySetInnerHTML={{ __html: pptc_text }}></div>
        <div dangerouslySetInnerHTML={{ __html: cookie_text }}></div> */}
        {items.map(([condition, label]) =>
        <div key={condition} style={{whiteSpace:'pre'}} onClickCapture={() => !opened[condition] && handle.open(condition)}>
          <Toggle tabIndex={0} disabled={!opened[condition]} value={checks[condition]} onChange={e => setChecks(Object.assign({}, checks, { [condition]: e.target.checked }))}/>
          &nbsp;
          {conditionContents[condition] ? <a tabIndex={0} style={toStyle(`
          text-decoration: underline;
          `)} onClick={e => handle.open(condition)}>{label}</a> : <span>{label}</span>}
        </div>)}
      </>
    })}
  </div>

  // display for popup
  const accepted = conditionsToShow.length === 0 || (!user && cookies)
  const singular = conditionsToShow.length === 1 && conditionsToShow[0][0]
  console.debug('ACCEPTED?', accepted, singular)

  // popup open state
  const [open, setOpen] = useState(undefined)
  const path = parseLogicalPath()
  useF(user, accepted, path, () => user && page.loaded() && setOpen(!accepted))

  // intercept initial cookie assignment
  const intercepted = useR({})
  const IGNORE_INITIAL = useM(() => set('seed cookies messages-seen accept-cookies loginAuth wordbase-dict auth-expanded music-player-state login-use-google'))
  const IGNORE_INITIAL_PREFIX = useM(() => list('page-icon- use-cached- website-title- website-icon-'))
  const IGNORE_INITIAL_SUFFIX = useM(() => list('-dict'))
  useE(cookies, () => {
    if (!cookies) {
      const local = store.local as any
      const _local_set = local._set.bind(local)
      local._set = (key, value) => {
        intercepted.current[key] = value
        console.debug('INTERCEPTED', intercepted.current)
        if (value === undefined) return

        const requested = Object
          .keys(intercepted.current)
          .filter(x => 
            !IGNORE_INITIAL.has(x)
            && !IGNORE_INITIAL_PREFIX.some(y => x.startsWith(y))
            && !IGNORE_INITIAL_SUFFIX.some(y => x.endsWith(y)))
        if (requested.length) {
          setOpen(requested)
        }
        // _local_set(key, value)
      }
      return () => local._set = _local_set
    } else {
      setOpen(false)
      Object.entries(intercepted.current).map(([k, v]) => (store.local as any).set(k, v))
      intercepted.current = {}
    }
  })

  usePageSettings({
    professional: true,
  })
  return display ? <div>
    {Object.values(conditionContents).map((x, i) => <>{x}<br/></>)}
  </div> : open ? <Modal full={true} style={`
  background: #0008;
  z-index: 100100100100;
  `}>
    <InfoStyles id='conditions-container' style={toStyle(`
      // border: 1px solid black;
      border-radius: 2px;
      height: initial; width: initial;
      max-width: calc(100% - 2em);
      height: fit-content;
    `)}>
      <InfoBody style={toStyle(`
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      `)}>
        {singular
        ?
        <InfoStyles id={`condition-${singular}`}>
          {conditionContents[singular]}
          <br/>
        </InfoStyles>
        :
        itemContents
        }
        {open.length ? <InfoSection>
          <div className='row wide gap wrap' style={S(`font-size: .75rem;border:1px solid currentcolor;padding:.5em;border-radius:.25em;`)}>Triggering {strings.plural(open.length, 'cookie', 's')}: {open.join(', ')}</div>
        </InfoSection> : null}
        <HalfLine />
        <div style={toStyle(`width:100%;display:flex;justify-content:space-between`)}>
          <InfoButton style={{display:history.length?'':'none'}} onClick={e => {
            history.back()
            setOpen(false)
          }}>LEAVE (BACK)</InfoButton>
          <InfoButton disabled={singular ? false : !(checks.pptc && checks.cn)} onClick={e => {
            if (singular) checks[singular] = true
            outerNext(checks)
          }}>ACCEPT</InfoButton>
        </div>
      </InfoBody>
    </InfoStyles>
  </Modal> : item ? itemContents : null
}
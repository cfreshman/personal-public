import React from 'react'
import styled from 'styled-components'
import { HalfLine, InfoBadges, InfoBody, InfoSection, InfoSelect, InfoStyles, Select } from '../components/Info'
import { usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { asInput, useF, useInput, useM, useR, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'
import { S } from 'src/lib/util'
import { store } from 'src/lib/store'
import { Chat } from 'src/components/Chat'
import { openLogin } from 'src/lib/auth'

const { named_log, strings } = window as any
const log = named_log('plat')

const STATES = ['AL', 'AK', 'AS', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FM', 'FL', 'GA', 'GU', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MH', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'MP', 'OH', 'OK', 'OR', 'PW', 'PA', 'PR', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VI', 'VA', 'WA', 'WV', 'WI', 'WY']
const KEYS = {
  PLATE: 'plat-plate',
  STATE: 'plat-state',

  THEIR_PLATE: 'plat-their-plate',
  THEIR_STATE: 'plat-their-state',
}

const format_state_plate = (state, plate) => state && plate ? [state, plate].map(x => x.toUpperCase()).join('-') : undefined
const parse_state_plate = (server_plate) => server_plate?.split('-')
const chat_id_to_other = (chat_id, profile, delimiter=' & ') => {
  const match = /plat:([^&]+)&([^&]+)/.exec(chat_id)
  if (!match) return ''
  const plates = [match[1], match[2]]
  return plates.filter(x => x !== profile?.plate).join(delimiter) || 'self'
}

export default () => {
  const [{user:viewer}] = auth.use()
  const [plat_profile, set_plat_profile] = useS<{ user:string, plate:string, chats:string[] }>(undefined)

  const [plate, set_plate, fill_plate] = asInput(store.use(KEYS.PLATE, { default: '9vz222' }))
  const [state, set_state, fill_state] = asInput(store.use(KEYS.STATE, { default: 'MA' }))
  const state_plate = useM(plate, state, () => format_state_plate(state, plate))

  const [their_plate, set_their_plate, fill_their_plate] = asInput(store.use(KEYS.THEIR_PLATE, { default: '' }))
  const [their_state, set_their_state, fill_their_state] = asInput(store.use(KEYS.THEIR_STATE, { default: '' }))
  const their_state_plate = useM(their_plate, their_state, () => format_state_plate(their_state, their_plate))
  const [other_opened, set_other_opened] = useS(undefined)

  const [raw_chat_id, set_raw_chat_id] = usePathState()
  const chat_id = useM(raw_chat_id, () => {
    if (!raw_chat_id) return undefined
    const plates = raw_chat_id.split('&')
    return `plat:${plates.join('&')}`
  })
  const set_chat_id = (new_chat_id) => {
    log('set chat id', new_chat_id)
    set_raw_chat_id(new_chat_id && chat_id_to_other(new_chat_id, {}, '&'))
  }
  
  const handle = {
    _parse_plat_profile: (profile) => {
      log('parse', {profile})
      if (profile.plate) {
        const [state, plate] = parse_state_plate(profile.plate)
        set_state(state)
        set_plate(plate)
      }
      set_plat_profile(profile)
    },

    load: async () => {
      log('load')
      const { profile } = await api.get(`/plat`)
      handle._parse_plat_profile(profile)
    },
    save: async () => {
      log('save', state_plate)
      try {
        const { profile } = await api.post(`/plat`, { plate:state_plate })
        handle._parse_plat_profile(profile)
      } catch (e) {
        alert(e.error || e)
      }
    },
    open: async () => {
      if (their_state_plate) {
        const { id } = await api.post(`/plat/open`, { other_plate:their_state_plate })
        set_chat_id(id)
        set_other_opened(their_state_plate)
        set_their_plate(undefined)
        set_their_state(undefined)
      }
    },
  }
  useF(viewer, handle.load)

  const [count, set_count] = useS(undefined)
  const state_plate_ref = useR()
  state_plate_ref.current = state_plate
  useF(state_plate_ref.current, async () => {
    if (state_plate_ref.current) {
      const state_plate = state_plate_ref.current
      const { value:count } = await api.post('/plat/count', { plate:state_plate })
      if (state_plate_ref.current === state_plate) {
        set_count(count)
      }
    } else {
      set_count(undefined)
    }
  })

  usePageSettings({
    professional: true,
    background: '#eef',
  })
  const chat_items = useM(plat_profile, () => {
    return plat_profile?.chats.map(chat_id => ({
      id: chat_id,
      display: chat_id_to_other(chat_id, plat_profile),
    })).filter(x => x.display).sort((a, b) => a.display.localeCompare(b.display))
  })
  return <Style id='plat'>
    <InfoBody>
      <InfoSection labels={['plat: US license plate chat', '(warning - everything is public)']}>
        {/* <HalfLine /> */}
        {/* <div>your plate:</div> */}
        {/* <InfoBadges labels={[
          'your plate',
        ]} /> */}
        <div className='row gap wide'>
          <Select {...fill_state} options={STATES} />
          <input className='plate-number' {...fill_plate} />
        </div>
        <InfoBadges labels={[
          // 'your plate',
          !viewer
          ? { 'log in to save plate': () => openLogin() }
          : state_plate === plat_profile?.plate
          ? 'saved'
          : { 'save plate': () => handle.save(), label: !viewer },
          count !== undefined && `${count} ${strings.plural(count, 'chat', 's')}`
        ]} />
        <HalfLine />
        {/* <div>other plate:</div> */}
        <InfoBadges labels={[
          'their plate',
        ]} />
        <div className='row gap wide'>
          <Select {...fill_their_state} options={STATES} />
          <input className='plate-number' {...fill_their_plate} />
        </div>
        <InfoBadges labels={[
          // 'their plate',
          their_state_plate
          ? their_state_plate === other_opened ? 'opened' : { 'new chat': () => handle.open(), label: !viewer }
          : 'new chat',
        ]} />
      </InfoSection>
      {!viewer || !chat_id
      ? <InfoSection id='content-section' labels={[
        `chats for ${plat_profile?.plate || '(SAVE PLATE)'}`,
      ]}>
        <div className='row wrap gap' style={S(`
        gap: .5em;
        `)}>
          {!viewer
          ? <a onClick={() => openLogin()}>log in to view chats</a>
          : chat_items?.length
          ? chat_items.map(({ id, display }) => <a onClick={e => set_chat_id(id)}>{display}</a>)
          : 'no chats yet'}
        </div>
      </InfoSection>
      : chat_id
      ? <InfoSection id='content-section' labels={[
        // 'chat',
        // chat_id_to_other(chat_id, plat_profile),
        `chat with ${chat_id_to_other(chat_id, plat_profile)}`,
        { close: () => set_chat_id(undefined) },
      ]}>
        <div id='chat-container'>
          {chat_id ? <Chat hash={chat_id} /> : 'enter license plates above'}
        </div>
      </InfoSection>
      : null}
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`&#plat {
  .plate-number {
    text-transform: uppercase;
    // width: 10em;
  }

  > .body {
    display: flex;
    flex-direction: column;
    gap: 1em;

    input {
      border-radius: 2px !important;
    }
    input, label.action, label.select {
      height: 1.8em !important;
    }
    .gap {
      gap: 2px;
    }
  }
  #content-section {
    flex-grow: 1;
  }
  #chat-container {
    height: 100%; width: 100%;
    // background: var(--id-color-text) !important;
    // color: var(--id-color) !important;
    padding: .25em;
    border-radius: 2px;
    border: 1px solid #000;

    --id-color: #fff;
    background: var(--id-color) !important;

    &.chat-visible-false {
      display: none;
    }

    .messages {
      height: 0;
      flex-grow: 1;
      overflow: auto;
      &::-webkit-scrollbar {
        display: none;
      }
      padding-bottom: 1em;
      > * {
        margin-bottom: .1em;
      }
    }
    .edit-container {
      // margin: 0 !important;
      margin-bottom: .25em !important;
    }
    .chat-input, .chat-send {
      border: .075em solid #000 !important;
    }
    .chat-send {
      background: #000 !important;
      color: #fff !important;

      display: none;
    }
    .chat-input {
      background: var(--id-color-text) !important;
      color: var(--id-color-text-readable) !important;
    }

    .capital-word, .capitals-word {
      font-size: 1.5em;
      background: none;
      color: #000;
      padding: 0.25em;
      border-radius: 0.25em;
      text-transform: uppercase;

      padding: 0;
      border-radius: 0;

      &:is(.capital-skip, .capitals-skip) {
        color: #0004;
      }
    }
  }
}`
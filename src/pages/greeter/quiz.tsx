import React from 'react'
import styled from 'styled-components'
import { InfoBody, InfoButton, InfoLoginBlock, InfoSection, InfoStyles } from '../../components/Info'
import { usePageSettings } from 'src/lib/hooks_ext'
import { S } from 'src/lib/util'
import api, { auth } from 'src/lib/api'
import { useEventListener, useF, useM, useR, useRerender, useS, useSkip } from 'src/lib/hooks'
import { Greet } from './greet'
import { copy } from 'src/lib/copy'
import { GreeterLoginNotice } from './greeter_login_notice'
import { openLogin } from 'src/lib/auth'

const { named_log, qr, list, set, rand, range, lists, strings } = window as any
const log = named_log('greeter quiz')

export const prompts = list('animal,food,movie,place,activity,color,flower,crystal,emoji,quote,anything', ',')
export const prompt_label = (prompt) => ({
  food: 'food / drink',
  movie: 'movie / tv show / book / game',
  flower: 'flower / plant',
  crystal: 'crystal / mineral / material',
  anything: 'anything else',
}[prompt] || prompt).toUpperCase()

export const Quiz = ({ user1, user2, handle }) => {
  const [{ user:viewer }] = auth.use()
  const member = user1 === viewer || user2 === viewer
  const other = member ? (user1 === viewer ? user2 : user1) : false

  const [meet, setMeet] = useS(undefined)
  const loaded = useR(false)
  useF(user1, user2, () => handle.load_meet(user1, user2, value => {
    setMeet(value)
    if (member && !loaded.current) {
      loaded.current = true
      const viewer_quiz = value.quiz[viewer] || {}
      if (!prompts.some(prompt => viewer_quiz[prompt])) {
        // setEdit(true)
        // nvm, show other's quiz
      }
    }
  }))
  useF(meet, log)

  const user1_quiz = useM(meet, user1, () => (meet?.quiz||{})[user1]||{})
  const user2_quiz = useM(meet, user2, () => (meet?.quiz||{})[user2]||{})
  const viewer_quiz = useM(meet, viewer, () => (meet?.quiz||{})[viewer]||{})

  const quiz_counts = useM(user1_quiz, user2_quiz, () => {
    const result = {}
    log(user1_quiz, user2_quiz)
    prompts.map(prompt => {
      log(prompt)
      result[prompt] = 0
      ;[user1_quiz, user2_quiz].map(user_quiz => {
        if (user_quiz[prompt]) {
          result[prompt] += 1
        }
      })
    })
    return result
  })
  const prompt_order = useM(quiz_counts, () => {
    return prompts.sort((a, b) => quiz_counts[b] - quiz_counts[a])
  })
  useF(quiz_counts, prompt_order, log)

  const [edit, setEdit] = useS(false)
  const edit_data = useR({})
  const rerender = useRerender()
  useF(meet, () => {
    if (meet) {
      edit_data.current = strings.json.clone(meet)
    }
  })

  handle = {
    ...handle,
    save_meet: async () => {
      await handle.set_meet(edit_data.current, setMeet)
      setEdit(false)
    }
  }

  useEventListener(window, 'keydown', e => {
    if (edit && e.metaKey && e.key === 's') {
      e.preventDefault()
      handle.save_meet()
    }
  })
  
  return <>
    <InfoSection labels={[
      `${user1} & ${user2} quiz`,
      member && !edit && { edit: () => setEdit(true) },
      edit && { save: handle.save_meet },
      edit && { cancel: () => {
        setEdit(false)
      } },
      'view:',
      { 'meet': e => handle.setPath([user1, 'met', user2], e) },
      { [user1]: e => handle.setPath([user1], e) },
      { [user2]: e => handle.setPath([user2], e) },
    ]}>
    </InfoSection>
    <InfoSection labels={[
      'what _____ reminds you of them?'
    ]}>
      {edit ? <div>fill in as many or as few as you'd like</div> : <div className='card row gap' style={S(`text-transform:uppercase`)}>
        <div className='card-inner card-inner-half'>{user1}</div>
        <div className='card-inner card-inner-half'>{user2}</div>
      </div>}
      {!meet ? <div>loading quiz</div> : <>
        {prompt_order.map(prompt => edit ? <div className='card column wide'>
          <div>{prompt_label(prompt)}</div>
          <div className='row wide gap'>
            <input type='text' className='card-inner' autoCapitalize='off' placeholder={`what ${prompt_label(prompt)} reminds you of ${other}?`} value={viewer_quiz[prompt]} onChange={e => {
              viewer_quiz[prompt] = e.target.value
              edit_data.current.quiz[viewer] = viewer_quiz
              rerender()
            }}></input>
          </div>
        </div> : <div className={`card ${quiz_counts[prompt] ? '' : 'card-disabled'}`}>
          <div>{prompt_label(prompt)}</div>
          <div className='row gap'>
            <div className='card-inner card-inner-half'>
              {user1_quiz[prompt]||' '}
            </div>
            <div className='card-inner card-inner-half'>
              {user2_quiz[prompt]||' '}
            </div>
          </div>
        </div>)}
      </>}
    </InfoSection>
  </>
}

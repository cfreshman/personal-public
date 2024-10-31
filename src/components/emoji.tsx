import React from 'react'
import styled from 'styled-components'
import { InfoBadges, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { useCachedScript, usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { useF, useM, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { store } from 'src/lib/store'
import { S } from 'src/lib/util'

const { named_log, Q, entries, keys, values, defer, rand } = window as any
const NAME = 'components/emoji'
const log = named_log(NAME)

export const split_emoji = (str) => [...new Intl.Segmenter().segment(str)].map(x => x.segment)

export const use_emoji = () => {
  const [emoji, set_emoji] = useS(undefined)
  useCachedScript('/lib/2/emoji/script.js', () => {
    const { emoji } = window as any
    emoji.alert(() => {
      set_emoji(emoji)
    })
  })
  return emoji
}

export const EmojiKeyboard = ({ input_selector, add_emoji, style }: { input_selector?, add_emoji?, style? }) => {
  const emoji = use_emoji()

  const [search, set_search] = useS('')
  const [shuffle, set_shuffle] = useS(false)
  const group_name_to_class = (group_name) => 'emoji-keyboard-group-'+group_name.toLowerCase().replaceAll(' ', '-').replaceAll('&', 'and')

  const list = useM(emoji, shuffle, () => {
    if (!emoji) return []
    return shuffle ? rand.shuffle(emoji.emojis) : emoji.emojis
  })

  return <_StyleEmojiKeyboard className='emoji-keyboard column gap' style={style}>
    {emoji ? <>
      <div className='emoji-keyboard-header column gap wide'>
        <input type='text' value={search} onChange={e => set_search(e.target.value)} placeholder='search emojis' />
        <InfoBadges labels={[
          ...(shuffle ? [] : entries(emoji.groups).map(([group, emojis]) => ({ text:<span className='emoji-keyboard-section-button'>{emojis[0].emoji}</span>, func: () => {
            Q(`.${group_name_to_class(group)}`).scrollIntoView({ behavior: 'smooth', block: 'center' })
            Q('#index').scrollIntoView({ block: 'end' })
          } }))),
          // { text:<span className='emoji-keyboard-section-button'>🔀</span>, func: () => set_shuffle(!shuffle) },
        ]} />
      </div>
      <div className='emoji-keyboard-body'>
        {shuffle ? <div className='emoji-keyboard-group-body row wrap'>
          {list.filter(x => x.primary).map(x => {
            return <div className='emoji-keyboard-tile' title={x.description} onClick={e => {

              const l_input = input_selector && Q(input_selector)
              if (l_input) {
                const [start, end] = [l_input.selectionStart, l_input.selectionEnd]
                l_input.value = l_input.value.slice(0, start) + x.emoji + l_input.value.slice(end)
                l_input.selectionStart = l_input.selectionEnd = start + x.emoji.length
                defer(() => l_input.selectionStart = l_input.selectionEnd = start + x.emoji.length)
                // l_input.focus()
              }

              add_emoji && add_emoji(x.emoji)

            }}>{x.emoji}</div>
          })}
        </div>
        : entries(emoji.groups).map(([group, emojis]) => {
          const filtered = emojis.filter(x => x.description.toLowerCase().includes(search.toLowerCase()))
          if (!filtered.length) return null
          return <>
            <div className={`emoji-keyboard-group-name ${group_name_to_class(group)}`}>{group}</div>
            <div className='emoji-keyboard-group-body row wrap'>
              {filtered.filter(x => x.primary).map(x => {
                return <div className='emoji-keyboard-tile' title={x.description} onPointerDown={e => {

                  const l_input = input_selector && Q(input_selector)
                  if (l_input) {
                    const [start, end] = [l_input.selectionStart, l_input.selectionEnd]
                    l_input.value = l_input.value.slice(0, start) + x.emoji + l_input.value.slice(end)
                    l_input.selectionStart = l_input.selectionEnd = start + x.emoji.length
                    defer(() => l_input.selectionStart = l_input.selectionEnd = start + x.emoji.length)
                    // l_input.focus()
                  }

                  add_emoji && add_emoji(x.emoji)

                }}>{x.emoji}</div>
              })}
            </div>
          </>
        })}
      </div>
    </> : 'loading emoji keyboard...'}
  </_StyleEmojiKeyboard>
  // return <_StyleEmojiKeyboard className='row wrap'>
  //   {emoji ? emoji.sets.map(x => <div className='emoji-tile' onPointerDown={e => {
  //     const l_input = Q(input_selector)
  //     if (l_input) {
  //       const [start, end] = [l_input.selectionStart, l_input.selectionEnd]
  //       l_input.value = l_input.value.slice(0, start) + x[0].emoji + l_input.value.slice(end)
  //       l_input.selectionStart = l_input.selectionEnd = start + x[0].emoji.length
  //       l_input.focus()
  //     }
  //   }}>{x[0].emoji}</div>) : 'loading emoji keyboard...'}
  // </_StyleEmojiKeyboard>
}
const _StyleEmojiKeyboard = styled.div`
font-size: 1rem;
line-height: 1;
user-select: none;
background: #fff; color: #000;
border: 1px solid currentcolor;
border-radius: .25em;
padding: .25em;
height: 30em;
width: 100%;
overflow: auto;

.emoji-keyboard-header {
  position: sticky;
  top: 0;
}
.emoji-keyboard-section-button {
  font-size: 2em;
}

.emoji-keyboard-group-name {
  font-weight: bold;
}
.emoji-keyboard-group-body {
  margin-bottom: 1em;
  gap: 1px;
}
.emoji-keyboard-tile {
  font-size: 2em;
  cursor: pointer;
  &:hover:not(:active) {
    translate: 0 -2px;
  }
}
`
import React from 'react'
import styled from 'styled-components'
import { ColorPicker, InfoBadges, InfoBody, InfoButton, InfoSection, InfoSlider, InfoStyles, Select } from '../components/Info'
import { useCachedScript, usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { asInput, useF, useM, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { store } from 'src/lib/store'
import { S } from 'src/lib/util'
import { EmojiKeyboard, use_emoji } from 'src/components/emoji'

const { named_log, Q, entries, keys, values, canvases, range, devices, colors, rand } = window as any
const NAME = 'emoji banner'
const log = named_log(NAME)


const FONTS = {
  DUOSPACE: 'duospace',
  ARIAL: 'arial',
  TNR: 'times new roman',
  CURSIVE: 'cursive',
  FANTASY: 'fantasy',
  ROBOTO_MONO: 'roboto-mono',
  HIGHWAY_GOTHIC: 'highway-gothic',
  QUICKSAND: 'quicksand',
  SEVEN_SEGMENT_DISPLAY: 'seven-segment-display',
}
const font_to_actual = (key) => ({
  // 'duospace': 'Duospace',
}[key] || key)

export default () => {
  useCachedScript('https://html2canvas.hertzen.com/dist/html2canvas.min.js')
  const emoji = use_emoji()

  const emoji_list = useM(emoji, () => {
    if (!emoji) return []
    return emoji.emojis.filter(x => x.primary)
  })

  const [font, set_font] = store.use('emoji-banner-font', { default:FONTS.DUOSPACE })
  const [text, set_text, fill_text] = asInput(store.use('emoji-banner-text', { default:'🥝⭐️' }))
  const [background, set_background, fill_background] = asInput(store.use('emoji-banner-background', { default:'#000000' }))
  const [color, set_color, fill_color] = asInput(store.use('emoji-banner-color', { default:'#ffffff' }))
  const [angle, set_angle] = store.use('emoji-banner-angle', { default:350 })
  const [size, set_size] = store.use('emoji-banner-size', { default:1.6 })
  const [spacing, set_spacing] = store.use('emoji-banner-spacing', { default:.2 })

  const banner_text = useM(text, angle, () => {
    const chars = [...text]
    const SIZE = 70
    const rows = range(SIZE).map(r => range(100).map(c => chars[(r + c) % chars.length]).join(''))
    return rows.map(row => <div className='row pre'>{[...row].map(char => <span style={S(`rotate:-${angle}deg`)}>{char}</span>)}</div>)
    // return [...text.repeat(2_000)].map(x => <span>{x}</span>)
  })

  const show_font = useM(text, () => {
    // only show font if text contains non-emojis
    const non_emoji_chars = [...text].filter(x => x.length === 1).join('')
    const text_has_non_emojis = /(?!(\p{Emoji}\uFE0F|\p{Emoji_Presentation}))/ug.test(non_emoji_chars)
    return text_has_non_emojis
  })

  usePageSettings({
    expand:true,
  })
  return <Style id='emoji-banner'>
    <InfoBody className='column'>
      <InfoSection className='column grow' labels={[
        NAME,
        { save: () => {
          const { html2canvas } = window as any
          html2canvas(Q('#emoji-banner-banner')).then(canvas => {
            canvases.download(canvas, 'emoji-banner.png')
          })
        } },
        devices.is_mobile && 'note: works best on desktop',
      ]}>
        <div id='emoji-banner-banner' style={S(`
        background: ${background};
        color: ${color};
        font-family: ${font_to_actual(font)};
        `)}>
          <div id='emoji-banner-banner-inner' className='column wrap' style={S(`
          font-size: ${size}em;
          rotate: ${angle}deg;
          gap: ${spacing}em;
          `)}>{banner_text}</div>
        </div>
        <div className='center-row gap'>
          colors:
          {show_font ? <InfoButton><ColorPicker value={color} setValue={set_color} /></InfoButton> : null}
          <InfoButton><ColorPicker value={background} setValue={set_background} /></InfoButton>
          {show_font ? <InfoButton onClick={() => {
            set_color(background)
            set_background(color)
          }}>swap</InfoButton> : null}
          <InfoButton onClick={() => {
            const new_background = colors.random()
            set_background(new_background)
            set_color(colors.hex_readable(new_background))
          }}>random</InfoButton>
        </div>
        {show_font ? <div className='center-row gap'>
          font:
          <Select value={font} setter={set_font} options={values(FONTS)} />
        </div>
        : null}
        <div className='center-row wide gap'>
          <label>angle:</label>
          <InfoSlider value={angle} setValue={set_angle} range={[0, 360]} snap={5} />
        </div>
        <div className='center-row wide gap'>
          <label>size:</label>
          <InfoSlider value={size} setValue={set_size} range={[1, 10]} snap={.1} />
        </div>
        <div className='center-row wide gap'>
          <label>spacing:</label>
          <InfoSlider value={spacing} setValue={set_spacing} range={[0, 3]} snap={.1} />
        </div>
        <div id='emoji-banner-input-container' className='row wide gap'>
          <input id='emoji-banner-input' {...fill_text} />
          <InfoButton onClick={() => {
            const length = rand.i(1, 3)
            const emojis = range(length).map(() => rand.sample(emoji_list).emoji)
            set_text(emojis.join(''))
          }}>🎲</InfoButton>
        </div>
        <EmojiKeyboard input_selector={'#emoji-banner-input'} add_emoji={emoji => set_text(Q('#emoji-banner-input').value)} style={S(`
        height: 0;
        min-height: 20em;
        flex-grow: 1;
        `)} />
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
#emoji-banner-banner {
  margin: 1px;
  box-shadow: 0 0 0 1px #000;
  width: calc(100% - 2px);
  height: auto;
  aspect-ratio: 3/1;
  overflow: hidden;
  
  font-size: 100%;
  
  display: flex; align-items: center; justify-content: center;
  position: relative;
  #emoji-banner-banner-inner {
    position: absolute;
    height: max(150vw, 150vh); width: max(150vw, 150vh);
    transform-origin: center;
    display: flex; align-items: center; justify-content: center;
    line-height: 1;

    > div {
      gap: inherit; 
    }
  }
}

#emoji-banner-input-container {
  align-items: stretch;
  > * {
    font-size: 3em;
  }
}

`
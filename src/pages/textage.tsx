import React from 'react'
import styled from 'styled-components'
import { ColorPicker, HalfLine, InfoBody, InfoButton, InfoCheckbox, InfoSection, InfoSelect, InfoSlider, InfoStyles, Multiline } from '../components/Info'
import { useCachedScript, usePageSettings, usePathState } from 'src/lib/hooks_ext'
import { asInput, useF, useS } from 'src/lib/hooks'
import api from 'src/lib/api'
import { store } from 'src/lib/store'
import { S } from 'src/lib/util'

const { Q, named_log, keys, values, node, colors, devices } = window as any
const NAME = 'textage'
const log = named_log(NAME)

const FONTS = {
  ARIAL: 'Arial',
  TNR: 'Times New Roman',
  CURSIVE: 'cursive',
  FANTASY: 'fantasy',
  ROBOTO_MONO: 'roboto-mono',
  HIGHWAY_GOTHIC: 'highway-gothic',
  QUICKSAND: 'quicksand',
  SEVEN_SEGMENT_DISPLAY: 'seven-segment-display',
  PIXEL: 'pixel',
}
const ALIGN = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
}

const PRESETS = {
  BRAT: {
    font: FONTS.ARIAL,
    bold: false,
    italic: false,
    color: '#000000',
    background: '#03ff62',
  },
  POOP: {
    font: FONTS.QUICKSAND,
    bold: true,
    italic: false,
    color: '#895a34',
    background: '#402d1c',
  },
}

export default () => {
  const [text, set_text, fill_text] = asInput(store.use('textage-text', { default:`hello fucker` }))
  
  const [font, set_font] = store.use('textage-font', { default:FONTS.ARIAL })
  const [bold, set_bold] = store.use('textage-bold', { default:false })
  const [italic, set_italic] = store.use('textage-italic', { default:false })
  const [align, set_align] = store.use('textage-align', { default:ALIGN.CENTER })
  const [color, set_color, fill_color] = asInput(store.use('textage-color', { default:'#000000' }))
  const [background, set_background, fill_background] = asInput(store.use('textage-background', { default:'#ffffff' }))
  const [angle, set_angle] = store.use('textage-angle', { default:0 })
  // const [padding, set_padding] = store.use('textage-padding', { default:.5 })
  const [size, set_size] = store.use('textage-size', { default:3 })

  const handle = {
    preset: (preset)  => {
      if (preset) {
        const { font, bold, italic, align, color, background, angle, size } = PRESETS[preset]
        ;[
          [font, set_font],
          [bold, set_bold],
          [italic, set_italic],
          [align, set_align],
          [color, set_color],
          [background, set_background],
          [angle, set_angle],
          [size, set_size],
        ].map(([value, setter]) => value !== undefined && setter(value))
      }
    }
  }
  
  usePageSettings()
  return <Style>
    <InfoBody>
      <InfoSection labels={[NAME]}>
        <Multiline {...fill_text} />
        <div className='row gap wrap'>
          <InfoSelect label='font' value={font} setter={set_font} options={values(FONTS)} />
          {/* <InfoCheckbox label='bold' value={bold} setter={set_bold} />
          <InfoCheckbox label='italic' value={italic} setter={set_italic} />
          <InfoSelect label='align' value={align} setter={set_align} options={values(ALIGN)} /> */}
        </div>
        <div className='row gap wrap'>
          {/* <InfoSelect label='font' value={font} setter={set_font} options={values(FONTS)} /> */}
          <InfoSelect label='align' value={align} setter={set_align} options={values(ALIGN)} />
          <InfoCheckbox label='bold' value={bold} setter={set_bold} />
          <InfoCheckbox label='italic' value={italic} setter={set_italic} />
        </div>
        <div className='center-row gap'>
          colors:
          <InfoButton><ColorPicker value={color} setValue={set_color} /></InfoButton>
          <InfoButton><ColorPicker value={background} setValue={set_background} /></InfoButton>
          <InfoButton onClick={() => {
            set_color(background)
            set_background(color)
          }}>swap</InfoButton>
          <InfoButton onClick={() => {
            const new_background = colors.random()
            set_background(new_background)
            set_color(colors.hex_readable(new_background))
          }}>random</InfoButton>
        </div>
        <div className='center-row wide gap'>
          <label>angle:</label>
          <InfoSlider value={angle} setValue={set_angle} range={[0, 360]} />
        </div>
        {/* <div className='center-row wide gap'>
          <label>padding:</label>
          <InfoSlider value={padding} setValue={set_padding} range={[0, 3]} />
        </div> */}
        <div className='center-row wide gap'>
          <label>size:</label>
          <InfoSlider value={size} setValue={set_size} range={[0, 10]} />
        </div>
        {/* <HalfLine /> */}
        <div className='middle-row wide' style={S(`
        background: #0002;
        `)}>
          <div id='textage-raw' style={S(`
          ${devices.is_mobile ? `` : `
          max-width: 50vh;
          `}

          font-size: ${size}em;
          background: ${background};
          color: ${color};
          display: flex; align-items: center; justify-content: center;
          width: 100%; aspect-ratio: 1/1; height: auto;
          border: 1px solid #000;
          padding: ${.5}em;
          overflow: hidden;
          `)}>
            <span style={S(`
            rotate: ${angle}deg;
            font-family: ${font};
            font-weight: ${bold ? 'bold' : 'normal'};
            font-style: ${italic ? 'italic' : 'normal'};
            text-align: ${align};
            
            white-space: pre-wrap;
            max-width: 100%;
            word-break: break-word;
            line-height: 1.1;
            `)}>{text}</span>
          </div>
        </div>
        <div>screenshot, crop, send</div>
        <HalfLine />
        <div>
          <InfoSelect label='switch to preset' options={keys(PRESETS)} value={undefined} setter={handle.preset} />
        </div>
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
`
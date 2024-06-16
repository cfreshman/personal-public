import { tone } from 'src/lib/audio'
import { S, bound, bounds, eventToRelative, group, named_log, norm, ons, range } from 'src/lib/util'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoSlider, InfoStyles } from '../components/Info'
import { asInput, useF, useInput, useList, useM, useR, useS } from '../lib/hooks'
import { fs } from 'src/lib/types'
import { store } from 'src/lib/store'


const log = named_log('noise')
const DEFAULT_TONE_MS = 55 * 60 * 1_000

const W = 120
const scale = [W, W/3]
export default () => {
  const [noises, setNoises, addNoises] = useList<{pitch,volume,ms}>([])
  const [play, setPlay] = useS(false)

  // useF(() => addNoises(range(120, 10).map(x => ((x, y) => ({ pitch:x, volume:y, ms:1e10 }))(x, 1 - Math.abs(W/2 - x)/(W/2)))))
  useF(() => addNoises(range(8).map(x => ((y, x) => ({ pitch:x, volume:y, ms:1e10 }))(x, 1 - Math.abs(W/2 - x)/(W/2)))))
  useF('noises', noises, console.debug)

  const ref = useR<HTMLCanvasElement>()
  useF(noises, () => {
    const canvas: HTMLCanvasElement = ref.current
    
    canvas.width = scale[0]
    canvas.height = scale[1]
    canvas.style.imageRendering = 'pixelated'
    const ctx = (ref.current as HTMLCanvasElement).getContext('2d')
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#000'

    const pitch_bounds = bounds(noises.map(x => x.pitch))
    const volume_bounds = bounds(noises.map(x => x.volume))

    noises
    .map(({pitch,volume}) => ctx.fillRect(
      Math.floor(norm(pitch_bounds, pitch) * scale[0]), Math.floor(scale[1] - norm(volume_bounds, volume) * scale[1]),
      1, 1))
  })

  // const tones = useM(noises, () => noises.map(({pitch,volume,ms}) => tone(pitch, volume, ms)))
  // useF(tones, play, () => play ? tones.map(x => x.play()) : tones.map(x  => x.stop()))

  const [ms, setMs, bindMs] = asInput(store.local.use('noise-ms', { default: DEFAULT_TONE_MS } ))
  const [_vol, setVol, bindVol] = asInput(store.local.use('noise-volume', { default: 15 }))
  const vol = _vol / 10

  const prev_tones = useR()
  const tones = useM(play, noises, () => noises.map(({pitch,volume,ms}) => tone(pitch, volume, ms)))
  useF(tones, () => {
    prev_tones.current?.map(t => t.stop())
    prev_tones.current = tones
  })

  console.debug(tones)
  // useF(play, tones, () => tones.smap(play ? '.start()' : '.stop()'))
  useF(play, tones, () => tones.map(x => play ? x.start() : x.stop()))
  useF(vol, tones, () => tones.smap(`.volume(${vol/10})`))

  const [tested, setTested] = useS(false)
  const handle = {
    test: noises => {
      ;(tested ? addNoises : setNoises)(noises)
      setTested(true)
      setPlay(true)
    },
  }

  useF({}, () => {
    let down = false
    const ctx = (ref.current as HTMLCanvasElement).getContext('2d')
    const canvasNoiseAdd = (e) => {
      if (down) {
        const {normalized} = eventToRelative(e, ref.current)
        // ctx.fillRect(
        //   normalized.x * scale[0], normalized.y * scale[1],
        //   1, 1)

        const pitch_bounds = bounds(noises.map(x => x.pitch))
        const volume_bounds = bounds(noises.map(x => x.volume))
        addNoises([{
          pitch: normalized.x*pitch_bounds[2]+pitch_bounds[0],
          volume: (1-normalized.y)*volume_bounds[2]+volume_bounds[0],
          ms,
        }])
      }
    }
    return [
      ...ons(ref.current, {
        pointerdown: e => {
          down = true
          canvasNoiseAdd(e)
        },
        pointermove: canvasNoiseAdd,
      }),
      ...ons(window, {
        pointerup: () => down = false,
      })
    ]
  })

  return <Style>
    <InfoBody>
      <InfoSection>
        <input {...bindMs} />
        <InfoSlider range={[0, 100]} {...bindVol} />
      </InfoSection>
      <InfoSection labels={[
        play ? 'start' : { start: () => setPlay(true) },
        !play ? 'stop' : { stop: () => setPlay(false) },
        { reset: () => {
          setNoises([])
          setPlay(false)
          setTested(false)
        } },
        { test: () => handle.test([{pitch:440, volume:1, ms: 500}]) },
        { test2: () => handle.test(
          range(220, 880, 10)
          .map(x => ((y, x) => ({ pitch:y, volume:(y/10+.1), ms }))(x, 1 - Math.abs(W/2 - x)/(W/2)))
        )},
        { test3: () => handle.test(
          range(8)
          .map(x => ((y, x) => ({ pitch:30 * y, volume:(y/10+.1), ms }))(x, 1 - Math.abs(W/2 - x)/(W/2)))
        ) },
      ]}>
        <canvas ref={ref} />
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
canvas {
  width: 100%;
  border: 1px solid #222;
  border-radius: 0;
  image-rendering: pixelated;
  cursor: pointer;
}

.button, .label {
  border-radius: 0 !important;
}
`
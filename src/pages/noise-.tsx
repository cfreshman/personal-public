import { tone } from 'src/lib/audio'
import { S, bound, bounds, group, named_log, norm, range } from 'src/lib/util'
import styled from 'styled-components'
import { InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { useF, useList, useM, useR, useS } from '../lib/hooks'
import { fs } from 'src/lib/types'


const log = named_log('noise')

const W = 512
export default () => {
  const [noises, setNoises, addNoises] = useList<{pitch,volume,ms}>([])
  const [play, setPlay] = useS(false)

  const ref = useR<HTMLCanvasElement>()
  useF(noises, () => {
    const canvas: HTMLCanvasElement = ref.current
    const scale = [W, 128]
    canvas.width = scale[0]
    canvas.height = scale[1]
    const ctx = (ref.current as HTMLCanvasElement).getContext('2d')
    ctx.fillStyle = '#000'

    const pitch_bounds = bounds(noises.map(x => x.pitch))
    const volume_bounds = bounds(noises.map(x => x.volume))

    noises
    .map(({pitch,volume}) => ctx.fillRect(
      Math.floor(norm(pitch_bounds, pitch) * scale[0]), Math.floor(scale[1] - norm(volume_bounds, volume) * scale[1]),
      4, 4))
  })

  const tones = useM(noises, () => noises.map(({pitch,volume,ms}) => tone(pitch, volume, ms)))
  const handle = {
    play: (noises=undefined) => {
      setPlay(true)
      tones.map(x => x.play())
    },
    stop: () => {
      setPlay(false)
      tones.map(x  => x.stop())
    },
  }
  useF(tones, play, () => play ? handle.play() : handle.stop())

  useF(() => addNoises(range(8).map(x => ((y, x) => ({ pitch:x, volume:y, ms:1e10 }))(x, 1 - Math.abs(W/2 - x)/(W/2)))))
  useF('noises', noises, console.debug)

  return <Style>
    <InfoBody>
      <InfoSection labels={[
        play ? 'start' : { start: handle.play },
        !play ? 'stop' : { stop: handle.stop },
        { test: () => {
          setNoises([{ pitch:440, volume:1, ms:500 }])
          setPlay(true)
        } },
        { test2: () => {
          setNoises(
            range(220, 880, 10)
            .map(x => ((y, x) => ({ pitch:x, volume:y, ms:1e10 }))(x, 1 - Math.abs(W/2 - x)/(W/2))))
          setPlay(true)
        } },
        { test3: () => {
          setNoises(
            range(8)
            .map(x => ((y, x) => ({ pitch:x, volume:1/(y+1), ms:1e10 }))(x, 1 - Math.abs(W/2 - x)/(W/2))))
          setPlay(true)
        } },
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
}

.button, .label {
  border-radius: 0 !important;
}
`
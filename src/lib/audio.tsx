import { consumer, fs } from "./types"

const actx = new AudioContext()
export const tone = (pitch, volume, ms): OscillatorNode & {
  volume: consumer<number>,
} => {
  const gain = new GainNode(actx, { gain: volume })
  return fs(
    new OscillatorNode(actx, {
      frequency: pitch,
    })
  )
  // .with(.connect(new GainNode(actx, { gain: volume })))
  // ooo .filter(x=>x) => .filter(.)
  .with(x=>x
    .connect(gain)
    .connect(actx.destination)
  )
  .then(x => {
    const _start = x.start.bind(x)
    return Object.assign(x, {
      start: (...a) => {
        _start(...a)
        console.debug(x)
        setTimeout(() => x.stop(), ms)
      },
      volume: (ratio => {
        gain.gain.setValueAtTime(volume * ratio, actx.currentTime)
      })
    })
  })
  .value

}
// Decode 1d streams (audio, video) as Morse Code
import React, { useState } from 'react'
import { useF, useInput, useM, useR, useSkip } from '../lib/hooks'
import { store } from '../lib/store'
import { JSX, truthy } from '../lib/types'
import { end, isMobile, node, toStyle, transposeMap } from '../lib/util'
import styled from 'styled-components'
import { CodeBlock, InfoBody, InfoLabel, InfoSection, InfoStyles } from '../components/Info'

/**
 * dot - 1
 * dash - 3
 * b/n units - 1
 * b/n characters - 3
 * b/n words - 7
 */

// dot: 0, dash: 1
const MorseCode = {
  'A': '01',
  'B': '1000',
  'C': '1010',
  'D': '100',
  'E': '0',
  'F': '0010',
  'G': '110',
  'H': '0000',
  'I': '00',
  'J': '0111',
  'K': '101',
  'L': '0100',
  'M': '11',
  'N': '10',
  'O': '111',
  'P': '0110',
  'Q': '1101',
  'R': '010',
  'S': '000',
  'T': '1',
  'U': '001',
  'V': '0001',
  'W': '011',
  'X': '1001',
  'Y': '1011',
  'Z': '1100',
  '0': '11111',
  '1': '01111',
  '2': '00111',
  '3': '00011',
  '4': '00001',
  '5': '00000',
  '6': '10000',
  '7': '11000',
  '8': '11100',
  '9': '11110',
  '.': '010101',
  ',': '110011',
  '/': '10010',
  ':': '111000',
  '@': '011010',
  '%': '111111001011111',
  '-': '100001',
  '+': '01010',
  '=': '10001',
  '&': '01000',
  '!': '101011',
  '?': '001100',
  '"': '010010',
  '\'': '011110',
  '(': '10110',
  ')': '101101',
}
const ToMorseCode = MorseCode
const FromMorseCode = transposeMap(MorseCode)

const sum = x => x.reduce ? x.reduce((a,v)=>a+v, 0) : 0
const average = x => sum(x) / x.length

const isDotAndDashString = x => typeof(x) === 'string' && [...new Set(x + '.- ')].sort().join('') === '.- '.split('').sort().join('')
const fromBinaryToDotAndDashString = x => x.split('').map(y => ({'0':'.','1':'-'}[y] || y)).join('')
const toDotAndDashString = input => isDotAndDashString(input) 
  ? input 
  : (Array.isArray(input) ? input.join('') : input)
    .toUpperCase()
    .split(' ')
    .map(x => 
      x
      .split('')
      .map(y => fromBinaryToDotAndDashString(ToMorseCode[y]) || ' ')
      .join(' '))
    .join('   ')

const toEncodedInput = x => Array.isArray(x) && typeof(x[0]) === 'number' ? x :
  toDotAndDashString(x)
  .split('')
  .map(x => x === '.' ? '10' : x === '-' ? '1110' : '0000')
  .join('')
  .split('')
  .map(x => Number(x))

export default () => {
  const saved = useM(() => Object.assign({
    // textInput: '.. -. .--. ..- -',
    textInput: 'abcdefghijklmnopqrstuvwxyz. 0123456789',
    history: [],
  }, store.get('morse-save') || {}))

  const [history, setHistory] = useState<[number[] | string, string][]>(saved.history)
  const [input, setInput] = useState<number[] | string>(history.length ? '' : toEncodedInput('hello'))
  const [output, setOutput] = useState<string>('')

  const [textInput, setTextInput, bindTextInput] = useInput(saved.textInput)
  const encodedTextInput = useM(textInput, () => toEncodedInput(textInput))
  useF('TEXT INPUT', textInput, toDotAndDashString(textInput), encodedTextInput, console.debug)
  useF(textInput, () => setOutput(handle.decode(encodedTextInput)[0]))
  useF(textInput, history, () => store.set('morse-save', {
    textInput, history
  }))

  const methodUpdateRequest = useR()
  const [inProgress, setInProgress] = useState<string | false>(false)
  useF('IN PROGRESS', inProgress, console.debug)
  const handle = {
    decode: (input, min_count=undefined) => {
      console.debug(input)
      input = toEncodedInput(input)
      const average_input = average(input)
      console.debug(
        'DECODE', average_input, 
        Math.ceil(100 * input.filter(x => x > average_input).length / input.length))

      let output = []
      let word = ''
      let counts = []
      let last = undefined, count = 0, decodes = [], all_counts = []
      min_count = min_count ?? input.length
      for (let i = 0; i < input.length; i++) {
        const value = input[i] > average_input / 4
        if (last !== undefined && value !== last) {
          if (last === false) {
            decodes.push([count, counts])
            min_count = Math.min(...counts, min_count)
            counts = []
          } else {
            counts.push(count)
          }
          count = 1
        } else {
          count += 1
        }
        last = value
        if (i === input.length - 1 && value) counts.push(count)
      }
      decodes.push([count, counts])

      console.debug('DECODE unit', min_count, decodes)
      const _decodeCharacter = (final=false) => {
        // 3 time units between characters
        console.debug(count > min_count * 2.5 || final, min_count, count, counts)
        if (count > min_count * 2.5 || final) {
          all_counts.push([count, counts])
          counts = []
        }
      }
      counts = []
      decodes.map(x => {
        count = x[0]
        counts.push(...x[1])
        _decodeCharacter()
      })
      _decodeCharacter(true)

      all_counts.map(([count, counts], i, a) => {
        const str = counts.map(x => x > min_count * 2 ? 1 : 0).join('')
        const character = FromMorseCode[str]
        console.debug(character, fromBinaryToDotAndDashString(str), counts)
        if (character) word += character
        // 7 time units between words
        if (count > min_count * 6 || i === a.length - 1) {
          output.push(word)
          word = ''
        }
      })

      return [output.join(' '), min_count]
    },
    end: () => {
      setInput(encodedTextInput)
      cancelAnimationFrame(methodUpdateRequest.current)
      methodUpdateRequest.current = undefined
    },
    stream: (update, evaluate) => {
      const osc = document.getElementById("oscilloscope") as HTMLCanvasElement
      const oscCtx = osc.getContext("2d")
      const bin = document.getElementById("binary") as HTMLCanvasElement
      const binCtx = bin.getContext("2d")
      const canvases: [HTMLCanvasElement, CanvasRenderingContext2D][] = [[osc, oscCtx], [bin, binCtx]]

      let last = Date.now()
      setOutput('')
      let textInput = ''
      let magnitude_data = [], min_count = undefined, min_magnitude = undefined
      let prev_i = 0
      function draw() {
        const magnitude = update()
        if (magnitude < Infinity) {
          if (min_magnitude === undefined || magnitude < min_magnitude) {
            const difference = min_magnitude - magnitude
            magnitude_data = magnitude_data.map(x => x + difference)
            min_magnitude = magnitude
          }
          magnitude_data.push(magnitude - min_magnitude)
        }
        const scale = Math.max(...magnitude_data)
        let bin_data = magnitude_data.map(x => evaluate(x, scale))
        if (end(bin_data)) last = Date.now()

        // try to decode every 1s
        if (Date.now() - last > 1_000) {
          // magnitude_data = magnitude_data.slice(prev_i)
          // bin_data = bin_data.slice(prev_i)
          // prev_i = magnitude_data.length

          last = Date.now()
          const start = bin_data.findIndex(truthy)
          const end = bin_data.slice().reverse().findIndex(truthy)
          const bin_data_active = bin_data.slice(start, -end)

          let words
          ;[words, min_count] = handle.decode(bin_data_active, min_count)
          if (words.length) {
            const dotsAndDashes = toDotAndDashString(words)
            textInput = [textInput, dotsAndDashes].filter(truthy).join('   ')
            setInput(textInput)
          }
          magnitude_data = []
          bin_data = []
        }
        methodUpdateRequest.current = requestAnimationFrame(draw)

        // clear canvas
        canvases.map(([canvas, ctx]) => {
          ctx.fillStyle = 'white'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.fillStyle = 'black'
        })
        const slice_width = (osc.width * 1.0) / magnitude_data.length
        
        // plot volume
        for (let i = 0, x = 0; i < magnitude_data.length; i++, x += slice_width) {
          const y = magnitude_data[i] / scale * osc.height
          oscCtx.fillRect(Math.ceil(x), osc.height - y, Math.ceil(slice_width), y)
        }

        // plot binary
        for (let i = 0, x = 0; i < bin_data.length; i++, x += slice_width) {
          const y = bin_data[i] * bin.height
          binCtx.fillRect(Math.ceil(x), bin.height - y, Math.ceil(slice_width), y)
        }
      }
      draw()
    },
  }
  useF(input, inProgress, () => {
    console.debug('INPUT', input, inProgress)
    const output = handle.decode(input)[0]
    setOutput(output)
    if (!inProgress) {
      if (output.trim()) {
        if (!history.length || output !== history.slice(-1)[0][1]) {
          setHistory(history.concat([[input, output]]))
        }
      }
    }
  })
  useSkip(useF, inProgress, () => handle.end())

  const history_element = useM(history, () => {
    return history.slice().reverse().map(([history_input, history_output], i) => {
      const average_history_input = average(history_input)
      const h_i = history.length - 1 - i
      return <>
        <InfoSection labels={[
          'input',
          { remove: () => setHistory([].concat(history.slice(0, h_i), history.slice(h_i + 1))) },
        ]}>
          <CodeBlock text={typeof(history_input) === 'string'
          ? history_input
          : history_input.map(x => x > average_history_input ? '-' : '_').join('')} />
        </InfoSection>
        <InfoSection labels={[
          'output'
        ]}>
          <CodeBlock lines={isDotAndDashString(history_input) ? [history_output] : [
            history_output.split(' ').map(x => x.split('').map(y => ToMorseCode[y].split('').map(x => ({'0':'.','1':'-'}[x])).join('')).join(' ')).join('   '),
            history_output,
          ]} />
        </InfoSection>
      </>
    })
  })

  return <Style id='morse'>
    <InfoBody>
      <InfoSection labels={[
        // 'input'
      ]}>
        <input type='text' {...bindTextInput} disabled={!!inProgress} />
        <InfoLabel labels={inProgress ? [
          { text: 'text', func: ()=>{}, disabled: true },
          { microphone: () => setInProgress(false), disabled: inProgress !== 'microphone' },
          { camera: () => setInProgress(false), disabled: inProgress !== 'camera' },
        ] : [
          { text: 'text', func: () => setInput(textInput) },
          // { audio: () => {} },
          // { video: () => {} },
          { microphone: async () => {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
            })
            const audio = stream.getAudioTracks()[0]
            if (audio) {
              setInProgress('microphone')
              const context = new (window['AudioContext'] || window['webkitAudioContext'])({
                sampleRate: 96000,
              })
              const source = context.createMediaStreamSource(stream)

              const analyzer = context.createAnalyser()
              analyzer.fftSize = 2048
              source.connect(analyzer)
              
              const frequencyArray = new Float32Array(analyzer.fftSize)
              handle.stream(() => {
                analyzer.getFloatTimeDomainData(frequencyArray)
                const volume = Math.sqrt(average(frequencyArray.map(x => x * x)))
                return volume
              }, (volume, scale) => {
                return volume > scale / 6 ? 1 : 0
              })
            }
          } },
          { camera: async () => {
            try {
              const width = 256
              const height = 256
              const stream = await navigator.mediaDevices.getUserMedia({ video: { 
                width, height,
              } })
              const videoElement = document.querySelector('#stream') as HTMLVideoElement
              videoElement.width = width
              videoElement.height = height
              const canvasElement = document.querySelector('#capture') as HTMLCanvasElement
              canvasElement.width = width
              canvasElement.height = height

              const video = stream.getVideoTracks()[0]
              if (video) {
                setInProgress('camera')
                const canvas = isMobile || true ? canvasElement : document.createElement('canvas')
                const ctx = canvas.getContext('2d')

                const delay_ms = 500
                const clip = () => {
                  let recorder = new MediaRecorder(stream)
                  recorder.ondataavailable = ({ data }) => {
                    if (data.size) {
                      // console.debug(URL.createObjectURL(data))
                      // console.debug('clip ready', data)
                      videoElement.src = URL.createObjectURL(data)
                      videoElement.play()
                    }
                    recorder.pause()
                    clip()
                  }
                  recorder.start()
                  setTimeout(() => recorder.requestData(), delay_ms)
                }
                clip()

                handle.stream(() => {
                  const diameter = Math.min(
                    videoElement.videoWidth, videoElement.videoHeight)
                  const pad = [
                    videoElement.videoWidth - diameter,
                    videoElement.videoHeight - diameter,
                  ].map(x => x/2)
                  const range = pad.map(x => [x + diameter*1/4, x + diameter*1/2])
                  ctx.drawImage(
                    videoElement, 
                    range[0][0], range[1][0], range[0][1], range[1][1],
                    0, 0, width, height)// average brightness of center pixels within half diameter of full image
                  const data = ctx.getImageData(0, 0, width, height)
                  const brightness = (x, y) => {
                    const i = (x + y * width) * 4
                    return sum(data.data.slice(i, i + 4))
                  }
                  let magnitude = 0
                  for (let x = 0; x < width; x++) {
                    for (let y = 0; y < height; y++) {
                      magnitude += Math.pow(brightness(x, y), 2)
                    }
                  }
                  magnitude = Math.sqrt(magnitude / (diameter * diameter / 4))
                  magnitude && console.debug('draw', magnitude)
                  return magnitude
                }, (magnitude, scale) => magnitude > scale / 2 ? 1 : 0)
              }
            } catch (e) {
              document.querySelector('.body').append(node(`<span>${e.toString()}</span>`))
            }
          } },
        ]} />
        <div style={{ display: inProgress ? '' : 'none' }}>
          <canvas id="oscilloscope" style={toStyle(`
          height: 1em;
          width: 100%;
          `)} />
          <canvas id="binary" style={toStyle(`
          height: 1em;
          width: 100%;
          `)} />
          <div style={{ display: ['camera'].includes(inProgress) ? 'flex' : 'none' }}>
            <video id="stream" style={toStyle(`
            height: 5em;
            aspect-ratio: 1/1;
            display: none;
            `)} />
            <canvas id="capture" style={toStyle(`
            height: 5em;
            aspect-ratio: 1/1;
            `)}/>
          </div>
        </div>
      </InfoSection>
      <InfoSection labels={[
        'output'
      ]}>
        <CodeBlock lines={[
          isDotAndDashString(input) && toDotAndDashString(output),
          output,
        ]} />
      </InfoSection>
      <br/>
      <br/>
      <InfoSection labels={[
        'history',
        history.length && { clear: () => setHistory([]) },
      ]}>
        {history.length ? history_element : '(empty)'}
      </InfoSection>
    </InfoBody>
    <script src='/lib/external-adapter-latest.js' />
  </Style>
}

const Style = styled(InfoStyles)`
&#morse {
  input, select, .select {
    border-color: black;
    color: black;
  }
  button, .button, .action {
    background: black;
    color: white;
  }
}
`
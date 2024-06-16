import React, { Fragment, useState } from 'react';
import Color from 'color';
import Calendar from 'src/components/Calendar';
import { message, Messages } from 'src/components/Messages';
import { store } from '../lib/store';
import { JSX, couple, pass, truthy } from '../lib/types';
import styled from 'styled-components';
import { ColorPicker, HalfLine, InfoBody, InfoButton, InfoCheckbox, InfoLabel, InfoLine, InfoLoginBlock, InfoSection, InfoStyles, Reorderable } from '../components/Info';
import api, { auth as _auth } from '../lib/api';
import { useE, useEventListener, useF, useInterval, useM, useR, useStyle } from '../lib/hooks';
import { useAuth, usePageSettings, useHash, usePathHashState, useTypedPathHashState } from '../lib/hooks_ext';
import { meta } from '../lib/meta';
import { S, equal, isMobile, pick, remove, toStyle, toYearMonthDay } from '../lib/util';
import url from 'src/lib/url';

const { entries, strings, keys, defer } = window as any

let calendar = []
let today = new Date().getDate()
let count = 729 + new Date().getDay()
for (let i = 0; i < count; i++) {
  let day = new Date()
  day.setDate(today - i)
  calendar.push(day)
}

let months = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')
function isLeap(year) {
  return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
}
let monthDays = `31 ${isLeap(new Date().getFullYear()) ? '29' : '28'} 31 30 31 30 31 31 30 31 30 31`.split(' ').map(Number)

const LOCAL_TALLY_KEY = `tally-local-2`

const title = location.host === 'tally.gallery' ? location.host : '/tally'
export default () => {
  meta.icon.use({ value: '/raw/tally/icon.png' })
  useF(() => meta.title.set(title))

  let auth = useAuth()
  const tallyApi = auth.user ? {
    get: () => api.get(`/tally`),
    tally: (term, date) => api.post(`/tally/${term}/${date}`),
    new: newTerm => api.put(`/tally/${newTerm}`),
    delete: term => api.delete(`/tally/${term}`),
    update: data => api.post(`/tally`, data),
    rename: (term, name) => api.post(`/tally/${term}/rename/${name}`),
    toggle: term => api.post(`/tally/${term}/toggle`),
    unhide: (term=undefined) => {
      // term ? api.post(`/tally/${term}/unhide`) : api.post('/tally/unhide')
      let new_hidden
      if (term) {
        new_hidden = strings.json.clone(tally.hidden)
        delete new_hidden[term]
      } else {
        new_hidden = {}
      }
      return api.post(`/tally/hide`, { hidden: new_hidden })
    },
    hide: (term) => {
      // api.post(`/tally/${term}/hide`)
      const new_hidden = strings.json.clone(tally.hidden)
      new_hidden[term] = true
      return api.post(`/tally/hide`, { hidden: new_hidden })
    },
  } : {
    _deepCopy: tally => tally && JSON.parse(JSON.stringify(tally)),
    _mockResponse: tally => {
      term && console.debug('TALLY MOCK RESPONSE', JSON.stringify(pick(tally.terms, term)))
      store.set(LOCAL_TALLY_KEY, tally)
      return new Promise(resolve => setTimeout(() => {
        resolve({ tally: { ...tally }})
      }))
    },
    get: () => {
      return tallyApi._mockResponse(Object.assign({
        user: false,
        terms: {},
        on: {},
        color: undefined,
        colors: {},
      }, store.get(LOCAL_TALLY_KEY, () => ({}))))
    },
    tally: (term, date) => {
      tally.terms[term] = tally.terms[term] || []
      console.debug(
        term, date,
        tally.terms[term].find(({ d }) => d === date),
        tally.terms[term])
      if (tally.terms[term].find(({ d }) => d === date)) {
        tally.terms[term] = tally.terms[term].filter(({ d }) => d !== date)
      } else {
        tally.terms[term].push({ d:date })
      }
      console.debug(JSON.stringify(pick(tally.terms, term)))
      return tallyApi._mockResponse(tally)
    },
    new: newTerm => {
      tally.terms[newTerm] = tally.terms[newTerm] || []
      return tallyApi._mockResponse(tally)
    },
    delete: term => {
      delete tally.terms[term]
      return tallyApi._mockResponse(tally)
    },
    update: data => {
      return tallyApi._mockResponse(Object.assign(tally, data))
    },
    rename: (term, name) => {
      tally.terms[name] = tally.terms[term]
      delete tally.terms[term]
      return tallyApi._mockResponse(tally)
    },
  }
  if (tallyApi._deepCopy) {
    // provide 'tally' in context as deep copy of actual value
    // to avoid mutation issues between client & mocked server
    Object.keys(tallyApi).filter(x => x[0] !== '_').map(x => {
      const y = tallyApi[x]
      tallyApi[x] = (...args) => {
        const _tally = tally
        {
          const tally = tallyApi._deepCopy(_tally)
          console.debug(tally)
          return y(...args)
        }
      }
    })
  }
  
  // let [term, setTerm] = useState<string>(window.decodeURIComponent(window.location.hash?.slice(2).replaceAll('+', ' ')) || '');
  // const [mode, setMode] = useState<''|'create'|'edit'|'include'|'bulk'|'dots'|'settings'>(undefined)
  const [{ term, mode }, _setPathHash] = useTypedPathHashState<{
    term: string,
    mode: ''|'create'|'edit'|'include'|'bulk'|'dots'|'settings',
  }>({
    prefix: 'tally', sep: '#',
    from: (p, h) => {
      // const [mode, term] = p.split('/').filter(pass).map(x => x.replace(/\+/g, ' ').replace(/^-$/, '')) as any
      // return { term, mode }
      return ({ term:h.replace(/\+/g, ' '), mode:p === 'false' ? '' : p.replace(/^\/?/, '').replace(/\/?$/, '').replace(/\+/g, ' ')||'' as any })
    },
    // to: ({ term, mode }) => [[mode, term].map(x => (x || '-').replace(/ /g, '+')).join('/'), ''],
    to: ({ term, mode }) => [mode, term].map(x => (x||'').replace(/ /g, '+')) as couple<string>,
  })
  const setTerm = term => _setPathHash({ term, mode })
  const setMode = mode => _setPathHash({ term, mode })

  let [tally, setTally] = useState<{
    user: string,
    terms: { [term:string]: { d: string }[] },
    on: { [term:string]: string },
    include: { [term:string]: string[] },
    color?: string,
    dark?: boolean,
    hidden: { [term:string]: true },
  }>(undefined)


  // const [showSettings, setShowSettings] = useState(false)
  // useF(showSettings, () => {
  //   if (showSettings) document.querySelector('.calendar').scrollTop = 1e6
  // })
  const tallyColorInverse = useM(tally?.color, () => {
    if (typeof(tally?.color) !== 'string') return

    const hexToRgb = hex =>
      hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i
              ,(m, r, g, b) => '#' + r + r + g + g + b + b)
      .substring(1).match(/.{2}/g)
      .map(x => parseInt(x, 16))
    const sum = hexToRgb(tally.color).reduce((a,v)=>a+v,0)
    // const [r, g, b] = sum > 255 * 1.5 ? [0, 0, 0] : [255, 255, 255]//hexToRgb(tally.color).map(x => 63 - Math.floor(x / 4) + 128 + 64)
    const base = sum > 255 * 1.85 ? [0, 0, 0] : [255, 255, 255]
    // const [r, g, b] = hexToRgb(tally.color).map((x,i) => .5*base[i] + .5*(255 - x)).map(Math.floor)
    const [r, g, b] = base
    return `rgb(${r}, ${g}, ${b})`
  })
  const tallyColorDefault = tally?.dark ? '#ffdb00' : '#0175ff'
  const tallyColorInverseDefault = tally?.dark ? '#000' : '#fff'
  const tallyColorBackground = tally?.dark ? '#222' : '#fff'
  const tallyColorText = tally?.dark ? tally?.color || tallyColorDefault : '#000'
  usePageSettings({
    checkin: 'tally',
    // transparentHeader: true,
    // background: 'var(--tally-background)',
    background: tallyColorBackground,
    text_color: tallyColorText,
  })

  let [tallyCalendar, setTallyCalendar] = useState({})
  let [tallyMonth, setTallyMonth] = useState({})
  let [error, setError] = useState('')
  let newTermRef = useR()
  const create = mode === 'create'
  const edit = mode === 'edit'
  const bulk = mode === 'bulk'
  const settings = mode === 'settings'
  let [confirm, setConfirm] = useState(false)
  let renameRef = useR()

  // enable entry mode with setEntry(set()), add items for that day
  const [entryDate, setEntryDate] = useState('')
  const [entry, setEntry] = useState<false | Set<any>>(false)
  useF(mode, () => mode === 'bulk' || setEntry(false))
  
  // enable dot view
  // const [_dots, setDots] = useState(false)
  const dots = useM(tally, mode === 'dots', () => {
    if (mode !== 'dots' || !tally) return false

    const value = {}
    Object.keys(tally.terms).map((term, i, a) => {
      value[term] = i / a.length * 360
    })
    return value
  })
  const dotCalendar = useM(tally, dots, () => {
    if (!dots) return false

    const value = {}
    Object.entries(tally.terms).map(([term, list]:any) => {
      list.map(({ d }) => {
        value[d] = value[d] ?? {}
        value[d][term] = dots[term]
      })
    })
    return value
  })
  const [_termHovers, setTermHovers] = useState<string[]>(undefined)
  const termHovers = term ? [term] : _termHovers
  console.debug('DOTS', dots, dotCalendar)
  useF(entryDate, () => {
    if (entryDate && mode === 'dots') {
      const termsEntries = dotCalendar[toYearMonthDay(new Date(entryDate))]
      const terms = termsEntries && Object.keys(termsEntries)
      console.debug('dot view, date', entryDate, terms)
      setTermHovers(equal(terms, termHovers) ? undefined : terms)
    }
  })

  const today = toYearMonthDay(new Date())
  const todaysTerms = useM(tally, () => {
    const value = new Set()
    if (tally) {
      Object.entries(tally.terms).map(([term, list]:any) => {
        if (list.some(({ d }) => d === today)) value.add(term)
      })
    }
    return value
  })
  // useF(entry, () => entry && setTerm(''))
  useF(entry, () => {
    entry && message.trigger({
      text: 'select a date, then tap all labels for that date',
      ms: 3_000,
      once: true,
      id: 'tally-bulk-hint',
    })
  })

  useF(mode, term, () => {
    if(0){}
    else if ('dots bulk'.includes(mode || 'default')) setTerm(undefined)
    else if (!mode && !term) setTerm(Object.keys(tally.terms)[0])
  })
  useF(mode, () => {
    setTermHovers(undefined)
  })

  const newTermDay = useR()
  const handle = {
    parse: (result, returned=false) => {
      console.debug('TALLY PARSE', result)
      setError('')
      // if result.tally.on[term], invert all dates since then
      const oldTally = tally
      {
        const { tally } = result
        delete tally._id
        console.debug('TALLY PARSE', tally, Object.keys(tally.on || {}))
        Object
        .keys(tally.on || {})
        .filter(x => tally.terms[x])
        .map(term => {
          try {
            let toggled = Number(new Date(tally.on[term] + ' 0:0:0'))
            const termDatesSinceToggle = new Set()
            tally.terms[term].map(({ d }) => {
              if (Number(new Date(d)) >= toggled) {
                termDatesSinceToggle.add(d)
              }
            })
            console.log('INVERT', 
              term, tally.on[term], toYearMonthDay(new Date(toggled)),
              termDatesSinceToggle, tally.terms[term])

            // remove previous tallies
            tally.terms[term] =
              tally.terms[term].filter(({ d }) => !termDatesSinceToggle.has(d))

            // add tallies for dates without previous tallies
            while (toggled < Date.now()) {
              const d = toYearMonthDay(new Date(toggled))
              if (!termDatesSinceToggle.has(d)) {
                tally.terms[term].push({ d })
              }
              toggled += 24 * 60 * 60 * 1000
            }
          } catch (e) {
            console.error(e)
          }
        })
        console.debug('TALLY PARSED', tally)
        if (returned) {
          return { tally }
        } else {
          setTally(tally)
          if (!term && !oldTally) {
            setTerm(Object.keys(tally.terms)[0] || '')
          }
        }
      }
    },
    load: () => {
      setEntryDate(today)
      return tallyApi.get()
        .then(handle.parse)
        .catch(e => setError(e.error))
    },
    tally: (date, term) => {
      if (entry) setEntryDate(date)
      else if (!term) {
        // local UI update
        tally.terms[''] = [{ d:date }]
        setTally({ ...tally })
        setTerm(undefined)
        console.debug('NEW TERM', {...tally})

        newTermDay.current = date
        // setCreate(true)
        setMode('create')
        return
      }

      // immediate UI update
      const _tally = tally
      {
        const tally = JSON.parse(JSON.stringify(_tally))
        tally.terms[term] = tally.terms[term] || []
        if (tally.terms[term].find(({ d }) => d === date)) {
          tally.terms[term] = tally.terms[term].filter(({ d }) => d !== date)
        } else {
          tally.terms[term].push({ d:date })
        }
        setTally({ ...tally })
      }

      term && tallyApi.tally(term, date).then(result => {
        console.log('TALLY TALLIED', result)
        handle.parse(result)
      }).catch(e => setError(e.error))
    },
    new: () => {
      let newTerm = newTermRef.current.value
      setTerm(newTerm)
      // setCreate(false)
      setMode(undefined)
      tallyApi.new(newTerm).then(data => {
        setError('')
        setTally(data.tally)
        if (Object.keys(data.tally.terms).length > 1) {
          message.trigger({
            text: 'hint: drag to re-order your labels',
            id: 'tally-reorder-hint',
            ms: 3_000,
            once: true,
          })
        }

        if (newTermDay.current) {
          handle.tally(newTermDay.current, newTerm)
          newTermDay.current = undefined
        }
      }).catch(e => setError(e.error))
    },
    copy: () => {
      let label = term
      while (tally.terms[label]) label += '*'
      tally.terms[label] = JSON.parse(JSON.stringify(tally.terms[term]))
      console.debug('TALLY COPY', term, label, tally.terms[term])
      tallyApi.update({ terms: tally.terms })
      .then(result => {
        handle.parse(result)
        setTerm(label)
        // setEdit(false)
        setMode(undefined)
      })
      .catch(e => setError(e.error))
    },
    delete: () => {
      if (term) {
        tallyApi.delete(term)
        .then(result => {
          handle.parse(result)
          setConfirm(false)
          // setEdit(false)
          url.replace(`/tally`)
        })
        .catch(e => setError(e.error))
      }
    },
    rename: () => {
      let name = renameRef.current.value
      if (name) {
        if (term) {
          tallyApi.rename(term, name).then(data => {
            // console.log(data)
            setError('')
            setTally(data.tally)
            setTerm(name)
            // setEdit(false)
            setMode(undefined)
          }).catch(e => setError(e.error))
        } else {
          setTerm(newTermRef.current.value)
        }
      }
    },
    generateTallyCalendar: () => {
      tallyCalendar = {}
      tallyMonth = {}
      let currMonth = new Date().getMonth()
      const markTerm = term => {
        if (tally && tally.terms[term]) {
          const included = [tally.terms[term], ...(tally.include[term] || []).map(t => tally.terms[t])].flatMap(pass)
          included.map(entry => {
            let dateString = entry.d
            // let dateString = entry.t ? toYearMonthDay(new Date(entry.t)) : entry.d
            tallyCalendar[dateString] = (tallyCalendar[dateString] || []).concat(entry.d)

            let month = new Date(entry.d).getMonth()
            let monthEntry = tallyMonth[month] || {
              count: 0,
              total: month === currMonth ? new Date().getDate() : monthDays[month],
            }
            monthEntry.count += 1
            tallyMonth[month] = monthEntry
          })
        }
      }
      if (entry) {
        tallyCalendar[entryDate] = [entryDate]
        Object.keys(tally.terms).map(markTerm)
      } else markTerm(term)
      setTallyCalendar(tallyCalendar)
      setTallyMonth(tallyMonth)
    },
  };
  useF(auth.user, async () => {
    if (auth.user && tally && Object.keys(tally.terms).length) {
      // merge local changes with remote
      const { tally: merged } = await tallyApi.get().then(x => handle.parse(x, true))
      Object
      .keys(merged)
      .filter(k => k !== 'terms')
      .map(k => tally[k] && Object.assign(merged[k], tally[k]))

      // copy tallies for each term with no repeated days
      console.debug(Object.keys(merged.terms), Object.keys(tally.terms))
      Object.keys(tally.terms).map(t => {
        if (!merged.terms[t]) {
          merged.terms[t] = tally.terms[t]
        } else {
          const commonDays = new Set(merged.terms[t].map(({ d }) => d))
          merged.terms[t].push(...tally.terms[t].filter(({ d }) => !commonDays.has(d)))
        }
      })
      console.debug('TALLY MERGED', JSON.parse(JSON.stringify(merged)))
      await tallyApi.update(merged)
    }
    await handle.load()
  })
  useEventListener(window, 'focus', x =>
    handle.load().then(x => 
      handle.generateTallyCalendar()))
  // useHash({}, term, () => term)
  useF(term, tally, entry, handle.generateTallyCalendar)
  useF(edit, () => {
    if (edit) {
      renameRef.current.value = term
      renameRef.current.focus()
    }
  })
  useF(create, () => {
    if (create) {
      newTermRef.current.focus()
    } else {
      // remove mocked day
      newTermDay.current = undefined
      if (tally) {
        delete tally.terms['']
        setTally({ ...tally })
      }
    }
  })
  meta.icon.use(href => meta.manifest.set({
    name: title,
    display: `standalone`,
    start_url: location.host === 'tally.gallery' ? location.origin : `${location.origin}/tally`,
    icons: /^data:image/.test(href as string) ? [{
      src: href,
      sizes: `256x256`,
      type: `image/png`,
    }] : [{
      src: `${window.origin}/raw/tally/icon.png`,
      sizes: `32x32`,
      type: `image/png`,
    }, {
      src: `${window.origin}/raw/tally/icon.png`,
      sizes: `256x256`,
      type: `image/png`,
    }, {
      src: `${window.origin}/raw/tally/icon.png`,
      sizes: `512x512`,
      type: `image/png`,
    }],
  }))
  useF(tally?.color, tally?.dark, () => {
    const img = document.createElement('img')
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)

      const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const c2i = (x, y) => (x + y*data.width)*4
      const getPixel = (x, y) => {
        const i = c2i(x, y)
        return Array.from(data.data.slice(i, i+4))
      }
      const setPixel = (x, y, color) => {
        const i = c2i(x, y)
        const rgb = color.rgb().array()
        rgb.map((x, j) => data.data[i + j] = x)
      }
      const isColor = (x, y, color, threshold=32) => {
        const pixel = getPixel(x, y)
        const rgb = color.rgb().array().concat([255])
        return pixel.every((x, i) => Math.abs(x - rgb[i]) <= threshold)
      }
      const replaceColors = (pairs) => {
        for (let x = 0; x < data.width; x++) {
          for (let y = 0; y < data.height; y++) {
            pairs.forEach(([a, b, c]) => {
              if (isColor(x, y, a, c)) {
                setPixel(x, y, b)
              }
            })
          }
        }
      }

      const colorMap = [
        ['#0375ff', tally?.color || tallyColorDefault, 128 + 64],
        ['#fcfcfc', tallyColorInverse || tallyColorInverseDefault, 1],
        ['#fff', tally?.dark ? '#222' : '#fff', 64],
      ].map(x => x.map((y, i) => i < 2 ? Color(y) : y))
      replaceColors(colorMap)
      ctx.putImageData(data, 0, 0)

      const canvas256 = document.createElement('canvas')
      canvas256.width = 256
      canvas256.height = 256
      canvas.style.imageRendering = 'pixelated'
      const ctx256 = canvas256.getContext('2d')
      ctx256.imageSmoothingEnabled = false
      ctx256.drawImage(canvas, 0, 0, 256, 256)
      meta.icon.set(canvas256.toDataURL())
    }
    img.src = '/raw/tally/icon.png'
  })
  // refresh daily
  const refreshPerDay = () => {
    const today = new Date()
    const endOfDay = new Date(today)
    endOfDay.setHours(24)
    setTimeout(() => {
      handle.load()
      handle.generateTallyCalendar()
      refreshPerDay()
    }, Number(endOfDay) - Date.now() + 1000)
  }
  useF(entryDate, () => {
    entry && setEntry(new Set(Object.entries<any>(tally.terms)
      .filter(e => e[1].some(i => i.d === entryDate))
      .map(e => e[0])
    ))
    handle.generateTallyCalendar()
  })

  const termsLength = tally ? Object.keys(tally.terms).length : 0
  const calendarEntries = useM(tallyCalendar, dotCalendar, termHovers, () => {
    let additional = []
    if (tally && term && tally.on[term]) {
      additional.push({
        date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        class: 'tally-default-on',
      })
    }
    return [].concat(additional, calendar.map((date, i) => {
      let dateString = toYearMonthDay(date)
      if (dots) {
        let dateDots = dotCalendar[dateString]
        const width = dateDots && Math.floor(1 / Object.values(dateDots).length * 100)
        // const width = dateDots && Math.floor(1 / Math.ceil(Math.pow(Object.values(dateDots).length, .67)) * 100)
        // if (dateDots && termHover) {
        //   dateDots = dateDots[termHover] !== undefined && {
        //     [termHover]: dateDots[termHover]
        //   }
        // }
        const classString = 
          dateDots 
          && (!termHovers || termHovers?.some(term => dateDots[term] !== undefined))
            ? 'outline'
            : ''
        return {
          date,
          func: () => setEntryDate(date),
          text: dateDots && <div className='dot-group'>
            {Object.entries(dateDots).map(([t, hue]) =>
            <div
            // onPointerOver={e => setTermHovers([t])}
            // onPointerOut={e => setTermHovers([t])}
            onPointerOver={e => (!termHovers || termHovers.length < 2) && setTermHovers([t])}
            onPointerOut={e => (!termHovers || termHovers.length < 2) && setTermHovers(undefined)}
            onClick={e => {
              console.debug('term click', t)
              if (e.shiftKey && (term || termHovers)) {
                setTerm(undefined)
                setTermHovers([...(termHovers||[]), ...(termHovers?.includes(t) ? [] : [t])])
              } else {
                setTerm(term === t ? undefined : t)
              }
            }}
            style={{
              width: `calc(${width}% - 2px)`,
              background: `hsl(${hue} 100% 50%)`,
              visibility: termHovers && !termHovers.includes(t) ? 'hidden' : undefined,
            }}/>)}
          </div>,
          class: classString,
        }
      } else {
        let dateTally = tallyCalendar[dateString]
        return {
          date,
          func: () => handle.tally(
            dateTally ? dateTally[0] : dateString,
            entry ? false : term),
          class: [
            dateTally ? 'tally' : '',
            entry && entryDate === dateString ? 'entry-mode' : '',
          ].join(' '),
        }
      }
    }))
  })
  const completeTermList = tally &&
    Object
    .keys(tally.terms)
    .concat(!term || tally.terms[term] ? [] : [term])
    .filter(x => truthy(x) && x !== 'false')
    .filter(x => !tally.hidden[x] && !tally.hidden[encodeURIComponent(x.replace(/ /g, '_')).replace(/_/g, ' ')])
  const termLabels = <div className='terms'>
    {dots || entry || mode === 'include' || termsLength ? <div className='row wide gap wrap'>
      {dots
      ? completeTermList.map(t =>
        <div key={t}
        className='term'
        // onPointerOver={e => setTermHovers([t])}
        // onPointerOut={e => setTermHovers(undefined)}
        onClick={e => {
          console.debug('term click', t)
          if (e.shiftKey && (term || termHovers)) {
            setTerm(undefined)
            setTermHovers([...(termHovers||[]), ...(termHovers?.includes(t) ? [] : [t])])
          } else {
            setTerm(term === t ? undefined : t)
          }
          // setTerm(term === t ? undefined : t)
        }}
        {...(isMobile ? {
          // onClick: e => setTermHover(termHover === t ? undefined : t)
        } : {
          // onPointerOver: e => (!termHovers || termHovers.length < 2) && setTermHovers([t]),
          // onPointerOut: e => (!termHovers || termHovers.length < 2) && setTermHovers(undefined),
          onPointerOver: e => {
            setTermHovers([t])
          },
          onPointerOut: e => {
            setTermHovers(undefined)
          },
        })}
        style={S((tally?.dark ? `
        color: hsl(${dots[t]} 100% 70%); 
        background: hsla(${dots[t]}, 100%, 70%, 0.1);
        ` : `
        background: hsl(${dots[t]} 100% 70%); color: #000;
        `) + `
        text-decoration: none;
        ${termHovers && !termHovers.includes(t) ? 'opacity: .3;' : ''}
        // color: #fff;
        `)}>
          {t}
        </div>)
      : entry
      ? completeTermList.map(t =>
        <div key={t}
        className={`
          term 
          ${entry?.has(t)?'selected':''}
          `}
        onClick={() => {
          entry?.has(t) ? entry.delete(t) : entry.add(t)
          setEntry(new Set(entry))
          // handle.bulk(entry)
          handle.tally(entryDate, t)
        }}>
          {t}
        </div>)
      : mode === 'include'
      ? completeTermList.map(t =>
        <div key={t}
        className={`
          term
          ${term === t || (tally.include[term] || []).includes(t)?'selected':''}
          `}
        onClick={() => {
          const included = (tally.include[term] || []).includes(t)
          if (included) tally.include[term] = remove(tally.include[term], t)
          else tally.include[term] = (tally.include[term] || []).concat([t])
          tallyApi.update(tally).then(handle.parse)
        }}>
          {t}
        </div>)
      : termsLength
      ?
      completeTermList.map(t =>
      <div key={t}
      className={`
        term 
        ${t === term ?'selected':''}
        ${todaysTerms.has(t) ?'on':''}
        `}
      onClick={() => setTerm(t)}>
        {t}
      </div>)
      : []}
    {/* reorder={order => {
      console.debug('REORDERED', order)
      const terms = {}
      order.map(i => completeTermList[i]).map(k => terms[k] = tally.terms[k])
      Object.assign(terms, tally.terms)
      tally.terms = terms
      setTally({ ...tally })
      tallyApi.update({ terms })
    }} */}
    </div>
    : <div className='column'>
      <div>Tap 'new' to track something daily</div>
      <div>Then tap a day on the calendar</div>
      {auth.user ? '' :
      <>
        <div>Log in to view on another device</div>
      </>}
    </div>}
  </div>

  const scrollerL = document.querySelector('.scroller')
  if (scrollerL && scrollerL.scrollTop === scrollerL.scrollHeight - scrollerL.clientHeight) setTimeout(() => scrollerL.scrollTop = 1e6)

  useStyle(`
  :root {
    --tally-accent: ${tally?.color || tallyColorDefault};
    --tally-accent-light: ${tally?.color || tallyColorDefault}55;
    --tally-accent-less-light: ${tally?.color || tallyColorDefault}55;
    --tally-accent-text: #000;
    --tally-accent-text-readable: var(--id-color-text-readable) !important;

    --tally-text: var(--id-color-text);
    --tally-background: var(--id-color);
  }
  #index.expand-true #controls {
    margin: 0;
    margin-bottom: -.25em;
  }
  #index.expand-false #controls {
    border-bottom: 0; border-radius-bottom-left: 0; border-radius-bottom-right: 0;
  }
  #inner-index#inner-index {
    --id-color: ${tallyColorBackground};
    border: 1px solid var(--id-color-text) !important;
  }
  #header {
    border-bottom: 1px solid var(--id-color-text) !important;
  }
  ` + (tally?.dark ? `
  #main .calendar-container .calendar .date:not(.spacer) {
    background: none;
    color: var(--tally-accent) !important;
    border: 1px dashed var(--tally-accent-light);
  }
  #main .calendar-container .calendar .date:not(.spacer).odd {
    border: 1px solid var(--tally-accent-less-light);
  }
  #main .calendar-container .calendar .date:not(.spacer).outline {
    border: 1px solid var(--tally-accent) !important;
  }
  #main .calendar-container .calendar .date.tally {
    border-color: var(--tally-accent) !important;
    color: var(--tally-accent-text) !important;
  }
  ${dots ? '' : '#main .term:not(.selected),'}
  #main .calendar-container .calendar .date .month {
    color: var(--tally-accent);
  }
  #inner-index, #controls {
    border-color: var(--tally-accent) !important;
  }
  #index::after {
    background: #111;
  }
  ` : `
  `))
  
  return <Style>
    <InfoBody>
      {!error ? '' :
      <div className='error' style={{color: 'red', minHeight: '0'}}>{error}</div>}
      {tally
      ?
      <>
        <Calendar 
        entries={calendarEntries}
        delta={tally && term && tally.on[term] ? 1 : 0}
        className={entry ? 'entry-mode' : ''} />
        {false
        // entry || dots || showSettings
        ?
        <InfoSection id='controls' labels={[
          { back: () => {
            setEntry(false)
            // setDots(false)
            setMode(undefined)
            // setShowSettings(false)
            setMode(undefined)
          }}
        ]}>
        </InfoSection>
        :
        <InfoSection id='controls' labels={
          mode === 'include'
          ? [
            { back: () => setMode('edit') },
          ]
          : [
            !(edit || create) && { tally: () => setMode(''), label: !mode },
            !edit && { [create ? 'cancel' : 'new']: () => {
              setMode(!create && 'create')
            } },
            mode === 'create' && { create: () => {
              handle.new()
            } },
            !create && { [edit ? 'back' : 'edit']: () => {
              if (!term) {
                setMode('')
                setTerm(keys(tally?.terms)[0])
              } else {
                setMode(!edit && 'edit')
              }
            } },
            mode === 'edit' && { rename: () => {
              handle.rename()
            } },
            !edit && !create && termsLength > 1 && { 'bulk entry': () => {
              setMode('bulk')
              setEntry(new Set(Object.entries<any>(tally.terms)
                .filter(e => e[1].some(i => i.d === entryDate))
                .map(e => e[0])
              ))
            }, label: bulk && (_=>setMode(undefined))},
            !edit && !create && termsLength > 1 && { 'dot view': () => {
              // setDots(true)
              setMode('dots')
            }, label: dots && (_=>setMode(undefined))},
            !edit && !create && { settings: () => {
              // setShowSettings(true)
              setMode('settings')
            }, label: settings && (_=>setMode(undefined)) },
            (edit && !confirm) && {
              copy: handle.copy,
            },
            tallyApi.toggle && (edit && !confirm) && {
              [tally.on[term] ? 'default-off' : 'default-on']: () => {
                tallyApi.toggle(term).then(handle.parse)
              }
            },
            (edit && !confirm) && {
              include: () => {
                // console.debug('include')
                setMode('include')
              },
            },
            (edit && !confirm) && (tally.hidden[term]
            ? { unhide: () => {
              tallyApi.unhide(term).then(() => handle.load())
            } } 
            : { hide: () => {
              tallyApi.hide(term).then(() => handle.load())
            } }),
            (edit && !confirm) && { delete: () => setConfirm(true) },
            confirm && { cancel: () => setConfirm(false) },
            confirm && { 'really delete': handle.delete },
            ]
        }>
          {0?0
          : mode === 'create' ? <input className='terms' ref={newTermRef} type='text' placeholder='enter label' onKeyDown={e => {
            ;{
              e.key === 'Enter' && handle.new()
            }
            if (e.key === ' ') {
              // e.preventDefault()
              const L = e.currentTarget
              defer(() => {
                const selection = [L.selectionStart, L.selectionEnd]
                // L.value = L.value.replace(/ /g, '_')
                L.setSelectionRange(selection[0], selection[1])
              })
            }
          }}/>
          : mode === 'edit' ? <input className='terms' ref={renameRef} type='text' placeholder='rename' onKeyDown={e => {
            {
              e.key === 'Enter' && handle.rename()
            }
            if (e.key === ' ') {
              // e.preventDefault()
              const L = e.currentTarget
              defer(() => {
                const selection = [L.selectionStart, L.selectionEnd]
                // L.value = L.value.replace(/ /g, '_')
                L.setSelectionRange(selection[0], selection[1])
              })
            }
          }}/>
          : mode === 'include' ?
          termLabels
          : mode === 'settings'
          ? <>
            <HalfLine fontSize={'.33em'}/>
            <div className='group'>
              <div className='inline-group'>
                <ColorPicker 
                type='color'
                className='action'
                value={tally.color || (tally?.dark ? '#ffdb00' : '#0175ff')}
                onInput={e => {
                  const color = e.target.value
                  tally.color = color
                  setTimeout(() => {
                    if (tally.color === color) {
                      setTally({ ...tally })
                      tallyApi.update({ color })
                    }
                  }, 100)
                }}/>
                <label className='action' onClick={e => {
                  setTally({ ...tally, color: undefined })
                  tallyApi.update({ color: undefined })
                }}>revert</label>
              </div>
              <InfoCheckbox label='dark mode' value={tally?.dark} onChange={e => {
                const dark = !tally.dark
                setTally({ ...tally, dark })
                tallyApi.update({ dark })
              }} />
              {
                entries(tally.hidden).length
                ? 
                <InfoButton onClick={e => {
                  tallyApi.unhide().then(() => handle.load())
                }}>
                  unhide all labels
                </InfoButton>
                :
                <InfoButton>
                  all labels unhidden
                </InfoButton>
              }
              
            </div>
          </>
          : termLabels}
        </InfoSection>}
        {/* {entry || dots || showSettings
        ?
        <InfoSection id='controls' labels={[
          { back: () => {
            setEntry(false)
            setDots(false)
            setShowSettings(false)
          }}
        ]}>
          {showSettings
          ? <>
            <div className='inline-group'>
              <ColorPicker 
              type='color'
              className='action'
              value={tally.color || (tally?.dark ? '#ffdb00' : '#0175ff')}
              onInput={e => {
                const color = e.target.value
                tally.color = color
                setTimeout(() => {
                  if (tally.color === color) {
                    setTally({ ...tally })
                    tallyApi.update({ color })
                  }
                }, 100)
              }}/>
              <label className='action' onClick={e => {
                setTally({ ...tally, color: undefined })
                tallyApi.update({ color: undefined })
              }}>revert</label>
            </div>
            <InfoCheckbox label='dark mode' value={tally?.dark} onChange={e => {
              const dark = !tally.dark
              setTally({ ...tally, dark })
              tallyApi.update({ dark })
            }} />
          </>
          : termLabels}
        </InfoSection>
        :
        <InfoSection id='controls' labels={[
            !edit && { [create ? 'cancel' : 'new']: () => { 
              setMode(!create && 'create')
            } },
            !create && term && { [edit ? 'cancel' : 'edit']: () => {
              setMode(!edit && 'edit')
            } },
            !edit && !create && termsLength > 1 && { 'bulk entry': () => {
              setEntry(new Set(Object.entries<any>(tally.terms)
                .filter(e => e[1].some(i => i.d === entryDate))
                .map(e => e[0])
              ))
            }},
            !edit && !create && termsLength > 1 && { 'dot view': () => {
              setDots(true)
            }},
            !edit && !create && { settings: () => setShowSettings(true) },
            (edit && !confirm) && {
              copy: handle.copy,
            },
            tallyApi.toggle && (edit && !confirm) && {
              [tally.on[term] ? 'default-off' : 'default-on']: () => {
                tallyApi.toggle(term).then(handle.parse)
              }
            },
            (edit && !confirm) && { delete: () => setConfirm(true) },
            confirm && { cancel: () => setConfirm(false) },
            confirm && { 'really delete': handle.delete },
          ]}>
          {create ?
          <div className='edit-container'>
            <input ref={newTermRef} type='text' placeholder='enter label'
              onKeyDown={e => e.key === 'Enter' && handle.new()}/>
            <span className='button' onClick={handle.new}>create</span>
          </div>
          : edit ?
          <div className='edit-container'>
            <input ref={renameRef} type='text' placeholder='rename'
            onKeyDown={e => e.key === 'Enter' && handle.rename()}/>
            <span className='button' onClick={handle.rename}>rename</span>
          </div>
          :
          termLabels
          }
        </InfoSection>} */}
      </>
      : ''}
    </InfoBody>
  </Style>
}


const Style = styled(InfoStyles)`
.body {
  display: flex;
  flex-direction: column;
  padding-top: 0;
  .terms {
    margin-top: .5em;
    margin-bottom: .5em;
    min-height: 1em;
    align-items: flex-start;
  }
  .entry-line {
    // margin-bottom: 0;
  }
}
.terms {
  display: flex;
  flex-wrap: wrap;
  row-gap: .25em;
  flex-direction: row;
  width: 100%;
  .reorderable {
    width: 0;
    flex-grow: 1;
  }
  
  .term {
    border-radius: .2rem;
    padding: 0 .3rem;
    width: fit-content;
    margin-right: .25rem;
    text-decoration: underline;
    cursor: pointer;
    user-select: none;

    // background: #eee8;
    &.on {
      // color: #0175ff;
    }
    &.selected {
      background: var(--tally-accent);
      color: #fff;
      color: var(--tally-accent-text);
      text-decoration: none;
    }
  }
}
.calendar-container {
  align-items: center;
  margin-bottom: 0 !important;

  .calendar {
    margin: 0;
    padding: .5em 0;
    padding-top: 3em;
    
    .date {
      color: #000000dd !important;
      &.tally, &.entry-mode {
        background: var(--tally-accent) !important;
        color: #fff !important;
        color: var(--tally-accent-text) !important;
      }
      &.tally-default-on {
        background: var(--tally-accent-light) !important;
        color: transparent !important;
      }
  
      &.outline {
        background: none !important;
        border: 1px solid #000 !important;
        &.odd {
          border-color: #000000dd;
        }
      }
    }
    &.entry-mode {
      .tally:not(.entry-mode) {
        background: var(--tally-accent-light) !important;
      }
    }

    &::-webkit-scrollbar {
      display: none;
    }
  }
}
.edit-container {
  display: flex;
  flex-direction: column;
  input {
    // margin-top: 0;
  }
  .button {
    align-self: flex-end;
  }
}

.date-text {
  width: -webkit-fill-available;
}
.dot-group {
  display: flex;
  width: 100%;
  align-items: row;
  flex-wrap: wrap;
  // row-gap: .125em;
  // column-gap: .125em;

  > * {
    background-clip: content-box;
    // border: 1px solid #000;
    // box-shadow: 0 0 0 0.67px #0008, 0 0 0 0.33px #0004;
    // border: .33px solid #000;
    margin: 1px;
    max-width: 50%;
    aspect-ratio: 1/1;
    border-radius: 50%;
  }
}

.label {
  opacity: 1 !important;
}
.body {
  overflow-x: hidden;
}
#controls {
  margin: 0 calc(-.5em - 1px);
  // margin-bottom: -.5em;
  padding: .375em .5em;
  border: 1px solid #000;
  border-radius: .2rem;

  border-radius: 0;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border: 1px solid #0003;
  border-bottom: 0;
  box-shadow: 0 0 0 1.5px #8881, 0 0 0 2.5px #88888808;

  padding-bottom: .5em !important;
  min-height: 7em;

  box-shadow: 0;
  margin: 0;
  margin-bottom: -.25em;
  // position: absolute; bottom: 0; width: calc(100% - .5em); background: var(--tally-background);
  // position: fixed; bottom: 0; left: 0; background: var(--tally-background);

  .button, .label {
    border: 0 !important;
  }
  .button {
    background: var(--id-color-text) !important; color: var(--id-color) !important;
  }
  .label {
    background: var(--id-color-text-readable) !important; color: var(--id-color-text) !important;
  }
}
`
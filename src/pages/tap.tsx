import 'react'
import styled from 'styled-components';
import { ColorPicker, HalfLine, InfoBody, InfoButton, InfoCheckbox, InfoSection, InfoStyles, Reorderable } from '../components/Info';
import { useEventListener, useF, useM, useR, useS, useStyle, useTimeout } from '../lib/hooks';
import { useCachedScript, usePageSettings, usePathHashState } from '../lib/hooks_ext';
import { S } from '../lib/util';
import api, { auth } from 'src/lib/api';
import { store } from 'src/lib/store';
import { useRoom } from 'src/lib/socket';
import { openLogin } from 'src/lib/auth';

const { named_log, entries, strings, keys, defer, datetimes, colors, set, range, truthy } = window as any
const log = named_log('tally')

const color_order = [
  // '#e6194B', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990', '#dcbeff', '#9A6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075', '#a9a9a9', '#ffffff', '#000000'
  // '#ff4444', '#44ff44', '#4444ff', '#ffff44', '#44ffff', '#ff44ff',
  '#285ff4', '#65c467', '#f8ce46', '#ec4d3e',
]

export default () => {
  const mono_cal = useCachedScript('/lib/2/mono-cal/script.js')
  const calendar_root = useR()

  const [{user:viewer}] = auth.use()

  const [tally, set_tally] = useS(undefined)
  const [[tab='', raw_term='default'], set_path] = usePathHashState() as [[''|'reorder'|'bulk'|'bars'|'settings', string], any]

  const mode = useM(tab, () => {
    return {
      tracking: tab === '',
      reorder: tab === 'reorder',
      bulk: tab === 'bulk',
      bars: tab === 'bars',
      settings: tab === 'settings',
    }
  })
  const term = useM(raw_term, () => decodeURIComponent(raw_term).replaceAll('+', ' '))

  const color = useM(tally, () => tally?.color || (tally?.dark ? '#ffdb00' : '#2977ff'))
  const color_readable = useM(color, () => color && colors.readable(color))
  useF(tally, term, mode, () => {
    if (mode.tracking && tally && !term) {
      set_path([tab, keys(tally.terms)[0]])
    }
  })
  const [bulk_day, set_bulk_day] = useS(undefined)
  useF(() => set_bulk_day(datetimes.ymd()))
  const [dots_day, set_dots_day] = useS(undefined)

  const days = useM(tally, term, () => {
    const days = {}
    tally && entries(tally.terms).map(([x, term_value]) => {
      if (term && x !== term) return
      entries(term_value).map(([ymd, value]) => {
        days[ymd] = days[ymd] || []
        days[ymd].push(x)
      })
    })
    return days
  })
  const term_colors = useM(tally, () => {
    // assign color of rainbow to each term
    const term_colors = {}
    if (tally) {
      const terms = keys(tally.terms)
      const num_terms = terms.length
      terms.map((term, i) => {
        // term_colors[term] = colors.to_hex(`hsl(${360 * i / num_terms}, 100%, 55%)`)
        term_colors[term] = num_terms <= 4 ? color_order[i % color_order.length] : colors.to_hex(`hsl(${360 * (i / num_terms)}, 100%, 55%)`)
        // term_colors[term] = colors.to_hex(`hsl(${360 * (i / num_terms)}, 100%, 55%)`)
      })
    }
    return term_colors
  })
  
  const debounce_set = useR()
  const handle = {
    load: async () => {
      if (viewer) {
        const { data:new_tally } = await api.get('/tly')
        log({ new_tally })
        if (!tally || new_tally.t > tally.t) {
          set_tally(new_tally)
        }
      } else {
        set_tally(undefined)
      }
    },
    save: (new_tally) => {
      new_tally.t = Date.now()
      set_tally({...new_tally})
      if (debounce_set.current) clearTimeout(debounce_set.current)
        debounce_set.current = setTimeout(async () => {
        await api.post('/tly', { data:new_tally })
      }, 100)
    }
  }
  useF(viewer, () => handle.load())
  useEventListener(window, 'focus', () => handle.load())
  {
    const next_day = new Date()
    next_day.setDate(next_day.getDate() + 1)
    next_day.setHours(0, 0, 0, 0)
    useTimeout(() => handle.load(), Number(next_day) - Date.now() + 1_000)
  }
  useRoom({
    room: `tly:${viewer}`,
    on: {
      [`tly:${viewer}:update`]: (t) => {
        if (t > tally.t) {
          handle.load()
        }
      },
    },
  })

  if (tally && tally.terms[term] === undefined) {
    tally.terms[term] = {}
  }

  useF(mono_cal, tally, term, mode, bulk_day, dots_day, () => {
    const { mono_cal } = window as any
    log({ tally, mono_cal })
    if (tally && mono_cal && calendar_root.current) {
      const calendar = []

      let func
      if (mode.bulk) {
        const bulk_days = {
          [bulk_day]: [],
          ...days,
        }
        log({ bulk_days })
        entries(bulk_days).map(([ymd, terms]) => {
          calendar.push({
            date: datetimes.new(ymd),
            classes: `bulk-today-${ymd === bulk_day}`,
          })
        })
        func = async e => {
          const { currentTarget } = e
          const ymd = currentTarget.dataset['yyyymmdd']
          if (ymd) {
            set_bulk_day(ymd)
          }
        }
      } else if (mode.bars) {
        const dots_days = dots_day ? {
          [dots_day]: [],
          ...days,
        } : days
        entries(dots_days).map(([ymd, terms]) => {
          const n = terms.length
          const wide = [2, 2, 3, 4, 5, 5, 5, 5, 5, 5][n - 1] || Math.max(3, Math.floor(n / 2))
          const gap = `${.5 / wide}em`
          // const interior = `<div class="row wrap" style="
          // gap: ${gap};
          // flex-wrap: wrap-reverse;
          // overflow: visible;
          // ">
          //   ${terms.map(term => `<span class='dot' data-term="${term}" style="
          //   color: ${term_colors[term]};
          //   background: currentcolor;
          //   display: inline-block;
          //   width: min(calc(50% - ${gap}), calc((100% - ${gap} * ${wide-1}) / ${wide}));
          //   aspect-ratio: 1/1;
          //   border-radius: 50%;
          //   ${tally.dark ? `` : `
          //   border: 1px solid var(--id-color-text);
          //   `}
          //   "></span>`).join('')}
          // </div>`
          // const interior = !n ? '' : `<div class="row" style="
          // height: 1em;
          // border-radius: 99em;
          // ${tally.dark ? `
          // border: 1px solid var(--tally-color);
          //   ` : `
          // border: 1px solid var(--id-color-text);
          // // gap: 1px;
          // // background: var(--id-color-text);
          // `}
          // overflow: hidden;
          // ">
          //   ${terms.map(term => `<span class='block' data-term="${term}" style="
          //   display: inline-block;
          //   width: 0; flex-grow: 1;
          //   height: 100%;
          //   color: ${term_colors[term]};
          //   background: currentcolor;
          //   "></span>`).join('')}
          // </div>`

          // const interior = !n ? '' : `<div class="row" style="
          // height: 1em;
          // overflow: hidden;
          // gap: 1px;
          // ">
          //   ${terms.map(term => `<span class='block' data-term="${term}" style="
          //   display: inline-block;
          //   width: 0; flex-grow: 1;
          //   height: 100%;
          //   color: ${term_colors[term]};
          //   background: currentcolor;
          //   border-radius: 99em;
          //   ${tally.dark ? `
          //   border: 1px solid var(--tally-color);
          //     ` : `
          //   border: 1px solid var(--id-color-text);
          //   // gap: 1px;
          //   // background: var(--id-color-text);
          //   `}
          //   "></span>`).join('')}
          // </div>`

          const interior = !n ? '' : `<div class="row" style="
          height: 1em;
          overflow: hidden;
          gap: 1px;
          ">
            ${terms.map(term => `<span class='block' data-term="${term}" style="
            display: inline-block;
            width: 0; flex-grow: 1;
            height: 100%;
            color: ${term_colors[term]};
            background: currentcolor;
            border-radius: 99em;
            ${tally.dark ? `
            border: 1px solid var(--tally-color);
              ` : `
            border: 1px solid var(--id-color-text);
            // gap: 1px;
            // background: var(--id-color-text);
            `}
            position: relative;
            ">
              <span style="
              position: absolute;
              height: 50%; width: 100%;
              left: 0;
              top: 0;
              background: #fff2;
              "></span>
            </span>`).join('')}
          </div>`
          calendar.push({
            date: datetimes.new(ymd),
            text: interior,
            classes: `dots dots-day-${ymd === dots_day}`,
          })
        })
        func = async e => {
          const { currentTarget } = e
          const ymd = currentTarget.dataset['yyyymmdd']
          if (ymd) {
            set_dots_day(dots_day === ymd ? undefined : ymd)
          }
        }
      } else if (term) {
        const term_value = tally.terms[term] || {}
        entries(term_value).map(([ymd, value]) => {
          calendar.push({
            date: datetimes.new(ymd),
          })
        })
        func = async e => {
          const { currentTarget } = e
          const ymd = currentTarget.dataset['yyyymmdd']
          if (ymd) {
            tally.terms[term] = tally.terms[term] || {}
            if (tally.terms[term][ymd]) {
              delete tally.terms[term][ymd]
            } else {
              tally.terms[term][ymd] = 1
            }
            handle.save(tally)
          }
        }
      }
      log({ calendar })

      mono_cal.attach(calendar_root.current, calendar, {
        show_toggle: false,
        // max_width: '20em'
        no_resize: true,
        reverse: true,
        default_func: func,
      })
      calendar_root.current.scrollTop = 1e10
    }
  })

  const dots_day_terms_set = useM(tally, dots_day, () => {
    if (!tally) return undefined
    return set(dots_day ? days[dots_day] || [] : keys(tally.terms))
  })

  useStyle(`
  :root {
    --tally-color: ${color};
    --tally-color-readable: ${color_readable};
    --tally-color-light: ${color}aa;
  }
  `)
  usePageSettings({
    background: tally?.dark ? '#222222' : '#eeebe6',
  })
  return <Style id='tally' className={`dark-${!!tally?.dark}`}>
    {viewer ? <InfoBody className='column gap'>
      <InfoSection className='grow center-column wide'>
        <div className='grow center-column wide' ref={calendar_root} style={S(`
        height: 0;
        `)} />
      </InfoSection>
      <InfoSection labels={[
        { 'tracking': () => {
          set_path(['', term])
        }, classes: 'tab tab-' + mode.tracking },
        { 'new': async () => {
          const new_term = prompt('new term:').trim()
          if (new_term) {
            tally.terms[new_term] = {}
            await handle.save(tally)
            mode.tracking && defer(() => set_path([tab, new_term]))
          }
        }, classes: 'tab tab-false' },
        tab !== '' ? {
          text: 'edit', classes: 'tab tab-false',
        } : { 'edit': () => {
          const new_term = prompt(`rename '${term}' to:`).trim()
          if (new_term) {
            tally.terms[new_term] = tally.terms[term]
            delete tally.terms[term]
            handle.save(tally)
            set_path([tab, new_term])
          }
        }, classes: 'tab tab-false' },
        { 'bulk entry': () => {
          set_path(['bulk', ''])
        }, classes: 'tab tab-' + mode.bulk },
        { 'bar view': () => {
          set_path(['bars', ''])
        }, classes: 'tab tab-' + mode.bars },
        { 'settings': () => {
          set_path(['settings', term])
        }, classes: 'tab tab-' + mode.settings },
      ]} style={S(`
      min-height: 10em;
      `)}>
        <HalfLine />
        {!tally ? null : mode.tracking || mode.bulk || mode.bars ? <>
          <Reorderable
          className='row gap wrap'
          style={S(` width: 0; min-width: 100%;`)}
          elements={
            mode.tracking ? keys(tally.terms).map(x => <button
            onClick={() => set_path([tab, x])}
            className={`cute term active-${x === term}`}
            style={S(`
            font-size: 1.5em;
            `)}>{x}</button>)
            : mode.bulk ? keys(tally.terms).map(x => {
              const term_has_bulk_day = days[bulk_day]?.includes(x)
              return <button
              onClick={() => {
                if (tally.terms[x][bulk_day]) {
                  delete tally.terms[x][bulk_day]
                } else {
                  tally.terms[x][bulk_day] = 1
                }
                handle.save(tally)
              }}
              className={`cute term active-${term_has_bulk_day}`}
              style={S(`
              font-size: 1.5em;
              `)}>{x}</button>
            })
            : mode.bars ? keys(tally.terms).map(x =>
              <button
              className={`cute term dots-term active`}
              onClick={e => {
                if (dots_day) {
                  if (tally.terms[x][dots_day]) {
                    delete tally.terms[x][dots_day]
                  } else {
                    tally.terms[x][dots_day] = 1
                  }
                  handle.save(tally)
                }
              }}
              style={S(`
              font-size: 1.5em;
              background: ${term_colors[x]};
              color: ${colors.readable(term_colors[x])};
              ${!dots_day_terms_set.has(x) ? `opacity: .2;` : ``}
              `)}>{x}</button>)
            : []
          }
          reorder={order => {
            const old_terms = keys(tally.terms)
            const new_terms = {}
            order.map(i => old_terms[i]).map(term => new_terms[term] = tally.terms[term])
            tally.terms = new_terms
            handle.save(tally)
          }} />
          {/* <div className='row gap wrap' style={S(`font-size: 1.5em`)}>
            {keys(tally.terms).map(x =>
            <button
            key={x}
            onClick={() => set_path([tab, x])}
            className={`cute term active-${x === term}`}
            >{x}</button>)}
          </div> */}
        </> : mode.settings ? <>
          <div className='column gap'>
            <div className='center-row gap stretch'>
              <InfoCheckbox label='dark' value={tally.dark??false} setter={dark => {
                tally.dark = dark
                handle.save(tally)
              }} />
              {/* <ColorPicker value={color} setValue={color => {
                tally.color = color
                handle.save(tally)
              }} /> */}
              <ColorPicker 
              type='color'
              className='action'
              value={color}
              onInput={e => {
                const color = e.target.value
                tally.color = color
                setTimeout(() => {
                  if (tally.color === color) {
                    handle.save(tally)
                  }
                }, 100)
              }}/>
              <InfoButton onClick={() => {
                tally.color = false
                handle.save(tally)
              }}>reset</InfoButton>
            </div>
            <div className='center-row gap'>
              {/* <InfoButton onClick={() => {
                const old_terms = keys(tally.terms)
                let str_prompt
                if (old_terms.length < 27) {
                  str_prompt = `enter new order like "c a b" for:\n${old_terms.map((x, i) => `${strings.lower[i]}) ${x}`).join('\n')}`
                } else {
                  alert(`too many terms to reorder - contact me`)
                  return
                }
                const str_order = prompt(str_prompt)
                if (/^([a-zA-Z] )+[a-zA-Z]$/.test(str_order)) {
                  let order = str_order.split(' ').map(x => strings.lower.indexOf(x.toLowerCase()))
                  const order_set = set(order)
                  const missing = range(old_terms.length).filter(x => !order_set.has(x))
                  order = order.concat(missing)
                  const new_terms = {}
                  order.map(i => old_terms[i]).filter(truthy).map(term => new_terms[term] = tally.terms[term])
                  tally.terms = new_terms
                  handle.save(tally)
                  // set_path(['', new_terms[0]]) // bug, undoes update
                } else if (str_order) {
                  alert('invalid order')
                }
              }}>reorder terms</InfoButton> */}
              <InfoButton onClick={() => {
                const del_term = prompt('enter name of term to delete:')
                if (del_term) {
                  delete tally.terms[del_term.trim()]
                  handle.save(tally)
                }
              }}>delete a term</InfoButton>
            </div>
          </div>
        </> : null}
        <HalfLine />
        <div className='spacer' />
        {/* <div className='wide' style={S(`
        border: 1px solid currentcolor;
        padding: .25em;
        // border-radius: .25em;
        `)}>
          
        </div> */}
        <div className='row wide end'>
          {mode.tracking ? `tracking ${term}` 
          : mode.bulk ? 'bulk entry'
          : mode.bars ? 'bar view'
          : mode.settings ? 'settings'
          : null}
        </div>
      </InfoSection>
    </InfoBody> : <>
      <div className='cover center'>
        <button className='cute' style={S(`font-size: 2em`)} onClick={() => openLogin()}>log in</button>
      </div>
    </>}
  </Style>
}


const Style = styled(InfoStyles)`&#tally#tally#tally{
font-family: sf-mono;
.calendar-container {
  max-width: 40em;
}
.calendar {
  font-size: 1.15em;
  .week {
    .date {
      border-width: 1px;
      &:not(.spacer) {
        border-color: transparent;
        box-shadow: none;

        color: var(--id-color-text);
        background: #00000010;
        &.odd {
          background: #00000020;
        }

        * {
          box-shadow: none;
        }
        .date-date {
          color: inherit;
        }
        .date-text {
          overflow: visible;
        }

        &.date-entry:not(.dots-day-false) {
          color: var(--tally-color-readable) !important;
          background: var(--tally-color) !important;

          &.bulk-today-false {
            background: var(--tally-color-light) !important;
            border-color: transparent !important;
          }
        }
        &.date-entry.dots {
          .date-text {
            width: 100%;
          }
        }
      }
      
      // --date-margin: .15em;
      // margin: var(--date-margin);
      // --date-spacing: calc((var(--date-margin) + 1px) * 2);
      // --date-width: calc((100% - var(--date-spacing) * 8) / 9);
      // min-width: var(--date-width);
      // &:nth-child(7n) {
      //   margin-left: calc(var(--date-width) + var(--date-margin) + var(--date-spacing) / 2);
      // }
      // &:nth-child(7n - 6) {
      //   margin-right: calc(var(--date-width) + var(--date-margin) + var(--date-spacing) / 2);
      // }
    }
  }
  // width: 100%;
}

*:is(.button, .action, .cute) {
  min-height: 1.5em;
  &.term {
    &.active-true {
      color: var(--tally-color-readable) !important;
      background: var(--tally-color) !important;
    }
  }
  &.tab {
    &.tab-true {
      background: var(--tally-color) !important;
      color: var(--tally-color-readable) !important;
    }
  }
}

.stretch {
  align-items: stretch !important;
}

button.cute {
  background: var(--id-color-text-readable); 
  color: var(--id-color-text); 
  border: 1px solid currentcolor;
  box-shadow: 0 2px var(--id-color-text) !important;
  translate: 0 -2px !important;
  border-radius: 99em !important;
  padding: 0 .5em !important;
  height: 1.5em;
  display: inline-flex; align-items: center; justify-content: center;
  cursor: pointer !important;
  font-family: sf-mono !important;

  // background: #405f92 !important;
  // background: #2869d3 !important;
  // background: #2e7dff !important;
  // color: #fff !important;

  &:active, &.active {
    box-shadow: none !important;
    translate: 0 !important;
    border-color: var(--id-color-text);
  }
  *:hover {
    text-decoration: none !important;
  }
}

&.dark-true {
  color: var(--tally-color);
  .calendar-container {
    border-color: var(--tally-color);
  }
  .calendar {
    .week {
      .date {
        &:not(.spacer) {
          color: var(--tally-color);
          border-color: var(--tally-color-light);
          background: #fff0;
          &.odd {
            border-style: dashed;
          }
          .month {
            color: inherit;
          }
        }
      }
    }
  }

  *:is(.action, .cute):not(.dots-term) {
    color: var(--tally-color) !important;
    background: var(--id-color-text-readable) !important;

    &.active-true {
      color: var(--tally-color-readable) !important;
      background: var(--tally-color) !important;
    }
  }
  .tab {
    background: var(--tally-color) !important;
    color: var(--tally-color-readable) !important;
    &.tab-true {
      background: var(--tally-color-readable) !important;
      color: var(--tally-color) !important;
    }
    &.label {
      background: var(--tally-color-light) !important;
    }
  }
  button.cute:not(.dots-term) {
    box-shadow: 0 2px var(--tally-color) !important;
  }
} 
}`
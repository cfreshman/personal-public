import { useF, useM, useR } from "../lib/hooks"
import { anyFields, fields, JSX, pass, truthy } from "../lib/types"
import { defer, range, toStyle, toYearMonthDay, unpick } from "../lib/util"
import styled from "styled-components"
import { Scroller } from "./Scroller"

const today = new Date()
let months = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')
function isLeap(year) {
  return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
}
let monthDays = `31 ${isLeap(new Date().getFullYear()) ? '29' : '28'} 31 30 31 30 31 31 30 31 30 31`.split(' ').map(Number)
const Sunday = new Date()
Sunday.setDate(Sunday.getDate() - Sunday.getDay())

export type CalendarEntry = {
  date: Date,
  func?: (e: Event)=>void,
  img?: string,
  text?: string | any,
  color?: string,
  class?: string,
  invert?: boolean,
  props?: fields<any>,
}

export default ({ entries, header=false, delta=0, history=true, align='bottom', ...props }: {
  entries: CalendarEntry[],
  header?: boolean | ((index:number, name:string) => any),
  delta?: number,
  history?: boolean | number,
  align?: 'bottom' | 'top'
  [key:string]: any,
}) => {
  const renderHeaderContents = (header === true ? (i,name)=>name : header) as (index:number, name:string) => any

  const calendar = useM(delta, () => {
    let calendar = []
    let date = today.getDate()
    let count = (history === true ? 729 + today.getDay() : history || 0) + delta + 1
    for (let i = 0; i < count; i++) {
      let day = new Date()
      day.setDate(date + delta - i)
      calendar.push(day)
    }
    return calendar
  })

  const dateEntries = useM(entries, () => {
    const dateEntries = {}
    entries?.filter(truthy).map(x => dateEntries[toYearMonthDay(x.date)] = x)
    return dateEntries
  })

  const scroller = useR()
  const scrollSave = useR()
  useF(scroller.current, () => {
    if (scroller.current) {
      defer(() => {
        scroller.current.scrollTop = align === 'top' ? 0 : scrollSave.current || scroller.current.scrollHeight
      }, 100)
    }
  })

  return <Style {...props} className={'calendar-container '+(props.className || '')}>
    <div className={'calendar '+(props.className || '')} ref={scroller}
    onScroll={(e:any) => scrollSave.current = scroller.current.scrollTop}>
      <Scroller />
      <div className={`scroller align-${align}`}>
        {Array
        .from({ length: 6 - calendar[0].getDay() })
        .map((_, i) => <div className='date spacer' key={i}></div>)}
        {calendar.map((date, i) => {
          let dateString = toYearMonthDay(date)
          const entry = dateEntries[dateString]
          // entry && console.debug(entry)
          // let dateTally = tallyCalendar[dateString]
          // let dateMonth = tallyMonth[date.getMonth()] || { count: 0, total: 1 }
          return <>
            <div key={i} className={`
            date
            ${entry?.class??''}
            ${date.getMonth()%2 ? 'odd' : ''}
            ${entry?.img ? 'img' : ''}
            ${entry?.func ? 'func' : ''}
            ${entry?.invert ? 'invert' : ''}
            `}
            // onClick={() => handle.tally(dateTally ? dateTally[0] : dateString, entry ? false : term)}
            onClick={entry?.func ? e => entry?.func(e) : undefined}
            style={
              toStyle(!entry
              ? (
                dateString === toYearMonthDay(today)
                ? `
                background-color: black;
                color: white;
                `
                : '')
              : entry?.img
              ? `
              background-image: url(${entry.img});
              background-size: 100%;
              background-position: center;
              background-repeat: no-repeat;
              ` 
              : `
              background: ${entry?.color};
              color: ${entry?.invert ? 'white' : 'black'};
              `)
            }
            {...(entry?.props||{})}
            >
              <span className='date-date'>{date.getDate()}</span>
              {entry?.text
              ? typeof(entry.text) === 'object' ? entry.text : <span className='date-text'>{entry.text}</span>
              : ''}
              {date.getDay() === 6 && date.getDate() < 8
                ? <div className='month'>
                  {date.getMonth() === 0
                  ? <>
                    <b>{date.getFullYear()}</b>
                    <br />
                    {months[date.getMonth()]}
                  </>
                  : months[date.getMonth()]}
                </div>
                : ''}
            </div>
          </>
        })}
        {Array
        .from({ length: calendar.at(-1).getDay() })
        .map((_, i) => <div className='date spacer' key={i}></div>)}
        {header
        ? <>
          {range(7).reverse().map(i => {
            const date = new Date(Sunday)
            date.setDate(date.getDate() + i)
            return <div className='date heading'>{renderHeaderContents(i, date.toLocaleDateString(undefined, { weekday: 'short' }))}</div>
          })}
        </>:''}
      </div>
    </div>
  </Style>
}

const Style = styled.div`
&.calendar-container {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  .calendar {
    height: 0;
    flex-grow: 1;
    overflow-y: auto;
    margin-bottom: .5em 0;
    display: flex;
    flex-wrap: wrap;
    flex-direction: row;
    margin: 0 -.2em;

    .scroller {
      max-width: 25em;
      padding-right: 2.25em;
      display: flex;
      flex-wrap: wrap-reverse;
      flex-direction: row-reverse;
    }

    .date {
      width: calc(14.28% - .4em);
      // height: calc(4em - .4em);
      aspect-ratio: 1/1;
      margin: .3em .2em .1em .2em;
      border-radius: .2em;
      padding: .15em;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: space-between;
      user-select: none;
      &.spacer {
        // border-color: transparent;
      }
      &:not(.spacer) {
        // border: 2px solid #00000022;
        // border: .12em solid #00000022;
        // box-shadow: 1px 1px 2px 1px #00000022;
        // box-shadow: 0px 2px 4px 1px #00000022;
        border: .12em solid transparent;
        background: #0000000d;
        &.odd {
          background: #00000019;
        }
      }
      &.heading {
        background: black;
        color: white;
        height: fit-content; aspect-ratio: unset;
        display: flex; flex-direction: row;
        align-items: center;
        justify-content: center;
        text-align: center;
        font-size: .7em;
        padding: 0;
      }
  
      &.func {
        cursor: pointer;
      }
      
      font-size: .8em;
      color: #000000dd;
      &.tally, &.entry-mode {
        background: #0175ff !important;
        color: white;
      }

      &.img .date-date {
        background: black;
        color: white;
        border-radius: 2px;
        padding: 0 .2em;
      }

      .date-text {
        font-size: .67em;
        max-width: -webkit-fill-available;
        display: inline-block;
        overflow: hidden;
        vertical-align: bottom;
        white-space: pre;
      }
  
      position: relative;
      .month {
        color: #000000dd;
        position: absolute;
        width: 0;
        right: -.5em;
        top: 0;
      }
    }
    &.entry-mode {
      .tally:not(.entry-mode) {
        background: #0175ff66 !important;
      }
    }
  }
}
`
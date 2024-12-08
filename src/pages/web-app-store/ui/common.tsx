import React from "react"
import { S } from "src/lib/util"
const { range } = window as any

export const Stars = ({ value }) => {
  return <>
    {range(5).map(i => <span key={i} style={{color: i + 1 - .25 <= value ? '#000' : '#ccc', fontFamily:'duospace, system-ui'}}>★</span>)}
  </>
}

export const Rating = ({ rating }) => {
  return <div style={S('flex-shrink:0; width:max-content')}>
    <Stars value={rating.value} /> {rating.value.toFixed(1)} ({rating.count})
  </div>
}
;[
  '/lib/2/common/script.js',
].map(src => {
  const xhr = new XMLHttpRequest()
  xhr.open('GET', src, false)
  xhr.onload = () => document.head.append((x => Object.assign(x, { innerHTML:xhr.responseText }))(document.createElement('script')))
  xhr.send()
})

const [moon, O=moon, 〇=O] = [(() => {
	const PERIOD = 29.53
	const N = Math.floor(PERIOD)
	const STAGE = {
	  NEW: 0,
	  WAXING_CRESCENT: Math.ceil(1 * N/8),
	  WAXING_QUARTER: Math.ceil(2 * N/8),
	  WAXING_GIBBOUS: Math.ceil(3 * N/8),
	  FULL: Math.ceil(4 * N/8),
	  WANING_GIBBOUS: Math.ceil(5 * N/8),
	  WANING_QUARTER: Math.ceil(6 * N/8),
	  WANING_CRESCENT: Math.ceil(7 * N/8),
	  get WAXING(){return this.WAXING_QUARTER },
	  get WANING(){return this.WANING_QUARTER },
	  get FIRST_QUARTER(){return this.WAXING_QUARTER },
	  get LAST_QUARTER(){return this.WANING_QUARTER },
	  get CRESCENT(){return this.WAXING_CRESCENT },
	  get QUARTER(){return this.WAXING_QUARTER },
	  get GIBBOUS(){return this.WAXING_GIBBOUS },
	  get [0](){return this.NEW },
	  get [1](){return this.WAXING_CRESCENT },
	  get [2](){return this.WAXING_QUARTER },
	  get [3](){return this.WAXING_GIBBOUS },
	  get [4](){return this.FULL },
	  get [5](){return this.WANING_GIBBOUS },
	  get [6](){return this.WANING_QUARTER },
	  get [7](){return this.WANING_CRESCENT },
	}

	const duration = ({ ms=0, s=0, m=0, h=0, d=0, W=0, C=0, M=0, Y=0, D=0 }) => {
	  const days = d + (((D) * 10 + Y) * 365 + (M * 365/12) + (W * 365/52))
	  return ms + 1_000*(s + 60*(m + 60*(h + 24 * d)))
	}
	const offset = (date, duration_ms_or_object) => new Date(Number(date) + (typeof(x) === 'number' ? x : duration(x)))
	
	const DISPLAY = '🌑🌒🌓🌔🌕🌖🌗🌘'
	const Moon = class {
	  day
	  cycle
	  get ratio() {
		return Math.round(1000 * ((this.day%PERIOD + PERIOD)%PERIOD / PERIOD)) / 1000
	  }
	  get text() {
		return this.render()
	  }

	  emoji() {
		return DISPLAY[Math.round(this.ratio * DISPLAY.length)]
	  }
	  render() {
		return `<`
	  }
	  toString() {
		return 'Moon'+JSON.stringify(pick(this, 'day ratio text cycle'))
	  }

	  static of = (moon) => new Moon(moon)
	  static date = (date=new Date()) => {
		const year_ms_offset = (Number(date) - Number(new Date(`${date.getFullYear()}-01-01 00:00:00`)))
		const year_day = year_ms_offset / (1_000 * 60 * 60 * 24)
		const cycle = Math.floor(year_day / N)
		const day = year_day % N
		return Moon.of({
		  cycle,
		  day,
		})
	  }
	  constructor({ day=0, cycle=0 }) {
		Object.assign(this, {day,cycle})
	  }
	}
	const CYCLE = range(Math.ceil(PERIOD)).map(day => Moon.of({ day }))

	const instance = {
	  N, STAGE,
	  stages: from(
		list('NEW WAXING_CRESCENT WAXING_QUARTER WAXING_GIBBOUS FULL WANING_GIBBOUS WANING_QUARTER WANING_CRESCENT')
		.map(k => [k, STAGE[k]])
	  ),
	  cycle: CYCLE.slice(),
	  get new() { return CYCLE[STAGE.NEW] },
	  get waxing_crescent() { return CYCLE[STAGE.WAXING_CRESCENT] },
	  get waxing_quarter() { return CYCLE[STAGE.WAXING_QUARTER] },
	  get waxing_quarter() { return CYCLE[STAGE.WAXING_GIBBOUS] },
	  get full() { return CYCLE[STAGE.FULL] },
	  get waning_gibbous() { return CYCLE[STAGE.WANING_GIBBOUS] },
	  get waning_quarter() { return CYCLE[STAGE.WANING_QUARTER] },
	  get waning_crescent() { return CYCLE[STAGE.WANING_CRESCENT] },
	  
	  get yesterday() { return Moon.date() },
	  get today() { return Moon.date(new Date()) },
	  get today() { return CYCLE[0] },
	  
	  of: Moon.of, date: Moon.date,
	  at: (day) => Moon.of({ day: (day + N)%N }),
	}

	return instance
})()]
merge(window, {moon, O, 〇})

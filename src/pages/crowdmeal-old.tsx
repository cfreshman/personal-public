import React, { useState } from 'react'
import api, { auth } from '../lib/api'
import { useCached, useCachedSetter, useEventListener, useF, useM, useR } from '../lib/hooks'
import { meta } from '../lib/meta'
import { defer, dev, formatDurationMs, fromYearMonthDay, isMobile, node, pick, range, toStyle, toYearMonthDay } from '../lib/util'
import styled from 'styled-components'
import { A, Checkbox, HalfLine, InfoBody, InfoLine, InfoSection, ScrollText, StaticImage } from '../components/Info'
import { SettingStyles } from './settings'

import Feature from 'ol/Feature.js'
import Geolocation from 'ol/Geolocation.js'
import Circle from 'ol/geom/Circle.js'
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer.js'
import Map from 'ol/Map.js'
import 'ol/ol.css'
import { transform } from 'ol/proj.js'
import { OSM, Vector as VectorSource } from 'ol/source.js'
import { Fill, Stroke, Style as OpenLayersStyle } from 'ol/style.js'
import View from 'ol/View.js'
import Calendar, { CalendarEntry } from 'src/components/Calendar'
import { message } from 'src/components/Messages'
import { Scroller } from 'src/components/Scroller'
import { openLogin } from '../lib/auth'
import { usePageSettings } from '../lib/hooks_ext'
import { JSX, pass, pipe, truthy } from '../lib/types'

type Recipe = { id?:string, name:string, category:string, img:string, url:string, date?:number, user?:string, prep?:number, cook?:number, time?:number }
const RECIPE_PLACEHOLDER = {
  name: '',
  category: '',
  url: undefined,
  img: undefined,
  prep: 30, cook: 30, time: 60,
  user: '',
}
const CALENDAR_PREVIEW_COUNT = 7 * 4
const logo_color = '#88fa4a'

export default () => {
  return 'crowdmeal'
  // meta.title.use({ value: 'Crowdmeal' })
  // meta.icon.use({ value: '/raw/crowdmeal/icon.png' })
  usePageSettings({
    // checkin: 'crowdmeal',
    background: '#fffef4',
    uses: {
      'OpenLayers': ['https://openlayers.org/','https://github.com/openlayers/openlayers'],
    },
  })

  const [{ user }] = auth.use()
  const [loaded, setLoaded] = useState(false)
  const [profile, signup, reloadProfile] = useCachedSetter<{
    meals, prepare, deliver, zipcode: string, opts?: (string | number)[],
  }, {
    meals?, prepare?, deliver?, zipcode?: string, opts?: (string | number)[], optouts?: Set<string | number>,
  }>({
    name: 'crowdmeal-profile', 
    fetcher: () => {
      return api
      .get('/crowdmeal/profile')
      .then(({ profile }) => pick(profile, 'meals prepare deliver zipcode opts'))
      .finally(() => defer(() => setLoaded(true)))
    },
    setter: signup => {
      if (!user) {
        openLogin()
        return undefined
      }

      const request = { ...signup }
      const { optouts } = request
      delete request.optouts
      if (optouts) {
        request.opts = [].concat(upcoming, range(7)).filter(x => {
          if (typeof(x) === 'string') {
            return opts.has(fromYearMonthDay(x).getDay()) ? !optouts.has(x) : optouts.has(x)
          } else {
            return opts.has(x)
          }
        })
      }
      console.debug('CROWDMEAL SIGNUP', request, signup)

      return api
      .post('/crowdmeal/signup', request)
      .then(({ profile }) => {
        console.debug('RESULT', profile)
        return profile
      })
    },
  })

  const [upcoming, opts, optins, optouts]: [string[], Set<string | number>, Set<string | number>, Set<string | number>] = useM(profile, () => {
    const upcoming = []
    const opts = new Set(profile?.opts || []), optins = new Set(), optouts = new Set()
    console.debug('COMPUTE OPTS', profile, opts)
    for (let i = 0, d = new Date(); i <= CALENDAR_PREVIEW_COUNT; i += 1, d.setDate(d.getDate() + 1)) {
      const ymd = toYearMonthDay(d)
      upcoming.push(ymd)
      const optsHas = opts.has(ymd)
      const opted = opts.has(d.getDay()) ? optsHas : !optsHas
      ;(opted ? optins : optouts).add(ymd)
    }
    range(7).map(i => {
      const opted = !opts.has(i)
      ;(opted ? optins : optouts).add(i)
    })
    console.debug(upcoming, optins, optouts)
    return [upcoming, opts, optins, optouts]
  })
  useF('CROWDMEAL PROFILE', loaded, profile, console.debug)
  useF(user, reloadProfile)
  const signups = useM(profile, () => profile && pick(profile, 'meals prepare deliver'))
  const signed_up = useM(
    signups, 
    () => signups && Object.values(signups).some(truthy))
  const [meals={}, reloadMeals] = useCached<{[day:string]:Recipe}>('crowdmeal-calendar', () => {
    return api.get('/crowdmeal/calendar').then(({ meals }) => meals)
  })
  const [defaultRecipe, reloadDefaultRecipe] = useCached<Recipe>('crowdmeal-default', () => {
    // return api.get(`/dinder/recipe/${dev ? 'Y34topH' : '5gv8onN'}`).then(({ recipe }) => recipe)
    return api.get(`/dinder/recipe/${dev ? 'pfwUYRW' : 'cCP90fk'}`).then(({ recipe }) => recipe)
  })
  const [categories] = useCached<string[]>('dinder-categories', () => api.external('https://www.themealdb.com/api/json/v1/1/categories.php').then(result => result.categories.map(x => x.strCategory)))

  const [inputs, setInputs] = useState({
    zip: profile?.zipcode,
    prepare: 6,
    deliver: 45,
  })
  useF(profile?.zipcode, () => setInputs({ ...inputs, zip: profile?.zipcode || inputs.zip }))
  const map: { current: Map } = useR()
  const view: { current: View } = useR()
  const positionFeature: { current: Feature } = useR()
  const setLatLng = (lat, lng) => {
    positionFeature.current.setGeometry(new Circle([lng, lat], 10000))
    view.current.fit(positionFeature.current.getGeometry() as any)
    view.current.setZoom(10)
  }
  useM(loaded, () => {
    if (!loaded) return
    return
    setTimeout(() => {
      const circle = new Circle([0, 0], 10000)
      const circleFeature = new Feature(circle)
      // const accuracyFeature = new Feature()
      const vectorSource = new VectorSource({
        features: [
          circleFeature,
          // accuracyFeature
        ],
      })
      const style = new OpenLayersStyle({
        fill: new Fill({
          color: '#00ff38aa', //'#9c530563', //'#0f13', //'#00ff5a22', //'#0f13',
          // color: '#210',
          // color: '#3f07',
        }),
        // stroke: new Stroke({
        //   color: '#222',
        //   width: 1.5,
        // }),
      })
      positionFeature.current = circleFeature
      
      view.current = new View({
        center: [0, 0],
        zoom: 5,
      })
      map.current = new Map({
        layers: [
          new TileLayer({
            source: new OSM(),
          }),
          new VectorLayer({
            source: vectorSource,
            style: style
          }),
        ],
        target: 'map',
        view: view.current,
      })
  
      const geolocation = new Geolocation({ projection: view.current.getProjection() })
      geolocation.setTracking(true)
      geolocation.on('change', x => console.debug(geolocation, x))
      geolocation.on('error', console.debug)
      // geolocation.on('change:accuracyGeometry', () => {
      //   accuracyFeature.setGeometry(geolocation.getAccuracyGeometry())
      // })
      geolocation.on('change:position', () => {
        if (profile?.zipcode) return

        const [lng, lat] = geolocation.getPosition()
        console.debug('GEOLOCATION', [lng, lat], transform(
          [lng, lat],
          geolocation.getProjection(),
          'EPSG:4326'))
        setLatLng(lat, lng)
        api
        .get(`/crowdmeal/location?latlng=${
          transform(
            [lng, lat],
            geolocation.getProjection(),
            'EPSG:4326')
          .reverse()
          .join(',')
        }`)
        .then(x => {
          console.debug('PROFILE', x, profile)
          setInputs({ ...inputs, zip: x.zipcode })
        })
      })
    })
  })
  const zip = useR(inputs.zip)
  useF(inputs.zip, () => {
    zip.current = inputs.zip
    setTimeout(async () => {
      if (inputs.zip && inputs.zip === zip.current) {
        const { location } = await api.get(`/crowdmeal/location?address=${inputs.zip}`)
        console.debug(
          'CROWDMEAL ZIP LOCATION', 
          inputs.zip,
          location,
          transform(
            [location.lng, location.lat],
            'EPSG:4326',
            view.current.getProjection()))
        if (location) {
          const [lng, lat] = transform(
            [location.lng, location.lat],
            'EPSG:4326',
            view.current.getProjection())
          setLatLng(lat, lng)
        }
      }
    }, 2000)
  })

  const handle = {
    request: (role: 'meals'|'prepare'|'deliver') => {
      signup({ 
        [role]: !profile[role] || profile.zipcode !== inputs.zip,
        zipcode: inputs.zip
      })
    }
  }

  const renderSignUp = role => {
    const reason = {
      'meals': 'for meals',
      'prepare': 'to prepare',
      'deliver': 'to deliver',
    }[role]
    return <span className='action button accent' onClick={e => {
      if (user) {
        handle.request(role)
      } else {
        const onLogin = ({ user }) => {
          handle.request(role)
          auth.remove(onLogin)
        }
        auth.add(onLogin)
        // message.trigger({
        //   text: `Sign up to be notified when Crowdmeal has enough users in your area`,
        // })
        openLogin('email')
      }
    }}>{profile && profile[role] && profile.zipcode === inputs.zip ? ` signed up ` : ` sign up ${reason} → `}</span>
    // }}>{signed_up && profile.zipcode === inputs.zip ? ` signed up` : ` sign up → `}</span>
  }

  const [userRecipe, setUserRecipe] = useState<Recipe>(undefined)
  const [calendarView, setCalendarView] = useState(!isMobile)
  useF(calendarView, userRecipe, () => {
    if ((userRecipe || calendarView) && isMobile) {
      document.querySelector('.recipe-section').scrollIntoView({ block: 'start' })
      document.querySelector('#index').scrollIntoView({ block: 'end' })
    }
  })
  const drag_select_day = useR()
  const last_drag_select_day = useR()
  useEventListener(window, 'pointerup', () => {
    drag_select_day.current = undefined
  })
  const [calendarSelect, setCalendarSelect] = useState(useM(() => toYearMonthDay(new Date())))
  const calendarData: CalendarEntry[] = useM(profile, meals, defaultRecipe, () => {
    const value: CalendarEntry[] = []
    const dayToRecipe = x => (meals && meals[x]) || defaultRecipe
    for (let i = 0, d = new Date(); i <= CALENDAR_PREVIEW_COUNT; i += 1, d.setDate(d.getDate() + 1)) {
      const ymd = toYearMonthDay(d)
      const recipe = dayToRecipe(ymd)

      const func = (e:any) => {
        console.debug('CALENDAR SELECT', user, drag_select_day.current, e)

        const setDayAndFollowingWeeks = (ymd, value) => {
          const last = pipe(
            new Date(),
            x => { x.setDate(x.getDate() + CALENDAR_PREVIEW_COUNT); return x },
            x => fromYearMonthDay(toYearMonthDay(x)))
          for (let d = fromYearMonthDay(ymd); d <= last; d.setDate(d.getDate() + 7)) {
            if (value) optouts.delete(toYearMonthDay(d))
            else optouts.add(toYearMonthDay(d))
          }
        }

        if (e.shiftKey || drag_select_day.current) {
          const dates = [fromYearMonthDay(ymd), fromYearMonthDay(last_drag_select_day.current)].sort((a, b) => Number(a) - Number(b))
          const value = !optouts.has(last_drag_select_day.current)
          console.debug('CALENDAR SELECT RANGE', dates, value, last_drag_select_day.current, Array.from(optouts))
          for (let d = dates[0], d_i = 0; d <= dates[1] && d_i < 7; d.setDate(d.getDate() + 1), d_i += 1) {
            const dYmd = toYearMonthDay(d)
            setDayAndFollowingWeeks(dYmd, value)
          }
          console.debug('CALENDAR RANGE SELECTED', Array.from(optouts))
          signup({ optouts })
        } else {
          // const last = pipe(
          //   new Date(),
          //   x => { x.setDate(x.getDate() + CALENDAR_PREVIEW_COUNT); return x },
          //   x => fromYearMonthDay(toYearMonthDay(x)))
          // for (let d = fromYearMonthDay(ymd); d <= last; d.setDate(d.getDate() + 7)) {
          //   if (optouts.has(ymd)) optouts.delete(toYearMonthDay(d))
          //   else optouts.add(toYearMonthDay(d))
          // }
          // signup({ optouts })
          const value = optouts.has(ymd)
          setDayAndFollowingWeeks(ymd, value)
          signup({ optouts })
          last_drag_select_day.current = drag_select_day.current = ymd
          setCalendarSelect(ymd)
        }
      }
      value.push({
        date: new Date(d),
        text: 
        // <div
        // style={toStyle(`
        // position: absolute;
        // top: 0; left: 0;
        // width: 100%; height: 1.5em;
        // background: var(--label);
        // display: flex;
        // align-items: center;
        // padding: 0.25em;
        // `)}
        // {...{
        //   onPointerDown: e => {
        //     drag_select_day.current = undefined
        //     func(e)
        //   },
        //   onPointerOver: e => {
        //     drag_select_day.current && func(e)
        //   },
        //   onPointerUp: e => {
        //     drag_select_day.current = undefined
        //   },
        // }}>
        //   <Checkbox 
        //   style={{margin:0}}
        //   value={!optouts.has(ymd)}
        //   />
        // </div>,
        <Checkbox 
        style={{margin:0}}
        value={!optouts.has(ymd)}
        {...{
          onPointerDown: e => {
            drag_select_day.current = undefined
            func(e)
          },
          onPointerOver: e => {
            drag_select_day.current && func(e)
          },
          onPointerUp: e => {
            drag_select_day.current = undefined
          },
        }}
        />,
        // <Checkbox 
        // style={{margin:0}}
        //   value={!optouts.has(ymd)}
        //   />,
        //   // onPointerDown={e => {
        //   //   func(e)
        //     // if (!e.shiftKey) {
        //     //   console.debug('POINTER DOWN', e.shiftKey, e)
        //     //   // repeat for following weeks
        //     //   const last = pipe(
        //     //     new Date(),
        //     //     x => { x.setDate(x.getDate() + CALENDAR_PREVIEW_COUNT); return x },
        //     //     x => fromYearMonthDay(toYearMonthDay(x)))
        //     //   for (let d = fromYearMonthDay(ymd); d <= last; d.setDate(d.getDate() + 7)) {
        //     //     if (!e.target.checked) optouts.delete(toYearMonthDay(d))
        //     //     else optouts.add(toYearMonthDay(d))
        //     //   }
        //     //   signup({ optouts })
        //     //   setCalendarSelect(ymd)
        //     // }
        //   // }}
        //   // onChange={func} />,
        // img: recipe?.img,
        // func: () => {},
        func: () => setCalendarSelect(ymd),
        // props: {
        //   onPointerDown: e => {
        //     drag_select_day.current = undefined
        //     func(e)
        //   },
        //   onPointerOver: e => {
        //     drag_select_day.current && func(e)
        //   },
        //   onPointerUp: e => {
        //     drag_select_day.current = undefined
        //   },
        // },
        class: `selected-${ymd === calendarSelect || d.getDay() === calendarSelect}`,
      })
    }
    console.debug(value)
    return value
  })

  const renderRecipe = ymd => {
    if (typeof(ymd) === 'number') {
      ymd = pipe(
        new Date(),
        x => {
          x.setDate(x.getDate() + (ymd - x.getDay() + 7) % 7)
          return x
        },
        x => toYearMonthDay(x))
    }

    const recipe = meals[ymd] || defaultRecipe || RECIPE_PLACEHOLDER
    console.debug(ymd, recipe, defaultRecipe)
    return <a className='dinder-card' key={ymd} href={recipe.url} target='_blank' rel='noreferrer'>
      <div className='description' style={toStyle(`
      display: flex;
      justify-content: space-between;
      `)}>
        <label className='pointer-target' style={toStyle(`
        display: flex;
        align-items: center;
        white-space: pre;
        `)}><Checkbox onClickCapture={pass}
        value={!optouts.has(ymd)} setter={value => {
          console.debug('OPTOUT', !value, Array.from(optouts).toString())
          if (value) optouts.delete(ymd)
          else optouts.add(ymd)
          signup({ optouts })
        }}
        />&nbsp;{ymd}{!calendarView ? <> - opted-{optouts.has(ymd) ? 'out' : 'in'}</> : ''}</label>
        {<a
        href={recipe.url} target='_blank' rel='noreferrer'
        style={{visibility:!recipe.url?'hidden':undefined}}>recipe</a>}
      </div>
      {/* <label className='description pointer-target'><Checkbox
      value={!optouts.has(ymd)} setter={value => {
        if (value) optouts.delete(ymd)
        else optouts.add(ymd)
        signup({ optouts: Array.from(optouts) })
      }}
      /> {ymd} - opted-in</label> */}
      <div className='recipe-name'>
        {recipe.name 
        ? <>{recipe.name} {recipe.category || (recipe.user && recipe.time) ? <>({[
          recipe.user && recipe.time && recipe.time !== 60 && formatDurationMs(recipe.time * 60 * 1000), 
          recipe.category
        ].filter(truthy).join(' ')})</> : ''}</>
        : '(empty)'}
      </div>
      {/* <ScrollText on={[recipe.name]} className='recipe-name'>
        {recipe.name || '(empty)'}
      </ScrollText>
      <div className='description'>{recipe.category} - {toYearMonthDay(day)}</div> */}
      <a href={recipe.url} target='_blank' rel='noreferrer' draggable={false} style={{display:'flex'}}>
        <StaticImage src={recipe.img} draggable={false} style={{visibility:!recipe.img?'hidden':undefined}}/>
      </a>
      {/* <div style={toStyle(`
      display: flex;
      justify-content: space-between;
      font-size: .9em;
      `)}>
        <span>{ymd}</span>
        {<a
        href={recipe.url} target='_blank' rel='noreferrer'
        style={{visibility:!recipe.url?'hidden':undefined}}>see recipe</a>}
      </div> */}
    </a>
  }

  const commonOptValue = upcoming.length === optins.size ? true : upcoming.length === optouts.size ? false : undefined
  const upcomingLabel = isMobile ? 'upcoming' : 'upcoming meals'

  return <Style id='crowdmeal'>
    <InfoBody>
      <Scroller deps={[[]]} />
      <InfoLine>
        <div>THIS WAS ABANDONED (no users) - if anyone is interested in re-attempting please <A href='/contact' /></div>
        <h3>CROWDMEAL</h3><span>&nbsp;- one cheap meal made per day</span>
      </InfoLine>
      {/* {signed_up
      ? <InfoLine className='description notice'>You're signed up. You'll be notified when Crowdmeal has enough users in your area</InfoLine>
      :''} */}
      <InfoSection labels={[
        // 'sign up for meals',
        // 'meals',
        // {
        //   element: renderSignUp('meals')
        // },
      ]}>
        <InfoLine>
          <input type='text' className='action inline number' placeholder='00000'
          value={inputs.zip} onChange={e => setInputs({ ...inputs, zip:e.target.value })}/>
        </InfoLine>
        {renderSignUp('meals')}
        <HalfLine />
        <div id="map" className="map" style={toStyle(`
        height: 250px;
        `)} />
      </InfoSection>
      <InfoSection labels={[
        // 'sign up to prepare',
        'prepare',
        {
          element: renderSignUp('prepare')
        },
      ]}>
        <InfoLine>
          <input className='action inline' type='number' 
          value={inputs.prepare} onChange={e => setInputs({ ...inputs, prepare:Number(e.target.value) })} /> meals per day
        </InfoLine>
        <InfoLine className='description'>
          You'll receive a recipe to make & ingredients to make it with
        </InfoLine>
      </InfoSection>
      <InfoSection labels={[
        // 'sign up to deliver',
        'deliver',
        {
          element: renderSignUp('deliver')
        },
      ]}>
        <InfoLine>
          <input className='action inline' type='number' 
          value={inputs.deliver} onChange={e => setInputs({ ...inputs, deliver:Number(e.target.value) })} /> minutes per day
        </InfoLine>
        <InfoLine className='description'>
          You'll deliver ingredients to preparers & meals to users
        </InfoLine>
      </InfoSection>
      {/* {userRecipe ? '' : <div className='spacer' />} */}
      <InfoSection className='recipe-section' labels={isMobile ? (
        calendarView ? [
          {
            element: <span className='action button accent' onClick={() => setCalendarView(false)}> ← {upcomingLabel} </span>
          },
          'calendar',
        ] : 
        userRecipe ? [
          {
            element: <span className='action button accent' onClick={() => setUserRecipe(undefined)}> ← {upcomingLabel} </span>
          },
          'suggest a recipe',
        ] : [
          upcomingLabel,
          {
            element: <span className='action button accent' onClick={() => setCalendarView(!calendarView)}>{userRecipe ? ' ← ' : ' calendar → '}</span>
          },
          {
            element: <span className='action button accent' onClick={() => setUserRecipe(userRecipe ? undefined : RECIPE_PLACEHOLDER)}>{userRecipe ? ' ← ' : ' suggest a recipe → '}</span>
          },
        ]
      ) : (
        userRecipe ? [
          {
            element: <span className='action button accent' onClick={() => setUserRecipe(undefined)}> ← {upcomingLabel} </span>
          },
          'suggest a recipe',
        ] : [
          'calendar',
          {
            element: <span className='action button accent' onClick={() => setUserRecipe(userRecipe ? undefined : RECIPE_PLACEHOLDER)}>{userRecipe ? ' ← ' : ' suggest a recipe → '}</span>
          },
        ]
      )} style={toStyle(`
      margin-bottom: -.5em;
      `)}>
        {userRecipe
        ? <>
          <div id='user-recipe-entry'>
            <span className='description'>No paywalls, use a square image if possible</span>
            <input 
            value={userRecipe.name}
            onChange={e => setUserRecipe({ ...userRecipe, name: e.target.value })}
            type='text' placeholder='Recipe Name' />
            {/* <InfoSelect 
            value={userRecipe.category || undefined}
            onChange={e => setUserRecipe({ ...userRecipe, category: e.target.value })}
            name='(select)' label='category' options={categories} /> */}
            {/* <div className='action'>
              time: {userRecipe.time}m (prep <input type='number'
              value={userRecipe.prep}
              onChange={e => setUserRecipe({ ...userRecipe, prep: Number(e.target.value), time: userRecipe.cook + Number(e.target.value) })}
              />, cook <input type='number'
              value={userRecipe.cook}
              onChange={e => setUserRecipe({ ...userRecipe, cook: Number(e.target.value), time: userRecipe.prep + Number(e.target.value) })}
              />)
            </div> */}
            <input
            value={userRecipe.url}
            onChange={e => setUserRecipe({ ...userRecipe, url: e.target.value })}
            type='text' placeholder='link'/>
            <div style={toStyle(`
            display: flex;
            align-items: center;
            `)}>
              <input
              value={userRecipe.img}
              onChange={e => setUserRecipe({ ...userRecipe, img: e.target.value })}
              type='text' placeholder='image link'
              style={{ width: '10em', flexGrow: '1' }}/>
              &nbsp;or&nbsp;
              {/* <InfoFile image inline /> */}
              <span className='action button inline' style={toStyle(`
              align-self: stretch;
              display: flex;
              align-items: center;
              background: #08080808;
              `)} onClick={e => {
                ;(document.querySelector('#suggest-recipe-file') as HTMLElement).click()
              }}>upload</span>
              <input id='suggest-recipe-file'
              type='file' accept='image/*' 
              style={{display:'none'}}
              onChange={e => {
                const reader = new FileReader()
                reader.onload = () => {
                  const img = node('<img />') as HTMLImageElement
                  img.onload = () => {
                    const canvas = node('<canvas />') as HTMLCanvasElement
                    const max = 512
                    const aspect = img.width / img.height
                    const min = aspect > 1 ? max / aspect : max * aspect
                    canvas.width = aspect > 1 ? max : min
                    canvas.height = aspect > 1 ? min : max

                    const ctx = canvas.getContext('2d')
                    ctx.drawImage(
                      img,
                      0, 0, img.width, img.height,
                      0, 0, canvas.width, canvas.height)
                    setUserRecipe({ ...userRecipe, img: canvas.toDataURL() })
                    console.debug(canvas, img, aspect)
                  }
                  img.src = reader.result as string
                  console.debug(reader.result)
                }
                reader.readAsDataURL(e.target.files[0])
              }}/>
            </div>
            <div className='inline-group' style={toStyle(`
            font-size: 1em;
            `)}>
              <span className='action button accent' onClick={(e:any) => {
                if (!user) {
                  openLogin()
                  message.trigger({
                    text: `Log in to add a new recipe`,
                    ms: 15_000,
                  })
                } else if ('name category url img'.split(' ').every(x => userRecipe[x])) {
                  setUserRecipe(undefined)
                  api.post('dinder/recipe', userRecipe).then(x => setUserRecipe(undefined))
                } else {
                  e.target.textContent = 'missing details'
                  setTimeout(() => e.target.textContent = 'submit', 2500)
                }
              }}> submit → </span>
            </div>
            <br/>
          </div>
        </>
        : calendarView
        ? <div id='calendar'>
          {calendarSelect !== undefined ? renderRecipe(calendarSelect) : ''}
          <div id='calendar-inner' style={toStyle(`
          position: relative;
          `)}>
            <div style={toStyle(`
            // position: absolute; top: 0; right: 0;
            // margin: .5em;
            width: 100%;
            display: flex;
            // justify-content: flex-end;
            margin: 0 .5em;
            margin: 0 0.115em;
            margin-bottom: 0.5em;
            `)}>
              <label className='pointer-target description' style={toStyle(`
                display: flex;
                align-items: center;
                white-space: pre;
                `)}><Checkbox
                value={!range(7).some(x => opts.has(x))} setter={value => {
                  signup({
                    opts: value ? [] : range(7)
                  })
                }}
                />&nbsp;opted-in by default</label>
            </div>
            <Calendar entries={calendarData} header={(index, name) => {
              const d: Date = pipe(
                new Date(),
                x => {
                  x.setDate(x.getDate() + (index - x.getDay() + 7) % 7)
                  return x
                })
              const ymd: string = pipe(
                d,
                x => toYearMonthDay(x))
              
            //   return <span className='pointer-target center-row' style={toStyle(`
            //   height: 100%;
            //   width: 100%;
            //   justify-content: space-between;
            //   padding: 0 calc(0.15em + 0.1rem);
            //   `)} onPointerDown={e => {
            //     if (!e.shiftKey) {
            //       const opts = new Set(profile?.opts)
            //       const optin = opts.has(index)
            //       if (optin) opts.delete(index)
            //       else opts.add(index)

            //       // remove opts for that week
            //       const last = pipe(
            //         new Date(),
            //         x => { x.setDate(x.getDate() + CALENDAR_PREVIEW_COUNT); return x },
            //         x => fromYearMonthDay(toYearMonthDay(x)))
            //       for (let d = fromYearMonthDay(ymd); d <= last; d.setDate(d.getDate() + 7)) {
            //         opts.delete(toYearMonthDay(d))
            //       }

            //       signup({ opts: Array.from(opts) })
            //       setCalendarSelect(ymd)
            //     }
            //   }} >
            //     <Checkbox style={{margin:0}} value={!optouts.has(index)} />
            //     {name}
            //   </span>
            // }} delta={CALENDAR_PREVIEW_COUNT} history={false} align='top' />
            return <span className={`pointer-target center-row selected-${calendarSelect === d.getDay()}`} style={toStyle(`
              height: 100%;
              width: 100%;
              justify-content: space-between;
              padding: 0 calc(0.15em + 0.1rem);
              border-radius: inherit;
              `)}
              onPointerDown={e => setCalendarSelect(toYearMonthDay(d))}>
                <Checkbox style={{margin:0}} value={!optouts.has(index)} onPointerDown={e => {
                  if (!e.shiftKey) {
                    const opts = new Set(profile?.opts)
                    const optin = opts.has(index)
                    if (optin) opts.delete(index)
                    else opts.add(index)

                    // remove opts for that week
                    const last = pipe(
                      new Date(),
                      x => { x.setDate(x.getDate() + CALENDAR_PREVIEW_COUNT); return x },
                      x => fromYearMonthDay(toYearMonthDay(x)))
                    for (let d = fromYearMonthDay(ymd); d <= last; d.setDate(d.getDate() + 7)) {
                      opts.delete(toYearMonthDay(d))
                    }

                    signup({ opts: Array.from(opts) })
                    setCalendarSelect(ymd)
                  }
                }}/>
                {name}
              </span>
            }} delta={CALENDAR_PREVIEW_COUNT} history={false} align='top' />
            <div className='description'>
              $/day - subject to local prices & wage
            </div>
          </div>
        </div>
        : <>
          {/* <div id='upcoming-meals-scrollbar' style={toStyle(`
          width: 100%;
          height: 1px;
          `)}></div> */}
          <div id='upcoming-meals' style={toStyle(`
          display: flex;
          column-gap: .15em;
          overflow-x: auto;
          max-width: calc(100% + 1em);
          margin: 0 -.5em;
          padding: 0 .5em;
          `)}>
            {/* <Scroller scrollBarSelector={'#upcoming-meals-scrollbar'} /> */}
            {!defaultRecipe ? '' : range(7).map(i => {
              const day = new Date()
              day.setDate(day.getDate() + i)
              return renderRecipe(toYearMonthDay(day))
            })}
          </div>
        </>}
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(SettingStyles)`
&#crowdmeal#crowdmeal#crowdmeal {
  --accent: #40ff0066;
  --light-accent: #2f02;
  --hard-accent: #00ff38aa;
  --background: #fffef4;
  --label: #210;
  --card: #f6f5eaff;

  * {
    user-select: none;
  }
  overflow-y: auto;
  .body {
    overflow-x: hidden;
    min-height: max-content;
    display: flex;
    flex-direction: column;
    > * { flex-shrink: 0 }
    .spacer { flex-grow: 1 }
    // background: #f2faf2;
    background: var(--background);
  }
  .label, .button, input {
    border-radius: 2px !important;
    border-width: 1.5px !important;
    border-color: #111;
    font-size: 1em !important;
    position: unset !important;
  }
  .label, .button, input {
    // border: 0 !important;
    border-color: transparent !important;
    background-clip: border-box;
    border-width: .67px !important;

    box-shadow: 0.67px 0.67px 0px 0px #0002;
    border-radius: 1.5px !important;
  }
  .label, .date:not(.spacer) {
    background: #111;
    color: #fff !important;
    opacity: 1;
    background: var(--label);
    * {
      color: inherit !important;
    }
  }
  .button {
    background: var(--label) !important;
    color: #fff !important;
  }
  .label {
    color: var(--label) !important;
    background: var(--hard-accent) !important;
  }
  #calendar #calendar-inner .calendar-container .date {
    padding: 0px calc(0.15em + 0.1rem);
    aspect-ratio: unset;
    &:not(.spacer) {
      background: var(--label) !important;
    }
    font-size: .8em !important;
    text-align: right;
    display: flex;
    align-items: center;
    justify-content: space-between;
    * {
      font-size: 1em !important;
    }
    input[type=checkbox] {
      aspect-ratio: 1/1 !important;
      margin-right: .33em !important;
    }
    &.heading > * {
      padding: 0 !important;
    }
    .date-date {
      background: transparent !important;
      // color: inherit !important;
    }

    // &.date.date:not(.spacer) {
    //   border: 1px solid var(--label) !important;
    //   overflow: hidden;
    // }
    // .date-date {
    //   position: absolute;
    //   top: 0; right: 0;
    //   z-index: 1;
    // }
    &.selected-true, .selected-true {
      background: #0008 !important;
      &, *:not(input) {
        // color: var(--hard-accent) !important;
        &.month {
          rgba(0, 0, 0, 0.867) !important;
        }
        text-shadow: 0 0 #fff;
      }
    }
  }
  .selected-true::after {
    // content: "";
    position: absolute;
    background: linear-gradient(var(--hard-accent) 0 0) white;
    z-index: -1;
    width: calc(100% + 2px);
    height: calc(100% + 2px);
    left: -2px;
    top: -2px;
    border: 1px solid var(--label);
    border-radius: inherit !important;

    border-style: dashed;
  }
  .action.button.accent {
    background: linear-gradient(var(--accent) 0 0), #fff; //#0f06;
    color: #322;
  }
  input[type="checkbox"] {
    -webkit-appearance: none !important;
    background: #fff !important;
    position: relative;
    border-radius: 2px !important;
    border-color: #000;
    height: 1em !important;
    width: 1em !important;
    margin: 0 !important;
    padding: 0 !important;
    cursor: pointer;
    &:checked {
      background: linear-gradient(var(--hard-accent) 0 0), #fff !important;
    }
    &:not(:checked) {
      background: #fff;
      border: 1px solid #91887f !important;
    }
  }
  .date input[type="checkbox"]:not(:checked) {
    background: #91887f !important;
    border: 0 !important;
  }
  .date.selected-true {
    // .date-date {
    //   background: linear-gradient(var(--accent) 0 0), #fff !important;
    // }
    // background: linear-gradient(var(--accent) 0 0), #fff !important;
    // color: #000 !important;
    // input[type="checkbox"] {
    //   box-shadow: 0 !important;
    //   &:checked {
    //     background: var(--label) !important;
    //   }
    // }
  }
  .date.heading input[type="checkbox"],
  .date input[type="checkbox"]
  {
    border: 0 !important;
    border-radius: .67px;

    width: .5em !important;
    &::before {
      color: transparent !important;
    }
  }
  input[type="checkbox"] {
    // border-width: .8px !important;
    // border-color: #222 !important;
  }
  input[type="checkbox"]:checked::before {
    content: '\\2713';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: .67em;
    font-weight: bold;
    pointer-events: none;
  }
  > .body > .section:not(:last-child) {
    margin-bottom: .75em;
  }
  &, .badges {
    font-family: Duospace;
  }
  h3 {
    margin: 0;
  }
  .section {
    position: relative;
    z-index: 1;
    pointer-events: none;
    > * {
      pointer-events: all;
    }
    &:not(:last-child) {
      margin-bottom: 1em;
    }
  }
  .entry-line {
    align-items: center;
    white-space: pre-wrap;
    > * {
      margin-right: 0;
    }

    .button {
      // align-self: stretch;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin: 0;
    }
  }

  input {
    margin-right: 0;
    padding: 0 0.5em;
    border: 1px solid #000;
    &:not(:is([type=number], .number))::placeholder {
      opacity: .4;
      font-size: .72em;
    }
    // font-family: system-ui;
    &.number, &[type=number], &[type=checkbox] {
      font-family: system-ui;
      &[type=number] {
        width: 4em;
      }
    }
  }

  .description {
    font-size: .7em;
  }
  .notice {
    background: var(--light-accent);
    padding: .5em 1em;
    border-radius: 2px;
  }

  #map {
    height: 250px;
    // border: 1px solid #000;
    // border-radius: 2px;
    position: relative;
    border-radius: 50%;
    overflow: hidden;
    z-index: -1;
    margin: -4em -16em;
    &::after {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      background: radial-gradient(#fff0, #fff0, #fff);
    }
  }


  .recipe-section {
    display: flex;
    flex-grow: 1;
    flex-direction: column;
    br {
      display: none;
    }
    #upcoming-meals {
      flex-grow: 1;
      align-items: flex-start;
    }
  }

  .dinder-card {
    border: .1rem solid var(--label);
    border-width: .67px;
    border-radius: 0 !important;
    border-radius: .5rem !important;
    border: 0;
    // border: .67 solid #fff !important;
    // box-shadow: .33px .33px 0w .67px #22222222;
    background: #fff;
    background: var(--card);
    // background: #0001;
    // background: #eeede4ff;
    border-radius: 2px;
    padding: 1em;
    display: flex;
    flex-direction: column;
    cursor: pointer;
    white-space: pre;
    overflow: hidden;
    color: inherit;
    text-decoration: none;
    .recipe-name {
      width: 0;
      min-width: 100%;
      display: inline-flex;
      position: relative;
      left: 0;
      white-space: pre-wrap;
    }

    max-width: fit-content;
    min-width: 20em;
    width: min-content;
    img {
      width: 20em;
      max-width: 100%;
      aspect-ratio: 1/1;
      object-fit: contain;
      background: #eee8;
      border-radius: 2px;
      border-radius: .5em;
      // display: none;
    }
    // margin-bottom: .25em;

    &.yes {
      animation: .15s right ease-in;
      @keyframes right {
        100% { transform: translate(200%, 0); visibility: visible }
      }
      visibility: hidden;
    }
    &.no {
      animation: .15s left ease-in;
      @keyframes left {
        100% { transform: translate(-200%, 0); visibility: visible }
      }
      visibility: hidden;
    }

    position: relative;
    &::after {
      pointer-events: none;
      position: absolute;
      content: "";
      top: 0;
      right: 0;
      height: 100%;
      width: 100%;
      // background: linear-gradient(90deg, #fff, #fff0 1em), linear-gradient(-90deg, #fff, #fff0 1em);
      background: linear-gradient(90deg, var(--card), #fff0 1em), linear-gradient(-90deg, var(--card), #fff0 1em);
    }
  }
  #user-recipe-entry {
    font-size: .85em;
    padding-top: .25em;
    // height: 100vh;
    // margin-bottom: 1em;
    > * {
      // margin-bottom: .25em;
    }
    .button {
      font-size: 1em;
      margin: 0;
    }
    .button.inline {
      height: 1.4em !important;
      align-self: center !important;
    }
    *::placeholder {
      opacity: 1;
    }
  }
  #calendar {
    display: flex;
    column-gap: .25em;
    row-gap: .25em;
    flex-wrap: wrap-reverse;
    // align-items: flex-start;
    align-items: start;
    padding-bottom: 1.5em;

    #calendar-inner {
      width: fit-content;
      height: fit-content;
      // border: .1rem solid #000;
      border-radius: 2px;
      padding: .5em;
      // padding: 0 .25em;

      display: flex;
      flex-direction: column;

      .calendar-container {
        .calendar {
          align-items: flex-start;
          height: fit-content;
          .scroller {
            // min-width: 26em !important;
            padding-bottom: .25em;
          }

          .date {
            border: 1px solid var(--bg);
            &.spacer {
              border-color: transparent;
            }
            &:not(.spacer) {
              // border: .1rem solid #000;
              // border: 0 !important;
              border: 1px solid var(--bg);
              border-radius: 2px;
              img { opacity: .5 }
              flex-direction: row-reverse;
              &:not(.heading) input[type=checkbox] {
                font-size: 1.3em;
              }
            }
          }
        }
      }
    }

    ${isMobile ? `
    #calendar-inner {
      width: 100%;
      padding: 0;
      padding-bottom: .5em;

      .calendar, .scroller {
        min-width: 100%;
      }
    }
    `:''}
  }

  #upcoming-meals {
    ::-webkit-scrollbar {
      -webkit-appearance: none;
      width: .25rem;
      background: transparent;
    }
    ::-webkit-scrollbar-track {
      margin-right: .25rem;
      background: transparent;
    }
    ::-webkit-scrollbar-track:hover, ::-webkit-scrollbar-track:active {
      background: transparent !important;
    }
    ::-webkit-scrollbar-thumb {
      background-color: var(--card) !important;
      background-color: #eaeae2 !important;
      background-clip: padding-box;
    }
  }
}
`
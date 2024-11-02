import React, { useState } from 'react'
import Calendar from 'src/components/Calendar'
import { Chat } from 'src/components/Chat'
import { message, Messages } from 'src/components/Messages'
import { openFeedback } from 'src/components/Modal'
import { Scroller } from 'src/components/Scroller'
import api, { auth } from '../lib/api'
import { openLogin } from '../lib/auth'
import { copy } from '../lib/copy'
import { cleanTimeout, useCached, useCachedSetter, useE, useEventListener, useF, useI, useM, useR, useRenderCount, useRerender, useStyle } from '../lib/hooks'
import { meta } from '../lib/meta'
import { convertLinksToHtml } from '../lib/render'
import { useSocket } from '../lib/socket'
import { store } from '../lib/store'
import { JSX, pass, truthy } from '../lib/types'
import url from '../lib/url'
import { duration, elapsed, formatDurationMs, isMobile, named_log, node, Q, QQ, randAlphanum, S, toMonthDay, toStyle, toYearMonthDay } from '../lib/util'
import styled from 'styled-components'
import { A, Comment, HalfLine, Help, InfoBadges, InfoBody, InfoFile, InfoLine, InfoSection, InfoSelect, InfoStyles, ScrollText, Select, Sponsor } from '../components/Info'
import userProfile from '../lib/user'
import Settings from './settings'
import { usePageSettings } from 'src/lib/hooks_ext'
const { displayStatus } = window as any

const log = named_log('dinder')

// Showcase recipes
// http://localhost:3000/-dinder?R=52994
// http://localhost:3000/-dinder?R=52816 eggplant

type Recipe = { id:string, name:string, category:string, img:string, url:string, date?:number, user?:string, prep?:number, cook?:number, time?:number }
type Match = { 
  id:string, recipe:Recipe, users:string[], date:number, 
  vote?:{[key:string]:boolean}, postpone?:{[key:string]:boolean}, previous?:string, unmatched?:boolean,
}

const RECIPE_PLACEHOLDER = {
  name: '',
  category: '',
  url: undefined,
  img: undefined,
  prep: 30, cook: 30, time: 60,
  user: '',
}

export default ({thinder=false}) => {
  usePageSettings({
    background: '#fff',
    uses: {
      'TheMealDB': 'https://www.themealdb.com',
    },
  })
  useF(() => api.post('dinder/day', { day: toYearMonthDay(new Date()) }))

  meta.title.use({ value: 'Dinder' })
  meta.icon.use({ value: '/raw/dinder/icon.png' })

  const rerender = useRerender()

  const [{ user, expand }] = auth.use()
  RECIPE_PLACEHOLDER.user = user

  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<false|'about'|'settings'>(false)
  useF(user, mode, () => mode === 'about' && reloadSuggestions())

  const [match, setMatch] = useState<Match>()
  useI(match, () => {
    match && Object.assign(match, {
      date: Date.now(),
      ...match,
    })
  })
  const [matches, reloadMatches] = useCached<Match[]>('dinder-matches', () => api.get('dinder/matches').then(result => {
    console.debug('DINDER MATCHES', result.list)
    // the day after the user's first match, ask if they want to carry swipes over
    if (!match && result.list?.length) {
      setTimeout(() => {
        const settings = userProfile.settings.get()
        const { dinder={} } = settings
        if (undefined === dinder['carrySwipes']) {
          setCarrySwipesPrompt(true)
        }
      })
    }
    return result.list
  }))
  const [_recipe, setRecipe] = useState<Recipe>()
  // const recipe = match && !_recipe ? RECIPE_PLACEHOLDER : _recipe
  const recipe = _recipe
  const [previous, setPrevious] = useState<string>()
  const isInitialUserRender = 1 === useRenderCount(user)
  const search = new URLSearchParams(location.search)
  const SEARCH_MATCH_KEY = 'M'
  const SEARCH_RECIPE_KEY = 'R'
  const recipeDefined = search.get(SEARCH_RECIPE_KEY)
  useF(recipe?.id, match?.id, async () => {
    if (isInitialUserRender) {
      // try loading match first
      // if that doesn't work but there's a recipe, load that instead
      
      if (search.get(SEARCH_MATCH_KEY)) {
        try {
          const result = await api.get(`dinder/match/${search.get(SEARCH_MATCH_KEY)}`)
          console.debug('MATCH LINK', result)
          const { match, recipe, previous } = result
          setMatch(match)
          setRecipe(recipe)
          setPrevious(previous)
          return
        } catch {} // pass
      }
      if (search.get(SEARCH_RECIPE_KEY)) {
        try {
          const result = await api.post(`dinder/recipe/new/${search.get(SEARCH_RECIPE_KEY)}`)
          console.debug('RECIPE LINK', result)
          const { recipe, previous } = result
          setRecipe(recipe)
          setPrevious(previous)
          return
        } catch {} // pass
      }
    }

    // if not initial render, update location search params to current match/recipe
    if (match?.id) search.set(SEARCH_MATCH_KEY, match?.id)
    else search.delete(SEARCH_MATCH_KEY)
    if (recipe?.id) search.set(SEARCH_RECIPE_KEY, recipe?.id)
    else search.delete(SEARCH_RECIPE_KEY)
    const searchString = search.toString()
    url.silent(location.pathname + (searchString ? '?'+searchString : '') + location.hash)
  })
  useE(loading, recipe, () => loading && recipe && cleanTimeout(() => setLoading(false), !recipe.img ? 0 : 500))
  const duration24hr = 24 * 60 * 60 * 1000
  const today = toYearMonthDay(new Date())
  const todaysMatch = match && today === toYearMonthDay(new Date(match.date))
  const todayHasMatch = todaysMatch || matches?.find(x => toYearMonthDay(new Date(x.date)) === today)
  const tomorrowsMatch = useM(match, matches, () => match && matches?.find(x => toYearMonthDay(x.date) === toYearMonthDay(match.date + duration24hr)))
  const oldMatch = match && !todaysMatch && Number(new Date(match.date)) < Date.now()
  const futureMatch = match && !todaysMatch && Number(new Date(match.date)) > Date.now()
  const votedToRemake = match?.vote && match.users.every(x => match.vote[x])
  const voteOnMatch = oldMatch 
    && (Date.now() - match.date) < 7 * duration24hr
    && !votedToRemake
  const solo = match?.users.length === 1
  useF('DINDER VOTE', todaysMatch, oldMatch, voteOnMatch, console.debug)

  const [userRecipe, setUserRecipe] = useState(undefined)
  const _recipeSave = useR()
  useF(userRecipe, mode, () => {
    if (userRecipe && mode === 'about') {
      if (!_recipeSave.current) _recipeSave.current = recipe
      setRecipe(userRecipe)
      setCalendar(false)
      console.debug('USER RECIPE', userRecipe)
    } else if (_recipeSave.current) {
      setRecipe(_recipeSave.current)
      _recipeSave.current = undefined
    }
  })

  const [suggestions, reloadSuggestions] = useCached('dinder-user-suggestions', async () => {
    const { list } = await api.get('dinder/recipe')
    return list
  })
  useF(user, reloadSuggestions)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const showPreview = (mode === 'about' && (userRecipe || (showSuggestions && recipe?.user === user)))

  const loadedRecipe = useR()
  const tempApiIdentifier = useM(user, () => {
    return user ? {} : {
      temp: store.get('dinder-temp-user-id', () => `temp:${randAlphanum(8)}`)
    }
  })
  const handle = {
    parse: result => {
      setPrevious(result.previous)
      setMatch(result.match)
      const recipe = result.match?.recipe?.id ? result.match.recipe : result.recipe
      console.debug('DINDER PARSE', result.match, recipe)
      if (!recipe && result.match?.recipe) {
        api.get(`dinder/recipe/${result.match.recipe}`).then(({ recipe }) => {
          loadedRecipe.current = true
          setRecipe(recipe)
        })
      } else {
        loadedRecipe.current = true
        setRecipe(recipe)
      }
    },
    load: (loading=true, preserve=false) => {
      if (userRecipe) return

      setLoading(loading)
      loadedRecipe.current = false
      api.get('dinder/matches').then(result => {
        console.debug('DINDER LOADED', preserve, result)
        const { list } = result
        
        if (preserve && match) {
          result.match = list.find(x => x.id === match.id)
        } else {
          const dateString = toYearMonthDay(new Date())
          result.match = list.find(x => dateString === toYearMonthDay(new Date(x.date)))
        }

        if (result.match && !result.match.unmatched) {
          handle.parse(result)
        } else {
          handle.randomize()
        }
      })
    },
    randomize: () => {
      loadedRecipe.current = false
      api.post('dinder/recipe/new', tempApiIdentifier).then(({ recipe }) => {
        if (!loadedRecipe.current) {
          setRecipe(recipe)
        }
      })
    },
    reset: () => {
      if (recipe?.user !== user) {
        setShowSuggestions(false)
      }
      if (ref.current) {
        const node = ref.current
        node.classList.remove('yes')
        node.classList.remove('no')
        node.style.transform = ``
        document.querySelectorAll('.dinder-actions .button').forEach((x:any) => x.classList.remove('press'))
      }
    },
    yes: () => {          
      let loadedResult, timeoutPassed
      setTimeout(() => {
        handle.reset()
        setLoading(true)
        if (loadedResult) handle.parse(loadedResult)
        else timeoutPassed = true
      }, 150)

      api.post('dinder/recipe/yes', tempApiIdentifier)
      .then(result => {
        if (timeoutPassed) handle.parse(result)
        else loadedResult = result

        if (!user) {
          // message.trigger({
          //   text: `Log in to make ${recipe.name} with ${result.match.users.filter(x => x !== '(log in)').join('&')}`,
          //   // ms: 15_000,
          //   id: 'dinder-login',
          // })
          // ;(callback => {
          //   message.add(() => {
          //     callback()
          //     message.remove(callback)
          //   })
          // })(() => {
          //   message.remove({ delete: 'dinder-login' })
          // })
        }
      })
      .catch(e => {
        // if (!user) {
        //   message.trigger({
        //     text: `Log in to match with someone and make ${recipe.name}`,
        //     // ms: 15_000,
        //     id: 'dinder-login',
        //   })
        //   ;(callback => {
        //     message.add(() => {
        //       callback()
        //       message.remove(callback)
        //     })
        //   })(() => {
        //     message.remove({ delete: 'dinder-login' })
        //   })
        // }
      })
      .finally(() => {
        if (!user) {
          openLogin()
        }
      })
    },
    no: () => {
      let loadedResult, timeoutPassed
      setTimeout(() => {
        handle.reset()
        setLoading(true)
        if (loadedResult) handle.parse(loadedResult)
        else timeoutPassed = true
      }, 150)

      api.post('dinder/recipe/no', tempApiIdentifier)
      .then(result => {
        if (timeoutPassed) handle.parse(result)
        else loadedResult = result
      })
    },
  }
  useF(user, async () => {
    console.debug('DINDER USER', {
      user, match, recipe
    })
    const tempMatchRecipeId = user && match && recipe?.id
    if (recipeDefined || tempMatchRecipeId) {
      try {
        await api.post(`dinder/recipe/new/${recipeDefined || tempMatchRecipeId}`, tempApiIdentifier)
        if (tempMatchRecipeId) handle.yes()
        return
      } catch {} // continue to regular load
    }
    handle.load()
  })
  useF(recipe, handle.reset)
  useF(recipe, match, () => {
    if (!userRecipe && !recipeDefined && match && recipe?.id !== match.recipe.id) {
      api.get(`dinder/recipe/${match.recipe.id || match.recipe}`).then(({ recipe }) => setRecipe(recipe))
    }
  })
  useSocket({
    on: {
      'dinder:match': () => {
        handle.load(false, true)
        reloadMatches()
      },
    },
  })
  useEventListener(window, 'focus', 
    () => !calendar && !match && recipe && !userRecipe && handle.load(false))


  const ref = useR()
  const noRef = useR()
  const yesRef = useR()
  const [skipBelow, setSkipBelow] = useState(false)
  useF(recipe, () => {
    if (recipe && !isMobile) {
      const body = Q('.body')
      if (body.scrollHeight > body.clientHeight) setSkipBelow(true)
    }
  })
  const actions = isBelow => {
    if (isMobile && !isBelow) return null
    if (skipBelow && isBelow) return true

    return (
      <div 
      className='dinder-actions inline' 
      style={{ alignItems: isBelow ? 'flex-start' : 'flex-end'}}>
        <div ref={noRef} className='action button no' onClick={() => {
          handle.reset()
          ref.current.classList.add('no')
          document.querySelectorAll('.dinder-actions .button.no').forEach((x:any) => x.classList.add('press'))
          handle.no()
        }}>NO</div>
        <div ref={yesRef} className='action button yes' onClick={() => {
          handle.reset()
          ref.current.classList.add('yes')
          document.querySelectorAll('.dinder-actions .button.yes').forEach((x:any) => x.classList.add('press'))

          handle.yes()
        }}>YES</div>
        {previous && (isBelow || skipBelow)
        ?
        <div 
        className='action button back'
        style={toStyle(`
        font-size: 1em;
        position: absolute;
        left: 0;
        margin: 0;
        width: 3em;
        `)}
        onClick={() => {
          handle.reset()
          api.post('dinder/recipe/back', tempApiIdentifier).then(result => handle.parse(result))
        }}>←</div>
        :''}
      </div>
    )
  }

  useE(recipe?.id, () => QQ('.dinder-card').map(async card => {
    const node = card.querySelector('.recipe-name') as HTMLSpanElement
    node.style.transition = ''
    node.style.left = `0`
    await Promise.resolve()
    node.style.transition = 'left 10s 2s linear'
    node.style.left = `-${node.scrollWidth - node.clientWidth}px`

    let scrolled = false, scrolling = true
    const _reset = ms => setTimeout(() => {
      node.style.transition = ''
      node.style.left = `0`
      // setTimeout(_inner, 2)
      scrolled = true
      scrolling = false
    }, ms)
    _reset(14_000) // 2s buffer on either end
    const _pointerover = (e:any) => {
      if (!scrolling && e.target === node) {
        scrolling = true
        node.style.transition = 'left 10s linear'
        node.style.left = `-${node.scrollWidth - node.clientWidth}px`
        _reset(10_000)
      }
    }
    const _pointerout = e => (scrolling && scrolled) && _reset(0)
    card.addEventListener('pointerover', _pointerover)
    card.addEventListener('pointerout', _pointerout)
    return () => {
      card.removeEventListener('pointerover', _pointerover)
      card.removeEventListener('pointerout', _pointerout)
    }
  }))

  // let user drag card past centerline to signify choice
  const pointer = useR()
  useEventListener(window, 'pointerup', e => {
    if (pointer.current) {
      const { clientX: refX, clientY: refY } = pointer.current
      pointer.current = undefined
      const node = ref.current
      const rect = node.getBoundingClientRect()
      node.classList.remove('yes')
      node.classList.remove('no')
      if (Math.abs(e.clientX - refX) > rect.width / 3) {
        const isYesVote = e.clientX - refX > 0
        ;(isYesVote ? yesRef : noRef).current.click()
      } else {
        node.style.transform = ``
      }
    }
  })
  const card = recipe &&
    <div ref={ref} className='dinder-card' key={recipe.id}
    onClick={(e:any) => {
      if (![e.target.tagName, e.target.parentNode.tagName].smap('.toLowerCase()').includes('a')) {
        url.new(recipe.url)
      }
    }}
    onPointerDown={e => {
      pointer.current = e
    }}
    onPointerMove={e => {
      if (match) return

      if (pointer.current) {
        console.debug(e)
        const { clientX: refX, clientY: refY } = pointer.current
        e.currentTarget.style.transform = `translate(${e.clientX - refX}px, 0px)`

        const rect = e.currentTarget.getBoundingClientRect()
        document.querySelectorAll('.dinder-actions .button').forEach((x:any) => x.classList.remove('press'))
        if (Math.abs(e.clientX - refX) > rect.width / 3) {
          if (e.clientX - refX > 0) {
            document.querySelectorAll('.dinder-actions .button.yes').forEach((x:any) => x.classList.add('press'))
          } else {
            document.querySelectorAll('.dinder-actions .button.no').forEach((x:any) => x.classList.add('press'))
          }
        }
      }
    }}>
      <ScrollText on={[recipe.name]} className='recipe-name'>
        {loading 
        ? 'Loading' 
        : recipe.name 
        ? <>{recipe.name} {recipe.category || (recipe.user && recipe.time) ? <>({[
          recipe.user && recipe.time && recipe.time !== 60 && formatDurationMs(recipe.time * 60 * 1000), 
          recipe.category
        ].filter(truthy).join(' ')})</> : ''}</>
        : '(empty)'}
      </ScrollText>
      <a href={recipe.url} target='_blank' rel='noreferrer' draggable={false} style={{display:'flex'}}><img src={recipe.img} draggable={false} style={{visibility:loading||!recipe.img?'hidden':undefined}} onLoad={e => setLoading(false)}/></a>
      {<a
      href={recipe.url} target='_blank' rel='noreferrer'
      style={{visibility:loading||!recipe.url?'hidden':undefined}}>see recipe</a>}
    </div>
  
  const [viewHowTo, setViewHowTo] = useState(false)
  const [calendar, setCalendar] = useState(false)
  const calendarScrollTop = useR(1e6)
  useF(calendar, () => {
    if (!mode && !calendar) {
      const content = document.querySelector('.content') as any
      content.style.height = content.clientHeight + 'px'
    } else {
      setTimeout(() => {
        const calendar = document.querySelector('.calendar')
        console.debug(calendarScrollTop.current, calendar)
        if (calendar) calendar.scrollTop = calendarScrollTop.current
      })
    }
  })
  const [carrySwipesPrompt, setCarrySwipesPrompt] = useState(false)
  const recipeView = !userRecipe && recipeDefined && recipe && todayHasMatch && (!match || (match.recipe.id || match.recipe) !== recipe.id)
  useF(matches, () => 
    matches && match 
    && setMatch(matches.find(x => x.id === match.id) || match))
  useF(user, reloadMatches)
  const calendarData = useM(matches, () => [].concat([{
    date: new Date(),
    color: '#000',
    func: () => {
      console.debug('CALENDAR HIDE')
      setCalendar(false)
    },
  }], matches?.map(x => {
    return {
      date: new Date(x.date),
      color: '#000',
      func: () => {
        console.debug('CALENDAR SELECT', x)
        setMatch(x)
        setRecipe(x.recipe)
        setCalendar(false)
      },
      text: x.users.find(x => x !== user) || undefined,
      img: x.recipe.img,
    }
  })))
  const calendar_delta = useM(matches, () => Math.max(7, ...(matches||[]).map(m => 1 + Math.ceil((m.date - Date.now()) / duration({ d:1 })))))
  useF('CALENDAR', calendarData, calendar_delta, console.debug)
  
  const [categories] = useCached<string[]>('dinder-categories', () => api.external('https://www.themealdb.com/api/json/v1/1/categories.php').then(result => result.categories.map(x => x.strCategory)))
  useF('categories', categories, log)
  const [filter, setFilter, reloadFilter] = useCachedSetter({
    name: 'dinder-filter',
    fetcher: () => user ? api.get('dinder/filter').then(({ value }) => value) : Promise.resolve([]),
    setter: (filter) => user ? api.post('dinder/filter', filter).then(reloadFilter) : Promise.resolve([]),
  })
  useF(user, reloadFilter)
  const remainingCategories = useM(categories, filter, () => {
    const filterSet = new Set(filter || [])
    return (categories || []).filter(x => !filterSet.has(x))
  })
  useF('FILTERS', filter, remainingCategories, categories, console.debug)

  const [filter_hint, setFilterHint] = store.local.use('dinder-filter-hint')
  useF(filter_hint, categories, () => {
    if (!filter_hint) {
      log('filter categories', categories)
      window['_dinder-filter-hint-trigger'] = () => {
        setFilter({ categories: categories?.filter(x => x !== 'Vegan') }).then(() => handle.randomize())
      }
    }
  })
  useF(filter_hint, () => {
    if (!filter_hint) {
      message.trigger({
        text: `Try a filter! <a onclick="window['_dinder-filter-hint-trigger']()"><b>only show</b> → <b>VEGAN</b></a> `,
      })
      setFilterHint(true)
    }
  })

  const [install, setInstall] = useState<string>()
  useF([], () => {
    const recipeDateInput = document.querySelector('#dinder-date-user-made-recipe')
    if (recipeDateInput) (recipeDateInput as any).value = (recipeDateInput as any).value || toYearMonthDay(new Date())
  })
  const matchView = match // && !calendar
  useStyle(`
  .modal:has(#feedback) {
    color: #000 !important;
    background: #fff !important;
  }
  #feedback, #feedback#feedback #contact-container > :is(textarea, input, a) {
    color: #000 !important;
  }
  #feedback#feedback #contact-container > :is(textarea, input) {
    background: #eee !important;
  }
  `)
  const reloadMatch = () => reloadMatches().then(list => {
    const reload = list.find(x => x.id === match.id)
    setMatch(reload?.unmatched ? undefined : reload)
  })
  const [monthly, reloadMonthly] = useCached<number>('monthly-donations', () => api.get('cost/month').then(({ sum }) => sum))
  const addToCalendar = recipe && (recipe.user === user || true)
    ? <>
      <span 
      className='action button' 
      style={toStyle(`
      margin: 0;
      margin-bottom: .25em;
      display: flex;
      align-items: center;
      `)}
      onClick={e => {
        if (e.target !== e.currentTarget) return
        if (!user) {
          openLogin()
          // message.trigger({
          //   text: `Log in to add ${recipe.name} to your calendar. Also – if you meant to match with someone, simply swipe or tap "YES" instead of this button`,
          //   ms: 15_000,
          //   id: 'dinder-login',
          // })
          // ;(callback => {
          //   message.add(() => {
          //     callback()
          //     message.remove(callback)
          //   })
          // })(() => {
          //   message.remove({ delete: 'dinder-login' })
          // })
          return
        }
        const date = (document.querySelector('#dinder-date-user-made-recipe') as HTMLInputElement).value
        if (date) {
          console.debug('DINDER MADE', date, recipe)
          api.post(`dinder/recipe/${recipe.id}/made`, { date }).then(({ match }) => setMatch(match))
          e.currentTarget.textContent = 'added to calendar'
        }
      }}>
        <input type='date'
        id='dinder-date-user-made-recipe'
        max={toYearMonthDay(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))}
        onPointerDown={e => e.stopPropagation()}
        />&nbsp;→&nbsp;add to calendar solo
      </span>
    </>
    :''
  const previousMatch = useM(match, matches, () => match && matches?.find(x => x.date < match.date && x.recipe.id === match.recipe.id))
  const nextMatch = useM(match, matches, () => match && matches?.findLast(x => x.date > match.date && x.recipe.id === match.recipe.id))
  return <Style id='dinder' className={isMobile ? 'mobile' : ''}>
    <InfoBody>
      <Scroller deps={[[]]} />
      <Comment text='icon: https://www.svgrepo.com/svg/383690/food-dish' />
      {expand ? <h3>{thinder ? 'THINDER' : 'DINDER'}</h3> : null}
      {/* <i>what're we making for dinner?</i> */}
      <InfoSection labels={[
        { 
          'how-to': () => {
            setMode(false)
            if (matchView) setViewHowTo(true)
          },
          label: !(mode || (matchView && !viewHowTo)) && (pass || (() => {
            setMode(false)
            setViewHowTo(false)
          })),
        },
        { about: () => setMode('about'), label: mode === 'about' && (pass || (() => {
          setMode(false)
          setViewHowTo(false)
        })) },
        { settings: () => setMode('settings'), label: mode === 'settings' && (pass || (() => {
          setMode(false)
          setViewHowTo(false)
        })) },
        // { 'give feedback': () => openFeedback() },
        // matchView && (viewHowTo || mode) && { close: ()=> { setViewHowTo(false); setMode(false) } },
        ]}>
          {mode === 'about'
          ?
            userRecipe
            ? <div id='user-recipe-entry'>
              <span style={{fontSize:'.8em'}}>No paywalls. Use a square image if possible</span>
              <input 
              value={userRecipe.name}
              onChange={e => setUserRecipe({ ...userRecipe, name: e.target.value })}
              type='text' placeholder='Recipe Name' />
              <div className='inline-group'>
                <InfoSelect 
                value={userRecipe.category || undefined}
                onChange={e => setUserRecipe({ ...userRecipe, category: e.target.value })}
                name='(select category)' options={categories} />
                <div className='action'>
                  {userRecipe.time}m (prep <input type='number'
                  value={userRecipe.prep}
                  onClickCapture={e => e.stopPropagation()}
                  onChange={e => setUserRecipe({ ...userRecipe, prep: Number(e.target.value), time: userRecipe.cook + Number(e.target.value) })}
                  />, cook <input type='number'
                  value={userRecipe.cook}
                  onClickCapture={e => e.stopPropagation()}
                  onChange={e => setUserRecipe({ ...userRecipe, cook: Number(e.target.value), time: userRecipe.prep + Number(e.target.value) })}
                  />)
                </div>
              </div>
              <input className='url-input'
              value={userRecipe.url}
              onChange={e => setUserRecipe({ ...userRecipe, url: e.target.value })}
              type='text' placeholder='recipe url'
              style={{ fontSize:'.85em' }}/>
              <div style={toStyle(`
              display: flex;
              align-items: center;
              font-size: .85em;
              `)}>
                <input className='url-input'
                value={userRecipe.img}
                onChange={e => setUserRecipe({ ...userRecipe, img: e.target.value })}
                type='text' placeholder='image url'
                style={{ fontSize:'1em', width: '10em', flexGrow: '1' }} />
                &nbsp;or&nbsp;
                <InfoFile image inline onChange={e => {
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
              <InfoBadges labels={[
                { cancel: e => setUserRecipe(undefined) },
                { submit: (e:any) => {
                  if (!user) {
                    openLogin()
                    // message.trigger({
                    //   text: `Log in to add a new recipe`,
                    //   ms: 15_000,
                    //   id: 'dinder-login',
                    // })
                    // ;(callback => {
                    //   message.add(() => {
                    //     callback()
                    //     message.remove(callback)
                    //   })
                    // })(() => {
                    //   message.remove({ delete: 'dinder-login' })
                    // })
                  } else if ('name category url img'.split(' ').every(x => userRecipe[x])) {
                    setUserRecipe(undefined)
                    api.post('dinder/recipe', userRecipe).then(x => reloadSuggestions())
                  } else {
                    e.target.textContent = 'missing details'
                    setTimeout(() => e.target.textContent = 'submit', 2500)
                  }
                } },
              ]} />
              {/* <div className='description'>You won't be able to modify these details later</div> */}
              {/* <div style={{fontSize:'.8em'}}>
                <br/>
                I made this on <input type='date'
                value={userRecipe.date} max={toYearMonthDay(new Date())}
                onChange={e => setUserRecipe({ ...userRecipe, date: e.target.value })}
                style={{ fontSize:'1em', display:'inline-block', width: 'fit-content' }}/>
              </div> */}
              <br/>
            </div>
            : showSuggestions
            ? <>
              <InfoBadges labels={[
                { 'done editing': () => setShowSuggestions(false) },
              ]} />
              {suggestions.map(x => {
                return <div style={{display:'flex'}}><InfoBadges labels={[
                  { 'delete': e => {
                    suggestions.splice(suggestions.indexOf(x), 1)
                    if (suggestions.length) {
                      rerender()
                    } else {
                      setShowSuggestions(false)
                    }
                    api.delete(`dinder/recipe/${x.id}`).then(() => reloadSuggestions())
                  } },
                  recipe?.id === x.id ? 'view' : { 'view': e => {
                    console.debug(x)
                    setLoading(true)
                    setMatch(undefined)
                    setRecipe(x)
                    setCalendar(false)
                  } },
                ]} />&nbsp;<span>{x.name}</span></div>
              })}
            </>
            : <>
              <InfoBadges labels={[
                { 
                  'add a new recipe': e => {
                    user ? setUserRecipe(RECIPE_PLACEHOLDER) : openLogin()
                  },
                  // style: user ? undefined : {opacity:'.5'}
                },
                user && suggestions?.length && { 'edit': e => setShowSuggestions(true) },
              ]} />
            {/* <span><span className='action button' onClick={e => setUserRecipe(RECIPE_PLACEHOLDER)}>add a new recipe</span>{
              suggestions?.length 
              ? <span className='action button' onClick={e => {
                setShowSuggestions(true)
              }}>edit</span>
              : ''}</span> */}
            {/* <span id='user-recipe-count' className='vertical-middle description'></span> */}
            {/* {(() => setTimeout(() => {
              const userRecipeCount = document.querySelector('#user-recipe-count')
              if (!userRecipeCount.textContent.includes('have added')) {
                api
                .get('dinder/recipe/count')
                .then(x => userRecipeCount.textContent = `Users have added ${x} new recipes!`)
              }
            }) && null)()} */}
            &nbsp;
            <span className='vertical-middle'>Original recipes from <A href='https://www.themealdb.com' func={url.new}>TheMealDB</A></span>
            {/* <span className='vertical-middle'>Unlock more from <A href='https://rapidapi.com/apidojo/api/tasty' func={url.new}>Tasty</A>: <InfoBadges labels={[
              { 
                'donate $1': e => url.new('https://github.com/sponsors/cfreshman/'),
                style: { background:'gold' },
              },
              { 
                text: <>
                  <span className='text'>share</span>
                </>,
                func: (e:any) => {
                  copy(
                    `https://dinder.social/?from=${user}`,
                    e.target.parentNode.querySelector('.text'), 3000)
                  message.trigger({
                    text: `If someone donates, you'll unlock more recipes for a month, too`,
                  })
                }
              },
            ]} /></span> */}

            <div>
              Install:<InfoBadges inline labels={[
                install === 'iOS' 
                ? 'iOS' 
                : { 'iOS': () => setInstall('iOS') },
                install === 'Android' 
                ? 'Android' 
                : { 'Android': () => setInstall('Android') },
                // install && { hide: () => setInstall(undefined) },
              ]} />
            </div>
            {install
            ? <div className='description' style={toStyle(`
            margin: .25em 0;
            `)}>
              {install === 'iOS'
              ?
              <span style={toStyle(`display:inline-flex;align-items:center`)}>
                Safari →
                {/* https://www.svgrepo.com/svg/343284/share-alt */}
                <svg width="1.5em" height="1.5em" style={{ margin: '0 .25rem' }}
                viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                  <g fill="none" fillRule="evenodd" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" transform="translate(4 2)">
                    <path d="m8.5 2.5-1.978-2-2.022 2"/>
                    <path d="m6.5.5v9"/>
                    <path d="m3.5 4.5h-1c-1.1045695 0-2 .8954305-2 2v7c0 1.1045695.8954305 2 2 2h8c1.1045695 0 2-.8954305 2-2v-7c0-1.1045695-.8954305-2-2-2h-1"/>
                  </g>
                </svg>→ Add to Home Screen
              </span>
              : install === 'Android'
              ?
              <span style={toStyle(`display:inline-flex;align-items:center`)}>
                Chrome →
                {/* https://www.svgrepo.com/svg/345223/three-dots-vertical */}
                <svg width="1em" height="1em" style={{ margin: '0 .25rem' }}
                viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                  <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
                </svg>→ Add to Home Screen
              </span>
              :''}
            </div>
            :''}
            {/* <span className='vertical-middle description'>via <A href='https://rapidapi.com/apidojo/api/tasty' func={url.new}>Tasty</A></span> */}

            {/* <span className='vertical-middle'>Original 286 recipes from <A href='https://www.themealdb.com' func={url.new}>TheMealDB</A></span>
            <span className='vertical-middle'>Unlock more: <span className='action button' onClick={e => {
              url.new('https://github.com/sponsors/cfreshman/')
            }}>donate $1</span><span className='action button' onClick={e => {
              copy(`https://dinder.social/?from=${user}`)
              message.trigger({
                text: `If someone signs up with this link and donates or shares too, you'll unlock more recipes for a month`,
                ms: 6_000,
              })
              const textNode = e.target.parentNode.querySelector('.text')
              textNode.textContent = 'copied!'
              setTimeout(() =>  textNode.textContent = 'share', 3000)
            }}><span className='text'>share</span>&nbsp;<Help>If someone signs up with your link and donates or shares too, you'll unlock more recipes for a month</Help></span></span>
            {monthly !== undefined ? 
            (() => {
              const percent = Math.min(1, (monthly + 1) / 100) * 100
              return <div style={toStyle(`
              border-radius: 2px;
              border: 1px solid #000;
              background: linear-gradient(90deg, #00c30f88 ${percent}%, #0000 ${percent}%), linear-gradient(90deg, #0000 ${10}%, #f002 ${10}%, #f002 ${11}%, #0000 ${11}%), linear-gradient(90deg, #0000 ${99}%, #00f2 ${99}%, #00f2 ${100}%, #0000 ${100}%);
              padding: 0 .5em;
              font-size: .8em;
              `)}>
                <span style={{mixBlendMode:'difference', color:'#fff'}}>
                  {monthly < 100 ? `Dinder is at $${monthly || 1}/mo` : ''}
                </span>
              </div>
            })()
            : ''}
            <span className='vertical-middle description'>{monthly >= 10 ? '✅' : '🔒'} 1518 more via <A href='https://rapidapi.com/apidojo/api/tasty' func={url.new}>Tasty</A> at <span style={{background:'0px 1px #f002'}}>$10/mo</span>&nbsp;&nbsp;<Help linger><A href='https://rapidapi.com/apidojo/api/tasty/pricing'>Tasty API fee</A></Help>&nbsp;&nbsp;</span>
            <span className='vertical-middle description'>{monthly >= 99 ? '✅' : '🔒'} <i>*1,000,000 more*</i> via <A href='https://api2.bigoven.com/' func={url.new}>BigOven</A> at <span style={{background:'0px 1px #00f2'}}>$99/mo</span>&nbsp;&nbsp;<Help><A href='https://api2.bigoven.com/web/documentation/feestructure'>BigOven's API fee</A></Help></span> */}
            {/* <div style={toStyle(`
            display: flex;
            align-items: center;
            font-size: 1.5em;
            flex-wrap: wrap;
            `)}>
              <A 
              href='https://www.themealdb.com' func={url.new}
              style={toStyle(`
              display: flex;
              align-items: center;
              `)}>
                <img 
                src='https://www.themealdb.com/images/logo-small.png' 
                style={{height:'.8em'}} />
              </A>
              &nbsp;
              <A
              href='https://api2.bigoven.com/' func={url.new}
              style={toStyle(`
              display: flex;
              align-items: center;
              `)}>
                <img 
                src="https://mda.bigoven.com/images/logos/BigOven_logo_rgb150x40.png" 
                style={{height:'1em'}} />
              </A>
            </div> */}
            &nbsp;
            <div style={toStyle(`
            position: fixed;
            width: 100%;
            left: 0;
            bottom: 1em;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            `)}>
              <div>
                {/* by <a href='https://twitter.com/freshman_dev'>
                  @freshman_dev
                </a> (<a
                href={`https://twitter.com/messages/compose?recipient_id=1351728698614042626&text=${
                  encodeURIComponent(`(wordbase.app) `)
                  }`}>
                  DM
                </a>) */}
                <a onClick={() => openFeedback()}>feedback</a> <A href='/contact'>contact</A>
              </div>
              {/* <HalfLine />
              <Sponsor hideForSupporter /> */}
              <HalfLine />
            </div>
            {/* <A 
            href="https://www.producthunt.com/posts/dinder?utm_source=badge-featured&utm_medium=badge&utm_souce=badge-dinder" target="_blank" 
            style={{ display: 'flex', width: 'fit-content' }}>
              <img 
              // src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=377765&theme=dark" 
              src="/raw/dinder/producthunt.svg" 
              alt="Dinder - Find someone to make dinner with tonight | Product Hunt" 
              style={{height:'2.5em'}} />
            </A> */}
            {/* <div className='description'>
              Inspired by <a href='https://twitter.com/Ygrene/status/1619396361572716544'>this tweet</a>
            </div> */}
          </>
          : mode === 'settings'
          ? <Settings app='dinder' close={()=>{}} />
          : viewHowTo || !match
          ? <>
            Swipe on meal suggestions for tonight.
            <br/>
            <div className='description'>
              {/* Pick up ingredients & cook when someone picks the same meal */}
              {/* Wait until someone picks the same meal to start shopping/cooking */}
              <div style={S(thinder ? `
              text-decoration: line-through;
              ` : '')}>
              When someone else picks a match, go shopping & prepare.{'\n'}
              Chat to share notes. Make it again next week.{'\n'}
              </div>
              {thinder ? <p style={S(`
              background: #eee;
              padding: .25em;
              border-radius: .25em;
              margin-top: .25em;
              `)}>
                <b>DO NOT ACTUALLY MAKE THE MEAL</b>{'\n'}
                <b>THIS IS THINDER</b> (see <A href='/dinder'>DINDER</A>){'\n'}
                <b style={{fontSize:'.67em'}}>make 2oz whole wheat pasta (w/ pea & rice protein sauce, steamed broccoli?) INSTEAD</b>{'\n'}
              </p>:null}
              {/* When someone else picks the same meal, you'll match, and can start shopping/cooking. */}
              {/* {isMobile ? ' ' : <br/>} */}
              {/* Chat to share cooking tips & notes. Afterwards, vote to make it again next week. */}
              <br/>
            </div>
          </>
          :''}
      </InfoSection>
      {mode && !showPreview
      ? null
      : calendar
      ?
      <InfoSection className='content' labels={[
        { [match ? 'match' : showPreview ? 'recipe' : 'swipe']: () => setCalendar(false) },
        { calendar: () => setCalendar(false), label: pass || true },
        ((match && !todaysMatch) || (showSuggestions && recipe?.user === user)) && { today: () => {
          setShowSuggestions(false)
          setRecipe(undefined)
          setMatch(undefined)
          setCalendar(false)
          setMode(undefined)
          handle.load()
        } },
      ]}>
        <Calendar entries={calendarData} delta={calendar_delta} onWheel={e => {
          calendarScrollTop.current = e.currentTarget.querySelector('.calendar').scrollTop
          // console.debug(e.currentTarget, calendarScrollTop.current)
        }} />
      </InfoSection>
      : match && !userRecipe && !recipeView
      ?
      (() => {
        const dateDisplay = toMonthDay(match.date)
        const prepareDisplay = todaysMatch
          ? `preparing with ${match.users.join(' & ')}`
          : `prepar${oldMatch ? 'ed' : 'ing'} ${
            solo
            ? `on ${dateDisplay}`
            : `${dateDisplay} with ${match.users?.filter(x => x !== user).join(' & ') || '(loading)'}`
        }`
        return <InfoSection className='content' nowrap labels={[
          prepareDisplay,
          { calendar: () => {
            setCalendar(true)
            // setMatch(undefined)
            // setMode(false)
            // setViewHowTo(false)
          } },
          // oldMatch && { swipe: () => {
          //   setRecipe(undefined)
          //   setMatch(undefined)
          //   handle.randomize()
          // } },
          { [oldMatch ? 'remove' : 'unmatch']: () => {
            api.delete(`dinder/match/${match.id}`).then(() => {
              reloadMatches()
              setMatch(undefined)
              handle.randomize()
            })
          } }
        ]}>
          <div style={toStyle(`
          position: relative;
          width: fit-content;
          `)}>
            {card}
            {previousMatch
            ? 
              solo
              ?
              <div className='row' style={{fontSize:'.8em'}}>[
                <a onClick={e => {
                  setMatch(previousMatch)
                  setRecipe(previousMatch.recipe)
                }}>← you've made this before ({toMonthDay(previousMatch.date)})</a>
              ]</div>
              :
              <InfoLine prefix labels={[{ ' ← ': () => {
                setMatch(previousMatch)
                setRecipe(previousMatch.recipe)
              } }]}>
                
                <span className='description'>
                  You've made this before
                </span>
              </InfoLine>
            :''}
            {votedToRemake
            ? 
            <InfoLine justify='right' labels={[{ ' → ': () => {
              const nextWeekMatch = matches.find(x => x.date > match.date && x.recipe.id === match.recipe.id)
              if (nextWeekMatch) {
                setMatch(nextWeekMatch)
                setRecipe(nextWeekMatch.recipe)
              } else {
                message.trigger({
                  text: 'unable to find that match, did you delete it?',
                  ms: 5_000,
                })
              }
            } }]}>
              <span className='description'>
                You {solo ? 'decided' : 'voted'} to make this again
              </span>
            </InfoLine>
            : voteOnMatch
            ? 
            (() => {
              const vote = (match.vote || {})[user]
              const toggle = () => {
                setMatch({ ...match, vote: { [user]: !vote }})
                api
                .post(`dinder/match/${match.id}/vote`, { vote: !vote })
                .then(reloadMatch)
              }
              console.debug('DINDER VOTE', user, match.vote, vote, match)
              return <InfoLine labels={[
                vote ? 'YES' : { YES: toggle },
                vote && { NO: toggle },
              ]}>
                <span className='description'>{solo ? 'Prepare' : 'Vote: prepare'} again next {new Date(match.date).toLocaleDateString('en-US', { weekday: 'long' })}?</span>
              </InfoLine>
            })()
            :''}
          </div>
          {!oldMatch
          ?
          (() => {
            const postpone = (match.postpone || {})[user]
            const toggle = () => {
              setMatch({ ...match, postpone: { [user]: !postpone }})
              api
              .post(`dinder/match/${match.id}/postpone`, { vote: !postpone })
              .then(reloadMatch)
            }
            return solo
            ?
            <div className='row' style={{fontSize:'.8em'}}>[
              {tomorrowsMatch
              ?
              <a onClick={e => {
                setRecipe(tomorrowsMatch.recipe)
                setMatch(tomorrowsMatch)
              }}>move tomorrow's match to postpone this one</a>
              :
              <a onClick={e => {
                displayStatus(e.currentTarget, 'postponed', 1_000)
                toggle()
              }}>postpone until {toYearMonthDay(match.date) === today ? 'tomorrow' : toMonthDay(match.date + duration({ d:1 }))}</a>
              }
            ]</div>
            :
            <InfoLine labels={tomorrowsMatch ? [
              { '→': () => {
                setRecipe(tomorrowsMatch.recipe)
                setMatch(tomorrowsMatch)
              } },
            ] : [
              postpone ? 'YES' : { YES: toggle },
              postpone && { NO: toggle },
            ]}>
              <span className='description'>
                {tomorrowsMatch 
                ? <>
                  Move tomorrow's match to postpone this one
                </>
                : <>
                  {solo ? 'Postpone' : 'Vote: postpone'} until tomorrow?
                </>}
              </span>
            </InfoLine>
            // return <InfoLine labels={tomorrowsMatch ? [
            //   { '→': () => {
            //     setRecipe(tomorrowsMatch.recipe)
            //     setMatch(tomorrowsMatch)
            //   } },
            // ] : [
            //   postpone ? 'YES' : { YES: toggle },
            //   postpone && { NO: toggle },
            // ]}>
            //   <span className='description'>
            //     {tomorrowsMatch 
            //     ? <>
            //       Move tomorrow's match to postpone this one
            //     </>
            //     : <>
            //       {solo ? 'Postpone' : 'Vote: postpone'} until tomorrow?
            //     </>}
            //   </span>
            // </InfoLine>
          })()
          :''}
          {nextMatch
          ? 
            solo
            ?
            <div className='row' style={{fontSize:'.8em'}}>[
              <a onClick={e => {
                setMatch(nextMatch)
                setRecipe(nextMatch.recipe)
              }}>you have plans to make this again on {toMonthDay(nextMatch.date)} →</a>
            ]</div>
            :
            <InfoLine prefix labels={[{ ' ← ': () => {
              setMatch(nextMatch)
              setRecipe(nextMatch.recipe)
            } }]}>
              
              <span className='description'>
                You have plans to make this again
              </span>
            </InfoLine>
          :''}
          {userProfile.settings.get()?.dinder?.chat
          ? <div className='dinder-chat'><Chat hash={match.id} fallback={<div />} /></div>
          :null}
        </InfoSection>
      })()
      : recipe && (!mode || showPreview) // userRecipe || 
      ? <>
        <InfoSection labels={showPreview ? undefined : [
          { 
            [showSuggestions && recipe?.user === user ? 'recipe' : 'swipe']: () => setCalendar(true),
            label: pass || true,
          },
          { calendar: () => setCalendar(true) },
          showSuggestions && recipe?.user === user && { today: () => {
            setShowSuggestions(false)
            setRecipe(undefined)
            setMatch(undefined)
            setCalendar(false)
            setMode(undefined)
            handle.load()
          } },
          ]}>
            {carrySwipesPrompt
            ?
            <div>
              Do you want to carry swipes over from previous days?
              <div className='action button' onClick={e => {
                const { dinder={} } = userProfile.settings.get()
                userProfile.settings.update('dinder', { ...dinder, carrySwipes: false })
                setCarrySwipesPrompt(false)
              }}>No, I want to decide what to make each night</div>
              <div className='action button' onClick={e => {
                const { dinder={} } = userProfile.settings.get()
                userProfile.settings.update('dinder', { ...dinder, carrySwipes: true })
                setCarrySwipesPrompt(false)
              }}>Yes, carry over recipes I've already liked</div>
              <div className='description'>(You can change this before swiping each day in the 'settings' tab)</div>
            </div>
            : <>
            {isMobile ? <div className='spacer' /> : ''}
            <div className='dinder-swipe'>
              {userRecipe
              ? card
              : recipeView
              ? <>
                {card}
                <br/>
                {addToCalendar}
              </>
              : <>
              {actions(false)}
                {card}
                {actions(true)}
                <br/>
                {/* <HalfLine /> */}
                {/* <div style={{ fontSize:'.7em' }}>↓ more options ↓</div> */}
                {/* <br/> */}
                {/* {recipe.user === user || true
                ? <div style={toStyle(`
                display: flex;
                align-items: center;
                vertical-align: center;
                `)}>
                  <span className='description' style={toStyle(`
                  display: inline-flex;
                  align-items: center;
                  vertical-align: center;
                  `)}>
                    <input type='date' 
                    id='dinder-date-user-made-recipe'
                    max={toYearMonthDay(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))}
                    style={{ fontSize:'1em', display:'inline-block', width: 'fit-content' }}/>
                  </span>
                  <span 
                  className='action button' 
                  style={toStyle(`
                  margin: 0;
                  `)}
                  onClick={e => {
                    const date = (document.querySelector('#dinder-date-user-made-recipe') as HTMLInputElement).value
                    if (date) {
                      console.debug('DINDER MADE', date, recipe)
                      api.post(`dinder/recipe/${recipe.id}/made`, { date })
                      e.currentTarget.textContent = 'added to calendar'
                    }
                  }}>add to calendar solo</span>
                </div>
                :''} */}
                <div style={S(`
                display: flex;
                flex-direction: column;
                padding: 4px; gap: 4px;
                margin-top: .5em;
                align-items: center;
                `)}>
                  {addToCalendar}
                  {userRecipe ? '' : 
                  <div style={toStyle(`
                  display: flex;
                  column-gap: .25em;
                  margin-bottom: .5em;
                  `)}>
                    {remainingCategories?.length === 1 ? '' :
                    <span
                    className='action button'
                    style={toStyle(`
                    display: inline-flex; white-space: pre;
                    margin: 0;
                    `)}
                    onClick={e => {
                      handle.reset()
                      if (!user) {
                        openLogin()
                        // message.trigger({
                        //   text: `Log in to filter by category`,
                        //   ms: 15_000,
                        //   id: 'dinder-login',
                        // })
                        // ;(callback => {
                        //   message.add(() => {
                        //     callback()
                        //     message.remove(callback)
                        //   })
                        // })(() => {
                        //   message.remove({ delete: 'dinder-login' })
                        // })
                        return
                      }
                      setLoading(true)
                      api.post(`dinder/filter`, { category: recipe.category }).then(() => {
                        handle.randomize()
                        reloadFilter()
                      })
                    }}>exclude {recipe.category || '(loading)'}</span>}
                    <span
                    className='action button'
                    style={toStyle(`
                    display: inline-flex; white-space: pre;
                    margin: 0;
                    `)}
                    onClick={(e:any) => {
                      if (e.target !== e.currentTarget) return
                      handle.reset()
                      if (!user) {
                        openLogin()
                        // message.trigger({
                        //   text: `Log in to filter by category`,
                        //   ms: 15_000,
                        //   id: 'dinder-login',
                        // })
                        // ;(callback => {
                        //   message.add(() => {
                        //     callback()
                        //     message.remove(callback)
                        //   })
                        // })(() => {
                        //   message.remove({ delete: 'dinder-login' })
                        // })
                        return
                      }
                      setLoading(true)
                      api.post(`dinder/filter`, { 
                        categories: categories.filter(x => x !== recipe.category) 
                      }).then(() => {
                        // e.target.textContent = `filtered to ${recipe.category}`
                        reloadFilter()
                      })
                    }}>only {remainingCategories?.length === 1 ? 'showing' : 'show'} <Select options={remainingCategories?.length === 1 ? [].concat(remainingCategories, categories.filter(x => x !== remainingCategories[0])) : remainingCategories || []} value={recipe.category} onChange={e => {
                      // {recipe.category || '(loading)'}
                      if (!user) {
                        openLogin()
                        // message.trigger({
                        //   text: `Log in to filter by category`,
                        //   ms: 15_000,
                        //   id: 'dinder-login',
                        // })
                        // ;(callback => {
                        //   message.add(() => {
                        //     callback()
                        //     message.remove(callback)
                        //   })
                        // })(() => {
                        //   message.remove({ delete: 'dinder-login' })
                        // })
                        return
                      }
                      const category = e.target.value
                      e.target.textContent = `only show ${category}`
                      api.post(`dinder/filter`, { categories: categories.filter(x => x !== category) }).then(() => {
                        e.target.textContent = `filtered to ${category}`
                        handle.randomize()
                        reloadFilter()
                      })
                    }} style={{
                      // border: '1px solid #000',
                      borderRadius: '2px'
                    }} /></span>
                    {filter?.length ? <span
                    className='action button'
                    style={toStyle(`
                    display: inline-flex; white-space: pre;
                    margin: 0;
                    `)}
                    onClick={async (e:any) => {
                      if (user) await api.post(`dinder/filter`, { categories: [] }).then(reloadFilter)
                      e.target.textContent = `done`
                      setTimeout(() => e.target.textContent = 'reset', 6_000)
                    }}>reset</span> : ''}
                  </div>}
                </div>
              </>}
            </div>
            </>}
        </InfoSection>
      </>
      : null}
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
&#dinder {
  --dinder-accent: #fd1;
  --dinder-accent: #24ff11;
  --dinder-accent: #76ff69;
  --dinder-accent: #f98282;
  --dinder-accent: #ffc111;

  overflow-x: hidden;
  * {
    user-select: none;
  }
  .label {
    // background: #111 !important;
    // border-left: .1rem solid #0000; border-right: .1rem solid #0000;
    // color: #fff !important;
    // opacity: 1;
  }
  .select, input[type=date] {
    // margin: .1em -.2em;
    // border: 1.5px solid #000 !important;
    // border-radius: .2em;

    border-color: transparent !important;
    background-clip: padding-box !important;
  }
  .action {
    // gap: .67em !important;
    // align-items: stretch !important;
    gap: 0 !important;
    > :is(.select, input, label) {
      // height: 100% !important;
      // min-height: 1em;
      // margin: 0 -3px !important;
      border: 1px solid #0000;
      background-clip: content-box;
      &:not(:first-child) {
        margin-left: 0 !important;
      }
      &:not(:last-child) {
        margin-right: 0 !important;
      }
      &:not([type=checkbox]) {
        height: 2em !important;
        border-radius: 2px !important;
        border-radius: 10em !important;
        &::before, &::after {
          content: " ";
        }
      }

      &::before:not(:last-child), &::after:not(:first-child) {
        content: " ";
      }
    }
  }
  > .body > .section:not(:last-child) {
    margin-bottom: .5em;
  }
  &, .badges {
    font-family: Duospace;
  }
  .chat {
    padding: 0;
    padding-top: 1em;
  }
}
.description {
  font-size: .85em;
  font-family: system-ui;
  white-space: pre-wrap;
}

.body {
  overflow-x: hidden;
}
.body, .section {
  display: flex;
  flex-direction: column;
  * { flex-shrink: 0 }
  > br { display: none }
  .spacer { flex-grow: 1 }
}
.section.content {
  flex-grow: 1;
}

.dinder-swipe {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}
.dinder-card {
  border: .1rem solid #000;
  border-radius: 2px;
  padding: 1em;
  display: flex;
  flex-direction: column;
  cursor: pointer;
  white-space: pre;
  overflow: hidden;
  .recipe-name {
    width: 0;
    min-width: 100%;
    display: inline-flex;
    position: relative;
    left: 0;
  }

  max-width: fit-content;
  min-width: 20em;
  width: min-content;
  img {
    width: 20em;
    aspect-ratio: 1/1;
    // object-fit: contain;
    object-fit: cover;
    background: #eee8;
    border-radius: 2px;
    border-radius: .5em;
  }
  // margin-bottom: .25em;
  margin: .125rem 0;

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
    background: linear-gradient(90deg, #fff, #fff0 1em), linear-gradient(-90deg, #fff, #fff0 1em);
  }
}
.dinder-actions {
  position: relative;
  min-width: 22em;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: .25em;

  .button {
    font-size: 1.5em;
    height: 1.4em;
    width: 3.4em;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 0;
  }
}
.dinder-chat {
  width: -webkit-fill-available;
}
#user-recipe-entry {
  font-size: .85em;
  padding-top: .25em;
  > * {
    margin-bottom: .25em;
    * {
      margin-bottom: 0;
    }
  }
  input {
    color: #fff;
    &::placeholder {
      opacity: 1 !important;
    }
  }
  .action input, .action .select {
    // border: 0 !important;
    // line-height: 1.2em !important;
    // min-height: 1.6em !important;
    // border-width: 1px !important;
    // border-radius: 1.5px !important;
    // border: 1px solid #000;
    // padding: .05em .15em !important;
  }
  .action {
    padding-top: 1px !important;
    padding-bottom: 1px !important;
  }
  .url-input {
    padding: .13em .2em;
  }
}

.calendar-container {
  width: 100% !important;
  align-items: center;
  margin: .5em 0;
}

.body .body:not(.chat) {
  padding: .25em;
  overflow: visible;
  font-size: .9em;

  .section:not(:first-child) > :is(div, span):not(:first-child) {
    // margin-left: 0.25em !important;
  }
}

.action input {
  font-size: 1em;
  width: unset;
}
input {
  font-family: inherit !important;
  // border: 0 !important;
  // box-shadow: .33px .33px 0 1px #000 !important;
  // border: 1.5px solid #000 !important;
  &::placeholder {
    opacity: .33 !important;
  }
}

.vertical-middle {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  vertical-align: middle;
  white-space: pre-wrap;
  > a, span { display: inline-flex }
}

.action {
  display: inline-flex !important;
  align-items: center;
}

&#dinder.mobile {
  .dinder-card {
    margin-top: .5em;
  }
}

.button.button.button, .action.action.action, .label.label.label {
  --id-color-text-readable: #000;
  --id-color-text: #fff;
  border-radius: 2px !important;
  background: var(--dinder-accent) !important;
  color: #000 !important;
  border: .1rem solid #000;
  &.label, &:active:not(:has(input:active)) {
    background: #000 !important;
    color: #fff !important;
  }
}
.badges.badges.badges:not(.inline) > * {
  font-size: .8rem !important;
}
.button.button.button, .action.action.action, .label.label.label, .dinder-card {
  box-shadow: 1px 1px #ff8000;
  border: 1px solid #000 !important;
}
.action.button.button.button:is(.no, .yes) {
  text-transform: uppercase;
  font-weight: bold;
  font-size: 2rem !important;
  margin-bottom: 0 !important;
  background: none !important;
  // background: #fa06 !important;
  // border: 1px solid #000;
  // box-shadow: .5px .5px 0 1px #ff8000;
  border: .1rem solid #000;
  margin: 2px 0 !important;
  &.press, &:active {
    background: #000 !important;
    color: #fff !important;
  }
}

.calendar {
  overflow-x: hidden;

  .date:not(.spacer) {
    background-color: #00000003 !important;
  }
  .date:not(.spacer).odd {
    background-color: #00000009 !important;
  }

  .date.img {
    border: 1px solid #000 !important;
    background-color: #0000 !important;
    .date-text {
      background: #000;
      color: #fff;
    }

    border-radius: 2px !important;
    border: .1rem solid #000 !important;
    box-shadow: 1px 1px #ff8000;
  }
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
  margin-right: .5em !important;
  padding: 0 !important;
  cursor: pointer;
}
input[type="checkbox"]:checked::before {
  content: '\\2713';
  font-family: system-ui !important;
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
`
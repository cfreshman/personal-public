import React, { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { convertLinks } from '../../lib/render';
import url from '../../lib/url';
import { S, pick } from '../../lib/util';
import styled from 'styled-components';
import { Loader } from '.';
import { External, InfoBody, InfoSection, Select } from '../../components/Info';
import { Scroller } from '../../components/Scroller';
import api from '../../lib/api';
import { openLogin } from '../../lib/auth';
import { sha256 } from '../../lib/encrypt';
import { useCached, useEventListener, useF, useR, useRerender, useTimeout } from '../../lib/hooks';
import { useAuth } from '../../lib/hooks_ext';
import { SettingStyles } from '../settings';
import { Race } from './race';

export const Leaderboard = ({ outer, tree, setTree, linesToTree, error, setError, stats, treeToCompact, compactToTree }: {
  outer, tree, setTree, linesToTree, error, setError, stats, treeToCompact, compactToTree
}) => {
  const rerender = useRerender()
  const [entries=[], reloadEntries] = useCached('wordle-leaderboard-entries', async () => {
    try {
      const entries = await api.get('/wordle')
      console.debug('WORDLE LEADERBOARD ENTRIES', outer.treeMeta, entries)
      if (outer.treeMeta) {
        handle.detail(outer.treeMeta, true)
        setTimeout(() => {
          document.querySelector(`#leaderboard-entry-${outer.treeMeta.id}`)?.scrollIntoView({
            block: 'center',
          })
          document.querySelector(`#inner-index`)?.scrollIntoView({ block: 'end' })
        }, 100)
      }
      return entries
    } catch (e) {
      setError(e)
      return []
    }
  })
  const [upload, setUpload] = useState(false)
  const [submission, setSubmission]: any[] = useState({})
  const auth = useAuth()
  const readyToSubmit = tree && submission.name && (submission.key || auth.user) && submission.link && stats.mode
  const [confirm, setConfirm] = useState('')
  const [edit, setEdit] = useState('')

  const [detail, setDetail]: [any, any] = useState(new Set())

  // parse/assign filter parameters
  const query = new URLSearchParams(location.search)
  const [latest, setLatest] = useState(
    JSON.parse(query.get('latest') || 'false'))
  const [mode, setMode] = useState(query.get('mode') || '')
  const [starts, setStarts] = useState(JSON.parse(query.get('starts') || '1'))
  const [name, setName] = useState(query.get('name'))
  const [starter, setStarter] = useState(query.get('starter'))
  const [max, setMax]: any[] = useState(
    query.get('max') || false)
  const [best, setBest] = useState(query.get('best') || '')
  {
    latest ? query.set('latest', latest) : query.delete('latest')
    mode ? query.set('mode', mode) : query.delete('mode')
    starts > 1 ? query.set('starts', starts) : query.delete('starts')
    name ? query.set('name', name) : query.delete('name')
    starter ? query.set('starter', starter) : query.delete('starter')
    max ? query.set('max', max) : query.delete('max')
    best ? query.set('best', best) : query.delete('best')
    const queryString = query.toString()
    url.silent(
      location.pathname + (queryString ? '?'+ queryString : '') + location.hash)
  }

  const [compare, setCompare]: [string[], any] = useState([])
  const [race, setRace]: [string[], any] = useState([])

  detail.size && query.set('detail', detail)
  mode && query.set('mode', mode)
  starts > 1 && query.set('starts', starts)


  const handle = {
    load: reloadEntries,
    submit: () => {
      if (readyToSubmit) {
        console.log('mode', stats.mode)
        const post = (key?) => {
          api.post('/wordle', {
            ...submission,
            key,
            user: auth.user,
            compact: treeToCompact(tree),
            mode: stats.mode,
          })
          .then(() => {
            handle.load()
            setUpload(false)
          })
          .catch(error => setError(error))
        }
        auth.user ? post() : sha256(submission.key).then(post)
      }
    },
    explore: (entry) => {
      outer.explore(entry.id, entry.name)
    },
    delete: (entry) => {
      outer.setTreeMeta(undefined)
      api.delete(`/wordle/${entry.id}`)
      .then(() => {
        handle.load()
        if (detail.has(entry.id)) {
          detail.delete(entry.id)
          setDetail(new Set(detail))
        }
      })
      .catch(error => setError(error))
    },
    edit: (entry) => {
      outer.setTreeMeta(entry)
      api.post(`/wordle/${entry.id}`, entry)
      .then(() => {
        handle.load()
        setEdit('')
      })
      .catch(error => setError(error))
    },
    detail: (entry, forceOpen=undefined) => {
      if (forceOpen || !detail.has(entry.id)) detail.add(entry.id)
      else detail.delete(entry.id)
      setDetail(new Set(detail))
      outer.setTreeMeta(detail.has(entry.id) ? entry : '')
    }
  }
  useF(() => entries.length ? (outer.treeMeta && handle.detail(outer.treeMeta, true)) : handle.load())
  useF(upload, () => setError(false))
  useF(compare, async () => {
    if (compare.length === 2) {
      await outer.compare(compare)
      setCompare([])
    }
  })
  useF(compare, () => compare.length && setRace([]))
  useF(race, () => race.length && setCompare([]))

  entries.map(entry => {
    '123456X'.split('').map((b, i) => {
      entry[`≤${b}`] = entry[b] + (entry[`≤${i}`] ?? 0)
    })
    // console.debug(entry)
    // entry.rank = [-entry[max || `≤6`], entry.total, entry.t]
    entry.rank = [max ? -entry[max] : 0, entry.total, entry.t]
  })
  const compareRank = (a, b) => (a[0] - b[0]) || (a[1] - b[1]) || (a[2] - b[2])
  entries.sort(({ rank: a }, { rank: b }) => compareRank(a, b))
  let prevRank
  let currRank = 1
  // entries.sort((a, b) =>
  //   (b[max || `≤6`] - a[max || `≤6`])
  //   || (a.total - b.total)
  //   || (a.t - b.t))
  // const bots = new Set<string>()
  // const words = new Set<string>()
  const seen = new Set<string>()
  const allMax = Math.max(...entries.flatMap(entry => '123456X'.split('').map(b => entry[b])))
  const [cumulative, setCumulative] = useState(false)
  let maxStarts = 1
  let shown = entries
  .filter(entry =>
    (!mode || mode === entry.mode)
    && (!name || name === entry.name)
    // && (!starter || starter === entry.starter.split(',').slice(0, starts).join(','))
    && (!starter || entry.starter.includes(starter))
    && (entry.starter.split(',').length >= starts))
  .filter(entry => {
    // if (bot) {
    //   if (bots.has(entry.name)) return false
    //   bots.add(entry.name)
    // }
    // if (word) {
    //   if (words.has(entry.starter)) return false
    //   words.add(entry.starter)
    // }
    if (best === 'bot') {
      if (seen.has(entry.name)) return false
      seen.add(entry.name)
    } else if (best === 'word') {
      if (seen.has(entry.starter)) return false
      seen.add(entry.starter)
    }
    maxStarts = Math.max(maxStarts, entry.starter.split(',').length)
    return true
  })
  .map((entry, i) => {
    if (!prevRank || prevRank[1] !== entry.rank[1]) {
      currRank = i+1
    }
    prevRank = entry.rank
    entry.currRank = currRank
    return entry
  })
  if (latest) shown = shown.sort((a, b) => b.t - a.t)
  const titleRef = useR()
  const tableRef = useR()
  const [resized, setResized] = useState(false)
  const resizeLs = () => {
    const titleL = titleRef.current;
    if (titleL) {
      titleL.style.fontSize = ''
      let rect = titleL.getBoundingClientRect()
      let fontSize = Number(getComputedStyle(titleL).fontSize.slice(0, -2))
      let i = 0
      while (rect.width / rect.height < 10 && i < 1000) {
        fontSize -= .5
        titleL.style.fontSize = fontSize + 'px'
        rect = titleL.getBoundingClientRect()
        i += 1
      }
    }
    const tableL = tableRef.current;
    if (tableL) {
      tableL.style.fontSize = ''
      tableL.style.width = ''
      tableL.style.left = ''
      let outer = tableL.parentNode.getBoundingClientRect()
      let rect = tableL.getBoundingClientRect()
      let fontSize = Number(getComputedStyle(tableL).fontSize.slice(0, -2))
      if (true || rect.width > outer.width) {
        tableL.parentNode.parentNode.style.position = 'relative'
        outer = tableL.parentNode.parentNode.getBoundingClientRect()
        tableL.style.position = 'relative'
        tableL.style.left = (outer.x - rect.x) + 'px'
        tableL.style.marginRight = 2 * (outer.x - rect.x) + 'px'
        // tableL.parentNode.parentNode.style.position = 'relative'
        // outer = tableL.parentNode.parentNode.getBoundingClientRect()
        // tableL.style.position = 'absolute'
        // tableL.style.left = '0'
        let i = 0
        while (rect.width > outer.width && i < 1000) {
          fontSize -= .5
          tableL.style.fontSize = fontSize + 'px'
          rect = tableL.getBoundingClientRect()
          i += 1
        }
        // tableL.style.width = '100%'
        tableL.style.width = outer.width + 'px'
      }
      setResized(true)
    }
  }
  // useF(resizeLs)
  useTimeout(resizeLs, 100)
  useEventListener(window, 'resize', resizeLs)
  const refs: any = {}
  return <Style>
    <InfoBody>
      <Scroller />
      {race.length === 2 ? <Race {...{ ids: race, close: () => setRace([]) }} /> : ''}
      {/* <InfoSection labels={[
        // { text: 'back to solver', func: () => outer.setLeaderboard(false) },
      ]} > */}
        {/* This is a Wordle bot leaderboard. Submit your own results! */}
      {/* </InfoSection> */}
      <div className='toggle-page back'>
        <span onClick={() => outer.setLeaderboard(false)}>
          <span className='arrow'>←</span> back to solver
        </span>
        {/* &nbsp;|&nbsp; */}
        {/* <span> */}
        <Link to='/wordbase'>
          enjoy word games? I remade&nbsp;
          {/* <img src="/raw/wordbase/favicon.png" style={{
            height: '.8em' }}/>
          &nbsp;Wordbase&nbsp; */}
          Wordbase!&nbsp;
          <img src="/raw/wordbase/favicon.png" style={{
            height: '1.2em' }}/>
          &nbsp;
          <span className='arrow'>→</span>
          {/* <Link to='/wordbase'>Wordbase</Link> */}
          {/* <div className='img-container' style={{ position: 'absolute', top: '2px', right: 0 }}>
            <img src="/raw/wordbase/favicon.png" />
          </div> */}
        </Link>
        {/* </span> */}
      </div>
      <InfoSection
      style={{ marginBottom: '.75em', marginTop: '.25em' }}
      ref={titleRef}
      >
        A Wordle bot leaderboard. Submit your results!
        <div style={{ opacity: .6, fontSize: '.5em', fontStyle: 'italic' }}>
          (for the original 2315 answers and 10657 guesses.
          NYTimes has made several revisions)
        </div>
      </InfoSection>
      {upload ? <InfoSection labels={[
        'new submission',
        { text: 'cancel', func: () => setUpload(false), style: { background: '#d4bd58' }}, // #c9b458
        readyToSubmit ? { text: 'submit', func: () => handle.submit() } : '',
      ]}>
        {/* <br /> */}
        <input className='action' type='text' maxLength={16}
        placeholder={`name (yours or bot's)`}
        value={submission.name}
        onChange={e => {
          setSubmission({ ...submission, ...{ name: e.target.value } })
        }}/>
        {auth.user ? '' : <>
        <input className='action' type='text' placeholder='passkey (to resubmit)'
        value={submission.passkey}
        onChange={e => {
          setSubmission({ ...submission, ...{ key: e.target.value } })
        }} style={{ display: 'inline-block' }}/>
        &nbsp;or <span className='action'
        style={{ display: 'inline-block' }} onClick={e => openLogin()}>
          sign in</span></>}
        <input className='action long' type='text' placeholder='link (to code/explanation)'
        value={submission.link}
        onChange={e => {
          setSubmission({ ...submission, ...{ link: e.target.value } })
        }}/>
        <input className='action long' type='number'
        placeholder='self-report computation time (seconds)'
        value={submission.compute}
        onChange={e => {
          setSubmission({ ...submission, ...{ compute: e.target.value } })
        }}/>
        <label className='action'>
          <input className='action' type='checkbox'
          checked={submission.public}
          onChange={e => {
            setSubmission({ ...submission, ...{ public: e.target.checked } })
          }}/>
          allow others to explore
        </label>
        {tree
        ? <div className='action' onClick={() => setTree(undefined)}>
          clear {tree[0].toUpperCase()} tree
        </div>
        : <label className='action' id='upload'>
          upload your results
          <input type="file" style={{display: 'none'}} onChange={e => {
            const reader = new FileReader()
            reader.onload = e => {
              try {
                const tree = linesToTree((e.target.result as string).split('\n'))
                setTree(tree)
                outer.setIsUpload(true)
              } catch (error) {
                setError(error)
              }
            }
            reader.readAsText(e.target.files[0])
          }} />
        </label>}
        {error ? <div className='error text'>{error.error ?? error}</div> : ''}
        {stats
        ? <div id='stats' className='text stats'>
          {stats ? <div>{JSON.stringify(stats, null, 2)}</div> : ''}
        </div>
        : <div className='text'>
          {'\n'}
          upload .txt of <a href='https://gist.github.com/cfreshman/cdcdf777450c5b5301e439061d29694c'>guesses</a> for each <a href='https://gist.github.com/cfreshman/a03ef2cba789d8cf00c08f767e0fad7b'>answer</a>:{'\n'}
          <div className='file'>
            salet,brond,aback{'\n'}
            salet,brash,abase{'\n'}
            ...{'\n'}
            salet,corni,zonal{'\n'}
          </div>
          {/* {'\n'} */}
          see <a href='https://www.reddit.com/r/wordle/comments/s88iq4/a_wordle_bot_leaderboard/'>post</a> for more context{'\n'}
        </div>}
        <br />
      </InfoSection> : ''}
      <InfoSection id='leaderboard' labels={[
        'leaderboard',
        // { text: 'back', func: () => outer.setLeaderboard(false) },
        {
          text: 'more info',
          func: () => open('https://reddit.com/r/wordle/comments/s88iq4', '_blank'), style: { background: '#d4bd58' },
        },
        upload ? '' : { text: 'submit', func: () => setUpload(true) },
      ]}>
        <div className='mode' style={{marginBottom:'.5em'}}>
          <span onClick={() => setLatest(!latest)}>
            {/* <span onClick={() => setWord(!word)}> */}
              {/* {best ? 'all per bot' : 'best per bot only'} */}
              {latest ? 'ranked' : 'latest'}</span>
          <span onClick={() => { setMode(''); setBest(''); setStarts(1); }}>
          {/* <span onClick={() => { setMode(''); setBot(false); setWord(false); }}> */}
            all results</span>
          {/* &nbsp; */}
          <span onClick={() => setMode(mode ? '' : 'hard')}>
            hard mode (*)</span>
          <span onClick={() => setStarts(starts % maxStarts + 1)}>
            {starts >= maxStarts ? '1-starts' : `${starts + 1}-starts (†)`}</span>
          <span style={{ textDecoration: 'none', display: 'inline-block' }}>
            best per:</span>
          <span onClick={() => setBest(best === 'bot' ? '' : 'bot')}>
          {/* <span onClick={() => setBot(!bot)}> */}
            {/* {best ? 'all per bot' : 'best per bot only'} */}
            bot</span>
          <span onClick={() => setBest(best === 'word' ? '' : 'word')}>
          {/* <span onClick={() => setWord(!word)}> */}
            {/* {best ? 'all per bot' : 'best per bot only'} */}
            start</span>
        </div>

        {/* {Object.assign(refs, { load: useRef() }) && ''}
        {useF(() => {
          const loadL = (refs.load.current as HTMLElement);
          console.warn('LOAD', loadL)
          if (loadL) {
            const animateLoad = i => {
              // loadL.textContent = `[ loading${i%4?' ':''}${`.`.repeat(i%4)} ]`
              // if (loadL.parentNode) setTimeout(() => animateLoad(i+1), 750)
              loadL.textContent = `[ loading ${'|/-\\'[i%4]} ]`
              if (loadL.parentNode) setTimeout(() => animateLoad(i+1), 100)
            }
            animateLoad(0)
          }
        }) && ''} */}
        {resized ? '' :
        // <span ref={refs.load}className='text' style={{ opacity: .7 }}>[ loading ... ]</span>
        // <Loader />
        <span ref={refs.load}className='text' style={{ opacity: .7, display: 'flex', alignItems: 'center', marginTop: '1em' }}>loading leaderboard <Loader /> </span>
        }
        <table ref={tableRef} style={{visibility: resized ? 'visible' : 'hidden' }}>
          <thead>
          <tr>
            <td></td>
            {/* <td>name</td> */}
            <td>
              <Select name='name' value={name || undefined}
              options={Array.from(new Set(shown.map(e => e.name)))}
              onChange={e => setName(e.target.value)} />
            </td>
            {/* <td>starter</td> */}
            <td>
              <Select name='start' value={starter || undefined}
              // options={Array.from(new Set(entries.map(e => e.starter.split(',').slice(0, starts).join(','))))}
              options={Array.from<string>(new Set(shown.map(e => e.starter)))}
              onChange={e => {console.debug(e.target.value); setStarter(e.target.value)}}
              display={(s:string) => s.toUpperCase()} />
            </td>
            <td>total</td><td>avg</td>
            {/* <td>max</td> */}
            <td>
              <Select name='max' value={max || undefined}
              options={[undefined].concat(
                '123456X'.split('').map(max => `≤${max}`))}
              display={x => !x ? 'max' : x}
              onChange={e => setMax(e.target.value)} />
            </td>
            <td>bars</td><td></td></tr>
          </thead>
          <tbody>
          {/* <tr><td></td><td>name</td><td>starter</td><td>total</td><td>avg</td><td></td></tr> */}
          {shown.map((entry, i) => {
            currRank = entry.currRank
            const maxBucket = Math.max(...'123456X'.split('').map(b => entry[b]))
            if (edit === entry.id) console.debug(entry)
            // const isLink = entry.link && /http/.test(entry.link)
            const isLink = entry.link && !entry.link.includes(' ')
            const starter = entry.starter.split(',')
            const longer = starter.length > starts
            return <>
              <tr id={`leaderboard-entry-${entry.id}`}
              // onClick={() => setDetail(detail === i ? false : i)}>
              onClick={() => {
                handle.detail(entry)
              }} className={`result result-${entry.mode} ${longer ? 'result-starts' : ''}`}>
                <td className='result-i'>{currRank}</td>
                {/* <td>{entry.mode === 'hard' ? '*' : ''}</td> */}
                <td className='result-name'>{entry.name}</td>
                {/* <td>{entry.mode === 'hard' ? '*' : ''}</td> */}
                {/* <td>{detail.has(entry.id)
                  ? entry.starter
                  : entry.starter.split(',').slice(0, starts).join(',')}</td> */}
                <td>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                    {starter.slice(0, starts).join(',')}
                    {longer
                    ?
                    <span style={{ opacity: '.7', fontSize: '.6em', marginLeft: '.2em' }}>
                      {`+${starter.length - starts}`}
                    </span>
                    : ''}
                  </div>
                </td>
                <td>{entry.total}</td>
                <td>{Math.ceil(entry.total / 2315 * 10000)/10000}</td>
                <td>{entry.max > 6 ? 'X' : entry.max}</td>
                <td>
                  <Distribution {...{
                    entry, max: allMax, thumbnail: true, cumulative, setCumulative }} />
                </td>
                {/* <td>{entry.link ? <a href={entry.link}>link</a> : ''}</td> */}
                <td>{
                isLink
                ? <External href={entry.link} /> 
                : ''
                }</td>
              </tr>
              {/* {detail === i ? <> */}
              {!detail.has(entry.id) ? '' : edit === entry.id ? <>
              <tr></tr>
              <tr className='detail edit'><td colSpan={8}><div>
                <div className='detail-controls'>
                  <span className='detail-inline action'
                  onClick={() => { setEdit(''); handle.load() }}>cancel</span>
                  <span className='detail-inline action' onClick={() => handle.edit(entry)}>save</span>
                  {confirm !== entry.id
                    ? <span className='detail-inline action' onClick={() => setConfirm(entry.id)}>delete</span>
                    : <>
                      <span className='detail-inline action' onClick={() => setConfirm('')}>cancel</span>
                      <span className='detail-inline action' onClick={() => handle.delete(entry)}>confirm delete</span>
                    </>}
                </div>
                <input type='text' value={entry.name} maxLength={16}
                placeholder='name'
                onChange={e=>{ entry.name = e.target.value; rerender() }}/>
                <input type='text' className='long' value={entry.link}
                placeholder='link (to code/explanation)'
                onChange={e=>{ entry.link = e.target.value; rerender() }}/>
                <input type='number' className='long' value={entry.compute}
                placeholder='self-report computation time (seconds)'
                onChange={e=>{ entry.compute = Number(e.target.value); rerender() }}/>
                <label className='action'>
                  <input type='checkbox' checked={entry.public}
                  onChange={e=>{
                    entry.public = e.target.checked; rerender() }}/>
                  open to explore
                </label>
              </div></td></tr>
              </> : <>
                <tr></tr>
                <tr className='detail'><td colSpan={8}><div>
                  {/* {auth.user !== entry.user ? ''
                  : <div className='detail-controls'>
                    <span className='detail-inline action' onClick={() => setEdit(entry.id)}>edit</span>
                  </div>} */}
                  {entry.starter.split(',').length > starts
                  ? <div>{entry.starter}</div>
                  : ''}
                  <div className='detail-author'>
                    {/* uploaded by: {entry.user || 'anonymous'} */}
                    uploaded by: {entry.user
                      ? <Link to={`/u/${entry.user}`} style={{color:'black'}}>
                        {entry.user}
                      </Link>
                      : 'anonymous'}
                    &nbsp;
                    {auth.user !== entry.user && auth.user !== 'cyrus' ? '' :
                    <span className='detail-inline action' onClick={() => setEdit(entry.id)}>edit</span>}
                  </div>
                  <div className='detail-date'>date: {new Date(entry.t).toLocaleDateString()}</div>
                  {entry.compute
                  ? <div className='detail-compute'>compute time: {
                    entry.compute > 60 * 60 * 2
                    ? `${(entry.compute / 3600).toFixed(1)}h`
                    : entry.compute > 60 * 2
                    ? `${(entry.compute / 60).toFixed(1)}m`
                    : `${(entry.compute / 1).toFixed(1)}s`
                  }</div>
                  : ''}
                  {isLink
                  ? <div className='detail-link'>link: {convertLinks(entry.link)}</div>
                  : <div className='detail-details'>details: {entry.link}</div>}
                  {entry.mode === 'hard'
                  ? <div className='detail-mode'>{entry.mode} mode</div>
                  : ''}
                  <Distribution  {...{
                    entry, max: allMax, cumulative, setCumulative }}/>
                  {entry.public || auth.user === 'cyrus'
                  ? <div className='row' style={S(`
                  display: flex;
                  gap: 2px;
                  `)}>
                    <div className='action inline'
                    onClick={() => handle.explore(entry)}>
                      explore in solver</div>
                    {compare.length > 1 && !compare.includes(entry.id) ? '' :
                    <div className='action inline'
                    onClick={() => {
                      compare.length < 2 && compare.includes(entry.id)
                        ? setCompare(compare.filter(id => id !== entry.id))
                        : setCompare(compare.concat([entry.id]))
                    }}>
                      {compare.length === 2
                      ? <>computing diff <Loader /></>
                      : compare.includes(entry.id)
                      ? 'select other'
                      : 'compare'}</div>}
                    {race.length > 1 && !race.includes(entry.id) ? '' :
                    <div className='action inline'
                    onClick={() => {
                      race.length < 2 && race.includes(entry.id)
                        ? setRace(race.filter(id => id !== entry.id))
                        : setRace(race.concat([entry.id]))
                    }}>
                      {race.length === 2
                      ? <>loading race <Loader /></>
                      : race.includes(entry.id)
                      ? 'select other'
                      : 'race'}</div>}
                  </div> : ''}
                </div></td></tr>
              </>}
            </>
          })}
        </tbody></table>
        {/* {entries.map((entry, i) => <div className='entry' key={i}>
          <div>{i}</div>
          <div></div>
          <div><a href='link'></a></div>
        </div>)} */}
      </InfoSection>
      {/* <div className='back'><span onClick={() => outer.setLeaderboard(false)}>
        back to solver</span></div> */}
      <div className='footer'>
        {/* <a href={auth.user ? '/chat/#/cyrus' : '/contact'}>contact me</a> */}
        <br/><br/>
        <a href={'/contact'}>contact me</a>
      </div>
    </InfoBody>
  </Style>
}

const Distribution = ({ entry, max, cumulative, setCumulative, thumbnail }: {
  entry: any, max: number, cumulative: boolean, setCumulative: any, thumbnail?: boolean
}) => {
  return <div className={`distribution ${thumbnail ? 'thumbnail' : ''}`}>
    {thumbnail ? '' :
    <div className='cumulative' onClick={() => setCumulative(!cumulative)}>
      {/* toggle cumulative */}
      → {cumulative ? 'normal' : 'cumulative'}
    </div>}
    {'123456X'.split('').map((b, i) =>
    <div className='bar' key={b} style={{
      width: `${Math.ceil((
        cumulative ? (entry[`≤${b}`] / 2315) : (entry[b] / max)
        ) * 100)}%`,
      background: cumulative
        // ? `hsl(200 80% ${90 - i/6 * 30}%)`
        ? `hsl(${((127 + i/6 * 20)+360)%360} 80% ${90 - i/6 * 30}%)`
        // : `hsl(${((200 - i/6 * 220)+360)%360} 80% 70%)`,
        : `hsl(${[210, 188, 127, 93, 53, 17, 340][i]} 80% 70%)`,
    }} >
      {thumbnail ? '' : <>
        <div className='bar-i'>{b}</div>
        <div className='bar-count'>{(cumulative ? entry[`≤${b}`] : entry[b]) || ''}</div>
      </>}
    </div>)}
  </div>
}

const Style = styled(SettingStyles)`
max-width: 37rem;
// font-size: max(16px, min(2.5vw, 20px));
font-size: max(1rem, min(2.5vw, 20px));
white-space: pre-wrap;
* { text-shadow: none; }
.body {
  display: flex;
  flex-direction: column;
}
a {
  color: inherit;
}

#leaderboard {
  thead {
    opacity: .8;
    // text-decoration: underline;
    border-bottom: .05em solid black;
  }
  tbody {
    background: #111;
    color: #fff;
    tr {
      cursor: pointer;
    }
  }
  tbody tr:nth-child(even) {
    // background: #0001;
    background: #fff3;
  }
  td {
    // padding: 0 .8em 0 0;
    // padding: 0 .4em;
    padding: .1em .4em;
    text-align: center;
    font-size: .8em;
  }
  tr.detail td {
    // background: #eee;
    background: #fff;
    color: black;
    // height: 2em;
    padding: 0;
    cursor: default;
    > div {
      height: 100%; width: 100%;
      display: inline-flex;
      flex-direction: column;
      align-items: flex-start;
      border: 0.05em solid #111;
      border-top: none; border-bottom: none;
      padding: .4em .6em;
    }
  }
  .detail:last-child { border-bottom: 0.05em solid #111; }
  select {
    -webkit-appearance: none;
    text-align: center;
    border: none;
    text-decoration: underline;
    cursor: pointer;
  }
  .select {
    text-align: center;
    text-decoration: underline;
    cursor: pointer;
    margin: 0;
    // pointer-events: none;
    position: relative;
    color: #000 !important; background: #fff0 !important;
    select {
      opacity: 0;
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
    }
  }
}

.body > *, .body > * > * { margin-bottom: .25em; &:last-child { margin-bottom: 0; } }
.badges { margin-bottom: .25em !important; }
& .body {
  .badges .button {
    background: black;
    color: white;
    // border-color: transparent;
    background-clip: padding-box !important;
    border: 0;
    border-radius: 2px;
    background: #6aaa63;
  }
  .badges .label {
    opacity: 1;
    background: #0001;
    color: black;
    // background-clip: padding-box !important;
    border: 0;
    border-radius: 2px;
    background: black;
    color: white;
  }
}

.distribution {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  height: 5em;
  font-size: 1rem;
  padding: .25em 1.5em .25em .75em;
  .bar {
    flex-grow: 1;
    position: relative;
    line-height: 0;
    .bar-i, .bar-count {
      position: absolute; top: 50%;
      font-size: .5em;
    }
    .bar-i { right: calc(100% + .25em) }
    .bar-count { left: calc(100% + .25em) }
  }
  position: relative;
}
.distribution.thumbnail {
  width: 2em;
  height: 1em;
  padding: 0;
  // background: #222;
  // border: 1px solid black;
}

.toggle-page {
  // position: absolute;
  // bottom: 0.8em;
  // flex-grow: 1;
  display: flex;
  align-items: flex-end;
  // font-size: .8em;
  font-size: .7rem;
  color: #0006;
  justify-content: space-between;
  // max-width: 27.4em;
  max-width: 45.7em;
  span, a {
    color: #0006;
    // opacity: .5;
    // text-decoration: underline;
    cursor: pointer;
    user-select: none;
    text-shadow: none;
    display: flex;
    align-items: center;
    &:hover {
      text-decoration: none;
    }
  }
  * {
    margin-bottom: 0;
  }
  > span, > a {
    position: relative;
    transition: .1s;
    &:first-child {
      left: 0;
      &:hover {
        left: -.25em;
        padding-right: .25em;
      }
    }
    &:last-child {
      display: none;
      right: -2px;
      &:hover {
        right: calc(-.25em - 2px);
        padding-left: .25em;
      }
    }
  }
}
.mode, .cumulative {
  opacity: .5;
  user-select: none;
  text-shadow: none;
  &.cumulative, &.mode > span {
    text-decoration: underline;
  }
}
.mode > span, .cumulative {
  font-size: .6em;
  cursor: pointer;
  margin-right: 1.1em;
  &:last-child { margin-right: 0; }
}
.cumulative {
  position: absolute;
  top: 0; right: 0;
  opacity: .3;
}

.file {
  padding: .4em .4em;
  background: #8881;
  font-family: monospace;
  margin: .25em 0;
  // border: .1em solid #0002;
  // border-radius: .2em;
}

.detail > td > div > * {
  margin-right: .5em;
}
.detail-inline {
  display: inline-block;
  margin-right: .5em;
  // &:first-child { margin-left: 1em; }
}
.detail-link {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 24em;
  text-align: left;
}
.detail-details {
  max-width: 24em;
  text-align: left;
}
.detail.edit > td > div > * {
  margin-bottom: .15em;
}
.detail-controls {
  margin-bottom: 0 !important;
}

// .result {
//   position: relative;
// }
// .result-hard::after {
//   content: "*";
//   position: absolute;
//   left: -.7em;
//   color: #111;
//   font-size: .6em;
//   height: 0; top: 50%;
//   display: flex;
//   align-items: center;
// }
.result .result-i+td { padding-left: .8em !important; }
.result .result-i { position: relative; }
.result-hard .result-i::after {
  content: "*";
  position: absolute;
  right: -.1em;
  // color: #111;
  // font-size: .6em;
  height: 0; top: 50%;
  display: flex;
  align-items: center;
}
.result-starts .result-i::after {
  content: "†";
  position: absolute;
  right: -.1em;
  height: 0; top: 50%;
  display: flex;
  align-items: center;
}

.result-name { min-width: 10em; white-space: pre }

display: flex; flex-direction: column;
.footer {
  // position: absolute;
  // bottom: 0.8em;
  flex-grow: 1;
  display: flex; align-items: flex-end;
  font-size: .8rem;
  span, a {
    color: black;
    // font-size: .8em;
    // opacity: .5;
    text-decoration: underline;
    cursor: pointer;
    user-select: none;
    text-shadow: none;
  }
}

.arrow {
  font-family: sans-serif;
}
`

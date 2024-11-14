import { Fragment, Fragment as JSX, useState } from 'react';
import { trigger } from '../../lib/trigger';
import styled from 'styled-components';
import { A, Feedback, HalfLine, InfoBody, InfoSection, InfoStyles, Loader, Sponsor } from '../../components/Info';
import { openFeedback, openPopup } from '../../components/Modal';
import { Unread } from '../../components/Unread';
import api, { auth } from '../../lib/api';
import { openLogin } from '../../lib/auth';
import { copy } from '../../lib/copy';
import { cleanTimeout, useCached, useCachedSetter, useE, useEventListener, useF, useM, useR, useS, useStyle, useTimeout } from '../../lib/hooks';
import { useAuth, useSubpath } from '../../lib/hooks_ext';
import { store } from '../../lib/store';
import user from '../../lib/user';
import { S, layerBackground, range, toStyle } from '../../lib/util';
import Settings from '../settings';
import { GameSettings, Player } from './board';
import { theme } from './common';
import { createLocal, deleteGame, local } from './data';
import { dict, loadLang } from './dict';
import { HowTo } from './game';
import { GameLobby } from './lobby';
import { GamePreview } from './preview';
import { GameProgress } from './progress';
import { Info, Save } from './save';
import { GameSettingsModal } from './settings';
import { pass } from 'src/lib/types';

let subpath, copypath

let down, ignore
const GameItem = ({ info, isEdit, copyHint, outer }: {
  info: Info, isEdit, copyHint, outer
}) => {

  const auth = useAuth();
  const inviteRef = useR();
  const [copied, setCopied] = useState(false);

  const [timedEdit, setTimedEdit] = useState(isEdit)
  const [editTimeout, setEditTimeout] = useState(undefined);
  useF(isEdit, () => {
    if (isEdit) {
      editTimeout && clearTimeout(editTimeout)
      setEditTimeout(undefined)
      setTimedEdit(true)
    } else {
      setEditTimeout(setTimeout(() => setTimedEdit(false), 200));
    }
  })

  const isLocal = info.id === local.info.id
  const isP1 = info.p1 === auth.user
  const isTurn = info.turn%2 === (isP1 ? 0 : 1)

  useF(copied, () => {
    if (copied) setTimeout(() => setCopied(false), 2000);
  })

  useEventListener(window, 'pointerup pointercancel', e => { down = false })
  const [settings] = user.settings.use()
  const lang = settings.wordbase.language
  info.lang = info.lang || 'english'
  const langDiff = info.lang !== lang
  const toSide = timedEdit || (settings.wordbase.shortStatus ?? theme.simple)

  const deleteItem = <span onClick={() => deleteGame(info).then(() => {
    // outer.setEdit(false)
    outer.load()
    outer.open(false, false)
  })}>delete</span>

  return (
  <div className={`game-entry options-${isEdit ?'open':'closed'} anim-${timedEdit?'open':'closed'} game-entry-user-${info.turn < 1 ? 'none' : isLocal ? 'local' : isP1 ? 'right' : 'left'}`}
  onPointerDown={e => { down = e; ignore = false }}
  onPointerMove={e => {
    if (down && e.target === down.target) {
      if (e.clientX < down.clientX - 20) {
        outer.setEdit(true)
        down = e
        ignore = down
      } else if (e.clientX > down.clientX + 20) {
        outer.setEdit(false)
        down = e
        ignore = down
      }
    }
  }}>
    {info.p1
    ? <A href={`/wordbase/${info.id}`} className='main' style={S(`text-decoration:none`)}
    // onClick={e => {
    //   if (ignore) ignore = false
    //   else outer.open(info.id, false)
    // }}
    >
      <GameProgress info={info} open={outer.open} options={{
        changeOnOver: true,
        action: true,
        toSide,
        // showLang: langDiff && timedEdit && !isLocal,
      }} />

      {/* <div className={'info' + (isTurn ? ' dark':'')}>
        <span>{infoToAction(info, auth.user, timedEdit && isLocal)}</span>
      </div> */}
    </A>
    // : <div className='main' onPointerDown={e => {
    //   if (copy(`${window.location.origin}/wordbase#${info.id}`)) {
    //     setCopied(true)
    //   }
    // }} onClick={e => {
    //   if (!copied) {
    //     let el = inviteRef.current

    //     let endNode, startNode = endNode = el.firstChild
    //     startNode.nodeValue = startNode.nodeValue.trim()

    //     let range = document.createRange()
    //     range.setStart(startNode, 8)
    //     range.setEnd(endNode, el.textContent.length)

    //     let sel = window.getSelection()
    //     sel.removeAllRanges()
    //     sel.addRange(range)
    //     e.preventDefault()
    //   }
    // }}>
    : <div className='main' onClick={async e => {
      if (await copy(`${copypath}/${info.id}`)) {
        setCopied(true)
      } else {
        const el = inviteRef.current

        let endNode, startNode = endNode = el.firstChild
        startNode.nodeValue = startNode.nodeValue.trim()

        const range = document.createRange()
        range.setStart(startNode, 8)
        range.setEnd(endNode, el.textContent.length)

        const sel = window.getSelection()
        sel.removeAllRanges()
        sel.addRange(range)
        e.preventDefault()
      }
    }}>

      <div className='info dark game-status'>
        <span ref={inviteRef} className='chiclet'>
          {copied
          ? 'copied!'
          : toSide
          ? `${info.public ? 'public ':''}${langDiff ? info.lang+' ':''}#${info.id}`
          : copyHint === info.id
          ? `tap to copy link #${info.id}`
          : `${
            info.public ? 'public ':''
          }${
            langDiff ? info.lang+' ':''
          }invite ${
            (langDiff ? `` : window.location.host + subpath + '/').replace(/\/+-?/, '/')
          }${info.id}`}
          {/* : `invite #${info.id}`} */}
        </span>
      </div>
    </div>}
    {<div className={'options' + (isEdit ?' open':' closed')}>
      {/* {isLocal ? '' :
        <span onClick={() => {
          api.post(`/wordbase/g/${info.id}/hide`).then(() => outer.load());
        }}>hide</span>
      }
      {isLocal
      ? ''
      : info.status === Player.none
      ? <span onClick={() => {
        api.post(`/wordbase/g/${info.id}/resign`).then(() => outer.load());
      }}>resign</span>
      : <span onClick={() => {
        api.post(`/wordbase/g/${info.id}/rematch`).then(() => outer.load());
      }}>rematch</span>} */}
      {/* {isLocal
      ?
        <span onClick={() => {
          if (isLocal) {
            rematchGame(Info.local())
            outer.setEdit(false)
          } else {
            api.post(`/wordbase/g/${info.id}/delete`).then(() => outer.load());
          }
        }}>delete</span>
      : <> */}

      {/* {info.status === Player.none ? '' :
        <span onClick={() => {
          api.post(`/wordbase/g/${info.id}/rematch`).then(() => outer.load());
        }}>rematch</span>
      }

      {isTurn && info.status === Player.none
      ?
        <span onClick={() => {
          api.post(`/wordbase/g/${info.id}/resign`).then(() => outer.load());
        }}>resign</span>
      :
        <span onClick={() => {
          api.post(`/wordbase/g/${info.id}/hide`).then(() => outer.load());
        }}>hide</span>
      }

      </>}
      <span onClick={() => {
        if (isLocal) {
          rematchGame(Info.local())
          outer.setEdit(false)
        } else {
          api.post(`/wordbase/g/${info.id}/delete`).then(() => outer.load());
        }
      }}>delete</span> */}

      {isLocal || !info.p1
      ? deleteItem
      : info.status === Player.none
      ?
        <span onClick={() => {
          api.post(`/wordbase/g/${info.id}/resign`).then(() => outer.load());
        }}>resign</span>
      :
        <span onClick={() => {
          api.post(`/wordbase/g/${info.id}/rematch`).then(() => outer.load());
        }}>rematch</span>
      }

      {isLocal
      ? ''
      : (isTurn && info.status === Player.none)
        ? deleteItem
        : ''
      }
      <span onClick={() => {
        api.post(`/wordbase/g/${info.id}/hide`).then(() => outer.load());
      }}>hide</span>

      {/* {info.p1 ? '' :
        <span onClick={() => {
          api.post(`/wordbase/g/${info.id}/delete`).then(() => outer.load());
        }}>delete</span>
      } */}

      {/* </>} */}
    </div>}
  </div>
  )
}
const ITEMS_PER_SECTION = 20
const GameSection = ({name, force, games, isEdit, copyHint, outer}: {
  name: string, force?: boolean, games: Info[], isEdit?: boolean, copyHint, outer: any
}) => {
  const [expanded, setExpanded] = useState('Your Turn'.includes(name))
  // const hidden = 0
  const hidden = expanded ? 0 : Math.max(0, games.length - ITEMS_PER_SECTION)
  if (hidden) games = games.slice(0, -hidden)

  return !games.length && !force ? <></> : <>
    <div className='top'>
      <span>{name}</span>

      {/* <a className='feedback' onClick={() => outer.setModal(<Feedback />)}>send feedback</a> */}
      <a className='feedback' onClick={() => outer.setModal('feedback')}>send feedback</a>

      <div className='controls'>
        {outer.filter
        ? <>
          <span className='button'
            onClick={() => outer.setFilter(undefined)}>
            show all games
          </span>
          <span className='button'
            onClick={() => outer.open(false, outer.filter)}>
            stats
          </span>
        </>
        : <>
          {isEdit && 1 ? '' : <>
          {/* {0 ? '' : <span className='button'
            onClick={() => outer.setModal(<Changelog project='wordbase' />)}>
            1.1
          </span>} */}
          {0 ? '' : <span className='button' style={{fontFamily:'none'}}
          onClick={() => outer.setModal(<Support />)}>
            {/* &nbsp;?&nbsp; */}
            {/* <span style={{ position: 'relative', top: '1px' }}>♥</span> */}
            <svg style={{
              position:'relative', top:'0.05em',
              strokeWidth: '.5rem', overflow: 'visible',
              height: '100%', width: '1rem',
            }}
            xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" viewBox="0 0 230 230" fill="currentColor">
              <path d="M213.588,120.982L115,213.445l-98.588-92.463C-6.537,96.466-5.26,57.99,19.248,35.047l2.227-2.083  c24.51-22.942,62.984-21.674,85.934,2.842L115,43.709l7.592-7.903c22.949-24.516,61.424-25.784,85.936-2.842l2.227,2.083  C235.26,57.99,236.537,96.466,213.588,120.982z"/>
            </svg>
          </span>}
          {/* <Link className='button' to='/notify'>/notify</Link> */}
          {/* <Link className='button' to='/settings#wordbase'>settings</Link> */}
          {/* <Link className='button' to='/wordbase/stats'>stats</Link> */}
          <span className='button' onClick={() => outer.toggleStats()}>
            stats
          </span>
          <span className='button'
            onClick={() => outer.setModal(<Settings
              app='wordbase'
              close={() => outer.setModal(false)}/>)}>
            settings
          </span>
          </>}
        </>}
        {/* <a className='button' onClick={() => outer.setModal(<WordbaseStats {...{
          user: auth.user
          }} />)}>
          stats
        </a> */}
        {!isEdit ? '' : <span className='button' onClick={() => {
          api.post(`/wordbase/g/unhide`).then(() => outer.load());
        }}>
          unhide
        </span>}
        <span className='button' onClick={() => outer.setEdit(!isEdit)}>
          {isEdit ? 'close' : 'edit'}
        </span>
      </div>
    </div>

    <div className='section'>
      {!games.length ?
      <div id='menu-empty' style={toStyle(`
      // opacity: .5;
      color: ${theme.bomb_9};
      text-align: center;
      white-space: pre;
      // display: flex;
      // flex-direction: column;
      // align-items: center;
      `)}>
      <br />
      <br />
      <span className='button' onClick={() => outer.setModal(
        <div className='body'>
          <HowTo setModal={outer.setModal}/>
        </div>)}>
        how to play
      </span>
      <br />
      <br />
        {/* {`
send an invite link!
'online game' → new private link

match someone random
'online game' → join random

or play local
'local game' → human or computer

        `} */}
                {`
send an invite link!
`}
{/* <span className='button' onClick={() => {
  document.querySelector('#online-game').click()
}}>
  online game
</span>{` → `} */}
<span className='button' onClick={() => {
  ;(document.querySelector('#online-game') as any)?.click()
  setTimeout(() => {
    ;(document.querySelector('#new-invite') as any)?.click()
  })
}}>new invite</span>{`

match someone random
`}
{/* <span className='button' onClick={() => document.querySelector('#online-game').click()}>
online game
</span>{` → `} */}
<span className='button' onClick={() => {
  ;(document.querySelector('#online-game') as any)?.click()
  setTimeout(() => {
    ;(document.querySelector('#join-random') as any)?.click()
  })
}}>join random</span>{`

play local
`}
{/* <span className='button' onClick={() => document.querySelector('#local-game').click()}>
local game
</span>{` → `} */}
<span className='button' onClick={() => {
  ;(document.querySelector('#local-game') as any)?.click()
  setTimeout(() => {
    ;(document.querySelector('#local-human') as any)?.click()
  })
}}>human</span> <span className='button' onClick={() => {
  ;(document.querySelector('#local-game') as any)?.click()
  setTimeout(() => {
    ;(document.querySelector('#local-computer') as any)?.click()
  })
}}>computer</span>{`



`}
      </div>
      :
      games.map((info, i) =>
        <GameItem key={i} {...{
          info,
          isEdit,
          copyHint,
          outer,
        }} />)}
      {hidden ?
      <div className='game-entry'>
        <div className='button' style={{ margin: 'auto' }}
        onClick={() => setExpanded(true)}>
          show {hidden} more
        </div>
      </div>
      : ''}
    </div>
  </>
}


const UpperSection = ({outer, copyHint, gameProfile}: {
  copyHint, gameProfile, outer: {
    open, load, toggleStats, setCopyHint, setGameProfile, setModal, setEdit,
  }
}) => {
  const auth = useAuth()
  const [friends, setFriends] = useState([]);
  const [isLocal, setLocal] = useState(false);
  const [isComputer, setComputer] = useState(false);
  const [isNew, setNew] = useState(false);
  const [isFriend, setFriend] = useState(false);
  const [profile] = user.profile.use()
  const [settings] = user.settings.use()

  const fullscreen = settings.wordbase.full

  // load friends
  // useF(auth.user, () => handle.loadFriends())
  useF(profile, () => {
    if (profile) {
      setFriends(profile.friends)
    } else {
      setFriends([])
    }
  })

  // close friend selection when new game selection closes
  useF(isNew, () => { if (!isNew) setFriend(false) })

  // show 'copied!' for 3s
  const [copied, setCopied]: [boolean | string, any] = useState(false);
  useF(copied, () => {
    if (copied) setTimeout(() => setCopied(false), 5000);
  })


  const [storedCustomization, setStoredCustomization] = store.use('wordbase.customize')
  const gameSettings = useR()
  useF(storedCustomization, settings.wordbase.customize, () => {
    if (settings.wordbase.customize) {
      gameSettings.current = new GameSettings(storedCustomization)
    } else {
      gameSettings.current = undefined
    }
  })

  const handle = {
    invite: (path): Promise<{info: Info}> => {
      setNew(false);
      console.debug('NEW INVITE', JSON.pretty(gameSettings.current))
      let closeCallback
      openPopup(close => {
        closeCallback = close
        return <span><Loader />&nbsp;&nbsp;loading dictionary</span>
      }, `
      width: fit-content;
      height: fit-content;
      color: black;
      box-shadow: none;
      border: none;
      border-radius: .5em;
      padding: .5em;
      white-space: pre;
      font-family: Ubuntu;
      user-select: none;
      `)
      return loadLang(settings.wordbase.language).then(() => {
        closeCallback()
        const save = Save.new(gameSettings.current)
        return new Promise((resolve, reject) => {
          api.post(path, {
            settings: save.settings,
            state: save.serialize(),
            custom: JSON.stringify(save.settings) !== JSON.stringify(new GameSettings()),
          })
            .then(data => {
              console.debug('data', data);
              resolve(data)
              outer.load();
            })
            .catch(err => {
              console.debug('err', err.error)
              reject(err.error)
            });
        })
      })
    },
    open: () => {
      outer.setEdit(false)
      return handle.invite('/wordbase/i/open')
    },
    private: () => {
      setCopied(true)
      handle.invite('/wordbase/i/private')
        .then(async data => {
          const success = await copy(`${copypath}#${data.info.id}`)
          if (success) {
            setCopied(`copied invite link (#${data.info.id})`)
            // setTimeout(() => {
            //   if (/iPhone|iPod|Android/i.test(navigator.userAgent)) {
            //     window.location.href = 'sms:&body='
            //     + encodeURI(`Play me in Wordbase!\n${copypath}#${data.info.id}`)
            //   }
            // }, 1000)
          } else {
            setCopied(`created invite, tap to copy link`)
            outer.setCopyHint(data.info.id)
          }
        })
    },
    friend: user => handle.invite(`/wordbase/i/friend/${user}`)
      .then(data => outer.open(data.info.id)),
    random: () => {
      setNew(false)
      api.post('/wordbase/i/accept')
        .then(({info}) => outer.open(info.id))
        .catch(err => {
          console.debug(err)
          if (err.error === 'already open') {
            // copy(`${copypath}#${err.id}`)
            // setTimeout(() => outer.setCopyHint(err.id), 500)
            setCopied(`invite #${err.id} already open`)
          } else {
            const _originalCustomization = gameSettings.current
            gameSettings.current = new GameSettings()
            handle.open().then(data => {
              // copy(`${copypath}#${data.info.id}`)
              // setTimeout(() => outer.setCopyHint(data.info.id), 500)
              setCopied(`none open, created #${data.info.id}`)
              gameSettings.current = _originalCustomization
            })
          }
        })
        .finally(() => outer.load());
    },
    custom: () => {
      // setNew(false)
      outer.setModal(<GameLobby open={outer.open} setModal={outer.setModal}
        create={handle.customize(
          () => handle
            .invite('/wordbase/i/open')
            .then(data => setCopied(`created #${data.info.id}`)),
          'new public invite',
          true)} />)
      // api.post('/wordbase/i/accept')
      //   .then(({info}) => outer.open(info.id))
      //   .catch(err => {
      //     console.debug(err)
      //     if (err.error === 'already open') {
      //       // copy(`${copypath}#${err.id}`)
      //       // setTimeout(() => outer.setCopyHint(err.id), 500)
      //       setCopied(`invite #${err.id} already open`)
      //     } else {
      //       handle.open().then(data => {
      //         // copy(`${copypath}#${data.info.id}`)
      //         // setTimeout(() => outer.setCopyHint(data.info.id), 500)
      //         setCopied(`none open, created #${data.info.id}`)
      //       })
      //     }
      //   })
      //   .finally(() => outer.load());
    },
    local: (difficulty=0) => {
      console.debug('NEW LOCAL', difficulty, settings.wordbase.language)
      setLocal(false)
      setComputer(false)
      let closeCallback
      openPopup(close => {
        closeCallback = close
        return <span><Loader />&nbsp;&nbsp;loading dictionary</span>
      }, `
      width: fit-content;
      height: fit-content;
      color: black;
      box-shadow: none;
      border: none;
      border-radius: .5em;
      padding: .5em;
      white-space: pre;
      font-family: Ubuntu;
      user-select: none;
      `)
      createLocal(difficulty, gameSettings.current, settings.wordbase.language).then(() => {
        outer.open(local.info.id)
        closeCallback()
      })
    },
    challenge: (doCopy=false) => {
      return api.get('wordbase/challenge/hash').then(hash => {
        const challengeId = `new/${hash}`
        // copy(`${copypath}#${challengeId}`)
        if (doCopy) {
          copy(`wordbase.app/${challengeId}`.replace(/\/\/n/g, '/n'))
          setNew(false)
          setCopied(`copied challenge link, send it!`)
        } else return api.get('/wordbase/i/new').then(({ gameProfile }) => {
          outer.setGameProfile(gameProfile)
          return gameProfile
          // if (gameProfile.allowChallenges) {
          //   setNew(false)
          //   setCopied(`copied #${challengeId}, send it!`)
          // }
        })
      })
    },
    seed: () => { // just to seed competition matches
      setNew(false)
      // generate 1,000 matches
      const saves = range(100).map(i => Save.new(gameSettings.current))
      const states = saves.map(x => x.serialize())
      return api.post(`/wordbase/compete/0/seed`, {
        states,
      }).then(result => {
        openPopup(close => {
          return <div>
            <div>seed {saves.length} games (<a onClick={close}>close</a>)</div>
            <div>{JSON.stringify(result)}</div>
            <div style={{display: 'flex', flexWrap: 'wrap', fontSize: '.7em'}}>
              {saves.map((save, i) => <GamePreview key={i} board={save.board} />)}
            </div>
          </div>
        })
      })
    },
    customize: (inviteFunc, inviteType='', forceCustom=false) => {
      console.debug('CUSTOMIZE', inviteFunc, inviteType, forceCustom)
      return () => {
        const customizeInvites = settings.wordbase.customize
        if (!customizeInvites && !forceCustom) inviteFunc()
        else outer.setModal(<GameSettingsModal
          inviteType={inviteType}
          initialSettings={gameSettings.current}
          create={(newSettings, o) => {
            setNew(false)
            console.debug('NEW SETTINGS', JSON.pretty(newSettings))
            gameSettings.current = newSettings
            inviteFunc()
            setStoredCustomization(newSettings)
            outer.setModal(false)
          }}
          outer={outer} />)
      }
    },
  }

  const localInProgress = local.info?.turn && local.info.status === Player.none
  return (
    <div className={'upper' + (isNew || isLocal ? ' new' : '') + (isFriend ? ' friend' : '')}>
      <div className='corner'>
        {fullscreen ? <Unread /> : ''}
        {settings.wordbase.language !== 'english'
            ? <div className='lang'>{settings.wordbase.language}</div>
            : ''}
      </div>

      {/* <div className='img-container'>
        <img src="/raw/wordbase/favicon.png" />
      </div> */}

      {/* <div className='button-row'> */}
        {/* <div className='button' onClick={() => outer.open(local.info.id)}>
          local game
        </div> */}

        {/* <div className='button' onClick={() => outer.toggleStats()}>
          stats
        </div> */}
      {/* </div> */}

      <div
      id='local-game'
      className={'button' + (isLocal ? ' inverse' : '')}
      onClick={() => !localInProgress ? setLocal(!isLocal) : handle.local()}>
        {isLocal ? 'cancel' : 'local game'}
      </div>
      {!isLocal ? '' :
      localInProgress ?
        <div className='button indent' onClick={() => setLocal(true)}>
          already in progress
        </div>
      : <>
        <div id='local-human' className='button indent' onClick={handle.customize(() => handle.local(), 'local game (human)')}>
          human
        </div>
        {/* <div className='button indent' onClick={() => handle.local(1)}>
          computer
        </div> */}
        <div id='local-computer' className={'button indent' + (isComputer ? ' inverse' : '')}
          onClick={() => setComputer(!isComputer)}>
          {isComputer ? 'cancel' : 'computer'}
        </div>
        {!isComputer ? '' :
        <div className='button-list indent-2'>
          {[1, 2, 3].map(difficulty =>
            <div className='button indent' key={difficulty} onClick={handle.customize(() => handle.local(difficulty), 'local game (computer)')}>
              {['', 'easy', 'medium', 'hard'][difficulty]}
              {/* level {difficulty} */}
            </div>)}
        </div>}
      </>}

      <div className='button-list'
      onClick={!auth.user ? e => openLogin() : async () => {
        if (copyHint) {
          const success = await copy(`${copypath}/${copyHint}`)
          if (success) {
            setCopied(`copied #${copyHint}, send it!`)
          }
        } else {
          setNew(!isNew)
        }
      }}>
        <div
        id='online-game'
        className={'button' + (isNew ? ' inverse' : '') + (!auth.user?' placeholder':'')}>
          {isNew ? 'cancel' : typeof copied === 'string' ? copied : 'online game'}
        </div>
        {/* {!isNew
        ?
        <div className={'button' + (!auth.user?' placeholder':'')}>
          new!
        </div>
        :''} */}
        </div>
        {!isNew ? '' :
        <>
          <div className='description indent'>private</div>
          <div className='button-list indent'>
            {isFriend ? '' : <div id='new-invite' className='button indent' onClick={handle.customize(() => handle.private(), 'new private link')}>
              new invite link
            </div>}
            {!isFriend || !friends.length ? '' :
            friends.map(u =>
              <div className='button indent' key={u} onClick={handle.customize(() => handle.friend(u), `challenge ${u}`)}>
                {u}
              </div>)}
            <div className={'button indent' + (isFriend ? ' inverse' : '')}
              onClick={() => setFriend(!isFriend)}>
              {isFriend
              ? (friends.length ? 'cancel' : 'add someone as a friend')
              : 'challenge friend'}
            </div>
          </div>
          {/* <div className='button-list indent'>
            <div id='join-random' className='button indent' onClick={() => handle.random()}>
              join random
            </div>
            <div id='join-custom' className='button indent' onClick={() => handle.custom()}>
              custom
            </div>
          </div> */}
          <div className='description indent'>public</div>
          <div className='button-list indent'>
            <div id='join-random' className='button indent' onClick={() => handle.random()}>
              join random
            </div>
            <div id='join-custom' className='button indent' onClick={() => handle.custom()}>
              browse lobby
            </div>
          </div>
          <div className='description indent'>challenge link</div>
          <div className='button-list indent'>
            {(() => {
              const toggle = 
              <div className='button' onClick={() => handle.challenge()}
              style={{ position: 'relative' }}>
                {gameProfile?.allowChallenges ? 'disable' : 'enable challenge link'}
              </div>
              
              return gameProfile?.allowChallenges ? <>
                <div className='button' onClick={() => handle.challenge(true)}>
                  share challenge link
                </div>
                {toggle}
              </> : <>
                {toggle}
              </>
            })()}
            <div className='button' style={{ minWidth: '2.3rem' }} onClick={() => 
              outer.setModal(
              <ChallengeLinkModal outer={outer} enabled={gameProfile?.allowChallenges} toggle={() => handle.challenge()} />)
            }>
              ?
            </div>
          </div>
          {/* <div className='button-list indent' onClick={() => outer.open(false, false, true)}>
            <div className='button'>
              competitive
            </div>
            <div className='button'>
              new!
            </div>
          </div> */}
          {/* {auth.user === 'cyrus'
          ?
          <div className='button indent' onClick={handle.customize(() => handle.seed(), 'seed competition')}>
            seed
          </div>
          :''} */}
          {/* <div style={{
            // position: 'absolute', left: 'calc(100% + 1rem)',
            color: 'black', fontSize: '.8rem',
            }}>new! anyone who opens {location.host}#new/{auth.user} will create a new game with you</div> */}
          <div />
        </>}
      </div>
  )
}
const ChallengeLinkModal = ({ outer, enabled=false, toggle=pass, openSettingsTrigger=undefined }) => {
  const [_enabled, setEnabled] = useS(enabled)
  useF(enabled, setEnabled)
  openSettingsTrigger = openSettingsTrigger || trigger.new()
  const [{ user }] = auth.use()
  const [hash, toggleHash, reloadHash] = useCachedSetter<string, void>({
    name: 'wordbase-challenge-hash',
    fetcher: () => api.get('wordbase/challenge/hash'),
    setter: () => api.post('wordbase/challenge/hash'),
  })
  const [challengeSettings, setChallengeSettings, reloadChallengeSettings] = useCachedSetter<GameSettings, GameSettings>({
    name: 'wordbase-challenge-settings',
    fetcher: () => {
      console.debug('fetch challenge settings', hash)
      return api.get(`/wordbase/challenge/hash/user/${hash}`).then(({ challengeSettings }) => challengeSettings)
    },
    setter: challengeSettings => {
      console.debug('set challenge settings', challengeSettings)
      return api.post(`/wordbase/challenge/hash/user/${hash}`, { challengeSettings }).then(({ challengeSettings }) => challengeSettings)
    },
  })
  useF('challenge settings', challengeSettings)
  const info = useM(hash, challengeSettings, () => Object.assign(new Info({ id: 'new/'+hash, p1: '', p2: '', settings: challengeSettings })))
  const preview: Save = useM(info, () => Save.new(info.settings))
  useF('CHALLENGE INFO', hash, info)
  const _openGameSettings = (_settings=info.settings, _info=info) => outer.setModal(<GameSettingsModal
    inviteType='Challenge Link'
    initialSettings={_settings} outer={outer} info={_info}
    update={(settings) => {
      if (JSON.stringify(settings) !== JSON.stringify(_settings)) {
        console.debug('update challenge settings', settings)
        setChallengeSettings(settings)
        .then(() => reloadChallengeSettings())
        .then(settings => {
          outer.setModal('back')
          setTimeout(() => _openGameSettings(settings))
        })
      }
    }}
    />)
  
  
  
  return <div className='body'>
    <p>
      Challenge Link
    </p>
    <ul>
    {/* <li>
      Share a common link to invite challenges<br/>
    </li> */}
    <li>
      Disable at any time to prevent additional games<br/>
    </li>
    {/* <li>
    •  anyone can open it to start a game{'\n'}
    •  disable at any time to prevent additional games{'\n'}
    </li> */}
    <br/>
    <GameItemStyle>
      <div className='game-list' style={{padding: 0, height: 'fit-content'}}>
        <div className='section'>
          <GameItem info={info} isEdit={false} copyHint={undefined} outer={outer} />
        </div>
      </div>
      <HalfLine />
      <div className='flex row' style={S(`
      gap: .5em;
      `)}>
        <div className='button control' onClick={e => {
          toggle()
          setEnabled(!_enabled)
        }}>{_enabled ? 'disable' : 'enable'}</div>
        {_enabled ? <>
          <div className='button control' onClick={e => _openGameSettings()}>settings</div>
          <div className='button control' onClick={e => toggleHash()}>{hash === user ? 'randomize' : 'unrandomize'}</div>
        </> : null}
      </div>
      {/* <HalfLine />
      <div className='centering'>
        <GamePreview board={preview.board} theme={challengeSettings?.options?.theme} />
      </div> */}
    </GameItemStyle>
    </ul>
  </div>
}

export const WordbaseMenu = ({ open, infoList, reload, setList, setModal, loaded: outerLoaded, menuClosed, filter, setFilter }) => {
  infoList = useM(filter, infoList, () => filter 
    ? infoList.filter(x => x.p1 === filter || x.p2 === filter)
    : infoList)
  useE(infoList, () => infoList && cleanTimeout(outerLoaded))
  const auth = useAuth();
  const [isEdit, setEdit] = useState(false);
  useF(menuClosed, () => menuClosed && setEdit(false))
  const [gameProfile, setGameProfile] = useState(undefined)
  const [isStats, setStats] = useState(false)

  const [copyHint, setCopyHint]: [string | false, any] = useState(false)
  useF(copyHint, () => {
    if (copyHint) setTimeout(() => setCopyHint(false), 5000);
  })

  const handle = {
    open,
    setEdit,
    setCopyHint,
    setGameProfile,
    setModal,
    filter, setFilter,
    toggleStats: () => {
      open(false, true)
      // if (!isStats) {
      //   handle.load()
      // }
      // setStats(!isStats)
    },
    load: () => {
      const empty = () => {
        setList([]);
        setGameProfile({})
      }
      if (auth.user) {
        api.get('/wordbase/games').then(({
          gameProfile, infoList
        }) => {
          console.debug('games', infoList);
          setList(infoList?.length
            ? infoList.sort((a, b) => (b.lastUpdate || 0) - (a.lastUpdate || 0))
            : []);
          setGameProfile(gameProfile)
        }).catch(err => {
          console.debug('games err', err.error)
          empty()
        });
      } else empty()
    },
  }

  // set list to empty after 1s (removes loading spinner)
  useTimeout(() => infoList || setList([]), 1000)

  useF(auth.user, reload, handle.load)

  subpath = useSubpath('/wordbase')
  copypath = `${window.location.origin}${subpath}`

  const menuRef = useR()
  // useEventListener(window, 'resize', () => {
  //   if (menuRef.current) menuRef.current.style.width = ''
  //   setTimeout(() => {
  //     if (menuRef.current) menuRef.current.style.width = menuRef.current.clientWidth+'px'
  //   })
  // })

  // show new game hint if none open and < 3 are ended
  infoList = infoList?.filter(info => info.id !== local.info.id)
  const noOnlineGames = infoList?.every(i => {
    const isEnded = i.status !== Player.none
    return isEnded
  }) && infoList.length < 3
  const onGameListScroll = e => { // better sticky labels
    const labels: HTMLElement[] = Array.from(e.target.querySelectorAll('.top > span:first-child'))
    labels.reverse().map(x => {
      x.style.position = 'relative'
      x.style.top = ''
      return x
    }).map(x => x.getBoundingClientRect()).map((x, i, arr) => {
      if (i > 0) {
        if (x.y + x.height >= arr[i-1].y) {
          const top = `${Math.round(arr[i-1].y - (x.y + x.height))}px`
          labels[i].style.top = top
          // console.log(arr[i-1].y, x.y + x.height, i, labels[i].textContent, arr[i-1].y - (x.y + x.height), top, labels[i].style.top)
        }
      }
    })

    menuRef.current.classList.add('scrolled')
  }
  useF(menuClosed, () => {
    if (menuClosed && menuRef.current) menuRef.current.classList.remove('scrolled')
    if (!menuClosed) handle.load()
  })
  return (
    <Style className={`wordbase-menu solid-${theme.solid} options-${theme.options}`} ref={menuRef}>
      {/* <Scroller /> */}

      <UpperSection {...{
        outer: handle,
        copyHint,
        gameProfile,
      }}/>

      {isStats ?
      <InfoStyles style={{ height: 'auto', position: 'relative' }}>
        {/* <div className='img-container'>
          <img src="/raw/wordbase/favicon.png" />
        </div> */}

        {auth.user ?
        <InfoBody>
          <InfoSection label='longest word'>
            {gameProfile?.stats?.longestWord?.toUpperCase() || 'none'}
          </InfoSection>
          <InfoSection label='longest game'>
            {gameProfile?.stats?.longestGame} words
          </InfoSection>
          <InfoSection label='average word length'>
            {(gameProfile?.stats?.lettersPlayed / gameProfile?.stats?.wordsPlayed).toFixed(2)} letters
          </InfoSection>
          <InfoSection label='words played'>
            {gameProfile?.stats?.wordsPlayed}
          </InfoSection>
          <InfoSection label='games played'>
            {gameProfile?.stats?.gamesPlayed}
          </InfoSection>
        </InfoBody>
        :
        <div className='button placeholder' onClick={e => openLogin()}>
          log in for stats
        </div>}

      </InfoStyles>
      : ''}

      {!auth.user ?
      <div className='game-list' onScroll={onGameListScroll}>
        {local.info.turn > 0 || local.info.ai ? <GameSection {...{
          name: 'Local',
          games: [local.info],
          isEdit, copyHint, outer: handle,
        }}/> : ''}

        <GameSection {...{
          name: 'No Games Open',
          games: [],
          isEdit, copyHint, outer: handle,
          force: true,
        }}/>
      </div>
      :
      <div className='game-list' onScroll={onGameListScroll}>
        {!infoList ? <div style={toStyle(`
        width: 100%; height: 100%;
        display: flex; align-items: center; justify-content: center;
        `)}>
          <Loader/>
        </div> : <>

        {local.info.turn > 0 || local.info.ai ? <GameSection {...{
          name: 'Local',
          games: [local.info],
          isEdit, copyHint, outer: handle,
        }}/> : ''}

        <GameSection {...{
          name: infoList.length === 0 ? 'No Games Open' : 'Your Turn',
          games: infoList.filter(i => {
            const isInvite = !i.p1;
            const canPlay = i.status === Player.none &&
              (!i.p1 || auth.user === (i.turn%2 ? i.p2 : i.p1));
            const unseen = i.unseen === true || i.unseen?.includes(auth.user)
            // const unseen = i.status !== Player.none && !i.seen
            //   && i[i.status === Player.p1 ? 'p1' : 'p2'] !== auth.user
            // if (unseen) console.debug(i.lastWord, unseen, i.status !== Player.none, i.seen, !i.seen, i[i.status === Player.p1 ? 'p1' : 'p2'] !== auth.user)
            return !isInvite && (canPlay || unseen);
          }).reverse(),
          isEdit, copyHint, outer: handle,
          force: noOnlineGames,
        }}/>

        <GameSection {...{
          name: 'Their Turn', games: infoList.filter(i => {
            const isInvite = !i.p1;
            const isEnded = i.status !== Player.none;
            const canPlay = i.status === Player.none &&
              (!i.p1 || auth.user === (i.turn%2 ? i.p2 : i.p1));
            const isLocal = i.id === local.info.id
            return !isLocal && (isInvite || (!isEnded && !canPlay));
          }),
          isEdit, copyHint, outer: handle,
        }}/>

        <GameSection {...{
          name: 'Ended', games: infoList.filter(i => {
            const isEnded = i.status !== Player.none;
            // const unseen = i.status !== Player.none && !i.seen
            //   && i[i.status === Player.p1 ? 'p1' : 'p2'] !== auth.user
            const unseen = i.unseen === true || i.unseen?.includes(auth.user)
            return isEnded && !unseen;
          }),
          isEdit, copyHint, outer: handle,
        }}/>

        </>}
      </div>}
    </Style>
  )
}

const gameItemStyles = `
.game-list {
  padding: .5rem 1rem;
  overflow-y: scroll;
  &::-webkit-scrollbar { display: none }
  user-select: none;
  height: 0;
  flex-grow: 1;
  padding-top: 0;
  margin-top: -.5rem;
  .top {
    text-transform: uppercase;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: .5rem;

    position: sticky;
    top: 0;
    padding-top: .5rem;
    margin-top: 0;
    z-index: 198;
    &:first-child {
      &::after {
        // background: ${layerBackground(theme.background, theme.feed)};
        // background: #e78b88;
        position: absolute;
        top: 0; height: 100%;
        left: -1rem; width: calc(100% + 2rem);
        display: block;
        content: "";
        z-index: -1;
      }
    }
    &:not(:first-child) {
      pointer-events: none;
    }
    > span:first-child {
      width: fit-content;
      min-width: 6rem;
      position: relative;
      line-height: 2rem;
      margin: -0.25rem 0;
    }
    .controls {
      z-index: 199;

      text-transform: lowercase;
      font-size: 1rem;
      display: none;
      .button {
        margin-left: .5rem;
        white-space: nowrap;
        color: var(--id-color-text-readable);
      }
    }
    .feedback {
      display: none !important;

      text-transform: lowercase;
      font-size: .8rem;
      color: ${theme.bomb_3};
      text-shadow: none;
      margin-left: auto;
      display: none;
    }
  }
  .top:first-child .controls { display: flex; }
  .top:nth-child(3) .feedback { display: block; }
  position: relative;
  .top:first-child .feedback {
    position: absolute;
    bottom: 0; right: 0;
  }
}
.game-entry {
  height: 2.5rem;
  // margin-bottom: .5rem;
  margin-bottom: 2px;
  &:first-child {
    border-top-left-radius: 2px;
    border-top-right-radius: 2px;
  }
  &:last-child {
    border-bottom-left-radius: 2px;
    border-bottom-right-radius: 2px;
    // margin-bottom: .5rem;
  }
  cursor: pointer;
  color: ${theme.tile};
  display: flex;
  .main {
    // background: #2d2d2d;
    // background: #00000022;
    // background: ${theme.backing};
    &:not(:has(.game-progress)) {
      background: ${theme.backing};
    }
    height: 100%;
    flex-grow: 9;
    position: relative;
    overflow: hidden;

    width: 100%;
    flex-shrink: 0;
    transition: .2s;

    .game-progress {
      height: 100%;
      padding: 0 .5rem;
      text-shadow: none;
    }
    .game-status .chiclet {
      border-radius: 1em !important;
      padding: 0 .5em !important;
    }
    .info {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      user-select: none;
      span {
        white-space: pre;
        // background: #00000044;
        // background: #ffffff22;
        // background: #00000088;
        background: ${theme.bomb};
        color: ${theme.tile};
        padding: 0 .3rem;
        border-radius: .2rem;
        // user-select: none;
      }
      &.backing span {
        background: #00000088;
        background: ${theme.bomb_5};
        color: ${theme.tile};
      }
    }
  }
  overflow: hidden;
  .info {
    padding: 0 0.5rem;
  }
  &.options-open .main {
    flex-shrink: 1;
  }
  // &.anim-closed {
  //   .player-name.played { visibility: hidden; }
  // }
  // &.anim-closed .hide-right + .info { justify-content: flex-end }
  // &.anim-closed .hide-left + .info { justify-content: flex-start }
  // &.anim-open {
  //   .player-name-user { visibility: hidden; }
  // }
  // &.anim-open.game-entry-user-right .info { justify-content: flex-end }
  // &.anim-open.game-entry-user-left .info { justify-content: flex-start }
  .options {
    // width: 2.5rem;
    padding: 0 .5rem;
    flex-grow: 0;
    background: ${theme.bomb};
    // background: ${layerBackground('black', theme.bomb_7)};
    // background: black;
    display: flex;
    align-items: center;
    justify-content: space-between;
    span {
      min-height: 1.5rem;
      min-width: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${theme.bomb};
      background: ${theme.tile};
      // color: white;
      // background: black;
      // border-bottom: 1px solid #fffd;
      // background-clip: padding-box;
      // &:active { border-bottom: 0; border-top: 1px solid transparent; }
      padding: 0 .3rem;
      border-radius: .2rem;
      cursor: pointer;
      margin-right: .5rem;
      &:last-child { margin-right: 0; }
    }
    // transition: .4s;
    // overflow: hidden;
    // &.closed { max-width: 0; padding: 0; }
    // &.open { max-width: 100%; }
    flex-shrink: 0;
  }
}`
const GameItemStyle = styled.div`${gameItemStyles}`
const Style = styled.div`
  background: ${theme.feed};
  height: 100%; width: 100%;
  display: flex; flex-direction: column;
  margin: auto;
  position: relative;
  // padding-top: 10.5rem;
  padding-top: 7.75rem;

  color: ${theme.bomb};
  font-family: 'Ubuntu', sans-serif;
  // text-transform: uppercase;
  .button-row {
    display: flex;
    .button {
      margin-right: .5rem;
      &:last-child { margin-right: 0; }
    }
    justify-content: space-between;
    width: 100%;
  }
  .button, .unread {
    color: ${theme.tile};
    background: ${theme.bomb};
    text-shadow: none;
    // background: #000d;
    // border-bottom: 1px solid ${theme.bomb};
    // background-clip: padding-box;
    // &:active { border-bottom: 0; border-top: 1px solid transparent; }
    &.inverse { color: ${theme.bomb}; background: ${theme.tile}; border: solid 2px ${theme.bomb}; }
    padding: 0 .3rem;
    min-width: 1.5rem;
    width: fit-content;
    border-radius: .3rem;
    cursor: pointer;
    user-select: none;
    display: inline-flex; justify-content: center;
    text-decoration: none;
  }
  div.button {
    display: flex;
  }
  #menu-empty .button {
    height: 2.25rem;
    font-size: 1.5rem;
  }
  .upper {
    position: absolute;
    top: 0;
    width: 100%;
    z-index: 9999;
    background: ${theme.tile};
    // height: 8rem;
    display: flex;
    flex-direction: column;
    align-items: start;
    padding: 1rem;
    border-bottom: .5px solid transparent;
    .button {
      height: 2.25rem;
      display: flex;
      align-items: center;
      width: fit-content;
      white-space: pre;
      margin-bottom: .75rem;
      font-size: 1.5rem;
      cursor: pointer;
      &.placeholder {
        opacity: .5;
      }
    }
    > :last-child { margin-bottom: 0 !important; }
    // transition: .5s;
    overflow: hidden;
    // min-height: 7rem; max-height: 8rem;
    // &.new { min-height: 16rem; max-height: 17rem; }
    // &.friend { min-height: 16rem; max-height: 100%; }
    .indent, .indent-2, .button-list {
      margin-bottom: .75rem;
    }
    .indent {
      margin-left: 1rem;
      margin-bottom: .75rem;
      &.description {
        margin-bottom: 0;
      }
    }
    .indent-2 {
      margin-left: 2rem;
      margin-bottom: .75rem;
    }
    .button-list {
      width: calc(100% - 1rem);
      // padding-left: 1rem;
      // margin-bottom: .25rem;
      margin-bottom: .75rem;
      column-gap: .5rem;
      row-gap: .5rem;
      > .button {
        margin: 0;
        // margin-bottom: .5rem;
        // margin-right: .5rem;
      }
      display: flex;
      flex-wrap: wrap;
    }
    .corner {
      position: absolute;
      right: 1rem;
      top: 1rem;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      > * {
        margin-right: 0 !important;
        & + * {
          margin-top: 0.5rem;
        }
      }
      .lang {
        color: ${theme.bomb_3};
        text-shadow: none;
        line-height: 1rem;
        text-transform: uppercase;
      }
      .unread {
        float: right;
        opacity: 1;
        font-size: 1rem;
      }
    }
  }
  ${gameItemStyles}
  .img-container {
    position: absolute;
    top: .9rem;
    right: .7rem;
    border-radius: .5rem;
    background: #00000011;
    // padding: .1rem .3rem .3rem .1rem;
    padding: .1rem;
    height: 5.6rem;
    width: 5.6rem;
    img {
      width: 100%;
      height: 100%;
      image-rendering: pixelated;
      z-index: 1;
    }
  }

  &.solid-true {
    .info.backing span {
      background: ${theme.bomb} !important;
    }
  }
  &.options-true {
    .top:first-child {
      margin-bottom: 1rem;
      ::after {
        background: ${theme.superbomb} !important;
      }
    }
  }
  &.scrolled .game-list .top:first-child {
    &::after {
      background: ${layerBackground(theme.background, theme.feed)};
    }
  }
`


export const Support = () => {
  const [cost]: any = useCached('cost/month', () => api.get('cost/month'))
  console.log(cost)
  const Style = styled.div`
  .content a {
    color: ${theme.bomb} !important;
  }
  .content p:not(.support-links) {
    margin-bottom: .33em;
  }
  .support-links {
    position: relative;
    text-align: center;
    vertical-align: middle;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  `

  const [{ user }] = auth.use()
  const [shareChallenge, setShareChallenge] = useState(!!user)

  let [challengeHash] = useCached('wordbase-challenge-hash', () => api.get('wordbase/challenge/hash'))
  challengeHash = challengeHash?.replace(/^\//, '')

  return <Style className='body'>
    <div className='content' style={toStyle(`
    display:flex; flex-direction:column; align-items:center; text-align:center
    `)}>
      <p style={{display:'none'}}></p>
      <p style={{marginTop:'.5em'}}>
        This is a fan remake of Wordbase, an iOS/Android app discontinued in 2018
      </p>
      <br/><br/>
      {/* <p> */}
        {/* If you'd like to support the site (it costs ~$11/month to keep online), you can <Link to='/coffee'>buy me a coffee</Link> */}
        {/* If you'd like to support the site, you can <a href='https://ko-fi.com/freshman_dev' target='_blank' rel='noreferrer'>buy me a coffee!</a> */}
        {/* If you'd like to support the site, you can<br/>
      </p> */}
      {/* <p className='support-links'>
        '<a href='/coffee'>buy me a coffee</a>' */}
        {/* <a href={`http://twitter.com/intent/tweet?text=${encodeURIComponent(auth.user ? `challenge me: wordbase.app/new/${auth.user}` : 'check out wordbase.app')}`} onClick={e => {
         auth.user && api.post('wordbase/i/new', { enable: true })
        }}>share on Twitter</a> */}
      {/* </p> */}
      {/* <p>
        Community
      </p>
      <p className='support-links'>
        <a href="/discord">Discord</a> &nbsp; <a href="/reddit">Reddit</a> &nbsp; <Link to='/contact'>something else?</Link>
      </p> */}
      <p>
        Share via
        {/* Share{shareChallenge ? ' a challenge' : ''}&nbsp;&nbsp;{shareChallenge ? <a onClick={e => {
            e.stopPropagation()
            setShareChallenge(!shareChallenge)
          }}> */}
          {/* {shareChallenge ? <i>or plain link</i> : 'or challenge'} */}
        {/* </a> : ''} */}
      </p>
      <p className='support-links'>
        <a href={`http://twitter.com/intent/tweet?text=${encodeURIComponent(user ? `challenge me: wordbase.app/new/${challengeHash}` : 'check out wordbase.app')}`} onClick={e => {
         user && api.post('wordbase/i/new', { enable: true })
        }} target='_blank' rel='noreferrer'>Twitter</a>
        &nbsp;&nbsp; <a href={`https://www.facebook.com/sharer/sharer.php?` + new URLSearchParams({
          u: user ? `https://wordbase.app/new/${challengeHash}` : 'https://wordbase.app',
          t: user ? '[AUTOMATED] Challenge me!' : '[AUTOMATED] Check out this word game!',
        }).toString()} onClick={e => {
          user && api.post('wordbase/i/new', { enable: true })
         }} target='_blank' rel='noreferrer'>Facebook</a>
         {/* &nbsp;/ <a href={`https://www.tumblr.com/widgets/share/tool?` + new URLSearchParams({
          posttype: 'link',
          canonicalUrl: user ? `https://wordbase.app/new/${user}\n\n(automated)` : 'https://wordbase.app\n\n(automated)',
          title: user ? 'Challenge me!' : 'Check out wordbase.app!',
        }).toString()} onClick={e => {
          user && api.post('wordbase/i/new', { enable: true })
         }}>Tumblr</a>  */}
        &nbsp;&nbsp; <a href={`mailto:?` + new URLSearchParams({
          body: user ? `https://wordbase.app/new/${challengeHash}\n\n(automated)` : 'https://wordbase.app\n\n(automated)',
          subject: user ? 'Challenge me!' : 'Check out wordbase.app!',
        }).toString()} onClick={e => {
          user && api.post('wordbase/i/new', { enable: true })
         }} target='_blank' rel='noreferrer'>email</a>
        {/* &nbsp;&nbsp; <Link to='/contact'>something else?</Link> */}
      </p>
      <p>
        Play IRL with Bananagram or Scrabble tiles or something I don't know
      </p>
      <br/>
      <br/>
      {/* <br/> */}
      <p className='support-links'>
        by <a href='https://twitter.com/__freshman'>
          @__freshman
        </a> – <A href='/coffee'>buy me a coffee</A>
        {/* &nbsp;(<a
        href={`https://twitter.com/messages/compose?recipient_id=1351728698614042626&text=${
          encodeURIComponent(`(wordbase.app) `)
          }`}>
          DM
        </a>) */}
        {/* &nbsp;&nbsp;(<A href="/coffee" frame>buy me a coffee</A>) */}
        {/* &nbsp; (<form action="https://www.paypal.com/donate" method="post" target="_top" style={{display:'inline-flex'}}><input type="hidden" name="business" value="64YZZ6TQ94E4E" /><input type="hidden" name="no_recurring" value="0" /><input type="hidden" name="currency_code" value="USD" /><input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif" name="submit" title="Donate with PayPal" alt="Donate with PayPal button" /></form>) */}
      </p>
      {/* <Sponsor dark={!theme.dark} /> */}
      <p>
        <A href='https://freshman.dev/raw/hot_wordbase'>hot_wordbase</A>
      </p>
      {/* <script src='https://storage.ko-fi.com/cdn/scripts/overlay-widget.js'></script>
      <script dangerouslySetInnerHTML={{__html:`
        kofiWidgetOverlay.draw('freshman_dev', {
          'type': 'floating-chat',
          'floating-chat.donateButton.text': 'tip',
          'floating-chat.donateButton.background-color': '#00b9fe',
          'floating-chat.donateButton.text-color': '#fff'
        });
      `}}>
      </script> */}

      {/* <p style={{
        textAlign: 'center',
      }}>
        ⭐ Supporters ⭐{'\n'}
        {cost?.supporters?.length
        ? cost.supporters?.map((c, i) =>
          <span key={i} style={{
            display: 'inline-block',
            background: theme[i%2?'blue':'orange'], color: theme.tile,
            margin: '0 .15rem', padding: '0 0.3rem', borderRadius: '0.2rem', lineHeight: '1.5rem',
          }}>{convertLinks(c)}</span>)
        : '(nothing here yet)'}
      </p> */}
      {/* {convertLinks(cost?.list.length ? cost.list.map(c => c.name).join(' ⭐ ') : '(nothing here yet)')} */}
    </div>

    {
    1 ? '' :
    <p>
      {/* Progress for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} */}
      {cost ? <div style={{height: '2rem'}}>
        <GameProgress info={{
          id: '', status: (cost?.sum || 0) > 11 ? 1 : -1, turn: 1,
          // p2: `${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} $${cost.sum}`,
          // p1: '$11',
          p2: `${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
          // p2: 'support',
          p1: `$${cost?.sum??0}/$11`,
          progress: [(cost?.sum??0) / 11 * 100, 100],
        }} open={() => window.open('https://ko-fi.com/freshman_dev', '_blank')} />
      </div> : ''}
      {/* <div style={{
        background: cost ? `linear-gradient(90deg, ${theme.orange} ${cost}%, ${theme.blue} ${info.progress[0]}% ${info.progress[1]}%, ${colors[1]} ${info.progress[1]}%)` : '',
      }}></div> */}
    </p>
    }
    {/* <iframe src='https://ko-fi.com/freshman_dev/?hidefeed=true&embed=true&preview=true' style='border:none;width:100%;padding:4px;background:#f9f9f9;' /> */}
    {/* <div style={{
      display: 'flex'
    }} dangerouslySetInnerHTML={{__html:`
    <iframe id='kofiframe' src='https://ko-fi.com/freshman_dev/?hidefeed=true&widget=true&embed=true&preview=true' style='border:none;width:100%;padding:4px;background:#f9f9f9;' height='712' title='freshman_dev'></iframe>
    `}}></div> */}
    {/* <div style={{
      display: 'flex',
      overflow: 'hidden',
    }} dangerouslySetInnerHTML={{__html:`
    <iframe id='kofiframe'
      src='https://ko-fi.com/freshman_dev/?hidefeed=true&widget=true&embed=true&preview=true#checkoutModal'
      style='border:none;width:100%;height:48rem;' title='freshman_dev'></iframe>
    `}}></div> */}
    </Style>
}
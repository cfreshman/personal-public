import html2canvas from 'html2canvas';
import React, { Fragment, Fragment as JSX, useState } from 'react';
import { download } from '../../lib/download';
import { trigger } from '../../lib/trigger';
import { pass } from '../../lib/types';
import styled from 'styled-components';
import { Chat } from '../../components/Chat';
import { HalfLine, InfoBody, InfoStyles } from '../../components/Info';
import { Modal } from '../../components/Modal';
import api from '../../lib/api';
import { auth, openLogin } from '../../lib/auth';
import console from '../../lib/console';
import { copy } from '../../lib/copy';
import { cleanTimeout, useCached, useE, useEventListener, useF, useI, useM, useR, useRerender, useStyle } from '../../lib/hooks';
import { useSubpath } from '../../lib/hooks_ext';
import { useSocket } from '../../lib/socket';
import { store } from '../../lib/store';
import url from '../../lib/url';
import user from '../../lib/user';
import { dist, end, isMobile, layerBackground, named_log, range, set, toStyle } from '../../lib/util';
import Settings, { Select, SettingStyles } from '../settings';
import { Board, Dirs, GameSettings, IPos, ITile, Player, Pos, Tile } from './board';
import { globals, SkipTypes, theme } from './common';
import { cachedSave, fetchGame, fetchInfo, local, rematchGame, updateGame } from './data';
import { dict, isValidWord, loadLang } from './dict';
import { drawProgress } from './draw';
import { GameProgress } from './progress';
import { Result } from './result';
import { Info, Save } from './save';
import { GameSettingsModal } from './settings';
import { tutorial } from './tutorial';

const log = named_log('wordbase-game')
const designMinefield = false

// mapping from tile to parent
const graph = {
  from: {} as {[key:string]:ITile[]},
  to: {} as {[key:string]:ITile},
  path: {} as {[key:string]:string[]},
}
let prev_graph = JSON.duplicate(graph)

let tilePx = 50;
const playerClass = ['p1', 'p2'];
let startTile: ITile;
let lastTouch: IPos;
let lastStart: IPos;
let cancelEnd: IPos;
const tile_disconnects = {}
const tile_owner = {}
const TileElem = ({tile, word, play, handle, turn, localFlip, progressRenderTarget, delay}: {
  tile: ITile, hash: string, word: ITile[], play: boolean, handle: any, turn: number, localFlip?: boolean, progressRenderTarget?, delay: any
}) => {

  const isAdjToWordLast = useM(word?.slice(-1)[0], () => Tile.isAdj(word.slice(-1)[0], tile))

  const [flip, setFlip] = useState(false);
  const [swapped, setSwapped] = useState(false);
  const [shocked, setShocked] = useState<string | boolean>(false);
  const [settings] = user.settings.use()

  const wordIndex = word.findIndex(t => Tile.eq(t, tile))
  const wordEl = wordIndex >= 0 ? word[wordIndex] : undefined
  // const selected = !(swapped && (play && tile.swap?.new)) && (!tile.swap || !tile.swap.new || !swapped) && wordEl
  const selected = wordEl && !(swapped && (play || tile.swap?.new))
  const active = selected && wordIndex === word.length - 1

  const [disconnected, setDisconnected] = useState(false)
  useF(tile.swap, swapped, selected, () => setDisconnected(false))
  // tile_triggers.use(Tile.hash(tile), () => {
  //   console.debug('disconnected', Tile.hash(tile))
  //   setDisconnected(true)
  // })
  // tile_triggers.use(Tile.hash(tile), { add: () => setDisconnected(true) })
  const visual = tile.swap?.new && !swapped ? tile.swap.from : tile;
  const visual_graph = !disconnected && tile.swap?.new && !swapped ? prev_graph : graph
  let owner = visual.owner
  tile_owner[Pos.hash(tile)] = tile.owner
  tile_disconnects[Pos.hash(tile)] = owner => setDisconnected(tile.owner !== owner)

  if (wordEl) {
    owner = play ? 1 - turn : turn
    // console.debug(owner, wordEl)
  }

  const tileRef = useR<HTMLElement>()
  // useSkip(useF, play, () => {
  //   if (play) {
  //     if (tile.swap) tile.swap = Object.assign({}, tile.swap, { new: true })
  //     if (tile.shocks) tile.shocks = tile.shocks.slice()
  //   }
  // })
  const last = useM(tile.swap, () => {
    // if (tile.swap) console.debug('TILE LAST', tile.swap, tile.owner, (turn + 1) % 2, tile)
    return tile.swap && tile.owner === (turn + 1) % 2
  })
  const bombPlay = useM(tile.swap, () => {
    return tile.swap && !!tile.swap.from.isBomb
  })
  const [bombWait, setBombWait] = useState(false)
  useF(tile.swap, () => setBombWait(bombPlay))
  useF(shocked, () => {
      const shock = tile?.shocks?.find(x => x[0] === shocked)
      // if (shock && tile.swap?.from) console.debug(tile.swap?.from, shock[2])
      // if (typeof(shocked) === 'string' && shock && tile.swap?.from && Tile.eq(shock[2], tile)) setTimeout(() => setBombWait(false), globals.shockMs/2)
      if (typeof(shocked) === 'string' && shock && tile.swap?.from && Tile.eq(shock[2], tile)) setBombWait(false)
  })
  const bombFlip = useM(tile.swap, () => {
    return tile.swap && tile.shocks?.length && tile.swap.ms >= tile.shocks[0][1]
  })
  useE(play, tile.swap, () => {
    setFlip(false)
    if (play && tile.swap) {
      setSwapped(false)
      let timeout
      timeout = setTimeout(() => {
        if (!tile.swap) return
        tile.swap.new = false
        // tile.isBomb = tile.swap.from.isBomb
        const shockFlip = tile.shocks?.find(([type, shockMs]) => Math.abs(tile.swap.ms - shockMs) < globals.flipMs)
        if (!shockFlip) setFlip(true)
        progressRenderTarget.dispatchEvent(new Event('update'))

        // disconnect other's tiles TODO move somewhere else
        if (tile.swap.from.owner === 1 - tile.owner) {
          // console.debug('disconnect', Tile.hash(tile), [...prev_graph.from[Tile.hash(tile)]||[]])
          const disconnects = new Set<string>()

          // const remove = prev_graph.from[Tile.hash(tile)]
          // while (remove?.length) {
          //   const node = remove.pop()
          //   console.debug(Tile.hash(node), prev_graph.from[Tile.hash(node)]?.map(Tile.hash))
          //   disconnects.add(Pos.hash(node))
          //   prev_graph.from[Tile.hash(node)]?.forEach(x => remove.push(x))
          // }

          const connected = new Set(Object.values(graph.from).flatMap(pass).filter(x => x.owner === 1 - tile.owner).map(Tile.hash))
          const remove = prev_graph.from[Tile.hash(tile)]
          while (remove?.length) {
            const node = remove.pop()
            connected.delete(Tile.hash(node))
            disconnects.add(Pos.hash(node))
            prev_graph.from[Tile.hash(node)]?.forEach(x => !disconnects.has(Pos.hash(x)) && remove.push(x))
          }

          const frontier = [...Object.values(graph.from).flatMap(pass).filter(x => connected.has(x))||[]]
          console.debug('frontier', frontier?.slice())
          const resolve = [...connected]
          while (resolve.length) {
            const from = (
              graph.from[resolve.pop()]||[]
            ).filter(x => !connected.has(Tile.hash(x)) && x.owner !== tile.owner)
            frontier.push(...from)
            from.forEach(x => connected.add(Tile.hash(x)))
            resolve.push(...from.map(Tile.hash))
          }

          // then BFS remaining tiles to form edges
          while (frontier.length) {
            const current = frontier.pop()
            Pos.adj(current).forEach(tile => {
              const hash = Tile.hash(tile)
              if (!connected.has(hash) && disconnects.has(Pos.hash(tile))) {
                disconnects.delete(Pos.hash(tile))
                graph.to[hash] = current
                graph.path[hash] = (graph.path[Tile.hash(current)] || []).concat([Tile.hash(current)])
                graph.from[Tile.hash(current)] = (graph.from[Tile.hash(current)] || []).concat([tile])
                frontier.push(tile)
                connected.add(hash)
              }
            })
          }
          
          // disconnect remaining
          disconnects.forEach(x => tile_disconnects[x](tile.owner))
        }

        // const remove = prev_graph.from[Tile.hash(tile)]?.slice() || []
        // const disconnects = new Set<string>()
        // while (remove[0]) {
        //   const node = remove.pop()
        //   console.debug(node)
        //   // if (tile_owner[Pos.hash(node)] !== tile.owner) {
        //   // const to = prev_graph.to[Pos.hash(node)]
        //   // if (!to || (prev_graph.from[Tile.hash(to)].includes(node) && tile_owner[Pos.hash(node)] !== tile.owner)) {
        //     // delete graph.to[Tile.hash(node)]
        //     prev_graph.from[Tile.hash(node)]?.forEach(t => !disconnects.has(Pos.hash(t)) && remove.push(t))
        //     disconnects.add(Pos.hash(node))
        //   // }
        // }
        // const frontier = Object.values(prev_graph.from).flatMap(pass).filter(x => x.owner !== tile.owner && !disconnects.has(x))
        // const connected = new Set(frontier.map(Pos.hash))
        // console.debug('before', [...connected])
        // while (frontier.length) {
        //   const node = frontier.pop()
        //   Pos.adj(node)
        //     .filter(x => !connected.has(Pos.hash(x)) && disconnects.has(Pos.hash(x)))
        //     .forEach(x => {
        //       connected.add(Pos.hash(x))
        //       disconnects.delete(Pos.hash(x))
        //     })
        // }
        // console.debug('after', [...connected])
        // const remove = prev_graph.from[Tile.hash(tile)]
        // remove?.forEach(node => {
        //   if (node.owner !== tile.owner && graph.to[Tile.hash(node)] && Tile.eq(graph.to[Tile.hash(node)], tile)) {
        //     // delete graph.to[node]
        //     // delete graph.path[node]
        //     tile_disconnects[Pos.hash(node)](tile.owner)
        //   }
        // })
        // disconnects.forEach(x => tile_disconnects[x](tile.owner))

        // prev_graph.from[Tile.hash(tile)]?.forEach(t => tile_triggers.trigger(Tile.hash(t)))

        timeout = setTimeout(() => {
          setSwapped(true)
          timeout = setTimeout(() => {
            setFlip(false)
            if (tile.swap.isLast) {
              progressRenderTarget.dispatchEvent(new Event('complete'))
              handle.clear()
              // if (!tile.shocks) handle.setPlay(false)
            }
          }, globals.flipMs/3)
        }, globals.flipMs*2/3);
        // clearTimeout(timeout)
      }, globals.delayMs + tile.swap.ms + delay.current);
      return () => {
        timeout && clearTimeout(timeout)
      }
    } else {
      if (tile.swap) tile.swap.new = false
      setSwapped(false)
      setFlip(false)
    }
  });
  const [anim, setAnim] = useState(false)
  useE(play, tile.shocks, () => {
    setShocked(false)
    if (play && tile.shocks) {
      const timeouts = []
      // if (tile.shocks.some(s => s[0] !== 'shock')) setAnim(true)
      tile.shocks.forEach(([type, shockMs], i, arr) => {
        timeouts.push(setTimeout(() => {
          if (type !== 'shock') setAnim(true)
          tileRef.current?.classList.add(...type.split(' '))
          setShocked(type)
          timeouts.push(setTimeout(() => {
            tileRef.current?.classList.remove(...type.split(' '))
            setShocked(false)
            // if (i === arr.length-1) handle.setPlay(false)
            if (i === arr.length-1) setTimeout(() => setAnim(false))
          }, globals.shockMs * 3/2))
        }, globals.delayMs + shockMs + delay.current))//+ globals.flipMs
      })
      // timeouts.push(setTimeout(
      //   () => setAnim(false),
      //   tile.shocks.at(-1)[1] + globals.delayMs + delay.current + globals.shockMs))
      return () => {
        timeouts.forEach(clearTimeout)
        setAnim(false)
      }
    }
  });
  let filter
  let background
  let opacity = theme.name === 'nodes' && !wordEl && !(play && owner !== turn) && owner !== Player.none ? (.5 + .5 / Math.pow(visual_graph.path[Tile.hash(tile)]?.length || 1, 1/3)) : undefined
  if (wordEl && !swapped && !theme.pieces && (theme.colorShift ?? true)) {
    // const f = wordIndex
    const f = (1 - 2 / (wordIndex + 2))*.8 + .2 // .2 -> 1
    if (theme.alt) {
      filter = `
      brightness(${1 + .05 * (f + 2)})
      saturate(${Math.pow(.95, (f + 2)) * 100}%)
      `//saturate(${90 * (f + 2)}%)
      // background = layerBackground(
      //   '#ffffff',
      //   turn === (play ? Player.p2 : Player.p1) ? theme.blue_9 : theme.orange_9)
    } else {
      if (turn === (play ? Player.p2 : Player.p1)) {
        filter = `
        brightness(${1 + .3 * f})
        hue-rotate(${-2 / Math.pow(.9, (f + 1))}deg)
        saturate(${Math.pow(.9, (f + 1)) * 100}%)
        `
      } else {
        filter = `
        brightness(${1 + .5 * f})
        hue-rotate(${Math.min(3, 1 / Math.pow(.95, (f + 1)))}deg)
        `
      }
    }
  }

  const touchFunc = (e, func: (_: Pos) => any) => {
    e.preventDefault();
    const touch = e.touches[0];
    const refRect = (touch.target as Element).getBoundingClientRect();
    const row = tile.row + (touch.clientY - refRect.y)/refRect.height;
    let col = tile.col + (touch.clientX - refRect.x)/refRect.width;
    if (localFlip) col = tile.col + 1 - (col - tile.col)
    if (dist(.5, .5, row % 1, col % 1) <= .45) {
      const pos = { row: Math.floor(row), col: Math.floor(col) };
      Pos.eq(lastTouch, pos) || func(pos);
      lastTouch = pos;
    }
  }

  // const visual = (tile.swap && (tile.swap.new ? true : !swapped)) ? tile.swap.from : tile;
  // const visual = tile.swap ? tile.swap.from : tile;
  const from = (swapped || wordEl) ? tile : tile.swap?.from || tile
  // const ignoreInteractions = selected && !tile.letter
  const ignoreInteractions = false
  // const
  const selectRef = useR()
  const hoverInteractions = {
    onPointerOver: () => {
      // console.debug('HOVER', tile.letter)
      handle.hover(tile)
    },
    onTouchMove: e => touchFunc(e, handle.hover),
    onScroll: e => e.preventDefault(),
  }
  const tileLetter = <>
    <span className='tile-letter'>{tile.letter || tile.blankLetter}</span>
    {theme.name === 'scrabble'
    ? <span className='tile-value'>
      {theme.letterValues[tile.letter || tile.blankLetter]}
    </span>
    : ''}
  </>
  const colorRotate = useM(
    () => `color-rotate-${((tile.row * 31 + tile.col * 37)%4) * 90}`)
  // if (typeof(shocked) === 'string' && shocked.includes('-')) console.debug(tile.letter, shocked, tile)
  // if (Tile.eq(tile, { row: 0, col: 0 })) console.debug(dict, dict.letters)
  return (<div ref={tileRef}
    onPointerDown={() => {
      if (ignoreInteractions) return
      startTile = tile;
      designMinefield
      ? handle.toggleBomb(tile)
      : tile.letter
      ? handle.select(tile)
      : 0
    }}
    onPointerUp={() => {
      if (ignoreInteractions) return
      if (!isMobile && !settings.wordbase.desktopDrag) {
        if (Pos.eq(lastStart, tile)) {
          cancelEnd = tile
          lastStart = undefined
        } else {
          cancelEnd = undefined
          lastStart = tile
        }
        handle.unselect(!Pos.eq(tile, cancelEnd))
      } else if (!Tile.eq(startTile, tile)) {
        handle.unselect();
      }
    }}
    onTouchStart={() => {
      if (ignoreInteractions) return
      if (Pos.eq(lastStart, tile)) {
        cancelEnd = tile
        lastStart = undefined
      } else {
        cancelEnd = undefined
        lastStart = tile
      }
    }}
    onTouchEnd={() => {
      if (ignoreInteractions) return
      handle.unselect(!Pos.eq(tile, cancelEnd))
    }}
    className={[
      'tile',
      `flip-box-${!!(anim || shocked || flip)}`,
      `pointer-${isAdjToWordLast || tile.owner === turn}`,
      playerClass[owner] || 'none',
      `to-${playerClass[tile.owner] || 'none'}`,
      `from-${playerClass[tile.swap?.from.owner ?? tile.owner] || 'none'}`,
      ...Dirs.LIST.map(x => `adj-${[Pos.angle(x)]}-${tile_owner[Pos.hash(Pos.add(x, tile))] === tile.owner}`),
      (tile.swap?.from ?? tile).isBomb ? `from-bomb` : '',
      (tile.swap?.from ?? tile).isBomb === 2 ? `from-superbomb` : '',
      visual.isBomb ? 'bomb' : '',
      visual.isBomb === 2 ? 'superbomb' : '',
      selected ? 'selected' : '',
      active ? 'active' : '',
      flip ? `flip flip-${tile.swap?.degrees ?? 'old'}` : '',
      `bomb-flip-${bombFlip}`, `bomb-play-${bombPlay}`, `bomb-wait-${bombWait}`,
      shocked ? `shock ${shocked}` : '',
      `swapped-${!!swapped}`,
      `blank-${!tile.letter}`,
      `played-${!!(tile.swap && swapped && ((wordEl && play) || !word.length) && tile.owner !== Player.none)}`,
      `last-${!!(wordEl || (last && !word.length && (!play || swapped)))}`,
      `disconnected-${disconnected}`,
      // !disconnected
      // && 
      owner !== Player.none 
      && visual_graph.to[Tile.hash(visual)]
      && (
        Math.abs(6 - tile.row) !== 6
        || Math.abs(6 - (visual_graph.to[Tile.hash(visual)]?.row ?? 6)) !== 6)
      // && !(play && bombFlip && !swapped) && (!play || !wordEl || swapped)
      ? `edge edge-${Pos.angle(Tile.diff(visual_graph.to[Tile.hash(visual)], visual))}` : '',
      flip ? `flip-${tile.owner === Player.none ? 'off' : 'on'} flip-${tile.owner || 'none'}` : '',
      (theme.pieces && tile.owner !== Player.none) ? `no-flip` : '',
      `cost-${visual_graph.path[Tile.hash(tile)]?.length ?? 'na'}`,
      ].join(' ')}
    style={theme.pieces ? {
      borderWidth: `${Math.ceil(tilePx / 50)}px`,
      zIndex: tile.row,
    } : undefined}>

    {anim || shocked || flip
    ? <>
      <div className="flip-box-inner" style={{ zIndex: tile.row + '9999' }}>
        <div className={`flip-box-front
          color color-${from.owner} ${colorRotate}
          bomb-${!!from.isBomb} superbomb-${from.isBomb === 2}`}>
          <div className={`
          color color-${from.owner} ${colorRotate}
          bomb-${!!from.isBomb} superbomb-${from.isBomb === 2}`}
          style={{ background, filter, opacity }} />
          {tileLetter}
          {/* <div
          className={`color
          color-${wordEl ? owner : from.owner} ${colorRotate}
          bomb-${!!from.isBomb} superbomb-${from.isBomb === 2}`}
          style={{ background, filter }}
          /> */}
        </div>
        <div className={`flip-box-back
          color color-${tile.owner} ${colorRotate}
          bomb-${!!tile.isBomb} superbomb-${tile.isBomb === 2}`}>
          <div className={`
          color color-${tile.owner} ${colorRotate}
          bomb-${!!tile.isBomb} superbomb-${tile.isBomb === 2}`}
          style={{ background, filter, opacity }} />
          {tileLetter}
        </div>
      </div>

      <div
        className='hover-target'
        onPointerOver={() => {
          console.debug('here')
          handle.hover(tile)
        }}
        onTouchMove={e => touchFunc(e, handle.hover)}
        onScroll={e => e.preventDefault()} />
    </>
    : <>
      <div
        className={`color ${colorRotate}`}
        style={{ background, filter, opacity }}
        // style={{ filter }}
        />
      {/* keeping default single element version for performance */}
      {tile.letter
      ? <>
        {tileLetter}
        <div
          className='hover-target'
          {...hoverInteractions} />
      </>
      :
      <Select ref={selectRef} className='tile-letter'
        value={tile.blankLetter}
        options={dict.letters}
        display={x => x?.toLocaleUpperCase()}
        onChange={e => {
          handle.setBlank(tile, e.target?.value)
          e.target?.blur && e.target?.blur()
          console.debug(active, selected)
          if (active) { // if last letter, select tile to allow for ending at blank tile
            handle.unselect(tile)
          } else if (!selected) { // allow for selecting
            handle.select(tile)
          }
        }}
        {...hoverInteractions}
      />}
    </>}
  </div>)
}


const Row = ({row, hash, word, play, handle, turn, localFlip, progressRenderTarget, delay}) => {
  return (<div className='board-row' style={{
    height: `${tilePx}px`,
    fontSize: `${tilePx}px`,
  }}>
    {(row as ITile[]).map((tile, i) =>
    <TileElem key={i} {...{ tile, hash, word, play, handle, turn, localFlip, progressRenderTarget, delay }} />)}
  </div>)
}

const BoardElem = ({
  info, save, word, play, localFlip, progressRenderTarget, delay, handle
}: { info:Info, save:Save, word, play, localFlip, progressRenderTarget, delay, handle }) => {
  const [settings] = user.settings.use()
  const [{ user:viewer }] = auth.use()

  const playFrom = settings.wordbase.playFrom
  let viewReorder = (
    viewer === info.p2 && playFrom === 'bottom'
    || viewer === info.p1 && playFrom === 'top'
  )
  ? x => x.slice().reverse()
  : x => x

  return <div className={[
    'board',
    save.pN,
    play ? 'play' : '',
    play || info.status !== Player.none ? `active-${save.oN}` : `active-${save.pN}`,
    // (play ? !save.p1 : save.p1) ? 'p1' : 'p2',
    // save.p1 ? 'p1' : 'p2',
    save?.board ? '' : 'loading'].join(' ')}
    style={{
      // borderWidth: `${Math.ceil(tilePx / 30)}px`,
    }}>

    {save?.board && viewReorder(save?.board?.board).map((row, i) =>
    <Row key={i} {...{
      row, hash: info?.id, word, play, handle, turn: info?.turn%2,
      localFlip: localFlip,
      progressRenderTarget, delay,
    }}/>
    )[localFlip ? 'reverse' : 'slice']() || ''}
  </div>
}

// Object.assign(window, { wordbaseSettings: globals });
let cancelReplay = false, pauseReplay = false, actualSave, actualInfo, errorTimeout, timeoutTimeout
export const WordbaseGame = ({
  open, info: outerInfo, reload, setInfo: outerSetInfo, dual, gameClosed, setModal, loaded: outerLoaded
}: {
  open, info: Info, reload, setInfo, dual?, gameClosed?: boolean, setModal, loaded
}) => {
  if (!outerInfo) outerInfo = Info.empty('unloaded')
  let [info, setInfo] = useState(outerInfo)
  let [save, setSave] = useState(Save.empty(info))
  // useF(info, () => !replay && (
  //   outerInfo.id !== info.id
  //   || outerInfo.turn !== info.turn
  //   || outerInfo.status !== info.status
  //   ) && outerSetInfo(info))
  useF(outerInfo, () => outerInfo.id !== 'unloaded' && setInfo(Object.assign({}, outerInfo)))

  const currInfo = useR(info)
  const currInfoSave = useR()
  const currSaveId = useR()

  // TODO figure out best way to present cached saves
  // useI(save, () => {
  //   if (currId.current !== currSaveId.current) {
  //     save = cachedSave(info)
  //   }
  // })
  const [loaded, setLoaded] = useState<string | boolean>(false);
  const [selected, setSelected] = useState(false);
  const [word, setWord]: [ITile[], any] = useState([]);
  const [error, setError] = useState<string | { includes? }>('')
  const [overlay, setOverlay] = useState(false);
  const _setModal = setModal
  setModal = x => { setOverlay(false); _setModal(x) }
  const [unread, setUnread] = useState(0);
  // const [play, setPlay] = useState(undefined)

  const parseReplay = () => {
    let replay = info.id !== 'unloaded' && /replay/.test(location.pathname)
    if (replay) {
      const turnSearchParam = new URLSearchParams(location.search).get('turn')
      if (turnSearchParam) replay = JSON.parse(turnSearchParam)
    }
    return replay
  }
  const [replay, _setReplay] = useState<number | boolean>(parseReplay())
  url.use(path => _setReplay(parseReplay()))
  const setReplay = replay => open(info.id, false, false, replay)
  useF(replay, () => {
    console.debug('WORDBASE set replay', replay)
    // const replayUrl = location.pathname.replace(/[/?]?replay.*/, '/')
    //   + (replay ? '/replay'+info.id : '')
    //   + (typeof replay === 'number' ? `?turn=${replay < 0 ? info.turn : replay}` : '')
    //   + location.hash
    // console.debug('SET REPLAY URL', replay, location.pathname, info.id)
    // url.replace(replayUrl)
  })

  const replayable = true
  const isSpectator = ![info.p1, info.p2].includes(auth.user)
  const [settings] = user.settings.use()
  info = info ?? Info.empty()
  info.lang = info.lang ?? 'english'
  useF(info.lang, () => loadLang(info.lang))
  const showButtons = !settings.wordbase.hideButtons
  const setShowButtons = showButtons => {
    user.settings.update('wordbase.hideButtons', !showButtons)
  }
  // useF(settings, overlay, () => setShowButtons(overlay && !hideButtons))
  const [contest, setContest] = useState('')
  useF(info, save, () => {
    if (!replay) {
      if (info && info !== actualInfo) actualInfo = Object.clone(info)
      if (save && save !== actualSave) actualSave = save?.deep()
    }
  })
  // useF(outerReplay, !save.board,
  //   () => outerReplay && !replay && save.board && setReplay(outerReplay))
  // const outerReplayRef = useR(outerReplay)
  // useF(outerReplay, () => outerReplayRef.current = outerReplay)

  const confirm = info.confirm?.filter(c => c.turn === info.turn)[0]
  // const confirmAction = confirm && ![Info.ConfirmType.ACCEPT, Info.ConfirmType.REJECT].includes(confirm.type) && confirm

  const isLocal = info.id === local.info.id;
  const play = save.turn && save._play
  useE(play, save, () => {
    if (play && save.board) {
      const maxAnimMs = Math.max(...save.board.tiles().flatMap(t => {
        if (t.shocks) return t.shocks.map(([type, ms]) =>
          ms + globals.delayMs + delay.current + globals.flipMs)
        if (t.swap) return [
          t.swap.ms + globals.delayMs + delay.current + globals.shockMs*2]
        return [0]
      }))
      return cleanTimeout(() => handle.setPlay(false), maxAnimMs + globals.delayMs)
    }
  })
  const turn_1 = set('invite blue orange')
  const isTurn = !replay && (info.turn < 1 || !play) && info.status === Player.none &&
    (isLocal
      || ((!info.p1 || turn_1.has(info.p1)) && auth.user !== info.p2)
      || auth.user === (save.p1 ? info.p1 || 'orange' : info.p2 || 'blue'));
  const canPlay = isTurn && !confirm
  log('can play', canPlay, 'is turn', isTurn, {replay,turn:info.turn,play,status:info.status,isLocal})

  const socket = useSocket()

  const handle = {
    rerender: useRerender(),
    // setPlay,
    setPlay: (_play, _save=save, override=false) => {
      console.debug('WB PLAY', _play)
      if (!override && (info.id !== currInfo.current?.id || !_save)) return
      if (_play) {
        // let anySwap = false
        _save.board?.do(tile => {
          if (tile.swap) {
            tile.swap = Object.assign({}, tile.swap, { new: true })
            // anySwap = true
          }
          if (tile.shocks) {
            tile.shocks = [...tile.shocks]
          }
        })
        // info.progress = _save.board?.progress(true)
        // if (anySwap) setPlay(true)
      } else {
        setWord([])
      }
      _save = Object.assign(_save.deep(), { _play: _play && {} })
      currInfoSave.current = _save
      setSave(_save)
      return _save
    },
    check: () => {
      fetchInfo(info.id).then(data => {
        if (info.turn < data.info.turn || info.status !== data.info.status) {
          // console.log('fetch board', data);
          handle.fetch()
        }
      });
    },
    fetch: (loadInfo=info) => {
      loadInfo = loadInfo?.id ? loadInfo : currInfo.current
      if (loadInfo.id === 'unloaded') return
      setLoaded(false)
      currInfo.current = loadInfo
      currInfoSave.current = undefined
      console.debug('WB FETCH', loadInfo.id)
      fetchGame(loadInfo.id).then(data => {
        if (loadInfo.id === currInfo.current.id) {
          console.debug('WB FETCHED', loadInfo.id, data)
          if (data.redirect) return url.push(data.redirect)
          actualSave = data.save
          actualInfo = data.info

          if (!replay) {
            // check deep equality for save to avoid unnecessary play animations
            handle.setPlay(
              play || currSaveId.current !== data.info?.id || save?.turn !== data.save?.turn,
              data.save)
            outerSetInfo(data.info)
          }
          currInfoSave.current = data.save
          currSaveId.current = info.id
          setLoaded(auth.user || true)
          setTimeout(() => outerLoaded(true))
        }
      })
    },
    send: (info: Info, save: Save) => {
      updateGame(info, save).then(({ info, save }) => {
        if (info) {
          // setSave(save)
          handle.setPlay(true, save)
          info.progress = save.board.progress(true)
          outerSetInfo(info)
          // handle.clear()
        }
      })
      setSave(save)
      info.progress = save.board.progress(true)
      outerSetInfo(info)
    },
    select: (pos: Pos) => {
      if (!canPlay) return;
      const tile: ITile = save.board.get(pos);
      const wordIndex = word.indexOf(word.find(t => Tile.eq(t, tile)));
      if (selected) {
        handle.unselect();
      } else if (wordIndex > -1) {
        setWord(word.slice(0, wordIndex + 1));
        setSelected(true);
      } else if (word.length > 0 && save.board.adj(tile).includes(word[word.length-1])) {
        setWord(word.concat(tile))
        setSelected(true)
      } else if (tile.owner === save.player) {
        setWord([tile]);
        setSelected(true);
        // const plays = ai._search([tile], save.board, [...getDict()])
        // plays.sort((a, b) => b.length - a.length)
        // const words = plays.map(tiles => tiles.map(tile => tile.letter).join(''))
        // console.log(words)
      }
    },
    unselect: (keepSingle=false) => {
      setSelected(false);
      if (word.length === 1 && !keepSingle) {
        setWord([]);
        // console.log(ai.play(save.board, save.player, save.history))
      }
    },
    hover: (pos: Pos) => {
      const canHover = save.board.get(pos) && selected && word.length > 0;
      if (!canPlay || !canHover) return;

      if (Tile.eq(end(word, 2), pos)) {
        setWord(word.slice(0, word.length - 1));
      } else {
        const curr = word.slice(-1)[0];
        if (Tile.isAdj(curr, pos)) {
          const tile = save.board.get(pos);
          if (!Tile.has(word, tile)) {
            setWord(word.concat(tile));
          }
        }
      }
    },
    clear: () => {
      setWord([]);
      setSelected(false);
    },
    submit: () => {
      const letters = word.map(tile => tile.letter || tile.blankLetter || '?').join('')
      if (!letters) return
      if (letters.includes('?')) return setError('select blanks')
      const callback = ({ tries, isValid }) => {
        if (!isValid) {
          console.debug(`${letters} not in dict`);
          const tryLimit = info.settings?.options?.tries || 3
          const triesLeft = tryLimit - tries
          setError(tryLimit > 0
            ? `not a word, ${Math.max(0, triesLeft)} ${triesLeft === 1 ? 'try' : 'tries'} left`
            : `not a word`);
          setContest(letters)
          if (!triesLeft) {
            setTimeout(() => {
              const newSave = save.skip();
              const newInfo = Info.skip(info, newSave);
              handle.send(newInfo, newSave)
              handle.clear()
            }, 1000)
          }
          return;
        }

        // alreadyPlayed depends on info.settings.options.repeatWithDifferentTiles
        let alreadyPlayed
        if (info.settings?.options?.repeatWithDifferentTiles) {
          // allow repeats with different tiles, check for same tiles used
          alreadyPlayed = save.history.some(played =>
            played.length === word.length && played.every((t, i) =>
              Tile.eq(t, word[i])));
        } else {
          // don't allow any repeat words
          alreadyPlayed = save.history.some(played =>
            played.length === word.length
            && played.every((t, i) => t.letter === word[i].letter));
        }
        if (alreadyPlayed) {
          console.debug(`${letters} already played`);
          setError('already played')
          return;
        }

        // setPlay(true)
        const newSave = save.play(word);
        const newInfo = Info.play(info, newSave);
        newSave._play = true
        handle.send(newInfo, newSave);

        socket?.emit('wordbase:alerts') // to show server messages after play
        // handle.clear()
        // setTimeout(() => handle.clear(), 1000);
      }
      if (info.settings?.options.tries === GameSettings.TryLimit.challenge) {
        callback({ isValid: true, tries: info.tries })
      } else if (isLocal || ['danish'].includes(settings?.wordbase.language)) {
        const isValid = isValidWord(letters, info.lang) && globals.wordCheck
        if (!isValid) {
          info.tries = (info.tries || 0) + 1
          // updateGame(info, save)
          handle.send(info, save)
        }
        callback({ isValid, tries: info.tries })
      } else {
        api.post(`/wordbase/g/${info.id}/check`, { word: letters }).then(callback)
      }
    },
    challenge: () => {
      // challenge the previous play
      // if valid, skip turn
      // if invalid, undo opponent's play and replace with skip
      const callback = ({ isValid }) => {
        if (!isValid) {
          setError('challenge succeeded: not a word')
          // setTimeout(() => {
            const { replayInfo, replaySave } = Info.replay(info, save, info.turn - 1)
            replayInfo.timePerPlayer = info.timePerPlayer
            const newSave = replaySave.skip()
            const newInfo = Info.skip(replayInfo, newSave)
            handle.send(newInfo, newSave)
          // }, 1000)
          return;
        } else {
          setError('challenge failed: confirmed word')
          // setTimeout(() => {
            const newSave = save.skip()
            const newInfo = Info.skip(info, newSave)
            handle.send(newInfo, newSave)
          // }, 1000)
        }
      }

      if (isLocal) {
        const isValid = isValidWord(info.lastWord, info.lang)
        callback({ isValid })
      } else {
        api.post(`/wordbase/g/${info.id}/check`, { word: info.lastWord }).then(callback)
      }
    },
    confirm: (type: Info.ConfirmType, value?: any) => {
      setWord([])
      setModal(false)
      handle.send(Info.confirm(info, type, value), save.skip())
    },
    timeout: () => {
      clearTimeout(timeoutTimeout)
      const { timeout, remainingTime, timeForMove, timePerPlayer } = Info.getRemainingTime(info)
      // console.debug('TIMEOUT', timeout, timePerPlayer, timeForMove, remainingTime)
      if (timeout) {
        setWord([])
        setModal(false)
        handle.send(Info.timeout(info, timePerPlayer), save.skip())
      } else if (remainingTime < 1e8) {
        timeoutTimeout = setTimeout(handle.timeout, remainingTime * 1000 + (canPlay ? 0 : 60))
      }
    },
    rematch: () => {
      rematchGame(info).then(({info}) => {
        console.debug('REMATCH', info.id)
        open(info.id, false)
      });
    },
    keypress: (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Escape': handle.clear(); break;
        case 'Enter': handle.submit(); break;
      }
    },
    resize: () => {
      const board: HTMLElement = document.querySelector('.board');
      if (!board) return
      const container = board.parentElement
      const ratio = save?.board?.board 
      ? save.board.board.length / save.board.board[0].length
      : Board.ROWS / Board.COLS;
      console.debug(container, ratio)
      const height = Math.min(container.clientHeight, container.clientWidth * ratio);
      const width = Math.min(container.clientWidth, container.clientHeight / ratio);
      board.style.width = width + 'px';
      board.style.height = height + 'px';
      tilePx = height / (save?.board?.board?.length || Board.ROWS);
      // handle.rerender()
    },
    replay: () => { // TODO this was done quickly - clean up
      console.debug('REPLAY', replay)
      // if (!(actualSave?.board && actualSave?.history)) return setTimeout(() => {
      //   setReplay(false)
      //   setTimeout(() => setReplay(replay))
      // }, 500)
      // setPlay(replay)
      cancelReplay = !replay
      console.debug('replay', replay, cancelReplay, pauseReplay)
      if (pauseReplay || replay === -1) {
        // ignore, continue current play animation
        pauseReplay = replay === -1
      } else if (replay) {
        handle.clear()
        let { replayInfo, replaySave } = Info.replay(actualInfo, actualSave, replay)

        const currReplayTurn = info.turn === replayInfo.turn
          ? info.turn
          : info.turn < actualInfo.turn ? info.turn : 0
        console.debug('REPLAY FROM', currReplayTurn, 'TO', replayInfo.turn, 'OF', actualInfo.turn)
        if (replay === true) {
          if (!currReplayTurn) {
            outerSetInfo(JSON.parse(JSON.stringify(replayInfo)))
            handle.setPlay(true, Save.deserialize(replaySave.serialize()))
          }
          const clearReplay = (turn=undefined) => {
            console.debug('CLEAR/PAUSE REPLAY', turn)
            historyTimeouts.forEach(clearTimeout)
            setReplay(turn ?? false)
          }
          let waitMs = 2 * globals.flipMs
          console.debug(actualSave.history.slice(1).reverse().map((w, t) => t))
          const historyTimeouts = actualSave.history.slice().reverse().map((word, turn_minus_1) => {
            replaySave = replaySave.play(word)
            const turn = turn_minus_1 + 1
            if (turn - 1 < currReplayTurn) {
              console.debug('SKIP', turn)
              return // if in middle of replay, skip to current turn
            }
            console.debug('RECREATE TURN', turn)
            const deepCopy = Save.deserialize(replaySave.serialize())
            const timeout = setTimeout(() => {
              if (cancelReplay) return clearReplay()
              if (pauseReplay) return clearReplay(turn_minus_1)
              replayInfo = Info.play(replayInfo, deepCopy)
              handle.setPlay(true, deepCopy)
              outerSetInfo(JSON.parse(JSON.stringify(replayInfo)))
              if (replayInfo.turn === actualInfo.turn) setReplay(replayInfo.turn) // pause at end
            }, waitMs)
            waitMs += 4 * globals.flipMs
              + Math.max(...
                deepCopy.board.tiles().map(t =>
                  Math.max(t.swap?.ms || 0, ...(t.shocks || []).map(s => s[1]))))
            return timeout
          })
          // .concat([setTimeout(() => {
          //   if (cancelReplay) return clearReplay()
          //   if (pauseLeplay) return clearReplay(info.turn - 1)
          //   // setReplay(false)
          //   setTimeout(() => {
          //     setReplay(actualInfo.turn)
          //     // if (pauseLeplay) return clearReplay(save.turn - 1)
          //     // setReplay(false)
          //   }, 2 * globals.flipMs + Math.max(...
          //     actualSave.board.tiles().map(t =>
          //       Math.max(t.swap?.ms || 0, ...(t.shocks || []).map(s => s[1])))))

          //   if (actualInfo.turn === currReplayTurn) {
          //     console.debug('SKIP', turn)
          //     return // if in middle of replay, skip to current turn
          //   }
          //   setInfo(actualInfo)
          //   setSave(actualSave)
          // }, waitMs)])
        } else {
          handle.setPlay(true, replaySave)
          outerSetInfo(replayInfo)
          setOverlay(false)
        }
      } else {
        open(info.id)
      }
      //  else if (actualSave && actualInfo) {
      //   // setSave(actualSave)
      //   // outerSetInfo(actualInfo)
      //   open(info.id)
      // }
    },
    menu: () => {
      cancelReplay = true
      open(false, false)
    },
    contest: () => {
      return
      const letters = word.map(t => t.letter || t.blankLetter).join('')
      setModal(<InfoBody>
        <p>
          Contest Word Validity<span style={{
            textDecoration: 'none',
            float: 'right',
            color: '#0004',
            textShadow: 'none',
          }}> {info.lang.toLocaleUpperCase()}</span>
        </p>
        <p>
          Did your real word get rejected?
        </p>
        {(info.lang ?? 'english') === 'english'
        ?
          <>
            <p>
              First, <a href={`https://scrabble.merriam.com/finder/${letters}`} target='_blank' rel='noreferrer'>check if it's a valid Scrabble word</a>
            </p>
            <p>
              If so, you can ask your opponent to accept: <span className='control' style={{
                margin: '0.5rem',
              }} onClick={() => handle.confirm(Info.ConfirmType.CONTEST, {
                word,
                letters: word.map(t => t.letter || ' ').join(''),
                tries: info.tries,
              })}>CONTEST</span>{'\n'}<br/>
            </p>
          </>
        :
          <p>
            Ask your opponent to accept: <div className='button' onClick={() => handle.confirm(Info.ConfirmType.CONTEST, {
              word,
              letters: word.map(t => t.letter || ' ').join(''),
              tries: info.tries,
            })}>CONTEST</div>{'\n'}
          </p>
        }
      </InfoBody>)
      // setModal(<div>
      //   <p>
      //     Contest Word Validity
      //   </p>
      //   <p>
      //     Did your real word get rejected?
      //   </p>
      //   <p>
      //     First, <a href={`https://scrabble.merriam.com/finder/${letters}`} target='_blank' rel='noreferrer'>check if it's a valid Scrabble word</a>
      //   </p>
      //   <p>
      //     If so, <Link to='/contact'>/contact</Link> me and I'll add it right away!
      //     If not, you'll need to provide a compelling reason like a link to a well-known dictionary
      //   </p>
      //   <p>
      //     You have a chance to contest words on your first two tries per turn, but not the last
      //   </p>
      //   {(info.lang ?? 'english') !== 'english'
      //   ? <p>
      //     <b><i>For non-English dictionaries</i></b>, ask your opponent to confirm the word: <div className='button' onClick={() => handle.confirm(Info.ConfirmType.CONTEST, {
      //       word,
      //       letters: word.map(t => t.letter).join(''),
      //     })}>CONTEST</div>
      //   </p>
      //   : ''}
      // </div>)
    },
    toggleBomb: (tile) => { // for minefield pattern design
      const actual = save.board.get(tile)
      actual.isBomb = (Number(actual.isBomb || 0) + 1)%3
      outerSetInfo(Object.assign({}, info))
    },
    setBlank: (pos: IPos, letter: string) => {
      save.board.get(pos).blankLetter = letter
      handle.rerender()
    },
  }
  useEventListener(window, 'keydown', handle.keypress, false);
  useEventListener(window, 'resize deviceorientation', handle.resize, false);

  useF(info, save, handle.resize)
  useF(auth.user, handle.fetch)
  useF(auth.user, () => setLoaded(false))
  useI(info.id, gameClosed, () => {
    if (gameClosed) return outerLoaded(true)
    if (info.id === currSaveId.current) {
      console.debug('ALREADY LOADED')
      outerLoaded(true)
      handle.setPlay(true, save)
      setTimeout(() => outerLoaded(true))
    } else {
      handle.fetch(info)
      save = handle.setPlay(true, cachedSave(info), true)
      console.debug('CACHED', info, save)
      // if (currInfo.current?.id !== info.id) {

      //   // info = currInfo.current
      //   // save = cachedSave(currInfo.current)
      // }
    }
  })
  useF(reload, () => {
    if (reload?.id !== 'unloaded' && reload?.id === info.id) {
      // setWord([])
      handle.fetch()
    }
  })
  useF(word, () => setError(''))
  useF(replay, handle.replay)
  useF(info.id, () => {
    // setReplay(false)
    setWord([])
  })
  // useF(save, () => console.debug('WB STATE', info, save))
  useE(info.id, info.turn, save, reload, canPlay, () => {
    if (save.board && !replay && info.status === Player.none) {
      handle.timeout()
      return () => clearTimeout(timeoutTimeout)
    }
  })
  useF(error, () => {
    clearTimeout(errorTimeout)
    errorTimeout = setTimeout(() => setError(''), 3000)
  })

  // flip for local games
  const [localFlip, setLocalFlip] = store.use('wordbase.localFlip', {
    default: isMobile && settings.wordbase.localFlip
  })
  useF(settings.wordbase.localFlip, () => setLocalFlip(isMobile && settings.wordbase.localFlip))
  useF(localFlip, () => localFlip && user.settings.update('wordbase.localFlip', localFlip)) // only turn *on* setting
  const allowFlip = info.p2 === 'orange' && actualInfo?.turn % 2 && info.status === Player.none
  useStyle(!gameClosed && allowFlip && localFlip ? `
  #root {
    transform: rotate(180deg);
  }
  ` : '')

  const delay = useR() // delay flip when loading new game or flipping board
  useF(info.id, localFlip && allowFlip, () => {
    delay.current = globals.delayMs
    setTimeout(() => delay.current = 0, delay.current)
  })

  // for minefield pattern design
  if (designMinefield) {
    window['printBoard'] = () => save.board.board
      .map(row => row.map(t => t.isBomb || '.').join(''))
      .join('\n')
    window['clearBoard'] = () => save.board.tiles().map(t => t.isBomb = 0)
  }

  // show how-to if not a rematch and player hasn't made a move yet
  const showHowTo = !info.previous && (info.turn < 1 || (info.turn < 2 && canPlay))
  const lastSkip = SkipTypes[info.lastWord] || (save?.history.length && save.history[0].length === 0)
  const userLoaded = loaded && (auth.user ? loaded === auth.user : loaded === true)
  const [results, setResults] = useState(false)
  useE(info.id, gameClosed, () => {
    if (info) {
      // if (info.status === Player.none || gameClosed) setResults(false) // close results on switch
      console.debug('RESULTS', info.status, results, save.board, gameClosed)
      if (info.status === Player.none) setResults(false)
      else if (!results && save.board) {
        const animMs = globals.delayMs + globals.flipMs
          + Math.max(...save.board.tiles().map(tile => tile.swap?.ms || 0))
        const timeout = setTimeout(() => setResults(true), globals.flipMs + animMs + delay.current)
        return () => clearTimeout(timeout)
      }
    }
  })
  useE(overlay, () => setResults(false))
  const winningWord = useM(info.status, save.history, () => {
    return info.status !== Player.none && save.history?.length && Array.from(save.history[0])
  })
  useF('WORDBASE winning word', winningWord, info.status, save.history)
  useF(save._play && !results && winningWord.map && winningWord.map(x=>x.letter).join('') || false, word => word && setTimeout(
    () => setResults(true),
    info.animationMs + globals.flipMs*2))
  const subpath = useSubpath('/wordbase')
  const copypath = `${window.location.origin}${subpath}`
  const lastWord = info.lastWord || save.history[0]?.map(t => t.letter).join('') || (confirm && '.confirm')
  const timedOut = info.lastWord === '.timeout'
  const resigned = info.lastWord === '.resign'
  const turn = info.turn - (info.confirm?.length || 0)

  // Animate progress with tile flips. Using event target to allow updates directly from TileElem to GameProgress without re-render
  const progressRenderTarget = useM(() => new EventTarget())
  const animateProgress = () => {
    // console.debug('PROGRESS RERENDER')
    if (info.id && info.id !== 'unloaded' && loaded && play && save?.board) {
      info.progress = save?.board?.progress(true)
      progressRenderTarget.dispatchEvent(new Event('rerender'))
    }
  }
  useEventListener(progressRenderTarget, 'update', animateProgress)
  useF(save, info, loaded, animateProgress)
  // console.debug('rerender')
  // useF(save, () => console.debug(save))

  const showWordOptions = !play && word?.length
  const hasUnsetBlanks = word && !word.every(t => t.letter || t.blankLetter)

  const [challengeUser, reloadChallengeUser] = useCached(
    `wordbase-challenge-user-${info.id}`, 
    () => api.get(`wordbase/challenge/hash/user/${info.id.replace('new/', '')}`).then(({ user }) => user))
  useF(info.id, reloadChallengeUser)

  useI(info.id, save.turn, save._play, word, () => {
    if (!save?.board) return
    // compute graph
    graph.from = {}
    graph.to = {}
    graph.path = {}
    const rows = save.board.board
    const bombs = Object.fromEntries(save.replay?.bombs?.map(x => [Tile.hash(x), x]) || [])
    const p = [new Set(rows.at(-1).map(Tile.hash)), new Set(rows[0].map(Tile.hash))]
    ;[...save.history.slice().reverse(), word].forEach((play, turn) => {
      if (play === word && !word.length) return
      // console.debug(play, [...p[0]], [...p[1]])
      prev_graph = JSON.duplicate(graph)

      const player = turn % 2
      const other = 1 - player

      play.slice(1).forEach((tile, i_1) => {
        const hash = Tile.hash(tile)

        // // replace tile edge if player tiles still connected after (not a parent of current node)
        // if (!graph.to[hash] || !graph.path[Tile.hash(play[i_1])].includes(hash)) {
        //   console.debug('TO', [...graph.path[hash]||[]], Tile.hash(play[i_1]))
        //   graph.to[hash] = play[i_1]
        //   graph.path[hash] = (graph.path[Tile.hash(play[i_1])] || []).concat(Tile.hash(play[i_1]))
        //   graph.from[Tile.hash(play[i_1])] = (graph.from[Tile.hash(play[i_1])] || []).concat([tile])
        // }
        // NVM only replace if not already owned by player (to avoid floating edges when replayed)
        // console.debug('TO', hash, p[player].has(hash))
        if (!p[player].has(hash)) {

          // remove other's edges out of this node
          const remove = graph.from[hash]?.map(Tile.hash)
          remove?.forEach(node => {
            if (!p[player].has(node) && graph.to[node] && Tile.eq(graph.to[node], tile)) {
              delete graph.to[node]
              delete graph.path[node]
            }
          })

          // console.debug('FROM', [...graph.path[hash]||[]], Tile.hash(play[i_1]))
          graph.to[hash] = play[i_1]
          graph.path[hash] = (graph.path[Tile.hash(play[i_1])] || []).concat(Tile.hash(play[i_1]))
          graph.from[Tile.hash(play[i_1])] = [tile]
        }
        p[player].add(hash)
        p[other].delete(hash)
      })

      // connect bomb flips too
      ;(save._play || play !== word) && play.slice(1).forEach((tile, i_1) => {
        const bombFlips = [bombs[Tile.hash(tile)] || (tile.isBomb && tile)]
        delete bombs[Tile.hash(tile)]
        while (bombFlips[0]) {
          const bomb = bombFlips.pop()
          save.board[bomb.isBomb === 2 ? 'adj' : 'square'](bomb).map(t => {
            const h = Tile.hash(t)
            if (!graph.to[h] || !p[player].has(h)) {
              p[player].add(h)
              p[other].delete(h)
              graph.to[h] = bomb
              graph.path[h] = (graph.path[Tile.hash(bomb)] || []).concat([Tile.hash(bomb)])
              graph.from[Tile.hash(bomb)] = (graph.from[Tile.hash(bomb)] || []).concat([t])
              if (bombs[h]) {
                bombFlips.push(bombs[h])
                delete bombs[h]
              }
            }
          })
        }
      })

      // disconnect other's tiles TODO move somewhere else
      {
        // first, form frontier from existing edges
        const frontier = rows[save.board.base[other]]?.slice().filter(t => p[other].has(Tile.hash(t)))||[]
        const connected = new Set([...frontier].map(Tile.hash))
        const resolve = [...connected]
        while (resolve.length) {
          const from = (
            graph.from[resolve.pop()]||[]
          ).filter(x => !connected.has(Tile.hash(x)) && p[other].has(Tile.hash(x)))
          frontier.push(...from)
          from.forEach(x => connected.add(Tile.hash(x)))
          resolve.push(...from.map(Tile.hash))
        }
        console.debug('original', [...connected])

        // then BFS remaining tiles to form edges
        console.debug('frontier', frontier.slice(), other, p)
        while (frontier.length) {
          const current = frontier.pop()
          save.board.adj(current)
            .forEach(tile => {
              const hash = Tile.hash(tile)
              if (!connected.has(hash) && p[other].has(hash)) {
                // console.debug(hash)
                graph.to[hash] = current
                graph.path[hash] = (graph.path[Tile.hash(current)] || []).concat([Tile.hash(current)])
                graph.from[Tile.hash(current)] = (graph.from[Tile.hash(current)] || []).concat([tile])
                frontier.push(tile)
                connected.add(hash)
                
                // add connected
                const resolve = [hash]
                while (resolve.length) {
                  const from = (
                    graph.from[resolve.pop()]||[]
                  ).filter(x => !connected.has(Tile.hash(x)) && p[other].has(Tile.hash(x)))
                  frontier.push(...from)
                  from.forEach(x => connected.add(Tile.hash(x)))
                  resolve.push(...from.map(Tile.hash))
                }
              }
            })
        }
        console.debug('connected', connected)
        p[other].forEach(x => {
          if (!connected.has(x) && !p[player].has(x)) {
            delete graph.to[x]
            delete graph.path[x]

            // delete if not last turn
            if (turn <= save.history.length) p[other].delete(x)
          }
        })
      }
    })

    console.debug('PLAY GRAPH', graph, prev_graph)
  })
  const rerender = useRerender()
  useI(save, theme.name, () => {
    // if nodes theme, play immediately
    if (theme.name === 'nodes') {
      // save._play = false
      save?.board?.tiles().forEach(x => {
        // if (x.swap) x.swap.ms = 0
        // x.shocks?.forEach(y => y[1] = 0)
        // x.shocks?.forEach(y => y[1] = x.shocks[0][1])
        // x.shocks?.forEach(y => y[1] += globals.flipMs * 2)
      })
      if (save._play) setTimeout(rerender, info.animationMs + globals.flipMs/2)
    }
  })

  const historyButton =
  <div className='control button'
    onClick={() => replay ? setReplay(false) : setOverlay(!overlay)}>
    {replay
    ? 'exit'
    : overlay
    ? 'close'
    : showHowTo
    ? 'how to'
    : unread
    ? `${unread} unread`
    : 'history'}</div>
  return (
    <Style className={`wordbase-game anim3D-${settings.wordbase.anim3D} play-${canPlay}`}>
      {results && info.status !== Player.none && save && !overlay && !gameClosed ? <Modal
      // target={dual ? '.wordbase-game' : '#root'}>
      target={dual && '.wordbase-game'}
      full={dual ? false : settings.wordbase.full}>
        <Result {...{ user: auth.user, info, save,
          close: () => setResults(false),
          menu: handle.menu,
          rematch: handle.rematch,
          stats: () => open(false, true),
          open: open,
        }} />
      </Modal> : ''}
      <GameProgress info={info} open={open} options={{
        showLang: (info.lang ?? 'english') !== settings.wordbase.language,
        // let tiles talk directly to GameProgress for performance (TODO rewrite flips to animation instead of state)
        progressRenderTarget, // altBackground: true
      }}/>

      <div className='ui'>
        <div className='preview-container'>
          {!play && word.length ?
          <div key="preview" className={`preview ${!play ? '' : save.p1 ? 'p2' : 'p1'} preview-anim-${!isMobile}`}>
            {word.map((t, i) => <span className={`letter ${
              t.letter ? '' : 'blank ' + (t.blankLetter ? 'filled' : 'empty')
              }`} key={i}>{(letter => theme.pieces
              ? <>
                <span className='tile-letter'>{letter || t.blankLetter || '?'}</span>
                {theme.name === 'scrabble' ? <span className='tile-value'>
                  {theme.letterValues[letter]}
                </span> : ''}
              </>
              : letter)(t.letter) || '?'}</span>)}
          </div>
          :
          <div key="last" className={`last
          ${lastSkip||timedOut?'skip':''}
          ${save.p1 ? timedOut || resigned ? 'p1' : 'p2' : timedOut || resigned ? 'p2' : 'p1'}`} onClick={() => handle.setPlay(true)}>
            {SkipTypes[lastWord] || (
            confirm
            ?
            confirm.type === Info.ConfirmType.DRAW
              ? 'DRAW?'
              : confirm.type === Info.ConfirmType.CONTEST
              ? `${confirm.value.letters.toLocaleUpperCase()}?`
              : (confirm.type as string).toLocaleUpperCase() + 'ED'
            : lastWord?.split('').map((letter, i) => <span className='letter'>{
              theme.pieces
              ? <>
                <span className='tile-letter'>{letter}</span>
                {theme.name === 'scrabble' ? <span className='tile-value'>
                  {theme.letterValues[letter]}
                </span> : ''}
              </>
              : letter
            }</span>))}
          </div>}
        </div>
        <div className={'control-container '
          + (error || showWordOptions ? '' : 'spaced')}>
          {error ?
            <>
              <div className='control button'
              onClick={error?.includes && error.includes('left') ? handle.contest : undefined}>{error}</div>
              {/* {error.includes('0 tries left') && contest && contest === word.map(t => t.letter).join('')
              ? <div className='control button' onClick={handle.contest}>
                contest</div>
              : ''} */}
            </>
          : showWordOptions
          ? hasUnsetBlanks && false
              ?
              <div className='control button'>select blanks</div>
              :
              <>
                <div className='control button' onClick={handle.clear}>
                  cancel</div>
                {contest && (contest === word.map(t => t.letter).join(''))
                ? null //<div className='control button' onClick={handle.contest}>contest</div>
                : <div className='control button' onClick={handle.submit}>
                  submit</div>}
              </>
          :
          <>
            <div id='menu-button' className='control button' onClick={handle.menu}>
              menu</div>
            {/* {error || replay || info.lang === 'english' || !info.lang */}
            {/* {error || replay ||
            (info.lang === 'english'
             && info.lang === (settings.wordbase.language ?? 'english'))
            ? ''
            : <div className='lang'>{info.lang}</div>} */}
            {/*replay && replay !== true
            ? <>
              {info.turn === 1 ? '' :
              <div className='control button' onClick={() => setReplay(replay + 1)}>
                {'back'}</div>}
              <div className='control button' onClick={() => setReplay(replay - 1)}>
                {'next'}</div>
            </>
            : */
            isTurn && confirm && [Info.ConfirmType.DRAW, Info.ConfirmType.CONTEST].includes(confirm.type)
            ? <div className='group'>
              <div className='control button' onClick={() => handle.confirm(Info.ConfirmType.REJECT, `request rejected`)}>
                reject</div>
              <div className='control button' onClick={() => handle.confirm(Info.ConfirmType.ACCEPT, 'request accepted')}>
                accept {confirm.type === Info.ConfirmType.DRAW ? 'draw' : 'word'}</div>
            </div>
            : canPlay && !overlay
            ? <div className='group'>
              {isMobile && allowFlip && (info.turn < 2 || settings.wordbase.localFlip)
              ? <div className='control button' onClick={() => setLocalFlip(!localFlip)}
                style={{
                  transform: 'rotate(180deg)',
                  position: 'absolute', bottom: 'calc(100% + .65rem)', left: '.5rem' }}
                >
                flip board</div>
              : ''}
              {info.settings?.options?.tries === 0 && (info?.lastWord || '.')[0] !== '.'
              ? <div className='control button' onClick={handle.challenge}>challenge</div>
              : ''}
            </div>
            : info.status === Player.none || replay || (overlay && !showHowTo && !confirm)
            ? ''
            : <div className='control button' onClick={handle.rematch}>
              {info.rematch ? 'rematched' : 'rematch'}</div>}
            {replay
            ? info && replay && replay !== true
              ? <div className='group'>
                {info.turn === 1 ? '' :
                <div className='control button' onClick={() => setReplay(replay - 1)}>
                  {'back'}</div>}
                {info.turn === actualInfo?.turn ? '' : <div className='control button' onClick={() => setReplay(replay + 1)}>
                  {'next'}</div>}
                <div className='control button' onClick={() => setReplay(true)}>
                  {info.turn === actualInfo?.turn ? 'restart' : 'play'}</div>
                {historyButton}
              </div>
              : <div className='group'>
                <div className='control button' onClick={() => setReplay(-1)}>
                  pause</div>
                {historyButton}
              </div>
            : overlay && !showHowTo && !confirm
              ?
                <div className='group'>
                  {/* <div className='control button' onClick={() => handle.confirm(Info.ConfirmType.DRAW)}>
                    request draw</div> */}
                  <div className='control button' onClick={() => setModal(<SettingStyles>
                    <div className='body' style={toStyle(`
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 0 1em;
                    `)}>
                      <br/><br/>
                      <div
                      className='control button' 
                      onClick={() => {
                        const openGameSettings = () => setModal(<GameSettingsModal
                          initialSettings={info.settings} outer={{ open }} info={info}
                          update={(settings) => {
                            console.debug(settings.options.theme, settings)
                            if (settings.options.theme !== info.settings.options.theme) {
                              info.settings = settings
                              api.post(`wordbase/g/${info.id}/settings`, { settings })
                              .then(({ info }) => {
                                outerSetInfo(info)
                                openGameSettings()
                              })
                            }
                          }}
                          />)
                        openGameSettings()
                      }}>
                        match settings</div>
                      <br/>
                      <div className='control button'
                        onClick={() => {
                          drawProgress(info, save, false).then(x => download(x, `wordbase-${info.id}.png`))
                          // html2canvas(Q('.wordbase-game .board')).then(x => download(x.toDataURL(), `wordbase-${info.id}.png`))
                        }}>
                        print board
                      </div>
                      <br/>
                      <div
                      className='control button' 
                      onClick={() => setModal(<SettingStyles><InfoBody><HowTo setModal={setModal} /></InfoBody></SettingStyles>)}>
                        how to play</div>
                      <br/>
                      <div
                      className={`control button ${canPlay ? '' : 'disabled'}`} 
                      onClick={() => canPlay && handle.confirm(Info.ConfirmType.DRAW)}>
                        request a draw</div>
                      <br/>
                      <div className='control button'
                        onClick={() => setModal(<Settings app='wordbase' close={() => setModal(false)}/>)}>
                        app settings
                      </div>
                      <br/><br/>
                    </div>
                  </SettingStyles>)}>
                    options</div>
                  <div className='control button' onClick={() => setOverlay(!overlay)}>
                    close</div>
                </div>
              : historyButton}
          </>}
        </div>
        {/* <div className={'control-container spaced'}>
          <div className='control button' onClick={() => open(false)}>
            menu</div>
          {word.length > 0 ?
          play ? '' :
          error ?
          <div className='control button'>{error}</div>
          :
          <>
            <div className='control button' onClick={handle.clear}>
              cancel</div>
            <div className='control button' onClick={handle.submit}>
              submit</div>
          </> : ''}
          {info.status === Player.none ?'':
          <div className='control button' onClick={handle.rematch}>
            {info.rematch ? 'rematched' : 'rematch'}</div>}
          <div className='control button'
            onClick={() => setOverlay(!overlay)}>
            {overlay ? 'close' : info.turn < 2 ? 'how to' : unread ? `${unread} unread` : 'history'}</div>
        </div> */}
      </div>

      <div className='board-container'
      // onTouchEnd={e => {
      //   const s = window.getSelection()
      //   if ((s?.rangeCount || 0) > 0) {
      //     const r = s.getRangeAt(0)
      //     s.removeAllRanges()
      //     setTimeout(() => s.addRange(r), 0)
      //   }
      // }}
      >
        <div className={`overlay ${overlay ? 'on' : 'off'} replay-${!!replay}`}>
          {showHowTo ?
          <div className='info'>
            {info.previous && showButtons ? <div className='word-count-replay'>
              <div className='button' onClick={() => {
                open(info.previous)
              }}>PREVIOUS</div>
            </div> : ''}
            <HowTo setModal={setModal} />
          </div>
          :
          <div className='history'>
            <div className='word-count-replay'>
              {info.previous && showButtons
              ? <div className='button' onClick={() => {
                open(info.previous)
              }}>PREVIOUS</div>
              : ''}
              <div className={`word-count clickable-true`} onClick={() => {
                setShowButtons(!showButtons)
              }}>
                <span>{`${turn} turn${turn === 1 ? '' : 's'} played`}</span>
                &nbsp;
              </div>
              {info.replayable && showButtons
              ? <div className='button' onClick={() => {
                setOverlay(false)
                // setTimeout(() => setReplay(true), 500)
                setReplay(true)
              }}>REPLAY</div>
              : ''}
            </div>
            {info.chat && settings.wordbase.chat ?
            <Chat hash={info.chat} flipped={info.p2 === auth.user} reading={overlay} setUnread={setUnread} click={(msg, i, all) => {
              if (replayable && msg.meta.dedupe)
                return () => setReplay(msg.meta.dedupe)
              if (replayable && msg.meta?.classes?.includes('last')) {
                const words = new Set<string>(save.history.map(w =>
                  w.map(t => t.letter).join('')))
                words.add('.skip')
                words.add('SKIPPED')
                const order = all
                  .map((m, j) => [j, m]).filter(e => words.has(e[1].text))
                return () => setReplay(order.findIndex(e => e[0] === i))
              }
              return false
            }}
            fallback={<div className='info'>
              <HowTo setModal={setModal} />
            </div>} special='p1 p2'/>
            :
            save.history.slice().reverse().map((item, i) => {
              const skip = item.length === 0
              return <div key={i}
              className={`last ${skip?'skip':''} ${i%2 ? 'p2' : 'p1'}`}
              onClick={() => replayable && setReplay(i + 1)}>
                {skip ? 'SKIPPED' : confirm ? 'CONFIRMED' : item.map(t => t.letter).join('')}
              </div>
            }).reverse().slice(timedOut || resigned ? 0 : 1)}
            {/* <div className='hello'>
              hi {auth.user || ', you'}  :-)</div> */}
          </div>}
        </div>
        {!userLoaded
        ? ''
        : !auth.user && !isLocal && !replay
        ? <div className='board-block active' onClick={e => openLogin()}>
          {/new\/.+/.test(location.href)
          ? <span>log in to challenge {challengeUser || 'user'}</span>
          : <span>log in to play</span>}
        </div>
        : info?.id && info.turn < 0 && info.id !== 'local'
        ? <div className='board-block'>
            {challengeUser === auth.user
            ? <div style={{ cursor: 'pointer' }} onClick={e => {
                copy(`${copypath.replace(/https?:\/\//, '')}/${info.id}`.replace(/\/\/n/g, '/n'))
                const tapToCopyL = document.querySelector('.board-block span:last-child')
                const tapToCopyContent = tapToCopyL.textContent
                tapToCopyL.textContent = 'copied!'
                setTimeout(() => tapToCopyL.textContent = tapToCopyContent, 3000)
              }}>
              <span>#{info.id}</span>
              <br />
              <span>
                share this link<br/> to invite challenges
              </span>
              <br />
              <span>tap to copy</span>
            </div>
            : info.id.includes(`new/`)
            ? <div>
              <span>you {"can't"} view #{info.id}</span>
              <br />
              <span>
                this user doesn't exist<br />
                or doesn't accept challenges
              </span>
            </div>
            : info.id === 'local'
            ? ''
            : <span>you {"can't"} view #{info.id}</span>}
          </div>
        // : !loaded || auth.user || (isLocal && save.board)
        : ''}

        <BoardElem {...{
          info, save, word, play, localFlip: allowFlip && localFlip, progressRenderTarget, delay, handle
        }} />

      </div>
    </Style>
  );
}

const Style = styled.div`
  user-select: none;
  background: ${theme.feed};
  height: 100%; width: 100%;
  margin: auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  font-size: 1.2rem;
  font-family: Ubuntu, sans-serif;

  .button { cursor: pointer; user-select: none; text-shadow: none; }
  .game-progress {
    height: 2rem;
  }
  .ui {
    // height: 5.2rem;
    // background: ${theme.tile};
    margin: .5rem 0;
  }
  .preview-container, .control-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    user-select: none;
    position: relative;

    &.preview-container {
      justify-content: center;
      margin: 0 .5rem .25rem .5rem;
      height: 2.25rem;
    }
    &.control-container {
      justify-content: center;
      height: 1.8rem;
      &.spaced {
        > .button:first-child, > .group:first-child {
          position: absolute;
          left: 0;
        }
        > .button:last-child, > .group:last-child {
          position: absolute;
          right: 0;
         }
       }
    }
    .lang {
      position: absolute;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${theme.bomb_3};
      text-shadow: none;
      pointer-events: none;
    }
    .group {
      display: flex;
      flex-direction: row;
      margin: 0 .5rem;
      > * { margin: 0; margin-right: .5rem; }
      > *:last-child { margin-right: 0; }
    }
  }
  .control, .button {
    cursor: pointer; user-select: none;
    background: ${theme.bomb};
    // background: #000d;
    // border-bottom: 1px solid black;
    // background-clip: padding-box;
    // &:active { border-bottom: 0; border-top: 1px solid transparent; }
    color: ${theme.tile};
    font-size: 1.2rem;
    margin: 0 .5rem;
    &.left {
      margin-right: auto;
    }
  }
  .preview, .last, .control, .button {
    padding: 0 .3rem;
    border-radius: .3rem;
    text-transform: uppercase;
  }
  .preview, .last {
    background: ${theme.tile};
    color: ${theme.bomb} !important;
    font-size: 2rem;
    line-height: 2.2rem;
    text-shadow: none;
  }
  .preview {
    display: flex;
    align-items: center;
    justify-content: center;
    transition: 1s;
    position: absolute;
    height: 100%;
    .letter {
      &.blank {
        opacity: .3;
        &.empty {
          padding: 0.04em;
        }
      }
    }
  }
  .preview.preview-anim-true {
    .letter {
      animation: letter-pop-in .25s;
      @keyframes letter-pop-in { from { font-size: 0 !important; } }
    }
  }
  .last {
    cursor: pointer;
    width: fit-content;
    &.p1 { background: ${theme.blue} !important; margin-left: auto; }
    &.p2 { background: ${theme.orange} !important; margin-right: auto; }
    &.skip {
      // background: ${theme.bomb_1} !important;
      // background: ${layerBackground(theme.bomb_8, theme.tile_8)} !important;
      // color: ${theme.tile} !important;
      // background: ${theme.bomb_2} !important;
      // color: ${theme.dual_feed} !important;
      background: ${theme.tile} !important;
      color: ${theme.bomb_3} !important;
      text-shadow: none;
    }
    &.confirm {
      background: ${theme.bomb_1} !important;
      color: ${theme.tile} !important;
      text-shadow: none;
    }
    &.collapse {
      display: none;
      + .confirm { display: none; }
    }
  }
  .board-container {
    height: 0;
    flex-grow: 1;
    width: 100%;
    display: flex;
    // align-items: flex-end;
    background: #ffffff88;
    background: #fffb;
    background: ${theme.tile_7};
    align-items: center;
    justify-content: center;
    overflow: hidden;
    // background: #ffffffbb;
    // background: linear-gradient(0deg, #ffffffbb, #0000000b);
    user-select: none;

    position: relative;
    .overlay {
      *::-webkit-scrollbar { display: none }
      position: absolute;
      width: 100%; height: 100%;
      left: 0; top: 0;
      z-index: 99999;
      // background: #fffffff8;
      background:
        linear-gradient(0deg, ${theme.tile_8}, ${theme.tile_8}),
        linear-gradient(0deg, ${theme.tile_8}, ${theme.tile_8}),
        linear-gradient(0deg, ${theme.tile_2}, ${theme.tile_2});
      color: ${theme.bomb};
      padding: 0;
      // overflow-y: auto;
      overflow: auto;
      > div {
        width: 100%;
        min-height: 100%;
        padding: .5rem;
      }
      .info {
        padding: .5em;
        height: -webkit-fill-available;
      }

      .word-count-replay {
        margin: auto;
        text-align: center;
        margin-bottom: .5rem;
        display: flex;
        flex-direction: row;
        margin: 0;
        // margin-bottom: .5rem;
        > * {
          margin: 0;
          margin-bottom: .5rem;
          // padding: 0 .3rem;
          // border-radius: .3rem;
          // background: ${theme.bomb};
          // color: ${theme.tile};
        }
        > .clickable-true {
          padding: 0 .3rem;
          border-radius: .3rem;
          background: ${theme.bomb};
          color: ${theme.tile};
        }
        position: relative;
        .word-count {
          flex-grow: 1;
          > span {
            position: absolute;
            width: 100%; left: 0;
            pointer-events: none;
          }
          &.clickable-true {
            cursor: pointer;
          }
        }
        > * {
          margin-right: .5rem !important;
          &:last-child { margin-right: 0 !important; }
        }
      }
      // .word-count {
      //   // width: fit-content;
      //   margin: auto;
      //   text-align: center;
      //   margin-bottom: .5rem;
      //   padding: 0 .3rem;
      //   border-radius: .3rem;
      //   background: ${theme.bomb};
      //   color: ${theme.tile};
      // }
      // .last:last-child { margin-bottom: .5rem; }

      .hello {
        white-space: pre;
        margin-top: 100rem;
        width: 100%; text-align: center;
        padding: 0 .3rem; border-radius: .3rem;
        background: #efefef;
        color: #00000088;
      }

      .history {
        min-height: max(100%, 70vh);
        padding-bottom: 0;
        .last {
          margin-bottom: 2px;
        }
      }

      transition: .25s;
      &.replay-true { transition: 0s; }
      &.off {
        visibility: hidden;
        height: 0%;
        overflow-y: hidden;
      }
      &.on {
        animation: scroll-after-transition .25s;
        @keyframes scroll-after-transition {
          from { overflow-y: hidden }
          to { overflow-y: hidden }
        }
      }
    }
    .board-block, .board-block div {
      position: absolute;
      width: 100%; height: 100%;
      left: 0; top: 0;
      z-index: 998;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      text-align: center;
      span {
        background: ${theme.bomb};
        color: ${theme.tile};
        font-size: 2rem;
        padding: .3rem 1rem;
        // text-transform: uppercase;
        border-radius: .3rem;
      }
      &.active span { cursor: pointer; }
    }
  }
  .board {
    box-sizing: content-box;
    // min-height: min(100%, ${Board.ROWS / Board.COLS * 100}vw);
    user-select: none;
    // background: #5a5a5a;
    // background: ${theme.tile};
    // background: #333;
    background: #111;
    display: flex;
    flex-direction: column;
    touch-action: none;
    touch-action: pinch-zoom;
    &.loading {
      display: none;
      .tile .color { animation: none !important; }
    }
    &:active {
      pointer: cursor !important;
    }
  }
  .board-row {
    flex-grow: 1;
    display: flex;
    flex-direction: row;
    touch-action: none;
    touch-action: pinch-zoom;
    &:first-child, &:last-child {
      position: relative;
      .tile-letter {
        z-index: 2000;
      }
      &::after {
        z-index: 1000;
        content: ""; width: 100%; height: 100%;
        position: absolute;
        pointer-events: none;
        background: repeating-linear-gradient(
          -45deg,
          transparent,
          transparent .5rem,
          ${theme.tile_1_5} .5rem,
          ${theme.tile_1_5} 1rem
        );
      }
    }
  }
  .tile {
    flex-grow: 1;
    width: 1rem;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${theme.tile};
    color: ${theme.bomb};
    text-transform: uppercase;
    padding: 0;
    margin: 0;
    font-weight: bolder;
    // font-size: 1.4rem;
    // font-size: 1.6rem;
    text-shadow: none;
    user-select: none;
    touch-action: none;
    touch-action: pinch-zoom;
    background: transparent;
    z-index: 10;
    &.flip { z-index: 11; }
    overflow: visible;
    &:is(.bomb, .bomb-true) {
      color: ${theme.tile};
      // background: ${theme.tile};
    }
    font-size: .6em;
    // text-shadow: -0.005em -0.005em ${theme.bomb}, 0.005em 0.005em ${theme.bomb};

    position: relative;
    .color {
      content: ""; position: absolute; width: 100%; height: 100%;
      top: 0; left: 0;
      z-index: -100;
      background: ${theme.tile};
    }
    &:is(.bomb, .bomb-true) .color { background: ${theme.bomb}; }
    &.superbomb .color { background: ${theme.superbomb}; }
    // &.bomb.flip .color { background: ${theme.tile} }
    &.p1 .color { background: ${theme.blue} }
    &.p2 .color { background: ${theme.orange} }
    &.shock > .color {
      animation: shock ${globals.shockMs}ms;
      @keyframes shock {
        0% { }
        50% { transform: scale(.75); }
        100% { }
      }
    }
    // &.flip .color {
    //   z-index: -99;
    //   transform-style: flat;
    //   animation: flip ${globals.flipMs}ms;
    //   // transform: translateZ(-100px);
    //   transform-style: preserve-3d;
    //   @keyframes flip {
    //     0% { transform: translateZ(-100px) rotateY(-180deg); }
    //     100% { }
    //   }
    // }
    // &.shock .color {
    //   animation: shock ${globals.shockMs}ms;
    //   @keyframes shock {
    //     0% { }
    //     50% { transform: scale(.75); }
    //     100% { }
    //   }
    // }
    // &.shock-row .color {
    //   z-index: -99;
    //   animation: shock-row ${globals.shockMs + 50}ms;
    //   // tranform: rotate(180deg);
    //   @keyframes shock-row {
    //     0% { transform: translateZ(-100px) rotateY(-180deg); }
    //     50% { transform: translateZ(-100px) rotateY(-90deg) scale(.75); }
    //     100% { transform: translateZ(-100px); }
    //   }
    // }
    // &.shock-col .color {
    //   z-index: -99;
    //   animation: shock-col ${globals.shockMs + 50}ms;
    //   @keyframes shock-col {
    //     0% { transform: translateZ(-100px) rotateX(-180deg); }
    //     50% { transform: translateZ(-100px) rotateX(-90deg) scale(.75); }
    //     100% { transform: translateZ(-100px); }
    //   }
    // }

    background-color: transparent;
    perspective: 150px;
    transition: 0;

    display: flex;
    align-items: center;
    justify-content: center;
    &.blank-true {
      &:not(.selected) .flip-box-inner .color {
        background: ${layerBackground(theme.tile, theme.bomb_1)} !important;
        &.color-0 { background: ${layerBackground(theme.blue, theme.bomb_1)} !important }
        &.color-1 { background: ${layerBackground(theme.orange, theme.bomb_1)} !important }
      }
      &:not(.selected) .select { background: ${theme.bomb_1} !important; }
      .select, .flip-box-inner .color {
        position: absolute;
        top: 0; left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;

        select {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 0;
          z-index: -1;
          z-index: 100;
          color: transparent;
          background: transparent;
          pointer-events: all;
          outline: none;
          -webkit-appearance: none;
        }
      }
    }

    .flip-box-inner {
      .color {
        backface-visibility: hidden;
        background: ${theme.tile} !important;
        color: ${theme.bomb} !important
      }
      .color-0 { background: ${theme.blue} !important }
      .color-1 { background: ${theme.orange} !important }
      .bomb-true {
        background: ${theme.bomb} !important;
        color: ${theme.tile} !important;
      }
      .superbomb-true { background: ${theme.superbomb} !important }

      position: relative;
      width: 100%;
      height: 100%;
      transform-style: preserve-3d;

      .flip-box-front, .flip-box-back {
        position: absolute;
        width: 100%;
        height: 100%;
        backface-visibility: hidden;

        display: flex;
        align-items: center;
        justify-content: center;

        &.flip-box-back {
          transform: rotateX(-180deg);
        }
      }
    }

    &.flip-old:not(.no-flip) .flip-box-inner, &.flip:not(.no-flip) .flip-box-inner {
      animation: flip-old ${globals.flipMs}ms;
      @keyframes flip-old {
        0% { transform: rotate3d(1, 0, 0, 0); }
        50% {
          z-index: 99;
          transform: rotate3d(1, 0, 0, 90deg);
        }
      }
      transform: rotate3d(1, 0, 0, 180deg);

      .flip-box-back {
        transform: rotate3d(1, 0, 0, -180deg);
      }
    }
    &.shock .flip-box-inner {
      animation: shock ${globals.shockMs}ms;
      @keyframes shock {
        0% { transform: scale(1); }
        50% { transform: scale(.75); }
        100% { transform: scale(1); }
      }
    }
    &.shock-row .flip-box-inner {
      animation: shock-row ${globals.flipMs}ms;
      // tranform: rotate(180deg);
      @keyframes shock-row {
        0% { transform: rotateY(-180deg) }
        50% { transform: rotateY(-90deg) scale(.75) }
        100% { }
      }
    }
    &.shock-col .flip-box-inner {
      animation: shock-col ${globals.flipMs}ms;
      @keyframes shock-col {
        0% { transform: rotateX(-180deg) }
        50% { transform: translateZ(-100px) rotateX(-90deg) scale(.75) }
        100% { }
      }
    }

    ${range(16).map(i => {
      // we want to rotate towards the angle
      // basically -180 along angle+90°
      // 0/360° -> rotate -180° along y=1

      const to =
        i < 4
        ? [2-i, 2]
        : i < 8
        ? [-2, 2-i%4]
        : i < 12
        ? [-2+i%4, -2]
        : [2, -2+i%4]

      const degrees = Math.round(
        Math.atan2(to[1], to[0])
        * 180/Math.PI
        + 360) % 360
      const corner = degrees % 90 === 45

      const radians = degrees * Math.PI / 180
      const x = -Math.round(Math.sin(radians)) // cos + 90°
      const y = Math.round(Math.cos(radians)) // sin + 90°

      // flip all upwards to match old wordbase vid
      const nearest90 = 270 // Math.round(degrees / 90) * 90
      const fradians = nearest90 * Math.PI / 180
      const fx = -Math.round(Math.sin(fradians)) // cos + 90°
      const fy = Math.round(Math.cos(fradians)) // sin + 90°

      const name = Math.round(degrees)
      const rule =  `
      &.flip-${name}:not(.no-flip) .flip-box-inner {
        animation: flip-${name} ${globals.flipMs}ms ease-in;
        @keyframes flip-${name} {
          0% { transform: rotate3d(${fx}, ${fy}, 0, 0); }
          50% {
            z-index: 99;
            transform: rotate3d(${fx}, ${fy}, 0, 90deg);
          }
        }
        transform: rotate3d(${fx}, ${fy}, 0, 180deg);

        .flip-box-back {
          transform: rotate3d(${fx}, ${fy}, 0, -180deg);
        }
      }

      &.shock-${name} .flip-box-inner {
        animation: shock-${name} ${globals.flipMs}ms ease-out;
        @keyframes shock-${name} {
          0% { transform: rotate3d(${x}, ${y}, 0, 0); }
          50% {
            z-index: 99;
            transform:
              rotate3d(${x}, ${y}, 0, 90deg)
              scale(.75)
              ${corner ? `translate(${-y/4}em, ${x/4}em)` : ''}
              ;
          }
          100% { }
        }
        transform: rotate3d(${x}, ${y}, 0, 180deg);

        .flip-box-back {
          transform: rotate3d(${x}, ${y}, 0, 180deg);
        }
      }
      `
      // console.debug(rule)
      return rule
    }).join('')}


    .hover-target, select {
      position: absolute;
      height: 90%;
      width: 90%;
      border-radius: 50%;
      z-index: 100100;
      pointer-events: all !important;
    }
    &.selected .hover-target, &.selected select {
      border-radius: 40%;
      height: 100%;
      width: 100%;
    }
  }

  .board-container {
    .overlay {
      > div {
        display: flex;
        flex-direction: column;
      }
      .word-count {
        margin: 0;
        margin-bottom: .5rem;
      }
      .chat {
        height: 0;
        flex-grow: 1;
        padding: 0;
        .messages {
          overflow-y: auto;
          user-select: text;
          padding-bottom: 4rem;
          > * {
            cursor: default;
            user-select: text;
          }
        }
        .edit-container {
          margin-bottom: .5rem !important;
        }
        .chat-input {
          background: ${theme.tile};
          color: ${theme.bomb};
          border-color: ${theme.bomb_2};
          min-width: 100%;
          min-height: 2em;
          display: flex;
          align-items: center;
          vertical-align: middle;
          padding: .275rem;
        }
        .chat-input-container:not(.edit)::after {
          opacity: 1;
          color: ${theme.bomb_2};
          text-shadow: none;
        }
        .chat-send {
          background: ${theme.bomb};
          border-color: ${theme.bomb};
          color: ${theme.tile};
          text-transform: lowercase;
          border-radius: .3rem;
          padding: 0 .3rem;

          line-height: 1;
          bottom: calc(.15rem + (.275rem - .15rem));
        }
      }
    }
    .overlay.off * { user-select: none !important; }
  }

  &.anim3D-false .tile { perspective: none; }
  &.play-true .tile.pointer-true { cursor: pointer; }
`


export const HowTo = ({ setModal }) => {
  const [{ user }] = auth.use()
  const [notified, loadNotified] = useCached(
    'notified-wordbase',
    () => api.get(`/notify/sub/wordbase/${user}`).then(({set}) => set))

  return <HowToStyle className='info-inner'>
    <p className='header'>How to play</p>
    <p>
      <b>Reach the other player's base first to win</b><br/>
      Cut off their tiles to set them back<br/>
      But don't miss out on a winning move
      {/* Search for a chain of words to the other end<br/>
      Grow your territory, trigger bombs, and cut off your opponent<br/> */}
    </p>
    <div className='img-container'>
      <img 
      src="/raw/wordbase/howto.gif" 
      style={{cursor:'pointer'}}
      onClick={e => {
        tutorial()
        setModal(false)
      }} />
    </div>
    <HalfLine />
    <div className='centering'>
      <div className='control button' onClick={() => {
        tutorial()
        setModal(false)
      }}>play tutorial</div>
    </div>
    <HalfLine />
    {/* <li>{` •  new invite link – challenger goes second`
    + `\n •  challenge friend – challenger goes first`
    + `\n •  rematch – winner goes second`}</li> */}

    {/* <p className='header'>Notifications & Installation</p> */}

    <p className='header'>Install</p>
    <p>
      <span style={toStyle(`display:inline-flex;align-items:center`)}>
      iOS Safari →
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
      <br />
      <span style={toStyle(`display:inline-flex;align-items:center`)}>
      Android Chrome →
      {/* https://www.svgrepo.com/svg/345223/three-dots-vertical */}
      <svg width="1em" height="1em" style={{ margin: '0 .25rem' }}
      viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
        <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
      </svg>→ Add to Home Screen
      </span>
    </p>
    {user && !notified
    ?
    <div className='centering'>
      <div className='control button' onClick={() => url.push('/notify')}>enable notifications</div>
    </div>
    :''}

    {/* <div className='centering'>
      <InfoLabel labels={[{
        text: 'community & support',
        func: () => setModal(<Support />),
        style: { background: 'black', color: 'white', fontSize: '1em' },
      }]} />
    </div> */}
  </HowToStyle>
}
const HowToStyle = styled(InfoStyles)`
// width: fit-content;
margin: 0 auto;
// padding: .5em 1em;
// padding-bottom: 1rem;
background: ${theme.tile};
color: ${theme.bomb};
.header {
  margin-bottom: .5rem;
  text-decoration: underline;
  font-size: 1.2rem;
}
ul {
  list-style-type: none;
  padding: 0;
  li {
    font-size: 1rem;
    margin-bottom: .3rem;
  }
}
.img-container {
  height: 7rem;
  display: flex;
  align-items: stretch;
  justify-content: center;
}
img {
  height: 100%;
  min-width: 10.5rem;
  box-sizing: content-box;
  margin: 0 .5rem;
  border: 3px solid black;
  border-radius: 2px;
}
button {
  border: 0 !important;
}
`
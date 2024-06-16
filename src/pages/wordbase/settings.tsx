import { Fragment as JSX, useState } from 'react';
import { openFeedback } from '../../components/Modal';
import styled from 'styled-components';
import { Feedback, InfoSection, Loader as MiniLoader } from '../../components/Info';
import { useF } from '../../lib/hooks';
import { store } from '../../lib/store';
import { Select, SettingStyles } from '../settings';
import { Board, GameSettings } from './board';
import { theme, themes } from './common';
import { GamePreview } from './preview';
import { Info } from './save';
import { S } from 'src/lib/util';


export const GameSettingsModal = ({ create, update, inviteType='', initialSettings, outer, info }: {
  create?: true | ((x: GameSettings, o?:any) => any), // if create not passed in, display as readonly
  update?: (x: GameSettings) => void, // if update not passed in, display as readonly
  inviteType?: string, initialSettings: GameSettings,
  outer?, info?: Info
}) => {

  const [_gameSettings, _setGameSettings]: [GameSettings, any] = useState(Object.clone(initialSettings))
  const gameSettings = _gameSettings || GameSettings.Normal()
  const { mode, options } = gameSettings
  useF(JSON.stringify(initialSettings), () => _setGameSettings(initialSettings))

  const [preview, setPreview] = useState(Board.empty())
  useF(gameSettings, () => setPreview(Board.new(gameSettings, true)))
  const handle = {
    mode: (mode: GameSettings.Mode) => {
      if (create) {
        const previousMode = gameSettings.mode
        store.set(`wordbase.customize.mode-${previousMode}`, gameSettings.options)
        gameSettings.mode = mode
        gameSettings.options = Object.assign({},
          GameSettings.ModeOptions[mode],
          store.get(`wordbase.customize.mode-${mode}`) || {})
        console.debug(JSON.pretty(gameSettings))
        setPreview(Board.new(gameSettings, true))
      } else {
        update && update({ mode, options: Object.assign({},
          GameSettings.ModeOptions[mode],
          store.get(`wordbase.customize.mode-${mode}`) || {}) })
        // otherwise ignore
      }
    },
    options: (options: GameSettings.Options) => {
      if (create) {
        Object.assign(gameSettings.options, options)
        console.debug(JSON.pretty(options))
        setPreview(Board.new(gameSettings, true))
      } else {
        update && update({ mode, options: { ...gameSettings.options, ...options } })
        // otherwise ignore
      }
    },
  }

  const [creating, setCreating] = useState(false)

  const symmetric = (
    <label className='action'>
      <input type='checkbox' checked={options.symmetric}
      onChange={e => handle.options({ symmetric: !options.symmetric })}/>
      symmetric
    </label>
  )
  return (
  <Style>
    <div className='body'>
      <InfoSection labels={[
          // { text: inviteType || 'customize invite' },
        ]}>
          {/* <label className='action'
          style={{
            background: 'black', color: 'white', //float: 'right',
          }}
          >{inviteType || 'customize invite'}</label> */}
          {create && create !== true
          ? <>
            <p style={{
              textTransform: 'capitalize',
            }}><u>Customize: {inviteType || 'customize invite'}</u></p>
          </>
          : <>
            <p>Match Settings{info.p1 && info.p2 ? <>
              : {info && outer
              ? <>
                <a onClick={e => outer.open(false, info.p1)}>{info.p1}</a> vs <a onClick={e => outer.open(false, info.p2)}>{info.p2}</a>
              </>
              :''}
            </> : ''}</p>
          </>}
          {/* <div className='description'>{
`New! Tweak game settings. Still in the works, suggestions are welcome. This applies to local games, private links, & challenges`
          }</div> */}
      </InfoSection>
      <InfoSection labels={[
        // inviteType && { text: inviteType },
        'game mode',
      ]} style={S(`
      position: relative;
      `)}>
        <div style={S(`
        position: absolute;
        right: 0;
        `)}>
          <GamePreview board={preview} theme={options.theme} />
        </div>
        {/* {options.pattern
        ?
        <div style={{
          float: 'right',
          // background: theme.tile,
          // background: layerBackground(theme.tile, theme.bomb_1)
          // border: `1px solid ${theme.bomb}`,
          border: `.15em solid ${theme.bomb_1}`,
          borderRadius: '.2em',
          }}>
          <div style={{ height: '.5em', background: theme.orange }}/>
          {(options.pattern === 'random'
          ? GameSettings.randomMinefieldPlaceholder
          : GameSettings.MinefieldPatterns[options.pattern]).split('\n').map((r, r_i) =>
          <div key={r_i} style={{
            display: 'flex',
            height: '.5em'
          }}>{r.trim().split('').map((c, c_i) =>
            <div key={c_i} style={{
              display: 'inline-block',
              height: '.5em', width: '.5em',
              background:
                c === '2' ? theme.superbomb :
                c === '1' ? theme.bomb :
                'none'
            }}/>)}</div>)}
          <div style={{ height: '.5em', background: theme.blue }}/>
        </div>
        : ''} */}

        <div style={{ display: 'flex', gap: '.25em' }}>
          <label className='action'>
            mode: &nbsp;<Select requireOption {...{
              value: mode,
              options: [
                ...Object.values(GameSettings.Mode),
                'request a new mode',
              ],
              // display: key => GameSettings.Mode[key]?.toUpperCase() || key,
              onChange: e => {
                const mode = e.target.value
                if (mode.includes('new mode')) outer.setModal('feedback')
                else handle.mode(mode as GameSettings.Mode)
              },
            }}/>
          </label>
          {options.pattern === undefined ? '' : <label className='action'>
            <Select preserveCase requireOption {...{
              value: options.pattern,
              options: [
                ...Object.keys(GameSettings.MinefieldPatterns),
                'request a new pattern',
              ],
              // display: key => key.toUpperCase() || key,
              onChange: e => {
                const pattern = e.target.value
                if (pattern.includes('new pattern')) outer.setModal('feedback')
                else handle.options({
                  pattern: e.target.value,
                })
              },
            }}/>
          </label>}
        </div>
        {options.tries === undefined ? '' : <label className='action'>
          try limit: &nbsp;<Select preserveCase {...{
            value: GameSettings.ValueToSetting(GameSettings.TryLimit, options.tries),
            options: [
              ...Object.keys(GameSettings.TryLimit),
            ],
            // display: key => key.toUpperCase() || key,
            onChange: e => {
              handle.options({
                tries: GameSettings.TryLimit[e.target.value],
              })
            },
          }}/>
        </label>}
        {options.timePerMove === undefined ? '' : <label className='action'>
          clock: &nbsp;<Select preserveCase {...{
            value:
              GameSettings.ValueToSetting(
                GameSettings.TimePresets,
                [
                  options.timePerMove || GameSettings.TimePerMove.none,
                  options.timePerPlayer || GameSettings.TimePerGame.none,
                ])
              || (options.timePerMove || options.timePerPlayer ? 'custom' : 'none'),
            options: [
              ...Object.keys(GameSettings.TimePresets),
            ],
            onChange: e => {
              const preset = GameSettings.TimePresets[e.target.value]
              handle.options({
                timePerMove: preset[0],
                timePerPlayer: preset[1],
              })
            },
          }}/>
        </label>}
      {/* </InfoSection>
      <InfoSection labels={[
        'play clock',
      ]}> */}
        {options.timePerMove === undefined ? '' : <label className='action' style={{ marginLeft: '1rem' }}>
          time limit per move: &nbsp;<Select preserveCase requireOption {...{
            value: GameSettings.ValueToSetting(GameSettings.TimePerMove, options.timePerMove),
            options: [
              ...Object.keys(GameSettings.TimePerMove),
            ],
            onChange: e => {
              handle.options({
                timePerMove: GameSettings.TimePerMove[e.target.value],
              })
            },
          }}/>
        </label>}
        {options.timePerPlayer === undefined ? '' : <label className='action' style={{ marginLeft: '1rem' }}>
          time limit per game: &nbsp;<Select preserveCase requireOption {...{
            value: GameSettings.ValueToSetting(GameSettings.TimePerGame, options.timePerPlayer),
            options: [
              ...Object.keys(GameSettings.TimePerGame),
            ],
            onChange: e => {
              handle.options({
                timePerPlayer: GameSettings.TimePerGame[e.target.value],
              })
            },
          }}/>
        </label>}
      </InfoSection>
      <InfoSection labels={[
        'variations',
      ]}>
        {/* {options.pattern === undefined ? '' : <label className='action'>
          pattern: &nbsp;<Select preserveCase {...{
            value: options.pattern,
            options: [
              ...Object.keys(GameSettings.MinefieldPatterns),
              'request a new pattern',
            ],
            // display: key => key.toUpperCase() || key,
            onChange: e => {
              const pattern = e.target.value
              if (pattern.includes('new pattern')) history.push('/contact')
              else handle.options({
                pattern: e.target.value,
              })
            },
          }}/>
        </label>} */}
        {/* {options.bombMultiplier === undefined ? '' : <label className='action'>
          bomb tiles: &nbsp;<Select preserveCase {...{
            value: GameSettings.ValueToSetting(
              GameSettings.BombTiles,
              [options.bombMultiplier, options.superbombs]),
            options: [
              ...Object.keys(GameSettings.BombTiles),
            ],
            onChange: e => {
              const [bombMultiplier, superbombs] = GameSettings.BombTiles[e.target.value]
              handle.options({ bombMultiplier, superbombs })
            },
          }}/>
        </label>} */}
        {options.bombMultiplier === undefined ? '' : <label className='action'>
          bomb tiles: &nbsp;<Select preserveCase {...{
            value: GameSettings.ValueToSetting(
              GameSettings.BombMultiplier, options.bombMultiplier)
              || GameSettings.BombMultiplier.on,
            options: [
              ...Object.keys(GameSettings.BombMultiplier),
            ],
            onChange: e => {
              handle.options({ bombMultiplier: GameSettings.BombMultiplier[e.target.value] })
            },
          }}/>
        </label>}
        {!options.bombMultiplier ? '' : <div className='group'>
          <div className='group-items'>
            <label className='action'>
              <input type='checkbox' checked={options.superbombs}
              onChange={e => handle.options({ superbombs: !options.superbombs })}/>
              superbombs
            </label>
            {symmetric}
          </div>
        </div>}
        {/* {options.bombMultiplier === undefined ? '' : <label className='action'>
          <input type='checkbox' checked={(options.bombMultiplier ?? 1) !== 1}
          onChange={e => handle.options({
            bombMultiplier: (options.bombMultiplier ?? 1) !== 1 ? 1 : 3,
          })}/>
          extra bombs (x3)
        </label>}
        {options.superbombs === undefined ? '' : <label className='action'>
          <input type='checkbox' checked={options.superbombs || false}
          onChange={e => handle.options({
            superbombs: !options.superbombs
          })}/>
          superbombs (8-tile explosion)
        </label>} */}
        {options.blanks === undefined ? '' : <label className='action'>
          blank tiles: &nbsp;<Select preserveCase {...{
            value: GameSettings.ValueToSetting(
              GameSettings.BlankTiles, options.blanks)
              || GameSettings.BlankTiles.on,
            options: [
              ...Object.keys(GameSettings.BlankTiles),
            ],
            // display: key => key.toUpperCase() || key,
            onChange: e => {
              handle.options({
                blanks: GameSettings.BlankTiles[e.target.value],
              })
            },
          }}/>
        </label>}
        {!options.blanks || options.bombMultiplier ? '' : <div className='group'>
          <div className='group-items'>
            {symmetric}
          </div>
        </div>}
        {/* {options.bombMultiplier && options.blanks ? symmetric : ''} */}
        {options.repeatWithDifferentTiles === undefined ? '' : <label className='action'>
          <input type='checkbox' checked={options.repeatWithDifferentTiles || false}
          onChange={e => handle.options({
            repeatWithDifferentTiles: !options.repeatWithDifferentTiles
          })}/>
          allow repeat words with different tiles
        </label>}
      </InfoSection>
      <InfoSection labels={[
        'win conditions',
      ]}>
        {gameSettings.options.winConditions === undefined ? '' :
        gameSettings.options.winConditions
          .map((item, i, arr) => <div key={item} style={{ marginBottom: '.25rem' }}>
            • &nbsp;{item} {create && arr.length > 1 ? <label className='action inline'
            onClick={e => {
              handle.options({
                winConditions: gameSettings.options.winConditions.filter(x => x !== item)
              })
            }}
            >remove</label> : ''}
          </div>)}
          {!create || gameSettings.options.winConditions === undefined ? '' :
          <label className='action'>
            add win condition: &nbsp;<Select preserveCase {...{
              value: '(select)',
              options: [
                ...Object.values(GameSettings.WinConditions).filter(x => !options.winConditions.includes(x)),
                'request a new condition',
              ],
              // display: key => GameSettings.WinConditions[key]?.toUpperCase() || key,
              onChange: e => {
                const condition = e.target.value
                if (condition.includes('new condition'))  outer.setModal('feedback')
                else handle.options({
                  winConditions:
                    [...new Set(gameSettings.options.winConditions.concat(e.target.value as GameSettings.WinConditions))]
                })
              },
            }}/>
          </label>}
      </InfoSection>
      <InfoSection labels={[
        'other',
      ]}>
        <label className='action'>
          theme: &nbsp;<Select requireOption {...{
            value: options.theme,
            options: [
              undefined,
              ...Object.keys(themes),
              'suggest a new theme',
            ],
            display: (x:string) => x || ' ',
            onChange: e => {
              const theme = e.target.value
              if (theme?.includes('new theme')) outer.setModal('feedback')
              else handle.options({ theme })
            },
          }}/>
        </label>
      </InfoSection>
      {create
      ?
      <InfoSection labels={[
      ]}>
        <div
        style={{
          float: 'left',
          // background: 'black', color: 'white',
          background: theme.bomb, color: creating ? theme.tile_3 : theme.tile,
          fontSize: '1.5rem', padding: '.3rem', borderRadius: '.3rem',
          height: '2.25rem', display: 'flex', alignItems: 'center',
          cursor: 'pointer',
          marginRight: '.5em',
        }}
        onClick={e => {
          setCreating(true)
          setTimeout(() => create && create !== true && create(gameSettings), 100)
        }}
        >{creating ? <><MiniLoader />&nbsp;</> : ''}create</div>
      </InfoSection>
      :''}
    </div>
  </Style>
  )
}

const Style = styled(SettingStyles)`
min-width: 25em;
`
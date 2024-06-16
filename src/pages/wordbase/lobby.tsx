import { info } from "console"
import { useState } from "react"
import { InfoBadges, InfoBody, InfoSection, InfoSelect, Loader } from "../../components/Info"
import api, { auth } from "../../lib/api"
import { useCached, useF, useI, useM, useR, useStyle } from "../../lib/hooks"
import { useSocket } from "../../lib/socket"
import { formatDuration, keyOf, set } from "../../lib/util"
import styled from "styled-components"
// import { ModalStyle } from "."
import { SettingStyles } from "../settings"
import { Board, GameSettings, Player } from "./board"
import { theme, themes } from "./common"
import { GamePreview } from "./preview"
import { ClockIcon } from "./progress"
import { Info } from "./save"
import css from "src/lib/css"
import { JSX } from "src/lib/types"
import { deleteGame } from "./data"

const previews: { [key:string]: Board } = {}
export const GameLobby = ({ open, setModal, create }) => {
  const [{ user }] = auth.use()
  
  const [hasNewInvites, setHasNewInvites] = useState(false)
  const [filledInvites, setFilledInvites] = useState(new Set())

  const [infoList, reloadInfoList] = useCached<Info[]>('wordbase-public-invites', async () => {
    const { invites } = await api.get('wordbase/invites/custom')
    console.debug('WORDBASE INVITES', invites)
    setHasNewInvites(false)
    setFilledInvites(new Set())
    return await Promise.all<Info>(invites
      .map(x => api.get(`wordbase/games/${x.id}`).then(({ info }) => Info.of(info))))
  })
  useF(reloadInfoList)
  useSocket({
    on: {
      'wordbase-public-invite': (type, id) => {
        switch (type) {
          case 'NEW':
            // setHasNewInvites(true)
            reloadInfoList()
            break
          case 'DELETE':
            setFilledInvites(new Set([id, ...filledInvites]))
            break
        }
      },
    },
  })

  const handle = {
    join: id => {
      api.post(`wordbase/games/${id}/accept`).then(() => {
        open(id)
        setModal(undefined)
      })
    },
  }

  useI(infoList, () => {
    infoList?.map(x => {
      if (!previews[x.id]) previews[x.id] = Board.new(x.settings, true)
    })
  })

  const [mode, setMode] = useState<GameSettings.Mode>(undefined)
  const [timed, setTimed] = useState<'any'|'no'|'yes'>(undefined)
  const [tries, setTries] = useState<string>(undefined)
  useF('LOBBY FILTER', mode, timed, console.debug)

  // only show one invite per setting state
  const filteredInfoList = useM(infoList, mode, timed, tries, () => {
    const seen = new Set()
    return infoList?.filter(x => {
      if (mode !== undefined && mode !== x.settings.mode) return false
      const { options } = x.settings
      if (timed !== undefined && timed !== ((options.timePerMove || options.timePerPlayer) ? 'yes' : 'no')) return false
      if (tries !== undefined && (tries === 'custom' ? options.tries === 3 : options.tries !== 3)) return false
      if (x.p1 === user || x.p2 === user) return true
      const settingState = JSON.stringify(x.settings)
      if (seen.has(settingState)) return false
      seen.add(settingState)
      return true
    })
  })

  // hacky style setting to align modal with top of window
  useStyle(`
  .modal > div {
    justify-content: flex-start;
    padding: 1em 0;
  }
  `)

  const deleted = useM(set)
  
  return !infoList ? <div><Loader />&nbsp;&nbsp;loading public invites</div> : <Style id='wordbase-lobby' className='body'>
    <InfoBody>
      <InfoSection labels={[
        'public invites',
        { new: create },
        hasNewInvites && { refresh: reloadInfoList },
      ]}>
        <InfoBadges labels={[
          <InfoSelect label='mode' inline
          value={mode} 
          options={[undefined, ...Object.values(GameSettings.Mode)]}
          display={x => x === undefined ? 'any' : x}
          onChange={e => setMode(e.target.value as GameSettings.Mode)} />,
          <InfoSelect label='clock' inline
          value={timed}
          options={[undefined, 'no', 'yes']}
          display={x => x || 'any'}
          onChange={(e:any) => setTimed(e.target.value)} />,
          <InfoSelect label='tries' inline
          value={tries} 
          options={[undefined, 'default', 'custom']}
          display={x => x ?? 'any'} 
          onChange={e => setTries(e.target.value as string)} />,
        ]} />
      </InfoSection>
      {!infoList
      ? <div><Loader />&nbsp;loading public invites</div>
      : !filteredInfoList.length
      ? <div>no open invites</div>
      : ''}
      {filteredInfoList?.map(x => {
        const settings: GameSettings = x.settings
        return <div 
        className={`inline-group lobby-item lobby-item-filled-${filledInvites.has(x.id)}`}>
          <GamePreview board={previews[x.id]} theme={settings.options.theme} />
          <div className='lobby-item-detail'>
            <InfoBadges labels={[
              settings.mode.toUpperCase(),
              {text:<>
              <ClockIcon/>{
              settings.options.timePerMove
              ? formatDuration(settings.options.timePerMove)
              : '-'
              }/{
              settings.options.timePerPlayer
              ? formatDuration(settings.options.timePerPlayer * 2)
              : '-'
              }
              </>},
              `${keyOf(GameSettings.TryLimit, settings.options.tries)} tries`,
            ]} />
            <div className='flex column description'>
              {settings.options.repeatWithDifferentTiles ? <span>repeats allowed with different tiles</span> : ''}
              <span>{settings.options.winConditions.join(', ')} to win</span>
            </div>
            <div className='spacer' />
            <InfoBadges labels={[
              ...(
              deleted.has(x.id) ? ['deleted'] :  
              filledInvites.has(x.id) ? ['filled'] :
              x.p1 === user || x.p2 === user ? [
                'created',
                { delete: () => {
                  deleteGame(x)
                  deleted.add(x.id)
                } },
              ] :
              [
                { join: () => handle.join(x.id) },
                x.lang !== 'english' && x.lang,
              ]),
            ]} />
          </div>
        </div>
      })}
    </InfoBody>
  </Style>
}

const Style = styled(SettingStyles)`
&#wordbase-lobby {

  .lobby-item {
    display: flex;
    width: -webkit-fill-available;

    &.lobby-item-filled-true {
      opacity: .3;
    }

    .lobby-item-detail {
      display: flex;
      flex-direction: column;
      min-height: 100%;
      flex-grow: 1;

      border: 0.15em solid transparent;
      border-radius: 0.2em;

      background: linear-gradient(#fff5 0 0) ${theme.bomb_1};
    }
  }

  .clock-icon {
    display: flex;
  }
}
`

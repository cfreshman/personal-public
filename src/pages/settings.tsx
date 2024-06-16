import React, { Fragment, useState } from 'react'
import { Link, useHistory } from 'react-router-dom'
import { Tooltip, openFeedback } from 'src/components/Modal'
import styled from 'styled-components'
import { HalfLine, Help, InfoBadges, InfoBody, InfoLine, InfoLines, InfoLoginBlock, InfoSection, InfoStyles, Select } from '../components/Info'
import api from '../lib/api'
import { useF, useM, useR } from '../lib/hooks'
import { useAuth, usePageSettings, useTypedPathHashState, useTypedPathState } from '../lib/hooks_ext'
import { JSX, truthy } from '../lib/types'
import url from '../lib/url'
import user, { settingAction, settingBoolean, settingField, settingLabel, settingOptions, settingText, SettingType, typeOfSetting } from '../lib/user'
import { isMobile, set, toStyle } from '../lib/util'
import css from 'src/lib/css'

export { Select }

export default ({ app, close }: {
  app?: string, close?: any
}) => {
  const auth = useAuth()
  const history = useHistory()
  const [loaded, setLoaded] = useState(false)
  const [profile, setProfile] = useState(undefined)
  // useF(profile, () => console.debug('SETTINGS PROFILE'))
  const [settings] = user.settings.use()

  const [info, setInfo]: [{ [key: string]: any }, any] = useState({})
  const searchRef = useR()

  useF(auth.user, () => {
    handle.load()
    searchRef.current?.focus()
  })
  const handle = {
    load: () => {
      if (auth.user) {
        api.get(`/profile/${auth.user}`).then(handle.parse)
      } else {
        setProfile(undefined)
        setLoaded(true)
      }
    },
    parse: data => {
      if (data.profile) {
        const { friends, follows, followers } = data.profile
        const info: any = {}
        if (auth.user) {
          info.isUser = true
          const friendSet = new Set(friends)
          const followerSet = new Set(followers)
          if (info.isUser) {
            info.requests = followers.filter(f => !friendSet.has(f))
          } else {
            info.isFriend = friendSet.has(auth.user)
            info.canFollow = !followerSet.has(auth.user)
            info.canUnfollow = followerSet.has(auth.user)
          }
        }
        setInfo(info)
        if (!data.profile.settings) data.profile.settings = {}
      }
      setProfile(data.profile)
      setLoaded(true)
    },
    search: () => {
      const search = searchRef.current?.value
      search && history.push(`/search#${search}`)
    },
    settings: (field, value) => {
      user.settings.update(field, value)
    },
  }

  // useTimeout(() => {
  //   document.querySelector(location.hash)?.scrollIntoView({
  //     behavior: "smooth",
  //     block: "center",
  //     inline: "nearest"
  //   })
  // }, 100)

  const nonPage = useM(() => set('account miscellaneous danger'))
  const [pages, setPages] = app ? [[app], ()=>{}] : useTypedPathHashState({
    prefix: 'settings',
    from: (p, h) => (p + ',' + h).split(',').filter(truthy),
    to: x => x?.length === 1 ? [x[0] + location.search, ''] : [location.search, (x || []).join(',')],
  })
  const search = new URLSearchParams(location.search)
  app = app || search.get('app')
  const page = pages?.length === 1 ? pages[0] : false
  const [expanded, setExpanded] = useState(new Set([...nonPage, ...(pages || [])]))
  useF(expanded, () => {
    setPages([...expanded].filter(x => !nonPage.has(x)))
  })
  const app_setting_order = useM(() => Object
    .entries(user.settings.fields)
    .map<[number, [string, settingField]]>((x, i) => 
      [i, x as unknown as [string, settingField]])
    .sort((a, b) => {
      if (a[1][0] === page) return -1
      if (b[1][0] === page) return 1
      return a[0] - b[0]
    })
    .map(x => x[1]))
  const app_settings = useM(app, settings, expanded, () => {
    return app_setting_order.map(([section, fields]) => {
      const isNonPage = nonPage.has(section)
      const isMisc = section === 'miscellaneous'
      if (app && !isMisc && app !== section) return
  
      const labelToText = (option: string, label: settingLabel) =>
        {
          try {
            return typeof label === 'function' ? label() : label !== undefined ? label : option
          } catch (e) {
            console.debug(label)
            throw e
          }
        }
  
      const items = []
      let group: { text, items: any[] }
      const finishGroup = () => {
        if (!group) return
        items.push(
        <div className='group' key={items.length}>
          {group.text ? <div className='description'>{group.text}:</div> : null}
          <div className={`group-items inline`}
          style={{ display: 'flex', flexWrap: 'wrap', marginLeft: group.text ? '1rem' : 0 }}>
            {group.items.map((item, i) => <>
              {item}
            </>)}
          </div>
        </div>)
      }
      const startGroup = (option, field) => {
        finishGroup()
        group = { text: labelToText(option, field), items: [] }
        if (group.text.startsWith('ungroup')) group = undefined
      }
  
      const optionToElement = (option: string, field: settingField) => {
        const settingType = typeOfSetting(field)
        const query = `${section}.${option}`
        let typedField, element
        switch (settingType) {
          case SettingType.BOOLEAN:
            typedField = field as settingBoolean
            return <div key={items.length}>
              <label className='action'>
                <input type='checkbox' checked={settings[query] ?? typedField.default}
                onChange={e => handle.settings(query, !(settings[query] ?? typedField.default))}/>
                &nbsp;
                {labelToText(option, typedField.label)}
              </label>
            </div>
          case SettingType.TEXT:
            typedField = field as settingText
            return <div key={items.length}>
              <label className='action'>
                <span>{labelToText(option, typedField.label)}:&nbsp;</span>
                <input type='text' value={typedField.value} placeholder={typedField.default||labelToText(option, typedField.label)} onChange={e => {
                  const value = e.target.value
                  if (!typedField.override || !typedField.override(value)) {
                    handle.settings(query, value)
                  }
                }} />
              </label>
            </div>
          case SettingType.OPTIONS:
            typedField = field as settingOptions
            return <div key={items.length}>
              <label className='action' onClick={e => {
                document.body.click()
                const select = e.currentTarget.querySelector('select')
                setTimeout(() => {
                  select.click()
                })
              }}>
                {
                  labelToText(option, typedField.label) ? <>
                    {labelToText(option, typedField.label)}: &nbsp;
                  </>:null
                }<Select {...{
                  value: settings[query] ?? typedField.default,
                  options: typedField.options,
                  display: typedField.display,
                  onChange: e => {
                    const value = e.target.value
                    if (!typedField.override || !typedField.override(value)) {
                      handle.settings(query, value)
                    }
                  },
                }}/>
              </label>
            </div>
          case SettingType.ACTION:
            typedField = field as settingAction
            return <div key={items.length}>
              <label className='action' onClick={() => typedField?.action()?.then(() => handle.settings('', ''))}>
                {labelToText(option, typedField.label)}
              </label>
            </div>
          case SettingType.GROUP:
            startGroup(option, field)
        }
      }
  
      Object.entries<any>(fields).map(([ option, field ]) => {
        let element = optionToElement(option, field)
        if (element) {
          if (field.description) {
            element = <>
              {element}
              <div className='setting-description'>{field.description}</div>
            </>
          }
          if (field.tooltip) {
            element = <span style={toStyle(`
            display: inline-flex;
            align-items: center;
            gap: calc(.25em + 2px);
            `)}>
              {element}
              <Help>
                {field.tooltip}
              </Help>
            </span>
          }
          if (group) group.items.push(element)
          else items.push(element)
        }
      })
      finishGroup()
  
      const sectionExpanded = expanded.has(section) || app === section
      const get_section_label = (section) => `/${{
        'capitals': 'lettercomb',
      }[section] || section}`
      return <>
        <InfoBadges key={section} id={section} labels={
          isNonPage || section === app
          ? [get_section_label(section)]
          : [
            {
              text: get_section_label(section),
              func: () => app ? close() : url.push(`/${section}`),
            },
            {
              text: sectionExpanded ? 'collapse' : 'expand',
              func: () => {
                if (sectionExpanded) {
                  expanded.delete(section)
                  setExpanded(new Set([...expanded]))
                } else {
                  setExpanded(new Set([...expanded, section]))
                }
              }
            }
          ]}/>
          {sectionExpanded ? items : null}
          {sectionExpanded ? <HalfLine /> : null}
      </>
    })
  })

  usePageSettings()
  return <InfoLoginBlock to='change settings'><SettingStyles>
    {/* <InfoSearch {...{searchRef, placeholder: 'find a page', search: handle.search}}/> */}

    <InfoBody className='personal'>
    {profile ?
    <>
      {app ? '' :
      <InfoSection>
        welcome {profile.user}.<br/>
        <br/>
        {/* <span style={{fontSize:'.7em'}}>These settings apply to all pages on {location.host}</span><br/> */}
      </InfoSection>
      }
      <InfoSection labels={[
        // 'account',
      ]} style={{gap:0}}>
        {[
          ['/profile', 'view friends & accept requests'],
          ['/notify', 'email & notification settings'],
          ['/reset', 'update password'],
        ].map(([k, v]) =>
        <InfoBadges key={k} labels={[
          {
            text: k,
            href: k,
          },
          v,
        ]} />)}
        <HalfLine ratio={.25} />
        {app_settings.map((x,i,a)=>i===a.length-1?<><HalfLine ratio={.25} />{x}</>:x)}
        <HalfLine />
      </InfoSection>
      {app
      ?
      <InfoSection>
        <div className='action' onClick={() => {
          if (window === window.top) {
            url.push('/settings')
          } else {
            window.top.history.pushState(null, '', '/settings')
          }
        }}>view settings for other apps</div>
        <div className='action' onClick={() => openFeedback()}>send me feedback (new theme idea?)</div>
      </InfoSection>
      :''}
    </> : ''}
    </InfoBody>
  </SettingStyles></InfoLoginBlock>
}

export const SettingStyles = styled(InfoStyles)`&{
  #account {
    .entry-line {
      a {
        min-width: 5rem;
      }
    }
  }
  
  .group {
    align-items: stretch;
  }
  .group-items {
    > * {
      display: inline-flex;
      align-items: flex-start;
      &:not(:last-child) {
        margin-right: .25em;
      }
  
      > .action {
        height: 100% !important;
      }
    }
  }
  label.action {
    margin: 0;
    display: flex !important; align-items: center !important;
    & input {
      margin: 0 !important;
    }
  }
  .setting-description {
    font-size: .7em;
    opacity: .7;
    white-space: pre-wrap;
    margin-left: 1em;
  }
  
  .wordbase-language {
    .select, option {
      text-transform: uppercase;
      option:last-child {
        text-transform: none;
      }
    }
  }
  
  .body {
    ${css.mixin.column};
  }
  .section {
    ${css.mixin.column};
    br {display:none}
    gap: 2px;
  
    .group .group-items {
      gap: 2px;
      > * {margin:0}
    }
  }
}`
import { openFeedback } from 'src/components/Modal';
import { theme as wordbase_theme, themes as wordbase_themes, visible_theme_names as wordbase_visible_theme_names } from '../pages/wordbase/common';
import { languages, setLang } from '../pages/wordbase/dict';
import api from './api';
import { auth, logout } from './auth';
import { store } from './store';
import { trigger, TriggerValue } from './trigger';
import { action, anyFields, fields, supplier, transform } from './types';
import url from './url';
import { S, dev, getCssVar, isMobile, originalSearch, randi, range, set, squash, timezoneOffset } from './util';
import { ColorPicker } from 'src/components/Info';
import { meta } from './meta';
// import { setBackground, setTextColor } from './hooks_ext';
import { readable_text } from './color';
import { useS } from './hooks';
import { socket } from './socket';
import { parsePage } from './page';
import { themes as capitals_themes, visible_theme_names as capitals_visible_theme_names, music_options as capitals_music_options } from '../pages/lettercomb/theme';
import { visible_theme_names as letterpress_visible_theme_names } from '../pages/letterpress/theme';
import { greeter_export, greeter_friendversary_export } from 'src/pages/greeter/export';
import { message } from './message';

const { named_log, defer } = window as any
const log = named_log('lib/user')


export const profile = Object.assign(trigger.implicit<anyFields & {
  bio?: string, recents?: string[], settings: anyFields
}>({ settings: {} }), {
  refresh: (newProfile = undefined) => {
    // console.debug('REFRESH PROFILE', Object.clone(newProfile))
    const update = newProfile => {
      delete newProfile?.settings?.fields
      const compiled = Object.assign(Object.clone(profile.get()), Object.clone(newProfile))
      console.debug('USER PROFILE', Object.clone(compiled))

      const search = originalSearch
      const urlSettings = Array.from(search.entries()).filter(([k]) => k.includes('settings.'))
      if (urlSettings.length) {
        if (!newProfile.settings) {
          newProfile.settings = {}
        }
        const changes = urlSettings
          .map(([k, v]) => {
            search.delete(k)
            return [k.replace('settings.', ''), v]
          })
          .filter(([k, v]) => newProfile.settings[k] !== v)
          .map(([k, v]) => ({ [k]: v }))
        if (changes.length) {
          newProfile.settings['next'] = false
          settings.update(squash(changes))
          if (newProfile.settings['next']) {
            const to = newProfile.settings['next']
            if (to[0] === '/') url.push(to)
          } else {
            return
          }
        }
      }

      profile.set(compiled)
    }
    if (newProfile) update(newProfile)
    else if (!auth.user) profile.set()
    else api.get(`profile/${auth.user}`).then(({ profile }) => update(profile))
  }
})
socket.add(instance => {
  instance?.on('user:profile', (...x) => {
    console.debug('profile update', x)
    profile.refresh()
  })
}, true)

export type settingLabel = string | supplier<string>
export type settingGroup = settingLabel
export interface settingAction {
  action: action
  label?: settingLabel
}
interface settingBase<T> {
  default?: T
  label?: settingLabel
  classes?: string
  trigger: (option: T) => unknown
  description: string,
  tooltip: string,
}
export type settingBoolean = settingBase<boolean>
export interface settingText extends settingBase<string> {
  text: true,
}
export interface settingOptions extends settingBase<string> {
  options: string[]
  display?: transform<string, string>
  override?: (option: string) => boolean
}
export type settingField = settingBoolean | settingText | settingOptions | settingGroup | settingAction
export enum SettingType { BOOLEAN, TEXT, OPTIONS, ACTION, GROUP }
export const typeOfSetting = value => {
  if (value.text) return SettingType.TEXT
  if (value.options) return SettingType.OPTIONS
  if (value.action) return SettingType.ACTION
  if (value.label || value.default !== undefined) return SettingType.BOOLEAN
  return SettingType.GROUP
}

type settingBooleanAndValueTemplate = settingBoolean | boolean
type settingOptionsAndValueTemplate = settingOptions | string


type settingFieldValues = {
  wordbase: {
    language: string
    chat: boolean,
    customize: boolean,
    desktopDrag: boolean,
    playFrom: 'default'|'bottom'|'top',
    theme: string,
    full: boolean,
    anim3D: boolean,
    shortStatus: boolean,
    localFlip: boolean,
    hideButtons: boolean,
  },
  capitals: {
    chat: boolean,
    theme: string,
    reacts: string,
    // music: string,
  },
  letterpress: {
    chat: boolean,
    theme: string,
    reacts: string,
    // music: string,
  },
  petals: {
    chat: boolean,
    theme: string,
    reacts: string,
  },
  greeter: {
  },
}
const settingFields = {
  wordbase: {
    language: {
      default: 'english',
      options: Object.keys(languages).concat(['request a new language']),
      display: value => value === 'english' ? 'english (US)' : value,
      override: value => {
        if (!languages[value]) {
          // url.push('/contact')
          openFeedback({ title: 'Request a new language' })
          return true
        }
        setLang(value)
      },
    },
    chat: {
      default: true,
      label: 'enable game chat',
    },
    customize: {
      label: 'customize game invites',
    },
    desktopDrag: {
      default: true,
      label: 'desktop: auto-drag tiles',
    },
    playFrom: {
      label: 'play from',
      default: 'default',
      options: [
        'default',
        'bottom',
        'top',
      ],
    },
    theme: {
      default: 'default',
      options: wordbase_visible_theme_names.concat(['suggest a new theme']),
      override: value => {
        if (!wordbase_themes[value]) {
          // url.push('/contact')
          openFeedback({ title: 'Suggest a new theme' })
          return true
        }
        wordbase_theme.set(wordbase_themes[value])
      },
    },
    visualTweaks: 'visual tweaks',
    full: {
      default: isMobile,
      label: 'fullscreen',
      trigger: () => window.dispatchEvent(new Event('resize'))
    },
    anim3D: {
      default: true,
      label: '3D animations',
    },
    shortStatus: {
      label: 'simple status',
    },
    localFlip: {
      label: 'flip local games'
    },
    hideButtons: {
      default: true,
      label: 'hide PREVIOUS / REPLAY',
    },
  },
  capitals: {
    chat: {
      default: true,
      label: 'enable game chat',
    },
    // customize: {
    //   label: 'customize game invites',
    // },
    // playFrom: {
    //   label: 'play from',
    //   default: 'default',
    //   options: [
    //     'default',
    //     'bottom',
    //     'top',
    //   ],
    // },
    theme: {
      default: 'default',
      options: capitals_visible_theme_names,
    },
    // visualTweaks: 'visual tweaks',
    // full: {
    //   default: isMobile,
    //   label: 'fullscreen',
    //   trigger: () => window.dispatchEvent(new Event('resize'))
    // },
    // localFlip: {
    //   label: 'flip local games'
    // },
    '':'',
    reacts: {
      label: 'emotes',
      default: '😀😎😭🫠😈', text:true,
      override: value => {
        value = [...value].slice(-5).join('')
        settings.update('capitals.reacts', value)
        return true
      },
    },
    reacts_reset: {
      label: 'reset',
      action: () => {
        settings.update('capitals.reacts', undefined)
      },
    },
    ' ':'ungroup',
    // music: {
    //   default: capitals_music_options[0],
    //   options: capitals_music_options,
    // },
  },
  letterpress: {
    chat: {
      default: true,
      label: 'enable game chat',
    },
    // customize: {
    //   label: 'customize game invites',
    // },
    // playFrom: {
    //   label: 'play from',
    //   default: 'default',
    //   options: [
    //     'default',
    //     'bottom',
    //     'top',
    //   ],
    // },
    theme: {
      default: 'default',
      options: letterpress_visible_theme_names,
    },
    // visualTweaks: 'visual tweaks',
    // full: {
    //   default: isMobile,
    //   label: 'fullscreen',
    //   trigger: () => window.dispatchEvent(new Event('resize'))
    // },
    // localFlip: {
    //   label: 'flip local games'
    // },
    '':'',
    reacts: {
      label: 'emotes',
      default: '😀😎😭🫠😈', text:true,
      override: value => {
        value = [...value].slice(-5).join('')
        settings.update('letterpress.reacts', value)
        return true
      },
    },
    reacts_reset: {
      label: 'reset',
      action: () => {
        settings.update('letterpress.reacts', undefined)
      },
    },
    ' ':'ungroup',
    // music: {
    //   default: capitals_music_options[0],
    //   options: capitals_music_options,
    // },
  },
  // petals: {
  //   chat: {
  //     default: true,
  //     label: 'enable game chat',
  //   },
  //   '':'',
  //   reacts: {
  //     label: 'emotes',
  //     default: '😀😎😭🫠😈', text:true,
  //     override: value => {
  //       value = [...value].slice(-5).join('')
  //       settings.update('petals.reacts', value)
  //       return true
  //     },
  //   },
  //   reacts_reset: {
  //     label: 'reset',
  //     action: () => {
  //       settings.update('petals.reacts', undefined)
  //     },
  //   },
  //   ' ':'ungroup',
  // },
  dinder: {
    chat: {
      default: true,
    },
    resetFilter: {
      state: {
        reset: false,
      },
      action: () => {
        console.debug('RESET FILTER')
        api.delete('dinder/filter')
        settingFields.dinder.resetFilter.state.reset = true
        return Promise.resolve()
      },
      label: () => settingFields.dinder.resetFilter.state.reset
        ? `filters have been reset`
        : `reset category filters`,
    },
    carrySwipes: {
      default: false,
      label: 'carry swipes over to next day',
    },
    groupMatch: {
      default: true,
      label: 'allow matches with > 2 people',
      tooltip: 'everyone interested in the recipe will be added to the chat',
    },
    // dinnerTime: {
      cookHour: {
        label: 'cook at',
        default: '6pm',
        options: ['6am', '7am', '8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm'],
        tooltip: `we'll try to match you with someone at a similar time`,
      },
      '':'',
      dinnerTimezone: {
        label: `timezone`,
        default: Intl.DateTimeFormat().resolvedOptions().timeZone,
        // display: value => `${value} ${'Z'+timezoneOffset(value)}`,
        options: (Intl as any).supportedValuesOf('timeZone'),
        override: value => {
          settings.update('dinder.dinnerTimezoneOffset', (x => x < 0 ? x : '+'+x)(timezoneOffset(value)))
        },
      },
      dinnerTimezoneOffset: {
        label: ``,
        default: Number(
          new Intl.DateTimeFormat('en-US', {
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timeZoneName: "short",
          })
          .formatToParts(new Date())
          .filter(e => e.type === "timeZoneName")[0].value.replace('GMT', '')),
        options:
          range(-12, 12)
          .filter(x =>
            (Intl as any).supportedValuesOf('timeZone')
            .some(tz => timezoneOffset(tz) === x))
          .map(x => x < 0 ? x : '+'+x),
        override: x => {
          settings.update(
            'dinder.dinnerTimezone',
            (Intl as any).supportedValuesOf('timeZone')
            .map(tz => ({
              sort: tz.split('/')[1],
              tz,
            }))
            .sort((a, b) => -a.sort.localeCompare(b.sort))
            .find(({tz}) => timezoneOffset(tz) === Number(x))
            .tz
            )
        },
      },
    // },
  },
  ...(dev || true ? {
    greeter: {
      export: {
        label: 'export calendar',
        action: () => {
          defer(async () => {
            await greeter_export()
          })
        },
      },
      friendversaries: {
        label: 'export friendversaries',
        action: () => {
          defer(async () => {
            await greeter_friendversary_export()
          })
        },
      },
    },
  } : {}),
  miscellaneous: {
    theme: {
      PAGE_IGNORES: set('wordbase'),
      default: undefined,
      label: () => {
        // suggestions:
        // nice red: #ff6666
        return <div className='row' style={S(`padding: .33em 0`)}>
          theme&nbsp;
          <ColorPicker
          value={settings.theme || getCssVar('var(--id-color)')}
          onInput={e => {
            if (!settingFields.miscellaneous.theme.PAGE_IGNORES.has(parsePage())) {
              const color = e.target.value
              meta.theme_color.set(color)
            }
          }}
          onChange={e => {
            settings.update('theme', e.target.value)
          }}
          />
        </div>
      },
      action: () => {},
    },
    // themeReset: {
    //   label: 'reset',
    //   action: () => {
    //     settings.update('theme', undefined)
    //     location.reload()
    //   },
    // },
    '':'',
    themeReset: {
      label: 'unset theme',
      action: () => {
        settings.update('theme', undefined)
        location.reload()
      },
    },
    themeRandomize: {
      label: 'randomize theme',
      action: () => {
        settings.update('theme', `#${range(3).map(x => randi(256).toString(16).padStart(2, '0')).join('')}`)
      },
    },
    ' ':'ungroup',
    '  ':'',
    ...(() => {
      const theme_suggestions = {}
      ;['eeebe6', '15eba1', '7687fc', 'f7dc6f', '86b2ee', undefined].map((hex, i) => {
        theme_suggestions[`suggestion_${i+1}`] = {
          label: `${i?'':'suggested theme '}#${i+1}`,
          action: hex ? () => settings.update('theme', '#'+hex) : () => {
            // alert('i actually only have 1 suggestion rn :/ send some in! freshman.dev/contact')
            // ideas:
            // #4c8364
            message.trigger(`suggest #${i+1}! /contact`)
          },
        }
      })
      return theme_suggestions
    })(),
    // suggestion_1: {
    //   label: 'suggested theme #1',
    //   action: () => {
    //     // settings.update('theme', '#ff6666')
    //     settings.update('theme', '#509fe3')
    //   },
    // },
    // suggestion_2: {
    //   label: '#2',
    //   action: () => {
    //     settings.update('theme', '#15eba1')
    //   },
    // },
    // suggestion_3: {
    //   label: '#3',
    //   action: () => {
    //     settings.update('theme', '#7687fc')
    //   },
    // },
    // suggestion_4: {
    //   label: '#4',
    //   action: () => {
    //     // settings.update('theme', '#ffd700')
    //     settings.update('theme', '#F7DC6F')
    //   },
    // },
    // suggestion_5: {
    //   label: '#5',
    //   action: () => {
    //     // settings.update('theme', '#ffd700')
    //     settings.update('theme', '#F7DC6F')
    //   },
    // },
    // suggestion_6: {
    //   label: '#6',
    //   action: () => {
    //     // alert('i actually only have 1 suggestion rn :/ send some in! freshman.dev/contact')
    //     // ideas:
    //     // #4c8364
    //     message.trigger('suggest #5! /contact')
    //   },
    // },
    '   ':'ungroup',
    resetHints: {
      action: () => {
        console.debug('RESET HINTS')
        store.set('messages-seen', {})
        settings.update('hints', {})
      },
      label: () => `reset all hints (${Object.keys(settings['hints'] ?? {}).length})`,
    },
    logout: {
      action: () => logout(),
      label: 'log out',
    },
  },
  // danger: {
  //   cancelDownload: {
  //     action: () => {
  //       console.debug('CANCEL DOWNLOAD')
  //       settingFields.danger.download.state.confirm = false
  //       return Promise.resolve()
  //     },
  //     label: () => {
  //       return (settingFields.danger.download.state.confirm)
  //         ? 'cancel'
  //         : ''
  //     },
  //   },
  //   download: {
  //     state: {
  //       confirm: false,
  //       id: undefined,
  //     },
  //     action: () => {
  //       console.debug('DOWNLOAD')
  //       const { state } = settingFields.danger.download
  //       if (state.confirm) {
  //         if (!state.id) {
  //           return api.post('requests/download').then(({ id }) => {
  //             state.id = id
  //             state.confirm = true
  //           })
  //         }
  //       } else {
  //         state.confirm = true
  //         // setTimeout(() => state.confirm = false, 3000)
  //         return Promise.resolve()
  //       }
  //     },
  //     label: () => {
  //       const { confirm, id } = settingFields.danger.download.state
  //       return confirm
  //       ? 'confirm download?'
  //       : id
  //       ? `download #${id} - ready in ≤ 5 days`
  //       : `download data`
  //     },
  //   },
  //   cancelDelete: {
  //     action: () => {
  //       console.debug('CANCEL DELETE')
  //       settingFields.danger.delete.state.confirm = false
  //       return Promise.resolve()
  //     },
  //     label: () => {
  //       return (settingFields.danger.delete.state.confirm)
  //         ? 'cancel'
  //         : ''
  //     },
  //   },
  //   delete: {
  //     state: {
  //       confirm: false,
  //       id: undefined,
  //     },
  //     action: () => {
  //       console.debug('DELETE')
  //       const { state } = settingFields.danger.delete
  //       if (state.confirm) {
  //         if (!state.id) {
  //           return api.post('requests/delete').then(({ id }) => {
  //             state.id = id
  //             state.confirm = true
  //           })
  //         }
  //       } else {
  //         state.confirm = true
  //         // setTimeout(() => state.confirm = false, 3000)
  //         return Promise.resolve()
  //       }
  //     },
  //     label: () => {
  //       const { confirm, id } = settingFields.danger.delete.state
  //       return confirm
  //       ? 'confirm delete?'
  //       : id
  //       ? `delete #${id} - will confirm in ≤ 5 days`
  //       : `delete account`
  //     },
  //   },
  // }
}

type settingsType = fields<any> & { hints?, next?} & settingFieldValues

export const settings: settingsType & TriggerValue<settingsType> & {
  fields: typeof settingFields,
  update: (field_or_object: string | anyFields, value?: unknown, ...more_pairs) => unknown
} = Object.assign(trigger.implicit(profile.settings), {
  update: (field_or_object: string | anyFields, value?: unknown, ...more_pairs) => {
    if (typeof field_or_object === 'string') {
      profile.settings[field_or_object] = value
      while (more_pairs.length >= 2) {
        profile.settings[more_pairs[0]] = more_pairs[1]
        more_pairs = more_pairs.slice(2)
      }
    } else {
      Object.assign(profile.settings, field_or_object)
    }
    console.debug('UPDATE SETTINGS', Object.clone(profile.settings))
    delete profile.settings.filter
    settings.set(Object.assign({}, profile.settings))
    api.post(`/profile/settings`, profile).then(({ profile: value }) => profile.refresh(value))
  },
  fields: settingFields,
})
settings.add(value => {
  // set values on options
  Object.entries(settings.fields).map(([section, fields]) => {
    value[section] = {}
    Object.entries(fields).map(([option, field]) => {
      if (typeof field !== 'string') {
        field.value = value[section][option] = value[`${section}.${option}`] ?? field.default
        if (field.trigger) field.trigger(field.value)
      }
    })
  })
}, true)
profile.add(value => {
  console.debug('USER SETTINGS', Object.clone(profile.settings))
  settings.set(value.settings)
})

auth.add(value => {
  if (value && value.user !== profile.user) {
    profile.user = value.user
    profile.refresh()
  }
}, true)


export default {
  profile,
  settings,
}
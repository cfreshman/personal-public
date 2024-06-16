import api, { auth } from "src/lib/api"
import { dev } from "src/lib/util"

const { datetime, values, download } = window as any

const format_href = (href) => new URL(href, dev ? location.origin.replaceAll('3030', '5050') : location.origin).toString()
const format_link = (href, text=format_href(href)) => `<a href="${format_href(href)}">${text.replace(/https?:\/\//, '')}</a>`

const format_date = (t, next=false) => {
  const ymd = datetime.yyyymmdd(t + datetime.duration({ d: next ? 1 : 0, h:1 }))
  return ymd.replaceAll('-', '')
}
const get_date_interval = (item) => [format_date(item.t), format_date(item.t, true)]

const get_icon_desc = (item) => item.icon_url ? `${format_link(item.icon_url, 'ICON')}<br><br>` : ''
const get_notes_desc = (item, print_empty=false) => {
  const some_note = print_empty || values(item.public).some(x => x)
  return !some_note ? '' : `${item.users.filter(user => print_empty || item.public[user]).map(user => `<u>${user}'s note</u><br>${item.public[user]||`no notes by ${user}`}`).join('<br><br>')}<br><br>`
}
const get_links_desc = (item) => item.links.length ? `LINKS<br>${item.links.map(href => format_link(href)).join('<br>')}<br><br>` : ''
const get_ref_desc = (ref) => format_link(`/greeter/${ref}`)

const get_image = (item) => item.icon_url ? `IMAGE;VALUE=URI;DISPLAY=BADGE;FMTTYPE=image/png:${format_href(item.icon_url)}\n` : ''

const format_line = (line) => {
  // escape newlines and limit lines to 75 octets
  // TODO
  return line.replaceAll('\n', '\\n')
}

export const greeter_export = async () => {
  const user = auth.user
  const entered_user = prompt(`confirm your username to begin download:`)
  if (user !== entered_user) return
  let [{list:meet_list},{list:hangout_list}] = await Promise.all([
    api.get(`/greeter/meets/${user}`),
    api.get(`/greeter/hangouts/${user}`),
  ])
  alert(`for Google Calendar or others, you may want to create a new calendar first and import into that. importing is irreversable, but you can delete the new calendar`)

  meet_list = meet_list.filter(x => x.t)
  hangout_list = hangout_list.filter(x => x.t)

  const ics = 
`BEGIN:VCALENDAR
PRODID:-//freshman.dev//greeter//EN
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:greeter calendar
X-WR-TIMEZONE:${Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'}
X-WR-CALDESC:${user}'s freshman.dev/greeter/calendar
${meet_list.map(meet => {
  const [start_date, end_date] = get_date_interval(meet)
  return `BEGIN:VEVENT
DTSTART;VALUE=DATE:${start_date}
DURATION:P1D
UID:meet+${meet.id}@greeter.freshman.dev
${format_line(`DESCRIPTION:${get_icon_desc(meet)}${get_notes_desc(meet, true)}${get_links_desc(meet)}${get_ref_desc(meet.users.join('/met/'))}`)}
LOCATION:${meet.location || ''}
SEQUENCE:0
STATUS:CONFIRMED
SUMMARY:when ${meet.users[0]} & ${meet.users[1]} met
${get_image(meet)
}TRANSP:TRANSPARENT
${meet.icon_url ? `ATTACH;FILENAME=icon.png;FMTTYPE=image/png:${meet.icon_url}
`:''}END:VEVENT`
}).join('\n')}
${hangout_list.map(hangout => {
  const [start_date, end_date] = get_date_interval(hangout)
  return `BEGIN:VEVENT
DTSTART;VALUE=DATE:${start_date}
DURATION:P1D
UID:hangout+${hangout.id}@greeter.freshman.dev
${format_line(`DESCRIPTION:${get_icon_desc(hangout)}${get_notes_desc(hangout)}${get_links_desc(hangout)}${get_ref_desc(`hangout/${hangout.id}`)}`)}
LOCATION:${hangout.location || ''}
SEQUENCE:0
STATUS:CONFIRMED
SUMMARY:${hangout.title || hangout.location || datetime.yyyymmdd(hangout.t)}
${get_image(hangout)
}TRANSP:TRANSPARENT
${hangout.icon_url ? `ATTACH;FILENAME=icon.png;FMTTYPE=image/png:${hangout.icon_url}
`:''}END:VEVENT`
}).join('\n')}
END:VCALENDAR`

  await download(ics, `greeter-${Date.now()}.ics`)
}

export const greeter_friendversary_export = async () => {
  const user = auth.user
  const entered_user = prompt(`confirm your username to begin download:`)
  if (user !== entered_user) return
  const {list:meet_list} = await api.get(`/greeter/meets/${user}`)
  alert(`for Google Calendar or others, you may want to create a new calendar first and import into that. importing is irreversable, but you can delete the new calendar`)

  const ics = 
`BEGIN:VCALENDAR
PRODID:-//freshman.dev//greeter//EN
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:greeter calendar
X-WR-TIMEZONE:${Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'}
X-WR-CALDESC:${user}'s freshman.dev/greeter/calendar
${meet_list.map(meet => {
  const [start_date, end_date] = get_date_interval(meet)
  return `BEGIN:VEVENT
DTSTART;VALUE=DATE:${start_date}
DURATION:P1D
RRULE:FREQ=YEARLY;INTERVAL=1
UID:friendversary+${meet.id}@greeter.freshman.dev
${format_line(`DESCRIPTION:${get_icon_desc(meet)}${get_notes_desc(meet, true)}${get_links_desc(meet)}${get_ref_desc(meet.users.join('/met/'))}`)}
LOCATION:${meet.location || ''}
SEQUENCE:0
STATUS:CONFIRMED
SUMMARY:when ${meet.users[0]} & ${meet.users[1]} met
${get_image(meet)
}TRANSP:TRANSPARENT
${meet.icon_url ? `ATTACH;FILENAME=icon.png;FMTTYPE=image/png:${meet.icon_url}
`:''}END:VEVENT`
}).join('\n')}
END:VCALENDAR`

  await download(ics, `greeter-friendversaries-${Date.now()}.ics`)
}
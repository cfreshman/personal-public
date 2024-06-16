import React from 'react'
import { A } from '../components/Info'
import { truthy, JSX } from './types'
import { tokenize, strToStyle, node, S } from './util'

// create links without evaluating user input
//                              http or s         alphanum sub                   tail (doesn't cover
//                              |                 |    alpha domain or local     |     all cases)
const linkRegex =
  /(^|[^.\w\d\-_:/?=&%#@+\n])(?<href>(?:\w+?:\/\/)*(?:(?:(?:[\w\d-]+\.)+\w{1,}|localhost)(?:[\w\d\-_:/?=&%#@+.]{1,}))|(?:\d{1,3}\.){3}\d+)(\.(?:! ))?/im
const internalLinkRegex =
  /(^|[^.\w\d\-_:/?=&%#@+\n])(?<href>[/?](?:[\w\d\-_:/?=&%#@+.]{1,}[\w\d\-_]{1,}))(\.(?:! ))?/im

const OrRegExp = (a, b, flags=undefined) => {
  return new RegExp('(?:' + a.source + ')|(?:' + b.source + ')', [...new Set(flags ?? (a.flags + b.flags))].join(''))
}
const totalLinkRegex = OrRegExp(linkRegex, internalLinkRegex, 'gim')
export const extractLinks = x => Array.from<any>(x.matchAll(totalLinkRegex)).map(x => x.groups.href)
const _convertPart = (part, i, html=false, { new_tab=false }={}) => {
  const matches = [linkRegex.exec(part), internalLinkRegex.exec(part)]
  const m_i = matches.findIndex(truthy)
  const match = matches[m_i]
  if (match) {
    return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>
        {match[1]}<A tab={new_tab} href={match[2].includes('://') || match[2].startsWith('/') ? match[2] : 'http://'+match[2]}><TwitterEmoji word={match[2].trim().replace(/(.+:\/\/)?(https?:\/\/)?/, '')}/></A>{match[3]}
    </span>
  } else {
    return html
      ? <span key={i} dangerouslySetInnerHTML={{ __html: part }}></span>
      : <TwitterEmoji word={part} />
  }
}
export const convertLinks = (str, { new_tab=false }={}) => {
  if (!str) return ''
  if (typeof(str) === 'object') return str
  // determine indices to split links into separate parts
  const parts = tokenize(str, totalLinkRegex)
  return <>{parts.map((part, i) => _convertPart(part, i, undefined, { new_tab }))}</>
}
export const anchorRegex = /<a href="(.+)">(.+)<\/a>/gim
export const convertLinksAndHtml = str => {
  // first convert to HTML
  const html = node(`<span>${convertLinksToHtml(str)}</span>`)
  // recursively transform link text into tags
  const recurseLinkify = node => {
    if (node.children) {
      Array.from<any>(node.children).forEach(recurseLinkify)
    } else {
      node.innerHTML = convertLinksToHtml(node.textContent)
    }
  }
  recurseLinkify(html)

  // console.debug('CONVERTED STRING TO HTML', str, html.innerHTML)

  // then return JSX node from html node
  return <span dangerouslySetInnerHTML={{ __html: html.innerHTML }}></span>

  // determine indices to split links into separate parts
  // const parts = tokenize(str, OrRegExp(totalLinkRegex, anchorRegex))
  // console.debug(`CONVERT HTML`, parts)
  // return parts.map((part, i) => {
  //   let match
  //   if ((match = anchorRegex.exec(part))) {
  //     return <a key={i} href={match[1]}><TwitterEmoji word={match[2]} /></a>
  //   } else return _convertPart(part, i, true)
  // })
}
export const convertLinksToHtml = str => {
  // determine indices to split links into separate parts
  const parts = tokenize(str, OrRegExp(totalLinkRegex, anchorRegex))
  return parts.map(part => {
    if (anchorRegex.exec(part)) {
      return part
    } else if (linkRegex.test(part)) {
      return part
        .replace(linkRegex, `$1<a href="http://$2">$2</a>$4`)
        .replace(/\$4/, '')
        .replace('http://http', 'http')
    } else if (internalLinkRegex.test(part)) {
      return part
        .replace(internalLinkRegex, `$1<a href="$2" onclick="
        const e = event
        if (!e.metaKey && e.target.href.replace(location.origin, '') !== location.pathname) {
          e.preventDefault()
          history.pushState(null, '', e.target.href.replace(location.origin, ''))
        }
        ">$2</a>$4`)
        .replace(/\$4/, '')
    } else {
      return part
    }
  }).join('')
}

export const TwitterEmoji = ({ letter=undefined, word=undefined }) => {
  // ehhhhhhhh nvm
  return letter || word
  
  if (letter) return <>
    <span /* for textContent */ style={{ display: 'none' }}>{letter}</span>
    <img alt={letter} draggable="false"
    // tweak to fix mammoth emoji position
    style={strToStyle(`
    width: 1.5em;
    position: relative;
    top: ${letter === '🦣' ? '-.25em' : '0'};
    `)}
    src={`https://abs-0.twimg.com/emoji/v2/svg/${letter.codePointAt(0).toString(16)}.svg`} />
  </>

  if (word) {
    const parts: any = ['']
    Array.from<string>(word).map(letter => {
      if (letter.length > 1 && /\p{Emoji}/u.test(letter)) {
        parts.push(<TwitterEmoji letter={letter} />, '')
      } else {
        parts[parts.length-1] += letter
      }
    })
    return <span style={{ whiteSpace: 'pre-wrap' }}>{parts.filter(truthy)}</span>
  }

  throw 'must specify letter or word'
}

export const scriptRegex = /<script>([^]+)<\/script>/gim
export const extractScript = content => {
  let script = ''
  let text = ''
  if (typeof(content) === 'string') {
    // determine indices to split links into separate parts
    const splits = [0]
    Array.from(content.matchAll(scriptRegex))
      // .concat(Array.from(str.matchAll(internalLinkRegex)))
      .map(match => {
        splits.push(match.index, match.index + match[0].length)
      })
    splits.push(content.length)
    const parts = splits.slice(1).map((s, i) => content.slice(splits[i], s)).filter(s => s)
    // if (parts.length > 1) {
    //   console.debug(str, str.split(linkRegex).filter(part => part))
    //   console.debug(Array.from(str.matchAll(linkRegex)))
    //   console.debug(splits, parts)
    // }
    parts.map(part => {
      const match = scriptRegex.exec(part)
      if (match) script += match[1] + '\n'
      else text += part
    })
  } else {
    text = content
  }
  return { script, text }
}


export const svg = (shapes) => <svg viewBox='0 0 1 1' style={S(`
width: 1em; height: 1em;
`)} dangerouslySetInnerHTML={typeof shapes === 'string' ? {__html:shapes} : undefined}>{shapes}</svg>
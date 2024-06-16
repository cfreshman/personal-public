import React, { Fragment, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { InfoAutoSearch, InfoBadges, InfoBody, InfoSection, InfoStyles } from '../components/Info';
import { Scroller } from '../components/Scroller';
import { useF, useM, useR, useStyle } from '../lib/hooks';
import { useHash, usePageSettings, usePathState } from '../lib/hooks_ext';
import { alpha, projects, projectTags, searchProjects, tags } from '../lib/projects';
import { Q, QQ, defer, fromHash, isMobile } from '../lib/util';
import { JSX, pass, truthy } from 'src/lib/types';
import { dangerous } from 'src/components/individual/Dangerous';
import { exists } from 'fs';


function encode(str: string) {
    return str.replace(/ /g, '+')
    // return encodeURIComponent(str.replaceAll(' ', '+'))
}
function decode(str: string) {
    // return str.replaceAll('+', ' ')
    return decodeURIComponent(str.replace(/\+/g, ' '))
}

const SearchEntry = ({page, regex, tabbed, doTab, setTags}) => {
    const entryRef = useR()
    const p = projects[page]

    const highlight = html => !regex ? html : html.split('<a')
        .map((text, i) => {
            if (i > 0) {
                const split = text.split('>')
                split[1] = split[1].replace(regex, `<span class="highlight">$1</span>`)
                return split.join('>')
            } else {
                return text.replace(regex, `<span class="highlight">$1</span>`)
            }
        }).join('<a')

    useF(tabbed, () => {
        if (tabbed) {
            entryRef.current.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "nearest"
            })
        }
    })
    
    useF(tabbed, () => tabbed && Q(`.tabbed`).scrollIntoView({ block:'nearest' }))
    return <div className={`entry ${tabbed || isMobile ? 'tabbed' : ''}`} ref={entryRef} onClick={doTab}>
        <InfoBadges className='title' labels={[
            // { [tabbed ? '-': '+']: e => {
            //     e.stopPropagation()
            //     doTab(!tabbed)
            // } },
            // {
            //     text: '/' + highlight(p[0] ? `${page}: ${p[0]}` : page),
            //     href: `/${page}`,
            // },
            {
                text: dangerous('/' + highlight(p[0] ? `${page}: ${p[0]}` : page)),
                func: e => {
                    doTab(!tabbed)
                }
            },
            { 
                text: 'open',
                href: `/${page}`,
            },
            ...(projectTags[page] ?? []).map(tag => ({
                [tag]: () => setTags([tag]),
                label: true,
            }))
        ]} />
        <div className='desc' dangerouslySetInnerHTML={{__html: highlight(projects[page][1] || page) }}></div>
    </div>
    // <div className='desc' dangerouslySetInnerHTML={{__html: highlight(projects[page][1]) }}></div>
    // return (
    // <div className={tabbed || isMobile ? 'entry tabbed' : 'entry'} ref={entryRef} onClick={doTab}>
    //     <div className='entry-hover'>
    //     </div>
    // </div>
    // )
}
const SearchList = ({results, regex, tab, setTab, setTags}) => <>
    {results.map((p, i) =>
        <SearchEntry key={i} page={p} regex={regex}
        tabbed={i === tab ? true : false} doTab={(tab=true) => setTab(tab ? i : undefined)} setTags={setTags} />)}
</>

export default () => {
    usePageSettings({
        professional: true,
    })
    const searchRef = useR()
    const history = useHistory()
    const [[_term=[], tagList=[]], setPath] = usePathState({
        from: (x) => x.split('/').map(y => y.split('&').filter(truthy).map(decode)),
        to: (x) => x.some(y => y.some(truthy)) ? x.map(y => y.map(encode).join('&') || '&').join('/') : '',
    })
    const term = _term.join(' ')
    const _setPath = (term, tagList) => setPath([term.split(' '), tagList])
    const setTerm = (term) => _setPath(term, tagList)
    const setTags = (tagList) => _setPath(term, tagList)

    let regex
    try {
        regex = term ? new RegExp(`(${term})`, 'gi') : ''
    } catch (_) {
        regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    }
    const calcResults = (term, tagList) => {
        const alphaCompare = (a: string, b: string) => {
            const aAlpha = alpha.includes(a[0])
            const bAlpha = alpha.includes(b[0])
            if (aAlpha === bAlpha) return a.localeCompare(b);
            else if (aAlpha) return -1;
            else if (bAlpha) return 1;
        }
        return (tagList.length === 0
            ? searchProjects
            : searchProjects
                // .filter(p => (projectTags[p] || [])
                //     .some(field => tagList.includes(field)))
                .filter(p => tagList
                    .every(t => (projectTags[p] || [])
                        .includes(t)))
        )
            .filter(p => [p].concat(projects[p]).some(field => field.match(regex))
                || (projectTags[p] || []).some(tag => tag.match(regex)))
            .sort((a, b) => {
                if (a === term) return -1;
                if (b === term) return 1;
                const aHas = [a, projects[a][0]].some(field => field.match(regex));
                const bHas = [b, projects[b][0]].some(field => field.match(regex));
                if (aHas === bHas) return alphaCompare(a, b)
                else if (aHas) return -1;
                else if (bHas) return 1;
            })
    }
    const results = useM(term, tagList, () => calcResults(term, tagList))
    const [tab, setTab] = useState(0)

    useF(() => QQ('#main input').find(truthy).focus())
    // useF(() => defer(() => searchRef.current.focus()))
    // useHash({}, term, tagList, () => {
    //     setResults(calcResults(term, tagList))
    //     return encode(term) + (tagList.length ? `?${encode(tagList.join('&'))}` : '')
    // })
    const handle = {
        search: () => {
            const current = searchRef.current;
            if (current) {
                const search = (current as HTMLInputElement).value
                setTerm(search.toLowerCase())
                setTab(search ? 0 : -1)
            }
        },
        go: () => {
            const selected = results[tab] || searchRef.current.value
            if(0){}
            else if (selected === 'all') {
                results.map(result => window.open(location.origin + '/' + result, '_blank'))
            } 
            else if (selected) {
                history.push(`/${selected}`)
            }
        },
    }

    useStyle(`
    #inner-index {
        width: 100% !important;
    }
    `)
    return <Style>
        <InfoAutoSearch {...{
            searchRef,
            term,
            placeholder: 'find a page',
            search: handle.search,
            go: handle.go,
            tab: (dir) => setTab((tab + dir + results.length) % results.length),
        }}/>
        <InfoBody>
            <Scroller />
            <InfoSection className='tags'
                labels={['', ...Object.keys(tags).map(tag => {
                    const on = tagList.includes(tag)
                        || (tag === 'all' && !tagList.length)
                    // const style: React.CSSProperties =
                    //     on
                    //     ? { background: 'black', color: 'white', opacity: .4 }
                    //     : undefined
                    const style = undefined
                    const func = () => {
                        if (tag === 'all') {
                            setTags([])
                        } else {
                            if (tagList.includes(tag)) {
                                setTags(tagList.filter(t => t !== tag))
                            } else {
                                // setTags(tagList.concat([tag]))
                                setTags([tag])
                            }
                        }
                        // setTag(tag === 'all' ? '' : tag)
                    }
                    return {
                        text: tag,
                        style,
                        func,
                        label: on,
                    }
                })]} />
            {/* <InfoSection label='results' className='results'> */}
            <InfoSection className='results'>
                <SearchList {...{ regex, results, tab, setTerm, setTab, setTags }} />
            </InfoSection>
        </InfoBody>
    </Style>
}

const Style = styled(InfoStyles)`
${isMobile ? '' : 'min-width: min(40em, 100%);'}
max-width: unset !important;
.body {
    .tags {
        display: flex;
        margin-top: calc(-0.25em - 2px);
    }
    .entry-hover {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        width: fit-content;
        .title {
            color: black;
            // min-width: 7rem;
        }
    }
    .highlight {
        background: yellow;

        background: var(--id-color-text);
        color: var(--id-color-text-readable);
    }
    .entry {
        width: 100%;
    }
    .desc.desc.desc {
        // font-size: .8rem;
        // opacity: .4 !important;
        font-size: .85rem;
        display: none;
        // margin-left: 1rem;
        a {
            text-decoration: underline;
            color: var(--id-color-text-readable) !important;
        }
        a:hover, a:focus-visible {
            color: white !important;
            background: black !important;
            text-decoration: none;
        }

        // font-size: .7em;
        // margin-left: 1em;

        margin: .125em 0;
        background: var(--id-color-text);
        color: var(--id-color-text-readable);
        opacity: .33;
        padding: .25em;

        color: var(--id-color-text); background: #0000; border: 1px solid currentcolor; opacity: 1;
        border-width: 0 0 0 .25em; min-height: 2em; font-size: .9em;
        position: relative; top: -2px;

        background: var(--id-color-text);
        color: var(--id-color);
        border: 0;
        top: 0;
        padding: 0 1em;
        &::before {
            content: "";
            display: block;
            position: absolute; bottom: 100%; left: 0;
            width: 1em; height: 2px;
            background: inherit;
        }
        a {
            background: var(--id-color-text);
            color: var(--id-color);
            cursor: pointer;
            &:hover {
                background: inherit; color: inherit;
                filter: invert(1);

                background: var(--id-color);
                color: var(--id-color-text);
                filter: none;
            }
        }
        width: 100%;
        padding: .3em .95em;
        padding-top: 0;
        margin-bottom: 0;
    }
    .results {
        // &:not(:focus-within) .tabbed .title
        // , .title:hover
        // , .title:focus-visible {
        //     // text-decoration: underline;
        //     // color: white;
        //     // background: black;
        //     // text-decoration: none;
        // }

        .tabbed .desc
        // , .entry:has(.title:hover) .desc
        // , .entry-hover .title:hover~.desc
        // , .entry-hover .badges:hover~.desc
        // , .entry-hover:focus-within .desc
        // , .entry:first-child .desc
        { display: block; }

        &:not(:focus-within) .entry:not(.tabbed):has(.title:hover) {
            position: relative;
            .desc {
                pointer-events: none;
                position: absolute; top: 100%; z-index: 100;
                width: max-content;
            }
        }

        // &:not(:focus-within) .tabbed .badges
        // , .entry-hover:has(.title:hover) .badges
        // // , .entry-hover:focus-within .badges
        // // , .entry:first-child .badges
        // { display: none; }
    }
    .badges {
        > * {
            opacity: .33;
            background: #00000022;
            border: none;
        }
    }
    .tabbed .badges > *:first-child {
        box-shadow: 0 2px var(--id-color-text);
    }
}
`
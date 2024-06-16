/* eslint-disable react/no-children-prop */
import { Redirect, Route, Switch } from 'react-router-dom';
import styled from 'styled-components';
import { useEventListener, useF, useI, useR } from '../lib/hooks';
import { usePage, useSubdomain } from '../lib/hooks_ext';
import { parseLogicalPath, parseSubdomain } from '../lib/page';
import { clearShrink, useShrink } from '../lib/shrink';
import { compose, isMobile, list } from '../lib/util';

import { auth } from '../lib/api';
import { Missing, Page } from './Contents';
import Txt from 'src/pages/txt';
import { track_play } from 'src/lib/track_player';


const Style = styled.div`
    // width: 100%;
    max-width: 100%;
    // background: none;
    // background: #ffffff44;
    // color: var(--light);
    background: white;
    height: 0;
    flex-grow: 1;
    margin-top: 0;
    position: relative;
    display: flex;
    justify-content: center;

    > * {
        &.seamless {
            box-shadow: none;
        }
    }
`

// const landing = [
//     ['matchbox', '/raw/matchbox']
// ].map(([prefix, landing]) => <>
//     {/* {true ? <Route exact path={'/'} render={() => url.external(landing)} /> : null} */}
//     {location.pathname === '/' && location.host.startsWith(prefix+'.') ? url.external(landing) : null} {/* TODO uh fix for non-raw pages */}
// </>)
const landing = []

const external = list('matchbox.zip').map(url => <Route path={'/'+url} render={() => location.href = 'http://'+url} />)
const reloads = list('/raw /lib /api /resume-* /stream /git:* /pea-rice-explainer /prp /PRP').map(path => <Route path={path} render={() => location.reload()} />)
const aliases = loaded => [
    ['\:<', 'face'],
    ['\.*', 'ly'],
    [':*', 'ly'],
    ['~*', 'u'],
    ['paper', 'txt'],
].flatMap(pair => [
    <Route path={'/'+pair[0]} key={pair.join()} children={<Page {...{ override: pair[1], loaded }} />} />,
    <Route path={'/'+pair[0].replace('/', '/-')} key={'-'+pair.join()} children={<Page {...{ override: pair[1].replace('/', '/-'), loaded }} />} />,
])
const subdomain = parseSubdomain()
const redirects = [
    ['/capitals', '/lettercomb'],
    ['/1', '/donoboard'],
    ['/projects', '/'],
    ['/project', '/raw'],
    ['/profile', '/u'],
    ['/wb', '/wordbase'],
    ['/contact', '/about'],
    ['/carrot', '/🥕'],
    ['/rèsumè', '/resume'],
    // ['/resume', '/resume-CyrusFreshman.pdf'],
    ['/resume', '/resume-CyrusFreshman.html'],
    ['/tip', '/coffee'],
    ['/donate', '/coffee'], ['/money-me-now', '/coffee'],
    // ['/pico', '/pico-repo'],
    ['/pico', '/pico-packet'],
    ['/turt-smurts-2D', '/turt-smurts'],
    ['/slime', '/slime-ants'],
    ['/garden', '/pixels'],
    ['/computer.html', '/raw/simple/computer.html'],
    ['/moon', '/raw/moon/example.html'],
    ['/face', '/raw/simple/faces.html'],
    ['/pvh', '/raw/plants-vs-human'],
    ['/wwl-gallery', '/raw/wwl/app'],
    ['/no', '/raw/daily-nonogram'],
    ['/spo', '/spot'],
    ['/date-me', '/raw/index_cards/date-me'],
    ['/bcb', '/raw/browser-compute-bank'],
    ['/tappy-square', '/raw/wwl/app/tappy'],
    ['/daily-nonogram', '/raw/daily-nonogram'],
    ['/color', '/raw/simple/color.html'],
    ['/loft', '/raw/1/loftlist.html'],
    ['/raw/stream/stream', '/raw/stream'],
    ['/aob', '/apple-orange-banana'],
    ['/uglychat', '/sitechat'],
    ...list('stream fishbowl matchbox pico-packet bloom paths kmeans tweet-embed daily-nonogram').map(x => ['/'+x, '/raw/'+x]),
    ...list('gymnastic-dots').map(x => ['/'+x, '/raw/wwl/app/'+x]),
    ...list('js.html').map(x => ['/'+x, '/lib/2/'+x]),
    // ...list('cards').map(x => ['/'+x, '/raw/simple/'+x+'.html']),
    ...(isMobile ? [] : []),
].filter(pair => '/'+subdomain !== pair[0]).flatMap(pair => [
    <Route path={pair[0]} key={pair.join()} render={routeProps =>
        <Redirect to={
            routeProps.location.pathname.replace(/\/$/, '').replace(...pair) + routeProps.location.hash
        }/>
    }/>,
    <Route path={pair[0].replace('/', '/-')} key={'-'+pair.join()} render={routeProps =>
        <Redirect to={
            routeProps.location.pathname.replace(/\/$/, '').replace(...pair.map(x => x.replace('/', '/-'))) + routeProps.location.hash
        }/>
    }/>,
])

const subdomainPaths = {
    wordbase: ['/new'],
}
export const Main = ({ loaded }) => {
    useI(() => console.debug('Main init'))

    const page = usePage()
    useF(page, () => {
        // reset track player
        track_play([])
    })
    // const rerender = useRerender()
    // const page = useR()
    // useI(() => url.add(() => {
    //     const new_page = parsePage()
    //     if (new_page !== page.current) {
    //         console.debug('main page update', { page:page.current, new_page })
    //         if (page.current !== undefined) rerender()
    //         page.current = new_page
    //     }
    // }, true))
    const subdomain = useSubdomain()

    const ref = useR()
    const shrink = useShrink(1)
    const resizeInProgress = useR()
    const resize = () => {
        const expand = auth.get().expand
        if (expand || resizeInProgress.current) return
        resizeInProgress.current = true

        clearShrink()
        const inner = Array.from(ref.current?.children || []).filter(c => !c.classList.contains('scroller'))[0]
        const embedded = inner?.querySelector('#embedded')
        if (embedded) {
            // console.debug('EMBEDDED')
            const embdeddedResize = () => {
                const target = embedded.contentWindow?.window.document.querySelector('.shrink-target')
                console.debug('EMBEDDED SHRINK', target)
                if (target) {
                    clearShrink()
                    // console.debug('EMBEDDED SHRINK', target.clientWidth + 2, target.clientHeight + 2 + document.querySelector('#header').clientHeight)
                    shrink(target.clientWidth + 2, target.clientHeight + 2 + document.querySelector('#header').clientHeight)
                }
                // else window.removeEventListener('resize', embdeddedResizeListener)
            }
            embedded.contentWindow?.window.dispatchEvent(new Event('resize'))
            // const embdeddedResizeListener = window.addEventListener('resize', embdeddedResize)
            // allow embedded projects to resize before limiting exterior
            setTimeout(embdeddedResize, 500)
            setTimeout(embdeddedResize, 1000)
            setTimeout(() => resizeInProgress.current = false, 1000)
        } else if (inner) {
            console.debug('SHRINK INNER', inner, expand, auth.get())
            shrink(inner)
            // auth.set({ ...auth.get(), expand: !expand })
            // setTimeout(() => {
            //     auth.set({ ...auth.get(), expand: !!expand })
            //     resizeInProgress.current = false
            // }, 500)
            // resizeInProgress.current = false
        } else {
            resizeInProgress.current = false
        }
    }
    loaded = compose(loaded, () => setTimeout(resize, 10))
    const prevRatio = useR(document.body.clientHeight / document.body.clientWidth)
    useEventListener(window, 'resize', () => {
        const ratio = document.body.clientHeight / document.body.clientWidth
        // console.debug(ratio, prevRatio.current)
        if (ratio !== prevRatio.current) {
            prevRatio.current = ratio
            resize()
        }
    })

    console.debug('main rerender', location.href)

    return (
    <Style id='main' ref={ref}>
        <Switch>
            <Route path={'/git:'} render={props => <Redirect to={'https://github.com/cfreshman/'+props.location.pathname.replace(/git:$/, '')} />}/>,
            {landing}
            {external}
            {redirects}
            {aliases(loaded)}
            {reloads}
            {/* explicit /projects/ */}
            {/* {projects.map(name => EmbeddedRoute({name, implicit: false}))}
            <Route path='/projects/:id' component={Page} /> */}

            {/* implicit projects */}
            {/* <Route path={'/u'} render={routeProps =>
                <Redirect to={
                    routeProps.location.pathname.replace(/\/u\/?/, '/~')
                    + routeProps.location.hash
                }/>
            }/> */}
            {/* for subdomains, override subpaths like /new to /wordbase */}
            {subdomainPaths[subdomain]
            ? subdomainPaths[subdomain].map(path =>
                <Route key={path} path={path} children={() =>
                    <Page {...{ override: subdomain, loaded }} />} />)
            : ''}
            {subdomain
            ?
            <Route exact path={'/'+subdomain} render={() => {
                console.debug('subdomain redirect', parseLogicalPath(), '=>', parseLogicalPath().replace('/'+subdomain, ''))
                return <Redirect to={parseLogicalPath().replace('/'+subdomain, '')} />
            }} />
            :''}
            <Route path={['/t-', '/p-']} render={props => <Txt short={true} />} />
            <Route path={'/@*'} render={routeProps => {
                const { pathname, search, hash } = routeProps.location
                return <Redirect to={pathname.replace(/@/, 'u/') + search + hash} />
            }}/>
            <Route path='/*' children={<Page loaded={loaded} />} />
            {/* <Route path='/:id' children={<Page loaded={loaded} />} />
            {subdomain
            ? <Route path='/' children={() =>
                <Page {...{ override: subdomain, loaded }} />} />
            : ''} */}

            <Route path='*' children={<Missing {...{ loaded }} />} />
        </Switch>
    </Style>
    )
}

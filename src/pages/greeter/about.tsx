import React from 'react'
import styled from 'styled-components'
import { A, HalfLine, InfoBadges, InfoBody, InfoLoginBlock, InfoSection, InfoStyles } from '../../components/Info'
import { usePageSettings } from 'src/lib/hooks_ext'
import { S } from 'src/lib/util'
import api, { auth } from 'src/lib/api'
import { useF, useM, useR, useRerender, useS } from 'src/lib/hooks'
import url from 'src/lib/url'
import { GreeterLoginNotice } from './greeter_login_notice'
import { openLogin } from 'src/lib/auth'
import { Dangerous } from 'src/components/individual/Dangerous'
import { meta } from 'src/lib/meta'


const { named_log, list, strings, truthy, QQ } = window as any
const log = named_log('greeter about')

export const About = ({ handle=undefined }={}) => {

  const [{user:viewer}] = auth.use()
  const [install] = meta.install.use()

  return <>
    <InfoSection labels={[
      'about greeter',
      viewer ? { 'view your meets': () => handle.setPath([]) } : 0&&{ 'log in to do anything': () => openLogin() },
    ]}>
      <style>{`
      .greeter-about .heading {
        text-transform: uppercase;
      }
      `}</style>
      {/* <div><b><i>keep track of how you met friends & collect hangouts!</i></b></div> */}
      <div style={S(`
      background: var(--id-color-text);
      border-radius: 2px;
      overflow: hidden;
      `)}>
        <div className='middle-column' style={S(`
        padding: 1em;
        border: 2px dashed currentcolor;
        // border-radius: 1em;
        background: var(--id-color-text);
        color: var(--id-color);
        white-space: pre-line;
        margin: .5em;
        box-shadow: 0 0 0 .5em var(--id-color-text);
        border-radius: 2px !important;
        `)}>
          <i><b>a social diary:</b></i>
          <div>share how you first met friends</div>
          <div>- and log everyday hangouts!</div>
          <HalfLine />
          <div><b>NEW:</b> AI hang ideas!</div>
        </div>
      </div>
      <div className='heading'>^ flashy little slogan</div>
      <HalfLine ratio={1} />

      <div className='heading'>get started</div>
      <InfoBadges labels={[
        // 'new?',
        { text: "demo: join today's worksesh hangout", href: '/intro-greeter' },
      ]} />
      <HalfLine ratio={1} />

      {/* <div className='heading'>new</div>
      <div>- opt-in AI suggestions for things to do next based on your past logs!</div>
      <HalfLine /> */}

      <div className='heading'>install on your phone</div>
      <div style={S(`
      // background: var(--id-color-text);
      // color: var(--id-color);
      // border-radius: 2px;
      // padding: .5em;
      // font-weight: bold;
      border-left: 1px solid var(--id-color-text);
      margin-left: 2px;
      padding-left: .5em;
      `)}>
        {0&&install ? <>
          <div><InfoBadges labels={[
            { text: 'install /greeter', func: async () => {
              log({install})
              try {
                const result = await install.prompt()
                log({result})
              } catch (e) {
                log('install error', e)
              }
            } },
          ]} /></div>
        </> : <>
          <div>
            <span style={S(`display:inline-flex;align-items:center`)}>
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
          </div>
          <div>
            <span style={S(`display:inline-flex;align-items:center`)}>
            Android Chrome →
            {/* https://www.svgrepo.com/svg/345223/three-dots-vertical */}
            <svg width="1em" height="1em" style={{ margin: '0 .25rem' }}
            viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
              <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
            </svg>→ Add to Home Screen
            </span>
          </div>
        </>}
        <HalfLine />
        <div><InfoBadges labels={[
          { text: 'use telegram', href: '/notify/telegram', tab:true },
        ]} /> for native notifications</div>
      </div>
      <HalfLine ratio={1} />

      {/* <div>creds to ✨<A href='/u/zam'>zam</A>✨ for quizzes</div>
      <div>creds to my dreams for the idea</div>
      <HalfLine /> */}

      {/* <Dangerous html={`<a 
      href="https://www.producthunt.com/posts/greeter?utm_source=badge-featured&utm_medium=badge&utm_souce=badge-greeter" 
      target="_blank"
      style="filter: grayscale(1) invert() brightness(3);">
        <img 
        src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=442640&theme=light" 
        alt="greeter - keep&#0032;track&#0032;of&#0032;how&#0032;you&#0032;met&#0032;friends&#0033; | Product Hunt" 
        style="width: 180px; height: 39px;"
        width="250" height="54" />
      </a>`} /> */}
      {/* <Dangerous html={`<a style="filter: grayscale(1) invert() brightness(3);" href="https://www.producthunt.com/products/greeter/reviews?utm_source=badge-product_review&utm_medium=badge&utm_souce=badge-greeter" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/product_review.svg?product_id=573509&theme=dark" alt="&#0047;greeter - a&#0032;social&#0032;diary&#0058;&#0032;log&#0032;your&#0032;first&#0032;meets&#0032;&#0038;&#0032;everyday&#0032;hangouts&#0033; | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>`} /> */}
      <div className='heading'>leave a review!</div>
      {null&&<div className='row gap wrap'>
        <Dangerous html={`<a style="filter: grayscale(1) invert() brightness(3);" href="https://www.producthunt.com/posts/greeter?utm_source=badge-featured&utm_medium=badge&utm_souce=badge-greeter" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=442640&theme=dark" alt="greeter - Keep&#0032;track&#0032;of&#0032;how&#0032;you&#0032;met&#0032;friends&#0033; | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>`} />
        {/* <Dangerous html={`<a style="filter: grayscale(1) invert() brightness(3);" href="https://www.producthunt.com/products/greeter/reviews?utm_source=badge-product_review&utm_medium=badge&utm_souce=badge-greeter" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/product_review.svg?product_id=573509&theme=dark" alt="&#0047;greeter - a&#0032;social&#0032;diary&#0058;&#0032;log&#0032;your&#0032;first&#0032;meets&#0032;&#0038;&#0032;everyday&#0032;hangouts&#0033; | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>`} /> */}
      </div>}
      <div>
        <Dangerous html={`
        <iframe
            src="https://static.store.app/widget/badge/index.html?sitePath=greeter&theme=dark" 
            style="width: 250px; height: 122px; border: none; border-radius: 12px;">
        </iframe>
        `} />
      </div>
    </InfoSection>
  </>
}

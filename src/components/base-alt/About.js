import React, { Fragment } from 'react';
import { Link } from 'react-router-dom';
import punycode from 'punycode/';
import { Title, Description } from './Base';
import { S } from 'src/lib/util';
import { auth } from 'src/lib/api';
import { useM } from 'src/lib/hooks';
import { A } from '../A';
import { RATE, use_sponsor_slots } from '../individual/sponsors';
import { Dangerous } from '../individual/Dangerous';
import { useCachedScript } from 'src/lib/hooks_ext';

// export const About = () => {
//   const isMain = location.host === 'freshman.dev'
//   return (
//     <>
//     <Title>
//       <h1>About</h1>
//     </Title>
    
//     <Description>
//       Besides <Link to='/wordbase'>/wordbase</Link> and <Link to='/wordle/leaderboard'>/wordle/leaderboard</Link> this site is little more than a random assortment of experiments
//       {/* Besides <Link to='/wordbase'>/wordbase</Link> and <Link to='/wordle/leaderboard'>/wordle/leaderboard</Link> this site is little more than a random assortment of webdev experiments. */}
//       {/* Feel free to connect through the links above or send a quick message below. */}
//     </Description>
//     {/* <Description>
//       (For professional inquiries – email <a href='mailto:cyrus@freshman.dev'>cyrus@freshman.dev</a>)
//     </Description> */}
//     {isMain ? '' : <Description>
//       You're viewing from <a href={location.href}>{punycode.toUnicode(location.host)}</a>, the main URL is <a href='https://freshman.dev/about'>freshman.dev</a>
//     </Description>}
//     <br />
//     <Contact />
//     </>
//   )
// }

export const About = () => {
  const [{user:viewer}] = auth.use()
  const profile_link = useM(viewer, () => viewer ? `u/${viewer}` : 'profile')

  const sponsor_slots = use_sponsor_slots()

  useCachedScript(`https://js.stripe.com/v3/buy-button.js`)

  return <div style={S(`
  white-space: pre-line;
  display: flex; flex-direction: column;
  gap: 1.5em;
  `)}>
    {/* <div>i want to keep making high quality free-to-use apps!</div> */}
    {/* <div>*i need 8334 $1/mo <A href='/donoboard' /> slots acquired to definitely keep working on this website!*</div> */}
    {/* <div>i want to keep making high quality free-to-use apps that don't manipulate you: <A href='/donoboard'>{sponsor_slots
    // ? <>{sponsor_slots.unclaimed} $1/mo dono slots to go! (<A href='/donoboard'/>)</>
    ? <>{sponsor_slots.unclaimed} ${RATE}/mo dono slots to go!</>
    : '(loading sponsor slot info)'}</A></div> */}

    <div>i want to keep making free apps - <A href='/donoboard'><>claim a ${RATE}/mo donation slot!</></A></div>

    {/* <Dangerous className='middle-row' style={S(`
    scale: .7;
    transform-origin: top;
    min-height: 7em; margin-bottom: -8em;
    `)} html={`
      <stripe-buy-button
        buy-button-id="buy_btn_1PLX4aHQL6OVj4R1cK3jpYiv"
        publishable-key="pk_live_B1kkIywcVRgdddU64hB2s6mW001AZzDbgm"
      >
      </stripe-buy-button>
    `} /> */}
    {/* <div style={S(`border: 2px solid currentcolor; padding: .5em; border-radius: .25em; text-align: center`)}>Stripe has paused my account - working on getting that back</div> */}

    {/* <Dangerous style={S(`white-space:unset`)} html={`<div class="middle-column gap" style="align-items:center">
      <div style="display:flex;position:relative">
        <div style="position:absolute;font-size:.67em;width:max-content;background:#000;margin:3px;bottom:0;right:0">it's just me!</div>
        <img src="/raw/images/donate_profile.jpg" style="border:2px solid currentcolor;width: 100%" title="donate profile" />
      </div>
    </div>`} /> */}

    {/* <div>i made 130k straight out of UMass Amherst (i'm economical) working for Amazon Robotics (<a href='/raw/paths'>cool path planning stuff</a>) (but not the nicest company). 3000x$2/mo is 72k. if you like freshman.dev, <A href='https://freshman.dev/slot'>even 1 dono slot</A> will help keep me working for you instead of big tech - i've been going through savings for 2y already</div> */}

    {/* <div>i do original apps and remakes of apps which in some cases took full teams of people to design & build, such as Wordbase (released 2013, taken offline 2018). i love being able to create things anyone on the Internet can enjoy for free</div> */}

    {viewer || true
    ?
      // <div>you can also support by sharing - a game invite or your friend link at your <A href={`/${profile_link}`}>/u/surname</A> is the best way to get others started with the site. it's just as good as donating $1</div>
      <div>you can also support by sharing - a game invite (<A href='/lettercomb' />, <A href='/letterpress' />, <A href='/wordbase' />) is the best way to get others started with the site</div>
    :
    <div>i do original apps and remakes (<A href='/lettercomb' />, <A href='/letterpress' />, <A href='/wordbase' />). the original Wordbase, released 2013 taken offline 2018, took 5-10 people to build</div>
    }

    {/* <div><i>(from <a href="https://github.com/sponsors/cfreshman">github.com/sponsors/cfreshman</a>)</i></div> */}

    {/* <style>{`
    .mobile #title {
      display: none;
    }
    `}</style> */}

    {/* <Dangerous className='middle-row' style={S(`
    scale: .7;
    transform-origin: top;
    min-height: 7em; margin-bottom: -7em;
    `)} html={`
      <stripe-buy-button
        buy-button-id="buy_btn_1PLX4aHQL6OVj4R1cK3jpYiv"
        publishable-key="pk_live_B1kkIywcVRgdddU64hB2s6mW001AZzDbgm"
      >
      </stripe-buy-button>
    `} /> */}
    
    <div>i worked at Amazon Robotics out of university (UMass Amherst) but found Amazon immoral and abusive so i left and started doing this</div>

  </div>
}
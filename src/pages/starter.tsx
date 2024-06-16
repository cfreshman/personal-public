import React from 'react'
import styled from 'styled-components'
import { A, HalfLine, InfoBody, InfoSection, InfoStyles } from '../components/Info'
import { usePathState } from 'src/lib/hooks_ext'
import { useF, useS } from 'src/lib/hooks'
import api, { auth } from 'src/lib/api'

const { named_log, lists } = window as any
const log = named_log('template')

export default () => {
  const [{user:viewer}] = auth.use()
  return <Style>
    <InfoBody>
      <InfoSection labels={['getting started on freshman.dev']}>
        <div>freshman.dev is a passion project of mine (my last name is freshman). it has a lot going on:</div>
        <HalfLine />
        <div><b>play a word game!</b></div>
        <div>ONLINE → NEW INVITE LINK, then text the link</div>
        <div><A href='/letterpress'>/letterpress</A> - best one (in my opinion)</div>
        <div><A href='/lettercomb'>/lettercomb</A> - shorter, arcade-like</div>
        <div><A href='/wordbase'>/wordbase</A> - original app was most popular</div>
        <div><A href='/quadbase'>/quadbase</A> - four players!</div>
        {/* <div>you can click ONLINE → NEW INVITE LINK to start a game with friends</div> */}
        {/* <div>(these are both discontinued apps from the 2010s that i remade)</div> */}
        <HalfLine />
        <div><b>invite your friends!</b></div>
        <div><A href='/profile'>/profile</A></div>
        <div>FRIEND LINK → COPY, then text the link</div>
        {/* <div>when someone opens it, you'll automatically follow each other. so u can use various social features with them like <a href='/graffiti'>/graffiti</a> walls and <a href='/letterpress'>/letterpress</a> game challenges</div> */}
        <div>when someone opens it, you'll automatically follow each other. so u can use various social features with them like <a href='/letterpress'>/letterpress</a> game challenges</div>
        <HalfLine />
        {/* <div><b>describe the first time you met your friends!</b></div> */}
        <div><b>collect hangouts! (a social diary)</b></div>
        <div><A href='/greeter'>/greeter</A></div>
        {/* <div>click a friend's name under YOUR FOLLOWS to add a date, location, notes, and more</div> */}
        {/* <div>you can even export your friendversaries to your Google/Apple calendar!</div> */}
        <div>describe the first time you met friends</div>
        <div>log daily hangouts - title, icon, notes</div>
        <div>fill your calendar! look back on everything u did at the end of the month</div>
        <div>defeat depression! (at least it did for me)</div>
        <HalfLine />
        {/* <div><b>add to my guestbook or graffiti wall!</b></div>
        <div><A href='/guestbook'>/guestbook</A> <A href='/graffiti'>/graffiti</A></div>
        <div>please be respectful! this is a family-friendly site</div>
        <HalfLine /> */}
        <div><b>add to my guestbook!</b></div>
        <div><A href='/guestbook'>/guestbook</A></div>
        <div>please be respectful - this is a family-friendly site</div>
        <HalfLine />
        {/* <div><b>log a hangout!</b></div>
        <div><A href='/greeter'>/greeter</A></div>
        <div>you can add attendees, location, notes, and more</div>
        <div>log events as often as you want to fill out your <A href={`/greeter/${viewer}/calendar`}>calendar</A>!</div>
        <HalfLine /> */}
        <div><b>cheat at wordle!</b></div>
        <div>well don't actually. but i have a wordle solver at <A href='/wordle'>/wordle</A></div>
        <HalfLine />
        <div><b>solve a nonogram!</b></div>
        <div><A href='/daily-nonogram'>/daily-nonogram</A></div>
        <div>nonograms are a number puzzle recently invented in Japan</div>
        <HalfLine />
        <div><b>make a recipe with someone random!</b></div>
        <div><A href='/dinder'>/dinder</A></div>
        <div>disclaimer: no one uses this so you might not get a match! but i get a notification when at least one person uses it, so i'll try to swipe too</div>
        <HalfLine />
        <div><b>make a resume!</b></div>
        <div><A href='/html-resume'>/html-resume</A></div>
        <div>click LOAD EXAMPLE for a good starting point</div>
        <HalfLine />
        <div><b>play a multiplayer couch game for joy-cons! (macOS only, sorry)</b></div>
        <div><A href='/matchbox'>/matchbox</A></div>
        <HalfLine />
        <div><b>track habits!</b></div>
        <div><A href='/tally'>/tally</A></div>
        <HalfLine ratio={2} />
        {/* <div>DURABILITY NOTICE REQUIRED UNDER §24.3.7 OF THE WWW CONSORTIUM'S PUBLIC LEDGER:</div>
        <div>freshman.dev app has been tested in various extreme conditions such as concerts</div> */}
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`

`
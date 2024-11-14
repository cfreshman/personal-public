import React, { Fragment } from 'react';
import { Link } from 'react-router-dom';
import punycode from 'punycode/';
import { Title, Description } from './Base';
import { S, mobile } from 'src/lib/util';
import { auth } from 'src/lib/api';
import { useM } from 'src/lib/hooks';
import { A } from '../A';
import { Dangerous } from '../individual/Dangerous';
import { SponsorList } from '../individual/sponsors';
import Donoboard from 'src/pages/donoboard';
import { HalfLine } from '../Info';

export const Highlights = () => {
  const [{user:viewer}] = auth.use()
  const profile_link = useM(viewer, () => viewer ? `u/${viewer}` : 'profile')

  return <div id="highlights" style={S(`
  white-space: pre-line;
  display: flex; flex-direction: column; align-items: flex-start;
  gap: .5em;
  `)}>
    <div className='column'>
      <span>free word games (<A href='https://freshman.dev/fight-me'>fight me</A>) & more</span>
      <A href='/search'>search all pages</A>
      {/* <span>free word games & more</span> */}
      {/* <span>free word games & more: <A href='https://freshman.dev/fight-me'>fight me</A></span> */}
      {/* <span>enjoy? <A href='/about'>donate $2/mo</A></span> */}
    </div>
    <HalfLine />
    {true ? <>
      <span>top 3</span>
      <A href='https://freshman.dev/lettercomb'>/lettercomb (best word game imo)</A>
      <A href='https://freshman.dev/letterpress'>/letterpress (also best word game)</A>
      <A href='https://freshman.dev/greeter'>/greeter (social diary)</A>
      <HalfLine />
      {mobile && 0 ? null : <>
        <span>more</span>
        <A href='https://freshman.dev/wordbase'>/wordbase (word game i hate ugh)</A>
        <A href='/wordle/leaderboard'>Wordle bot leaderboard (300+ bots)</A>
        {/* <A href='/fishbowl'>/fishbowl (party game for 6-18)</A> */}
        {/* <A href='/matchbox'>/matchbox (joycon couch game)</A> */}
        {/* <A href='/raw/stream'>stream (microblog)</A> */}
        {/* <A href='/twitter/install'>Twitter blue Threads icon</A> */}
        {/* <A href='/itly'>/itly (smaller iMessage previews)</A> */}
        <A href='/tap'>/tap (habit tracker)</A>
        <HalfLine />
      </>}
      <span>new</span>
      <A href='/vibe'>/vibe (map of 24hr pics)</A>
      <A href='/list-picker'>/list-picker (picks random menu item)</A>
      {/* <A href='/emoji-banner'>/emoji-banner (create twitter header)</A> */}
      {/* <A href='/stream-pledge'>/stream-pledge (get livestreaming)</A> */}
      {/* <A href='/running'>/running (get faster)</A> */}
      {/* <A href='/light'>/light (text-only twitter)</A> */}
      <A href='/rent-splitter'>/rent-splitter (assign rooms fairly)</A>
      {/* <A tab='/radio'>radio</A> */}
      {/* <A href='/twitter/install'>/twitter (twitter blue Threads icon)</A> */}
      {/* <A href='/not-linkedin'>/not-linkedin (kill LinkedIn)</A> */}
      {/* <HalfLine /> */}
      {/* <span>finally</span> */}
      {/* <A href='https://freshman.dev/developer-program'>developer program (learn to code)</A> */}
      {/* <span>or</span> */}
      {/* <A href='/search'>something else? (open search)</A> */}
    </> : <>
      <A href='/lettercomb'>lettercomb (best word game imo)</A>
      <A href='/letterpress'>letterpress (also best word game)</A>
      <A href='/wordbase'>wordbase (word game i hate ugh)</A>
      <A href='/greeter'>greeter (social diary + AI)</A>
      <HalfLine />
      <A href='/wordle/leaderboard'>wordle bot leaderboard (300+ bots)</A>
      <A href='/fishbowl'>fishbowl (party game for 6-18)</A>
      <A href='/matchbox'>matchbox (joycon couch game)</A>
      <A href='/dinder'>dinder (tinder for dinner recipes)</A>
      <span>
        <A href='/pico-packet'>pico-packet</A> / <A href='https://github.com/cfreshman/pico-fi'>pico-fi</A> (Pico W)
      </span>
      <A href='/raw/stream'>my stream (microblog)</A>
      <A href='/pea-rice-explainer'>pea-rice (cheap green protein)</A>
      <HalfLine />
      <A href='https://freshman.dev/business'>business summary (Google Docs)</A>
      <A href='/search'>something else? (open search)</A>
    </>}

    <style>{`
      #highlights :is(img, iframe) {
        border-radius: 13px;
        width: 100%;
        // border: 1px solid #000;
        // // margin: 2px;
        // margin: 2px 0;
        // box-shadow: 0 0 0 2px currentcolor;

        border: 1px solid #fff;
        border-radius: 14px;
      }
      #highlights img {
        // border: 1px solid #fff;
        filter: contrast(1.5) brightness(.9);
      }
    `}</style>
  </div>
}
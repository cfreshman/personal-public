import React, { Fragment } from 'react';
import { Link } from 'react-router-dom';
import punycode from 'punycode/';
import { Title, Description } from './Base';
import { S } from 'src/lib/util';
import { auth } from 'src/lib/api';
import { useM } from 'src/lib/hooks';
import { A } from '../A';
import { Dangerous } from '../individual/Dangerous';
import { SponsorList } from '../individual/sponsors';

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

export const TLDR = () => {
  const [{user:viewer}] = auth.use()
  const profile_link = useM(viewer, () => viewer ? `u/${viewer}` : 'profile')

  return <div id="tldr" style={S(`
  white-space: pre-line;
  display: flex; flex-direction: column;
  gap: 1.5em;
  `)}>
    <div>
      <div>free web apps & more</div>
      <div>enjoy? <A href='https://freshman.dev/slot'>donate me $1/mo</A></div>
    </div>
    {0?<>
      <div className='column gap'>
        {/* <div>free web apps & more</div> */}
        <div>free-to-use web apps that don’t manipulate you. <A href='https://freshman.dev/business'>read the business summary (Google Docs)</A></div>
        {/* <iframe src='/raw/stream/items/2024-05-20-01.html' style={S(`height:25em`)} /> */}
        
        {/* <img src='/tldr.jpg' style={S(`
        border-radius: 1em;
        `)} /> */}
        {/* <img src='/raw/log/2024-05-24.png' /> */}
      </div>

      {/* <div>{viewer ? <A href={`/u/${viewer}`} /> : 'user'}: enjoy? <a href="/1">donate me $1/mo!</a></div> */}
      {/* <div><a href="/1">donate me $1/mo</a> so i never stop!</div> */}
      
      <div className='column gap'>
        {/* <div>i work hard for your <a href='https://freshman.dev/1'>$1 donations</a></div> */}
        {/* <div>i work hard for your <a href='/donoboard'>$1 donations</a></div> */}
        {/* <img src='/raw/log/2024-05-24-2.png' /> */}
        {/* <div>thank you to: <SponsorList /></div> */}
        <div>i work hard for <a href='/donoboard'>$1/mo donos</a>. i don't want to go back to big tech. thank you: <SponsorList /></div>
      </div>
    </>:null}

    <div className='column gap'>
      <div>bonus: somethings i enjoy</div>
      <iframe src='/raw/1/bestlist.html' style={S(`
      aspect-ratio: 1/1;
      `)} />
    </div>

    <style>{`
      #tldr :is(img, iframe) {
        border-radius: 13px;
        width: 100%;
        // border: 1px solid #000;
        // // margin: 2px;
        // margin: 2px 0;
        // box-shadow: 0 0 0 2px currentcolor;

        border: 1px solid #fff;
        border-radius: 14px;
      }
      #tldr img {
        // border: 1px solid #fff;
        filter: contrast(1.5) brightness(.9);
      }
    `}</style>
  </div>
}
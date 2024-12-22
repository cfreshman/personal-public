import React, { Fragment } from 'react';
import { Link } from 'react-router-dom';
import punycode from 'punycode/';
import { Title, Description } from './old/Base';
import { S } from 'src/lib/util';
import { auth } from 'src/lib/api';
import { useM } from 'src/lib/hooks';
import { A } from '../A';
import { Dangerous } from '../individual/Dangerous';
import { SponsorList } from '../individual/sponsors';
import Donoboard from 'src/pages/donoboard';

export const List = () => {
  const [{user:viewer}] = auth.use()
  const profile_link = useM(viewer, () => viewer ? `u/${viewer}` : 'profile')

  return <div id="list" style={S(`
  white-space: pre-line;
  display: flex; flex-direction: column;
  gap: 1.5em;
  `)}>
    {1?<>
      <div className='column gap'>
        <div>thank you to: <SponsorList /></div>
        {/* <div>see details at <A href='/donoboard' /></div>
        <div>acquire donoboard slots <A href='https://freshman.dev/slot'>here</A></div> */}
        {/* <div>acquire $1/mo <A href='/donoboard' /> slots <A href='https://freshman.dev/slot'>here</A></div> */}
        <div><i>view <A href='/donoboard' />, <A href='https://freshman.dev/slot'>acquire $2/mo slot</A></i></div>
      </div>
    </> : <>
      <Donoboard />
    </>}
    {/* <div className='column gap'>
      <div>bonus: somethings i enjoy</div>
      <iframe src='/raw/1/bestlist.html' style={S(`
      aspect-ratio: 3/2;
      `)} />
      <div>and what's next</div>
      <iframe src='/raw/1/nextlist.html' style={S(`
      aspect-ratio: 3/2;
      `)} />
    </div> */}

    <style>{`
      #list :is(img, iframe) {
        border-radius: 13px;
        width: 100%;
        // border: 1px solid #000;
        // // margin: 2px;
        // margin: 2px 0;
        // box-shadow: 0 0 0 2px currentcolor;

        border: 1px solid #fff;
        border-radius: 14px;
      }
      #list img {
        // border: 1px solid #fff;
        filter: contrast(1.5) brightness(.9);
      }
    `}</style>
  </div>
}
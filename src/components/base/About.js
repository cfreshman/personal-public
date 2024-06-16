import React, { Fragment } from 'react';
import { Link } from 'react-router-dom';
import punycode from 'punycode/';
import { Contact } from './Contact';
import { Title, Description } from './Base';

export const About = () => {
  const isMain = location.host === 'freshman.dev'
  return (
    <>
    <Title>
      <h1>About</h1>
    </Title>
    
    <Description>
      Besides <Link to='/wordbase'>/wordbase</Link> and <Link to='/wordle/leaderboard'>/wordle/leaderboard</Link> this site is little more than a random assortment of experiments
      {/* Besides <Link to='/wordbase'>/wordbase</Link> and <Link to='/wordle/leaderboard'>/wordle/leaderboard</Link> this site is little more than a random assortment of webdev experiments. */}
      {/* Feel free to connect through the links above or send a quick message below. */}
    </Description>
    {/* <Description>
      (For professional inquiries – email <a href='mailto:cyrus@freshman.dev'>cyrus@freshman.dev</a>)
    </Description> */}
    {isMain ? '' : <Description>
      You're viewing from <a href={location.href}>{punycode.toUnicode(location.host)}</a>, the main URL is <a href='https://freshman.dev/about'>freshman.dev</a>
    </Description>}
    <br />
    <Contact />
    </>
  )
}
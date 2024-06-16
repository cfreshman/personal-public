import React, { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Title } from './Base';

export const Home = () => (
  <>
  <Title>
    <div className="imgDiv">
      {/* <img src="/img/profile.jpeg" alt="profile"/> */}
      {/* <img src="/obscured.png" alt="profile"/> */}
      <img src="/img/plant.jpeg" alt="profile"/>
    </div>
    <h1>Cyrus Freshman</h1>
    <p>Software Developer</p>
    <p>B.S. in Computer Science</p>
  </Title>

  <Link to="/wordbase">wordbase</Link>
  {/* <Link to="/graffiti">graffiti wall</Link> */}
  {/* <Link to="/terrain">terrain generation</Link> */}
  <Link to="/wordle/leaderboard">wordle solver leaderboard</Link>
  <Link to="/nonogram">nonogram solver</Link>
  </>
)
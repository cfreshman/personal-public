import React from 'react';
import styled from 'styled-components';


export const Title = styled.div`
  margin: 0;
  padding: 0.25em 0 1em 0;
  text-align: center;
  // margin-top: 0.5em;
  margin-bottom: 1em;
  & > .imgDiv {
    width: 42%;
    max-width: 10em;
    position: relative;
    margin: auto;
    margin-bottom: .5em;
    &::after {
      content: "";
      display: block;
      padding-bottom: 100%;
    }
    & > img {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      border-radius: 50%;
      // border: 2px solid var(--light);
      box-shadow: 1px 2px 4px #00000020;
    }
  }
  & > h1 {
    margin: 0;
    font-size: 2em;
    font-weight: 400;
  }
  & > p {
    margin: 0;
    font-size: 0.8em;
  }
`

export const ProjectName = styled.p`
`
export const Description = styled.p`
  font-size: .8rem;
`
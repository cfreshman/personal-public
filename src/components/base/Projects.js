import React, { Fragment } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { Title, Description, ProjectName } from './Base';
import { projects, project_years } from '../../lib/projects';
import { list, set, toStyle } from '../../lib/util';
import { A } from '../A';
import { JSX } from 'src/lib/types';

const showcase = 'search,wordbase,greeter,matchbox,demos,visual,lettercomb,dinder,tally,wordle,nonogram,html-resume,tweet-embed,wwl-builder,guestbook,,simple games,art-ish,$$'.split(',')
const compiled = {
  // games: 'dots-and-boxes snakes snackman befruited minesweeper'.split(' '),
  games: 'dots-and-boxes snakes snackman'.split(' '),
  visual: 'terrain pixelworld'.split(' '),
  demos: 'paths bloom kmeans'.split(' '),
  // 'simple games': list('cards dots-and-boxes fishbowl'),
  'simple games': list('cards fishbowl daily-nonogram'),
  'art-ish': list('stream bcb computer.html'),
  '\$\$': list('coffee,pico-packet', ',')
}
const compiled_years = {
  games: '(old and not guaranteed to be fun)',
}
const emphasized_projects = set('wordbase wordle pico-repo dinder crowdmeal')
const inline = set('simple games,art-ish,$$', ',')
const projectRedirect = x => ({
  'Pico W starter kit': '/pico-starter',
}[x] || '/'+x)

const ProjectItem = ({ name, compiled }) => {
  return <A href={projectRedirect(name)} className={`project-item ${compiled && 'compiled'} special-${emphasized_projects.has(name)}`}
    onClickCapture={e => {
      // stop at propagation at link elements (inner or outer)
      if (e.target.href) {
        e.stopPropagation()
        if (e.target.href !== projectRedirect(name)) {
          e.preventDefault()
          open(e.target.href, e.metaKey ? '_blank' : '_self')
        }
      }
    }}>
    <ProjectName>
      <a>{(projects[name][0] || name).replace(/_/g, ' ')}</a>
      {project_years[name]
      ? <span className='project-year subtle'>{project_years[name]}</span>
      : ''}
    </ProjectName>
    <Description dangerouslySetInnerHTML={{__html: projects[name][1].replace(new RegExp(compiled+'? ?'), '') || ''}} />
  </A>
}

export const Projects = ({ inner=false }) => (
  <>
  {inner ? '' :
  <Title>
    <h1>Projects</h1>
    {/* <span>some old, some new</span> */}
    <span style={{ fontSize:'.7em' }} className='subtle'>
      {/* of varying degrees of complexity */}
      {/* mostly non-serious */}
      {/* with stark contrast in complexity */}
    </span>
      {/* will try to upload some more meaty ones soon */}
  </Title>
  }

  <ProjectList style={{flexGrow:1}}>
    {showcase.map(key => {
      if (key === 'serious') return <div style={toStyle(`
      width: 100%;
      // text-align: center;
      font-size: .8em;
      opacity: .5;
      margin: .25em 0;
      `)}>serious ⬏ ⬐ non-serious</div>

      if (!key) return <br/>
      
      if (compiled[key]) {
        if (inline.has(key)) {
          return <>
            {/* <div className='project-item list'>
              <div>
                <span className='project-list'>{key}</span>
                {compiled_years[key]
                ? <span className='project-year subtle'>{compiled_years[key]}</span>
                : ''}
              </div>
              <div></div>
            </div> */}
            <div className='inline-project-list' style={{display:'flex',fontSize:'.8em',alignItems:'center',flexWrap:'wrap'}}>
              {key[0] === '_' ? null : <>
                <span>{key}</span>
                &nbsp;/&nbsp;
              </>}
              {compiled[key].map(inner => <A href={projectRedirect(inner)} className={`project-item compiled`} style={{display:'inline-block',fontSize:'1em',whiteSpace:'nowrap'}}
                onClickCapture={e => {
                  // stop at propagation at link elements (inner or outer)
                  if (e.target.href) {
                    e.stopPropagation()
                  }
                }}>
                <ProjectName style={{fontSize:'1em'}}><a>{inner}</a></ProjectName>
              </A>)}
            </div>
            {/* <div className='project-item space' key={key+'space'}><div/><div/></div> */}
          </>
        } else {
          return <>
          <div className='project-item list'>
            <div>
              <span className='project-list'>{key}</span>
              {compiled_years[key]
              ? <span className='project-year subtle'>{compiled_years[key]}</span>
              : ''}
            </div>
            <div></div>
          </div>
          {compiled[key].map(inner => <ProjectItem key={key+inner} name={inner} compiled={key} />)}
          <div className='project-item space' key={key+'space'}><div/><div/></div>
        </>
        }
      }

      return <ProjectItem key={key} name={key} />
    })}
  </ProjectList>
  </>
)


const ProjectList = styled.div`
display: flex;
flex-direction: column;
.project-item {
  color: inherit;
  > :first-child {
    font-size: .8em;
    // display: block;
    color: inherit;
    // text-decoration: underline;
    width: 40%;
    width: 55%;
    height: 100%;
    margin: 0;
    margin-right: .5em;
    display: inline-block;
    float: left;
    // &:hover {
    //   color: var(--light);
    // }
    a {
      text-decoration: underline;
      width: fit-content;
      color: inherit;
      // &:hover, &:active, &:focus {
      //   // color: var(--light);
      //   background: var(--light);
      //   color: var(--dark);
      //   text-decoration: none !important;
      // }
    }
    // &:hover, &:active, &:focus {
    //   cursor: pointer;
    //   // text-decoration: none !important;
    //   a {
    //     background: var(--light);
    //     color: var(--dark);
    //     text-decoration: none !important;
    //     // background: linear-gradient(0deg, var(--light) 50%, #0000 50%);
    //     // background-size: 200% 200%;
    //     // background-position-y: 100%;
    //     // animation: hover .1s linear;
    //     // @keyframes hover {
    //     //   0% { background-position-y: 50%; }
    //     // }
    //   }
    // }
    .project-year {
      margin-left: .7em;
      font-size: .95em;
    }
  }
  display: flex;
  > :last-child {
    font-size: .7em;
    margin-bottom: .67em;
    margin-bottom: .5em;
    margin-bottom: .2em;
    // margin-right: .5em;
    // position: relative;
    // left: .5em;
    // width: 55%;
    width: -webkit-fill-available;
    display: inline-block;
    margin-top: .1em;
    vertical-align: top;
    float: left;
    &::after {
      content: '';
      display: block;
    }
  }
  &.list {
    > :first-child { width: 100%; }
    > :last-child { display: none; }
  }
}
.project-item.list {
  // opacity: .7;
  border: 0;
  border-top: 2px solid transparent;
  margin-bottom: -2px;
  .project-list {
    // opacity: .33;
  }
}
.project-item.compiled {
  > :first-child {
  }
  // padding-left: .5em;
  > :first-child::before {
    content: "- ";
    float: left;
    white-space: pre;
    line-height: 1;
  }
  > :last-child {
    margin-bottom: 0em;
  }
}
// .project-item:hover {
//   background: #fff1;
// }
.inline-project-list {
  line-height: 1;
  padding-bottom: .67em;
  .project-item {
    padding: 0;
    > ::before { display:none }
  }
}
.project-item.special-true {
  > :first-child a {
    // color: gold;
    // color: #eaaf0a;
    font-weight: bold;
    display: inline;
  }
  // ${Array.from({ length: 100 }).map((_, i) => `
  // &:nth-child(${i}) { animation-delay: -${i}s; }
  // `)}
  // > :first-child a {
  //   color: gold;
  //   color: rgba(255, 215, 0, .8);
  //   display: inline-block;

  //   background: -webkit-gradient(linear,left top,right top,from(#222),to(#222),color-stop(.5,#fff));
  //   background: -moz-gradient(linear,left top,right top,from(#222),to(#222),color-stop(.5,#fff));
  //   background: gradient(linear,left top,right top,from(#222),to(#222),color-stop(.5,#fff));
  //   background-size: 125px 100%;
  //   -webkit-background-clip: text;
  //   -moz-background-clip: text;
  //   background-clip: text;
  //   animation-name: shimmer;
  //   animation-duration: 4s;
  //   animation-iteration-count: infinite;
  //   background-repeat: no-repeat;
  //   background-position: 0 0;
  //   background-color: #222;

  //   @keyframes shimmer {
  //     0% { background-position: top left; }
  //     80% { background-position: top right; }
  //     100% { background-position: top left; }
  //     // 100% { background-position: top right; }
  //   }
  // }
  // &:hover, &:active, &:focus {
  //   > :first-child {
  //     a {
  //       background: gold !important;
  //     }
  //   }
  // }
}

// .project-item:not(.list):not(.space) {
//   &:hover, &:active, &:focus {
//     background: #fff1;
//     > :first-child {
//       color: inherit;
//       cursor: pointer;
//       a {
//         background: var(--light);
//         color: var(--dark);
//         text-decoration: none !important;
//       }
//     }
//   }
// }
`

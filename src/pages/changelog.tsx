import React, { useState } from 'react';
import styled from 'styled-components';
import { External, InfoBody, InfoSection, InfoSelect, InfoStyles } from '../components/Info';
import { auth } from '../lib/auth';
import { useF } from '../lib/hooks';
import { usePathState } from '../lib/hooks_ext';
import { parseSubpage } from '../lib/page';
import { project_years } from '../lib/projects';
import { JSX } from '../lib/types';
import url from '../lib/url';
import { set } from '../lib/util';

// todo actually use this
const CHANGELOGS = {
  wordbase:
  <>
    <p><b>1.1</b></p>
    <p>
      <b>Game Customization</b><br/>
      <a className='control'
      onClick={() => {
        url.external(`/wordbase?settings.wordbase.customize=true`)
      }}>
        enable
      </a><br/>
      •&nbsp; minefield game mode<br/>
      •&nbsp; game clock<br/>
      •&nbsp; super bombs<br/>
      •&nbsp; adjust try limit, switch to post-play challenges<br/>
      •&nbsp; ... and more!<br/>
    </p>
    <p>
      <b>Also:</b><br/>
      •&nbsp; ability to request draw<br/>
      •&nbsp; Portuguese & Finnish support<br/>
      •&nbsp; color themes<br/>
    </p>
  </>
} // replace with query to server

export default ({ project:embedded }) => {
  const options = embedded ? [embedded] : Object.keys(CHANGELOGS)
  const [project, setProject] = useState(parseSubpage() || embedded)
  useF(project, () => {
    if (embedded) {
      if (!project) url.external('/changelog')
    } else {

    }
  })

  return <Style>
    <InfoBody>
      <InfoSelect name={embedded ? 'view others' : 'select project'} options={options} value={project} onChange={e => setProject(e.target.value)} />
      <InfoSection labels={[
        'changelog',
        !embedded && project && {
          text: `→ /`+project,
          func: () => url.external(`/`+project),
          style: {
            border: 'none',
            textDecoration: 'underline',
            opacity: .4,
          },
        },
        ]}>
        {CHANGELOGS[project]}
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
.body {
  white-space: pre-wrap;
}
`
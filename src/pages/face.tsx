import React, { useState } from 'react';
import styled from 'styled-components';
import { InfoBody, InfoSection, InfoStyles } from '../components/Info';
import { useF, useR } from '../lib/hooks';
import { array } from '../lib/util';

const Face = () => {
  const [popped, setPopped] = useState(false)
  const [split, setSplit] = useState(false)
  const ref = useR()

  useF(() => {
    if (ref.current) {
      const el = ref.current as HTMLElement
      if (el.getBoundingClientRect().height > el.querySelector('.left').getBoundingClientRect().height) {
        setSplit(true)
        // el.style.setProperty('opacity', '0');
      }
    }
  })

  return <span ref={ref} className={`face popped-${popped} split-${split}`} onClick={() => setPopped(true)}>
    <span>
      <span className='left'>:</span>
      <span className='right'>{popped ? '>' : '<'}</span>
    </span> </span>
}

export default () => {
  return <Style>
    <InfoBody>
      {/* <div style={{ whiteSpace: 'pre' }}>
{`
  :<:<              :<:<
  :<:<          :<:<
            :<:<
        :<:<
            :<:<
  :<:<          :<:<
  :<:<              :<:<

`}
      </div> */}
      {/* {array(10000, i => ':<').join(' ')} */}
      {array(4002, i => <Face key={i} />)}
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
.face {
  cursor: pointer;
  font-size: 1.6rem;
  word-break: break-all;

  // > span {
  //   position: relative;
  //   ::after {
  //     position: absolute;
  //     content: "";
  //     height: 2rem;
  //     width: 2rem;
  //     left: calc(50% - 1rem);
  //     top: calc(50% - 1rem);
  //     background: #0001;
  //     border-radius: 0 0 100% 100%;
  //   }
  // }

  &.popped-true span.left {
    position: relative;
    &::after {
      position: absolute;
      content: "";
      height: 2.4rem;
      width: 2.4rem;
      right: calc(-5% - 1.2rem);
      top: calc(57% - 1.2rem);
      background: #0000000a;
      border-radius: 50%;
      pointer-events: none;
    }
  }face
  &.popped-true.split-true span.right {
    position: relative;
    &::after {
      position: absolute;
      content: "";
      height: 2.4rem;
      width: 2.4rem;
      left: calc(-5% - 1.2rem);
      top: calc(57% - 1.2rem);
      background: #0000000a;
      border-radius: 50%;
      pointer-events: none;
    }
  }
}
`
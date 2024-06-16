import React from 'react';
import styled from 'styled-components';
import { InfoBody, InfoStyles } from '../components/Info';
import { auth } from '../lib/auth';
import { Conditions } from '../lib/conditions';


export default () => {
  auth.use()
  return <Style>
    <InfoBody>
      <Conditions display={true} />
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
.body {
  white-space: pre-wrap;
}
`
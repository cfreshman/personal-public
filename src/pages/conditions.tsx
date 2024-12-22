import React from 'react';
import styled from 'styled-components';
import { InfoBody, InfoSection, InfoStyles } from '../components/Info';
import { auth } from '../lib/auth';
import { Conditions } from '../lib/conditions';


export default () => {
  auth.use()
  return <Style>
    <InfoBody>
      <InfoSection>
        <Conditions display={true} />
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
.body {
  white-space: pre-wrap;
}
`
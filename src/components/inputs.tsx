import React from 'react';
import api from 'src/lib/api';
import { useF, useM, useS } from 'src/lib/hooks';
import { store } from 'src/lib/store';
import { S, dev } from 'src/lib/util';
import styled from 'styled-components';
import { Multiline } from './Info';

export const InputLabelled = ({ label, value, onChange, align='left', width='auto', type='text', area=false, style={}, ...props }: {
  label: string,
  value: string, onChange,
  align?: 'left' | 'center' | 'right',
  width?: string, type?: string,
  area?: boolean,
  [key: string]: any,
}) => {
    return <_InputLabelledStyle {...props} className={'input-text-labelled ' + (props.className||'')} style={{ ...style, ...S(`
    align-items: ${{
      left: 'flex-start',
      center: 'center',
      right: 'flex-end',
    }[align]};
    width: ${width};
    `)}}>
        <label>{label}</label>
        {area ?
        <Multiline {...props} value={value} onChange={onChange} style={{ ...style, ...S(`
        width: 100%;
        max-width: unset;
        `)}} />
        :
        <input {...props} type={type} value={value} onChange={onChange} style={{ ...style, ...S(`
        width: 100%;
        max-width: unset;
        `)}} />}
    </_InputLabelledStyle>
}
const _InputLabelledStyle = styled.div`
display: flex;
flex-direction: column;
label {
  font-size: .8em;
}
`
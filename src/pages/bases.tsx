import React, { useState } from 'react';
import styled from 'styled-components';
import { InfoBody, InfoSection, InfoStyles } from '../components/Info';
import api from '../lib/api';
import { useF, useR } from '../lib/hooks';
import { q_parse } from '../lib/queue';

const leftPad = (s, n, c=' ') => {
  if (s.length < n) return c.repeat(n - s.length) + s
  else return s
}

export default () => {
  const [len, setLen] = useState(0)
  const [dec, setDec] = useState('')
  const [hex, setHex] = useState('')
  const [bin, setBin] = useState('')

  const [base, setBase] = useState(8)
  const [custom, setCustom] = useState('')

  const handle = {
    change: ({ dec:_dec='', bin:_bin='', hex:_hex='', len:_len=len, base:_base=base, custom:_custom='' }={}) => {
      let actual = Number(dec)
      if (_dec) actual = Number(_dec)
      if (_hex) actual = Number.parseInt(_hex, 16)
      if (_bin) actual = Number.parseInt(_bin, 2)
      if (_custom) actual = Number.parseInt(_custom, _base)
      if (isNaN(actual)) actual = 0
      setDec(leftPad(actual.toString(10), _len, '0'))
      setHex(leftPad(actual.toString(16).toUpperCase(), _len, '0'))
      setBin(leftPad(actual.toString(2), _len, '0'))

      setBase(_base)
      setCustom(leftPad(actual.toString(_base), _len, '0'))

      setLen(_len)
    }
  }

  return <Style>
    <InfoBody>
      <InfoSection labels={[
        'length',
      ]}>
        <input type='number' value={len} onChange={e => {
          handle.change({ len: Number(e.target.value) })
        }} />
      </InfoSection>
      <InfoSection labels={[
        'decimal',
      ]}>
        <textarea rows={4} value={dec} onChange={e => {
          handle.change({ dec: e.target.value })
        }} />
      </InfoSection>
      <InfoSection labels={[
        'hexadecimal',
      ]}>
        <textarea rows={4} value={hex} onChange={e => {
          handle.change({ hex: e.target.value })
        }} />
      </InfoSection>
      <InfoSection labels={[
        'binary',
      ]}>
        <textarea rows={4} value={bin} onChange={e => {
          handle.change({ bin: e.target.value })
        }} />
      </InfoSection>
      <InfoSection labels={[
        'custom',
      ]}>
        <input type='number' value={base} min={2} max={36} onChange={e => {
          handle.change({ base: Number(e.target.value) })
        }} />
        <textarea rows={4} value={custom} onChange={e => {
          handle.change({ custom: e.target.value })
        }} />
      </InfoSection>
    </InfoBody>
  </Style>
}

const Style = styled(InfoStyles)`
input, textarea {
  margin-bottom: .1em;
}
`
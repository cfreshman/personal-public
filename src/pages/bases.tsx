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
    change: ({ dec:_dec=undefined, bin:_bin=undefined, hex:_hex=undefined, len:_len=len, base:_base=base, custom:_custom=undefined }={}) => {
      let actual = Number(dec)
      if (_dec !== undefined) actual = Number(_dec || 0)
      if (_hex !== undefined) actual = Number.parseInt(_hex || '0', 16)
      if (_bin !== undefined) actual = Number.parseInt(_bin || '0', 2)
      if (_custom !== undefined) actual = Number.parseInt(_custom || '0', _base)
      if (isNaN(actual)) actual = 0
      setDec(!actual ? '' : leftPad(actual.toString(10), _len, '0'))
      setHex(!actual ? '' : leftPad(actual.toString(16).toUpperCase(), _len, '0'))
      setBin(!actual ? '' : leftPad(actual.toString(2), _len, '0'))

      setBase(_base)
      setCustom(!actual ? '' : leftPad(actual.toString(_base), _len, '0'))

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
import React, { useState } from 'react';
import { DnbGame } from "./game"
import './fonts.css';
import { usePageSettings } from 'src/lib/hooks_ext';

export default () => {
    usePageSettings({
        background: '#fff',
    })
    return <DnbGame />
}
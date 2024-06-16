import React from 'react';
import styled from 'styled-components';

const Style = styled.a`
`

export const WikiLink = ({ path }) => {
    let wiki = path.split('/').filter(p => p && ['projects', 'home', 'about'].indexOf(p) < 0).join('/');
    return (
        <Style className="wiki-link" href={`https://github.com/cfreshman/personal/wiki/${wiki}`}>
            [ wiki ]
        </Style>
    )
}
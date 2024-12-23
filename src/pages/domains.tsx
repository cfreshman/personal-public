import React from 'react';
import styled from 'styled-components';
import { InfoStyles, InfoBody, InfoLinks, InfoBadges, InfoSection, HalfLine } from '../components/Info'
import { truthy } from '../lib/types';
import { dev } from '../lib/util';
import { usePageSettings } from 'src/lib/hooks_ext';

export const domains = [
    // 'freshman.dev',
    { text: 'freshman.dev', label: 'default' },
    // 'uh.software',
    // 'f6n.co',
    'cyru.us',
    'frsh.mn',
    'tu.fo',
    // ' ',
    // { text: 'wordbase.app', label: ' → /wordbase ', direct: true},
    // { text: 'basin.fish', label: ' → /fishbowl ', direct: true},
    // { text: 'matchbox.zip', label: ' → /matchbox ', direct: true},
    // { text: 'tally.gallery', label: ' → /tally '},
    // { text: 'dinder.social', label: ' → /dinder ', direct: true},
    // { text: 'pico-repo.com', label: ' → /pico-repo '},
    // { text: 'crowdmeal.app', label: ' → /crowdmeal '},
    // { text: 'cyfr.dev', label: '-> freshman.dev'},
    // dev && location.host,
    // { text: 'monstera.software', direct: true },
    // { text: 'cafe.computer', label: ' → /computer.html ', direct: true },
    // { text: 'webputer.page', label: ' → /computer.html ', direct: true},
    // 'oatmeal.zip',
    // ' ',
    // 'cyrusman.xyz',
    // 'cyrusfre.sh/man',
    // 'f8n.co',
    // 'f3n.co',
    // 'cfre.sh/man', 
    ' ',
    { text: 'greeter.social', label: '→ /greeter', direct: true },
    { text: 'web-app-store.com', label: '→ /web-app-store', direct: true },
    // { text: 'vibe.photos', label: '→ /vibe', direct: true },
    // { text: 'cyrusfreshman.com', label: ' → freshman.dev ' },
    // { text: 'bowl.fish', label: ' → /fishbowl ', direct: true },
    // { text: 'tally.gallery', label: ' → /tally ', direct: true },
    // { text: 'pico.cafe', label: ' → /pico-packet ', direct: true },
    // { text: 'wwl.watch', label: ' → /raw/wwl ', direct: true },
    // { text: 'webputer.page', label: ' → /computer.html ', direct: true },
    ' ',
    // { text: 'tu.fo', label: 'url shortener', direct: true },
    { text: 'nn.fo', label: 'url shortener', direct: true },
    // ' ',
    // { text: 'paper.chat', label: ' social media concept ', direct: true },
].filter(truthy).map((d: any) => ({ 
    text: d.text || d,
    labels: d.label? [d.label] : [],
    direct: d.direct || false,
}))

export default () => {
    usePageSettings({
        professional: true,
    })
    return <InfoStyles>
        <InfoBody>
            <InfoSection>
                <div /> {/* needed to avoid margin after first badges line */}
                {domains.map(d =>
                d.text.trim()
                ?
                <InfoBadges labels={[
                    {
                        text: d.text,
                        href: `https://${d.text.replace(/\/.+/, '')}${d.direct ? '' : '/domains'}`,
                    },
                    ...(
                        d.text.replace(/\/.+/, '') === location.host
                        ? [...d.labels, ' here now! ']
                        : d.labels
                    ),
                ]} />
                : <HalfLine />)}
            </InfoSection>
            {/* <InfoLinks {...{
                // labels: ['why do I have so many domains?'],
                // labels: ['I have too many domains'],
                entries: domains.map(d =>
                    ({ text: d.text, data: `https://${d.text.replace(/\/.+/, '')}${d.direct ? '' : '/domains'}` })),
                entryLabels: domains.map((d: any) => d.text.replace(/\/.+/, '') === location.host
                    ? [...d.labels, ' here now! ']
                    : d.labels),
            }} /> */}
        </InfoBody>
    </InfoStyles>
}

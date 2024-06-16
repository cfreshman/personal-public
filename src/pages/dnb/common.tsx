import { array } from "../../lib/util";

export const globals = {
    wordCheck: true,
    flipMs: 700,
};

export const theme = {
    // p1: '#f80808',
    // p2: '#0808f8',
    // p1: '#CEE5D0',
    // p2: '#F7D59C',
    // back: '#5E454B',
    // dots: '#F3F0D7',
    // p1: '#E6BF97',
    // p2: '#6E72D3',
    p1: '#ff4f4f',
    p2: '#4f4fff',
    p3: '#52bf68',
    p4: '#ffd345',
    p5: '#c460f6',
    p6: '#79f1ed',
    // p7: '#4f4f4f',
    p: [''],
    back: '#fff',
    dots: 'black',
}
theme.p = array(6, i => theme[`p${i+1}`])
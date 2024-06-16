import React, { useState, useEffect } from 'react';
import { A, External } from '../../components/Info';
import { JSX } from '../../lib/types';
import { Q, toStyle } from '../../lib/util';
import styled from 'styled-components';
import api, { auth } from '../../lib/api';
import { useF, useInput, useR, useStyle } from '../../lib/hooks';
import { usePageSettings } from '../../lib/hooks_ext';
import './font.css';

const Wisput = (props) => {
    const [wisdom, setWisdom, wisdomFill] = useInput('')
    const [name, setName, nameFill] = useInput('')
    const [sending, setSending] = useState(false);
    const [open, setOpen] = useState(false);

    const handle = {
        open: () => {
            setOpen(!open);
        },
        submit: (e) => {
            e?.preventDefault()
            if (document.activeElement.id === 'quote' && !name) {
                document.activeElement.nextSibling.focus()
            } else {
                document.activeElement.blur()
                console.log(`${wisdom} ${name || 'anonymous'}`)
                if (!sending && wisdom) {
                    setSending(true);
                    api.post('/turt', {
                        content: wisdom,
                        author: name || 'anonymous'
                    }).then(data => {
                        console.log(data);
                        setWisdom('');
                        setSending(false);
                        props.onwisput(data._id);
                        setOpen(false)
                    });
                }
            }
        }
    }
    // useF(open, () => setTimeout(() => Q('#quote')?.focus(), 500))
    useF(open, () => setTimeout(() => Q('#quote')?.focus()))
    useStyle(open ? `
    .quote-container {
        visibility: hidden;
    }
    `: '')

    return <>
        {/* {open ? <span className='button' style={toStyle(`
        position: absolute; top: 1em;
        `)}>(a mix of user quotes and <External to={'api.quotable.io/random'} style={{color:'#fff'}} />)</span> : ''} */}
        {open ? <a href='https://api.quotable.io/random' className='button center-row' style={toStyle(`
        position: absolute;
        top: 0;
        // top: 3em;
        `)}>(a mix of user quotes and api.quotable.io/random<External to={'https://api.quotable.io/random'} />)</a> : ''}
        <div className={`wisput ${open ? "open" : ""}`}>
            {open
            ?
            <form onSubmit={handle.submit} onFocus={e => {
                if (e.target.id === 'author' && !wisdom) e.target.previousSibling.focus()
            }}>
                <div id="inputs">
                    <input type="text" id="quote" placeholder="What are some wise words?" {...wisdomFill}
                    onKeyDown={e => {
                        if (e.key === 'Enter') Q('.wisput #author').focus()
                    }} />
                    <input type="text" id="author" placeholder=" - anonymous" maxLength={40} {...nameFill}
                    onKeyDown={e => {
                        if (e.key === 'Enter') handle.submit(e)
                    }}
                    value={name ? name.replace(/^ ?-? ?/, ' - ') : ''}
                    onChange={e => setName(e.target.value.replace(/^( - )?/, ''))}/>
                </div>
                <div style={toStyle(`
                display: flex;
                justify-content: flex-end;
                margin: 0 -.125em;
                `)}>
                    <span className='button' onClick={handle.submit}>Submit</span>
                    <span className='button' onClick={handle.open}>Nevermind</span>
                </div>
            </form>
            :
            // <div className="tab button centering" onClick={handle.open}>add</div>
            <div className="tab button centering" onClick={handle.open}>+</div>
            }
        </div>
    </>
}

export default (props) => {
    // const [wisdom, setWisdom] = useState('Tap me for some wisdom :-)');
    const [wisdom, setWisdom] = useState('Tap me for some wisdom');
    const [author, setAuthor] = useState('Turt Smurts');
    const [visible, setVisible] = useState(true);
    const [responding, setResponding] = useState(false);

    // useCheckin('turt-smurts-2D')
    usePageSettings({
        checkin: 'turt-smurts',
        // background: '#f8eeee',
        hideLogin: true,
        hideFooter: true,
        expandPlacement: 'top-right',
        expand: true,
        expandStyle: `
        .wisdom, .author {
            background: #fff !important;
        }
        `,
        // transparentHeader: true,
        uses: {
            'api.quotable.io': 'https://api.quotable.io/random',
        },
    })

    const handle = {
        turtle: () => {
            if (!responding) {
                setResponding(true);
                setVisible(false);
                if (Math.random() > 0.5) {
                    setTimeout(() => {
                        fetch('https://api.quotable.io/random')
                        .then(res => res.json())
                        .then(data => {
                            console.debug(data);
                            setWisdom(data.content);
                            setAuthor(data.author);
                            setVisible(true);
                            setResponding(false)
                        });
                    }, 1000);
                } else {
                    setTimeout(() => api.get('/turt/random/').then(data => {
                        console.debug(data);
                        setWisdom(data.content);
                        setAuthor(data.author);
                        setVisible(true);
                        setResponding(false);
                    }), 1000);
                }
            }
        },
        wisput: (id) => {
            setResponding(true);
            setVisible(false);
            setTimeout(() => api.get(`/turt/${id}`).then(data => {
                console.debug(data);
                setWisdom(data.content);
                setAuthor(data.author);
                setVisible(true);
                setResponding(false);
            }), 1000);
        }
    }

    useEffect(() => {
        document.title = "Turt Smurts";
    });

    const ref = useR()
    useF(wisdom, () => {
        const bounds = ref.current.getBoundingClientRect()
        ref.current.style.minWidth = bounds.width + 'px'

        ref.current.querySelector('.wisdom').style.minWidth = 0
        ref.current.querySelector('.wisdom').style.minWidth = `min(80vw, ${(ref.current.querySelector('.author').getBoundingClientRect().width + 12)+'px'})`
    })
    auth.use(({ expand }) => {
        if (ref.current) ref.current.style.minWidth = ''
    })

    return (
        <Style id="turt-smurts" ref={ref}>
            {/* <About /> */}
            <div className={`quote-container ${visible ? "" : " unvisible"}`}>
                <div className="quote">
                    <p className="wisdom">{wisdom}</p>
                    <p className="author">
                        <span className="text">{author}</span>
                    </p>
                </div>
            </div>
            <p className="turtle" onClick={handle.turtle}>🐢</p>
            <Wisput onwisput={handle.wisput} />
        </Style>
    );
}

const Style = styled.div`
&#turt-smurts {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: #f8f8ff;
    // padding-top: 2em;

    * {
        user-select: none;
    }

    width: 100%;
    height: 100%;
    text-align: center;
    /* max-width: min(30rem, calc(100% - 2rem)); */
    /* margin: auto; */
    position: relative;
    /* background: linear-gradient(15deg, var(--bg-top) 0%, var(--pink-light) 100%) fixed; */
    // background: #f8eeee;

    .quote-container {
        height: 60%; width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        transition: opacity .75s;
    }
    .quote-container.unvisible {
        opacity: 0;
    }
    .quote {
        font-family: 'Caveat';
        color: var(--dark);
        max-width: calc(100% - 2rem);
    }
    .turtle {
        font-size: 5rem;
        cursor: pointer;
        width: fit-content;
        margin: auto;
        user-select: none;
        -webkit-tap-highlight-color: rgba(0,0,0,0);
        -webkit-tap-highlight-color: transparent;
        animation: walk 3s linear infinite;
    }
    @keyframes walk {
        25% { transform:rotate(-5deg); }
        75% { transform:rotate(5deg); }
    }
    .author, .wisdom {
        // background: var(--background);
        // background: #fff;
        background: linear-gradient(#fff8 0 0) var(--background);
        border: 1px solid #000;
        user-select: text;
        background: #f8f8ff;
        background: #fbfbff;
    }
    .wisdom {
        font-size: 1.5rem;
        // background: #fff;
        /* background: rgba(255, 255, 255, 0.5); */
        padding: 1rem;
        border-radius: .5rem;
        margin: 0;
        border-bottom-right-radius: 0;
        /* box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.12); */
        /* box-shadow: 4px 4px 4px 0 rgba(0, 0, 0, 0.12); */
        // font-family: 'Roboto Slab';
        font-family: system-ui;
        font-size: 1.25em;
        white-space: pre-wrap;
        word-break: break-word;
    }
    .author {
        font-size: .8rem;
        font-style: italic;
        // font-family: 'Roboto Slab';
        /* text-align: right; */
        /* color: #fff; */
        width: fit-content;
        // background: #fff;
        /* background: rgba(255, 255, 255, 0.5); */
        /* box-shadow: 4px 4px 4px 0 rgba(0, 0, 0, 0.12); */
        margin: 0;
        margin-left: auto;

        border-bottom-left-radius: .5rem;
        border-bottom-right-radius: .5rem;

        padding: 0 1rem;

        position: relative;
        top: -1px;
        border-top: 0;
    }
    .author > .text {
        width: fit-content;
        height: 1rem;
        position: relative;
        top: -0.5rem;
    }
    .author > .text::after {
        width: fit-content;
        height: 1rem;
        position: relative;
        top: -0.5rem;
    }

    .tab {
        position: absolute;
        right: 0;
        // width: 2.5rem;
        // height: 2.5rem;
        // background: inherit;
        // color: var(--dark);
        // cursor: pointer;
        // font-size: 1.25rem;
        // user-select: none;
        // pointer-events: all;
        // font-family: revert;
    }
    .wisput .tab {
        bottom: 100%;

        // width: 2rem;
        // height: 2rem;
        // margin: 1rem;
        // border: 1px solid #000;
        // border-radius: .25rem;
        // font-size: 1.25rem;

        // box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.12);
    }
    .wisput {
        font-size: 1rem !important;
        width: 100%;
        position: absolute;
        left: 0;
        bottom: -8rem;
        top: 100%;
        padding: 1rem;
        padding-top: 0;
        // transition: bottom .3s;
    }
    .wisput * {
        font-family: monospace;
    }
    .wisput.open {
        top: initial;
        bottom: 0;
    }
    // .wisput.open .tab {
    //     /* font-size: 2rem; */
    //     margin-bottom: .5rem;
    //     font-size: 1rem;
    // }
    // .wisput:not(.open) .tab {
    //     border-radius: 50%;
    // }
    .wisput #inputs {
        /* background: var(--bg-bottom); */
        border-radius: .25rem;
        margin-bottom: .25rem;
    }
    .wisput input
    // , .wisput .button 
    {
        border: 2px solid transparent;
        border-radius: 0;
        /* border: 1px solid var(--bg-top); */
        outline: none;
        background-color: #fff;
        color: var(--dark);
        padding: .05rem .25rem;
        padding: calc(.05rem + 2px) calc(.2rem + 2px);
        width: 100%;
        /* margin-bottom: .5rem; */
        /* text-align: center; */
        /* font-family: 'Inter'; */
        font-size: max(16px, 0.8rem);
        // box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.12);
    }
    .wisput input::placeholder {
        /* color: var(--bg-mid); */
        // color: #0004;
        color: inherit;
        font-size: .9rem;
    }
    .wisput input:focus-within::placeholder {
        color: #0004;
    }
    .wisput #quote {
        border-top-left-radius: .2rem;
        border-top-right-radius: .2rem;
    }
    .wisput #author {
        border-bottom-left-radius: .2rem;
        border-bottom-right-radius: .2rem;
    }

    .wisput {
        // .button, 
        #inputs
        // , .tab 
        {
            background: #fff;
            color: #000;
            border: 1px solid #000 !important;
        }
        // .button, 
        input
        // , .tab 
        {
            box-shadow: none;
        }
        // .button {
        //     padding: 0 .5em;
        //     font-size: .9em !important;
        // }
    }

    /* Buttons */
    // .wisput .button {
    //     display: inline-block;
    //     border: 1px solid transparent;
    //     outline: transparent;
    //     border-radius: .2rem;
    //     padding: .2rem .4rem;
    //     width: fit-content;
    //     min-width: 3.3rem;
    //     cursor: pointer;
    //     // float: right;
    //     margin: 0 .125em;

    //     background-color: #fff;
    //     color: var(--dark);
    //     font-size: 1rem;
    // }

    color: #000;
    a {
        color: inherit !important;
        text-decoration: none;
    }


    .wisdom {
        font-size: 1em;
        padding: .67em;
        padding-bottom: .775em;
    }
    .author {
        font-size: 1em;
        height: 1em;
        padding: 0 .67em;
    }
    .author > .text {
        top: -.75em;
    }
    // .wisput {
        .button {
            // padding: 0;
            // border: 0 !important;
            // text-decoration: underline;
            // margin-left: .5em;
            // background: none;
            // font-weight: bold;
            // text-transform: lowercase;


            // margin: 1em 0.5em;
            display: block;
            background: rgb(255, 255, 255);
            color: rgb(0, 0, 0);
            border-radius: 1em;
            padding: 0px 0.25em;
            font-size: 0.7em;

            display: flex;
            align-items: center;
            width: fit-content;
            border: 1px solid #000;
            cursor: pointer;
            text-transform: lowercase;
            padding: 0 .5em;
            white-space: pre-wrap;
        }
    // }

    .wisput .button {
        font-size: .8em;
        margin-left: .25em;
        text-transform: uppercase;
    }
    .wisput {
        padding: .5rem !important;
        position: unset !important;
    }
    .tab.button {
        bottom: .5rem !important;
        right: .5rem !important;
    }
}
`
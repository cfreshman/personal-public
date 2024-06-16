import React, { Fragment, useState } from 'react';
import { useF, useS, useStyle } from 'src/lib/hooks';
import { useSocket } from 'src/lib/socket';
import { A } from './A';
// import { Link } from 'react-router-dom';
// import { useStyle } from '../lib/hooks';
// import { useStyle } from '../lib/hooks_ext';
// import { useSocket } from '../lib/socket';

const { named_log } = window
const log = named_log('unread')

export const Unread = () => {
  return <></>
  // let [unread, setUnread] = useS({})
  // useSocket({
  //   on: {
  //     'chat:unread': unread => setUnread(unread),
  //   },
  //   connect: socket => socket.emit('chat:unread')
  // })
  // useStyle(Style)
  // useF(unread, log)

  // // useF(unread, () => console.debug('UNREAD', unread))

  // let unreadCount = unread && Object.values(unread).length
  // return unreadCount
  //   ? <A className='unread' href='/chat/site'>{unreadCount} unread</A>
  //   : <></>
}

const Style = `
.unread {
  margin-right: .75rem;
  background: var(--id-color-text) !important;
  color: var(--id-color) !important;
  // background: #323142;
  // color: #7c7b86;
  // opacity: 1;
  padding: 0 .25rem !important;
  border-radius: .15rem;
  border: 0 !important;
  // font-size: .77em;

  border-radius: 1e6em !important;
  font-size: .8em;
  margin-top: 2px;
  margin-right: 0.5em;
}
#header:has(.dropdown-label:hover) .unread {
  display: none;
}
`
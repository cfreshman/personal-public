import * as M from './model';
import ioM, { roomed } from '../../io';

let typing = new Set()

export default (io, socket, info) => {

   // socket.on('chat:send', (from, users, text, meta) => {
   //    let { chat } = M.get(hash)

   //    ioM.send(chat.users, 'chat:sent', text, meta)
   //    io.emit('live:message', {
   //       text: `${info.user || 'user'}: ${data}`,
   //       type: 'message'
   //    });
   // });
   socket.on('chat:typing', async (hash, user, isTyping) => {
      let { chat } = await M.getChat(user, hash)
      ioM.send(chat?.users.filter(u => u !== info.user), 'chat:typing', hash, info.user, isTyping)
   });
   socket.on('chat:view', async (hash) => {
      console.log('[IO:chat:view]', hash)
      let { chatUser } = await M.getUser(info.user)
      if (chatUser.unread && chatUser.unread[hash]) {
         delete chatUser.unread[hash]
         M._putUser(chatUser)
         socket.emit('chat:unread', chatUser.unread)
      }
   });

   const emitUnread = async () => {
      let { chatUser } = await M.getUser(info.user)
      socket.emit('chat:unread', chatUser.unread)
   }
   socket.on('init', emitUnread)
   socket.on('chat:unread', emitUnread)
};
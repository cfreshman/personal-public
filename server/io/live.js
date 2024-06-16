import { roomed } from '.';

let typing = new Set()

export default (io, socket, info) => {

   socket.on('live:message', data => {
         io.emit('live:message', {
            text: `${info.user || 'user'}: ${data}`,
            type: 'message'
         });
   });
   socket.on('live:typing', isTyping => {
      let isChange
      if (isTyping) {
         isChange = !typing.has(info.user)
         typing.add(info.user)
      } else {
         isChange = typing.has(info.user)
         typing.delete(info.user)
      }
      isChange && io.emit('live:typing', Array.from(typing))
   });

   roomed(io, socket, info, 'live',
      (joined, users) => {
         let usersWithoutJoined = users.slice()
         usersWithoutJoined.splice(users.indexOf(joined), 1)
         // if (usersWithoutJoined.length > 0) {
         //    socket.emit('live:message', {
         //       text: `> ${usersWithoutJoined.join(', ')} online`,
         //       type: 'online'
         //    })
         // }
         io.to('live').emit('live:message', {
            text: `> ${joined} joined`,
            type: 'action'
         })
         io.emit('live:typing', Array.from(typing))
      },
      (joined, users) => {
         io.to('live').emit('live:message', {
            text: `> ${joined} left`,
            type: 'action'
         })
         typing.delete(info.user)
         io.emit('live:typing', Array.from(typing))
      })

};
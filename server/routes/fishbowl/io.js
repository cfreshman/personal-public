import M from './'
import ioM, { roomed } from '../../io';
import { named_log, remove } from '../../util';

const log = named_log('fishbowl io')

// const rooms = {}
const room_id_to_sockets = {}
// const get_room = async (id) => {
//    if (!rooms[id]) {
//       rooms[id] = await M._get(id)
//    }
//    return rooms[id]
// }
const set_room = async (room) => {
   // rooms[room.id] = room
   ;(room_id_to_sockets[room.id] || []).map(socket => socket.emit(`fishbowl:set`, room))
   return await M._set(room)
}

export default (io, socket, info) => {
   let id
   const leave = () => {
      if (id && room_id_to_sockets[id]) {
         room_id_to_sockets[id] = remove(room_id_to_sockets[id], socket)
      }
      id = undefined
   }
   const join = (new_id) => {
      if (id === new_id) return
      leave(id)
      id = new_id
      if (!room_id_to_sockets[id]) room_id_to_sockets[id] = []
      room_id_to_sockets[id].push(socket)
      log('joined', id, room_id_to_sockets[id].map(x => x.id))
   }
   socket.on('fishbowl:join', join)
   socket.on('fishbowl:leave', leave)
   socket.on('disconnect', leave)

   socket.on('fishbowl:set', async (room) => {
      join(room.id)
      set_room(room)
   })
}
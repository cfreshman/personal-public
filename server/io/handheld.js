import { roomed } from '.';

let rotates = {}
let last = [0, 0, 0]

export default (io, socket, info) => {

   socket.on('handheld:rotate', rotate => {
      // console.log(rotate)
      rotates[socket.id] = rotate
      const other = Object.entries(rotates)
         .filter(e => e[0] !== socket.id)
         .map(e => e[1])
      const n = other.length
      const target = other
         .reduce(
            (arr, [x, y, z]) => [arr[0] + x, arr[1] + y, arr[2] + z],
            n ? [0, 0, 0] : last)
         .map(x => Math.round(x/(n || 1)*100)/100)
      // console.log(other.length, target)
      // console.log(Object.keys(rotates).length)
      socket.emit('handheld:rotate', target);
   });

   roomed(io, socket, info, 'handheld',
      (joined, users) => {
         // console.log('[IO:handheld]', socket.id)
         io.in('handheld').emit('handheld:users', users)
      },
      (joined, users) => {
         last = rotates[socket.id] ?? last
         delete rotates[socket.id]
         io.in('handheld').emit('handheld:users', users)
      })

};
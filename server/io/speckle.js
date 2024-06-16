import { roomed } from '.';

export default (io, socket, info) => {

   socket.on('speckle:dot', data => {
      socket.to('speckle').emit('speckle:dot', data);
   });

   roomed(io, socket, info, 'speckle')
};
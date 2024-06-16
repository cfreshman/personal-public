import { roomed } from '.';
import db from '../db';
import { entryMap } from '../util';

const names = {
   wall: 'wall',
       // pos: string
       // msg: string
}
const C = entryMap(names, name => () => db.collection(name));

async function get(pos) {
   return ((await C.wall().findOne({ pos })) || {}).msg;
}
async function all() {
   return Array.from(await C.wall().find({}).toArray()).map(({ pos, msg}) => ({ pos, msg }))
}
async function put(pos, msg) {
   if (msg) {
      await C.wall().updateOne({ pos }, { $set: { pos, msg } }, { upsert: true })
   } else {
      await C.wall().deleteOne({ pos })
   }
}

export default (io, socket, info) => {
   socket.on('wall:get', async pos => {
      // console.log('[IO:wall:get]', pos)
      if (pos) {
         const msg = await get(pos)
         if (msg) socket.emit('wall:get', pos, msg)
      }
   });
   socket.on(`wall:msg`, (pos, msg) => {
      // console.log('[IO:wall:msg]', pos, msg)
      socket.to(`wall`).emit('wall:msg', pos, msg)
      put(pos, msg)
   });
   socket.on(`wall:join`, async () => {
      socket.join(`wall`)
      const msgs = await all()
      // console.log(msgs)
      socket.emit('wall:all', msgs)
   })
   socket.on(`wall:leave`, () => socket.leave(`wall`))
   socket.on('disconnect', () => socket.leave(`wall`))
};
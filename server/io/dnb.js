import db from '../db';
import { entryMap } from '../util';

const names = {
   dnb: 'dnb',
       // hash: string
       // save: string
       // t: number
}
const C = entryMap(names, name => () => db.collection(name));

async function get(hash) {
   return ((await C.dnb().findOne({ hash })) || {}).save;
}
async function put(hash, save) {
   await C.dnb().updateOne({ hash }, { $set: { hash, save, t: new Date() } }, { upsert: true })
}
async function end(hash) {
   await C.dnb().deleteOne({ hash })
}

// delete entries older than a day
function clearDayOld() {
   const dayOld = new Date()
   dayOld.setDate(dayOld.getDate() - 1)
   C.dnb().deleteMany({t: {$lt: dayOld}})
}
db.queueInit(() => {
   setInterval(clearDayOld, 1000 * 60 * 60 * 24 /* daily */)
   setTimeout(clearDayOld, 1000)
})

export default (io, socket, info) => {
   let lastHash = undefined
   function leave() {
      if (lastHash) socket.leave(`dnb:${lastHash}`)
   }

   socket.on('dnb:hash', async hash => {
      leave()
      console.log('[IO:dnb:hash]', hash)
      lastHash = hash
      if (hash) {
         socket.join(`dnb:${hash}`)
         const save = await get(hash)
         if (save) socket.emit('dnb:play', save)
      }
   });
   socket.on(`dnb:play`, (hash, save) => {
      // console.log('[IO:dnb:play]', hash)
      socket.to(`dnb:${hash}`).emit('dnb:play', save)
      put(hash, save)
   });
   socket.on(`dnb:end`, hash => {
      console.log('[IO:dnb:end]', hash)
      end(hash)
   });
   socket.on(`dnb:leave`, leave)
   socket.on('disconnect', leave)
};
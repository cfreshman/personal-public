
// sockets reset on server reconnect
let ios = {}

async function get(user) {
   //  let io = await C.io().findOne({ user })
   let io = ios[user]
   return { io }
}
async function _put(io) {
   //  await C.io().updateOne({ user: io.user }, { $set: io }, { upsert: true });
   ios[io.user] = io
   return { io }
}

async function addIo(user, socketId) {
   const {
      io={
         user,
         ids: []
      }
   } = await get(user)
   if (user) {
      io.ids.push(socketId)
      console.log('[IO:add]', io)
   } else io.ids = []
   return await _put(io)
}
async function removeIo(user, socketId) {
   let { io } = await get(user)
   if (io) {
      io.ids = io.ids.filter(s => s !== socketId)
      if (io.ids.length === 0) {
         delete ios[user]
      } else {
         _put(io)
      }
      delete io['_id']
   }
   // console.log('[IO:remove]', io)
   return { io }
}
async function clearIo() {
   console.log('[IO:clear]')
   ios = {}
}

export {
   get,
   addIo,
   removeIo,
   clearIo,
};

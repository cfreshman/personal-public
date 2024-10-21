import { pass, randAlphanum, truthy } from '../util';
import * as M from './model';


let _io, _emits = []
export function set(io) {
   _io = io
   _emits.map(args => _io.emit(...args))
}
export function inst() {
   return _io
}
export function emit(...args) {
   if (_io) _io.emit(...args)
   else _emits.push(args)
}

export async function send(users, event, ...eventArgs) {
   let isSingle = typeof users === 'string'
   console.log('[IO:send]', users, event)
   let results = await Promise.all((isSingle ? [users] : users).map(async user => {
      let { io } = user ? await M.get(user) : {}
      if (!io || !io.ids.length) return false

      delete io._id
      if (!['chat:typing','chat:unread'].includes(event)) console.log(
         '[IO:send]', event, {
            ...io,
            ...{ id: io.ids[0], ids: io.ids.length },
         })
      io.ids.forEach(socketId => {
         inst().to(socketId).emit(event, ...eventArgs)
      })
      return true
   }))
   return (isSingle) ? results[0] : results
}

export async function update(room, ...x) {
   inst().to(room).emit(`${room}:update`, ...x)
}

const toConfirm = {}
export function middleware(socket, info, event, ...args) {
   // confirmed events
   // console.debug(`socket:${info.user}`, event, args)
   if (toConfirm[event]) {
      toConfirm[event].delete(socket.id)
      if (toConfirm[event].size === 0) delete toConfirm[event]
   }
}
export async function confirm(users, event, ...eventArgs) {
   const isSingle = typeof users === 'string'
   users = isSingle ? [users] : users

   // init confirms
   const id = randAlphanum(7)
   const confirmEvent = `confirm:${id}`
   const eventConfirms = new Set()
   const userSockets = await Promise.all(users.map(async (user, i) => {
      const { io } = user ? await M.get(user) : {}
      return io?.ids ?? []
   }))
   userSockets.flatMap(pass).forEach(x => eventConfirms.add(x))
   toConfirm[confirmEvent] = eventConfirms
   console.log('[IO:confirm]', id, event, users, eventConfirms)

   // send notification
   const results = await send(users, event, id, ...eventArgs)

   // wait for confirms
   await new Promise(resolve => setTimeout(resolve, 1000))
   const confirmed = results.map((x,i) => x && (
      !eventConfirms.size || userSockets[i].every(s_id => !eventConfirms.has(s_id))))
   console.log('[IO:confirm] confirmed', id, confirmed, eventConfirms, results)

   return isSingle ? confirmed[0] : confirmed
}

const roomUsers = {}
export function roomed(io, socket, info, name, onJoin=undefined, onLeave=undefined) {
   if (!roomUsers[name]) roomUsers[name] = []
   let users = roomUsers[name]
   let joined = false

   function join() {
      if (!joined) {
         console.log(`[IO:${name}:join]`, info)
         joined = info.user || 'user'

         users.push(joined)
         // users.sort()

         socket.join(name)
         io.to(name).emit(`${name}:online`, users)
         onJoin && onJoin(joined, users)
      }
   }
   function leave() {
      if (joined) {
         users.splice(users.indexOf(joined), 1)

         onLeave && onLeave(joined, users)
         io.to(name).emit(`${name}:online`, users)
         socket.leave(name)

         joined = false
         console.log(`[IO:${name}:leave]`, info)
      }
   }

   socket.on(`${name}:join`, join);
   socket.on(`${name}:leave`, leave);
   socket.on('disconnect', leave);
}

export const model = M
export default { set, inst, emit, send, update, confirm, roomed, model }

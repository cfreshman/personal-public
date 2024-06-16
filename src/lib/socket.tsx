import { useState } from "react";
import { Socket, io } from "socket.io-client";
import { useE, useF } from "./hooks";
import { useAuth } from "./hooks_ext";
import { trigger } from "./trigger";
import { dev } from "./util";

const ENDPOINT = dev ? window.origin.replace(/(:\d+)?$/, ':5050') : window.origin

// socket instance
export const socket = trigger.value<Socket>()

// base socket.io hook, to be used once in root component
// 1. initialize connection to endpoint
// 2. on connect, custom 'login'
// 3. on login:done, emit 'init' and join rooms
//    make socket available to other components
const joinedRooms = []
export const useConnectToSocketIo = () => {
  const auth = useAuth()

  const handle = {
    login: (local: any=socket.get()) => local?.emit && local.emit('login', auth),
  }
  useE(() => {
    console.debug('connect to WebSocket', ENDPOINT)
    const local = io(ENDPOINT, {
      transports: ['websocket']
    })
    local.on('connect', () => {
      console.debug('SOCKET CONNECT', local)
      handle.login(local)
      // serviceWorker.unregister()
      // serviceWorker.register()
    })
    local.on('login:done', () => {
      local.emit('init')
      joinedRooms.forEach(room => local.emit(`${room}:join`))
      socket.set(local)
    })
    return () => local.disconnect()
  })
  useF(auth.user, handle.login)
}

export const useUserSocket = (
  roomToJoin='',
  ons?: { [key: string]: (...args)=>any },
  emits?: (socket)=>any) => {

  const [local] = socket.use()
  useE(local, () => {
    if (local) {
      ons && Object.keys(ons).forEach(evt => local.on(evt, ons[evt]))
      emits && emits(local)
      if (ons) return () => {
        Object.keys(ons).forEach(evt => local.listeners(evt).remove(ons[evt]))
      }
    }
  })

  const [joined, setJoined] = useState(false)
  useE(local, () => {
    if (roomToJoin && local) {
      local.emit(`${roomToJoin}:join`)
      setJoined(true)
      joinedRooms.push(roomToJoin)
      return () => {
        local.emit(`${roomToJoin}:leave`)
        setJoined(false)
        joinedRooms.splice(joinedRooms.indexOf(roomToJoin), 1)
      }
    }
  })

  const auth = useAuth()
  useF(auth.user, () => {
    if (roomToJoin && joined) {
      local.emit(`${roomToJoin}:leave`)
      setTimeout(() => local.emit(`${roomToJoin}:join`))
    }
  })

  return local
}


export const useSocket = ({ room='', on, connect }: {
  room?: string,
  on?: { [key: string]: (...args)=>any },
  connect?: (socket)=>any,
}={}) => {
  const [local] = socket.use()

  // set socket.on listeners
  useE(local, on, () => {
    if (local && on) {
      Object.keys(on).forEach(evt => local.on(evt, on[evt]))
      return () => Object.keys(on).forEach(evt => local.off(evt, on[evt]))
    }
  })

  const [joined, setJoined] = useState(false)

  // join room when socket (local) is available
  useE(local, () => {
    if (room && local) {
      local.emit(`${room}:join`)
      setJoined(true)
      joinedRooms.push(room)
      return () => {
        local.emit(`${room}:leave`)
        setJoined(false)
        joinedRooms.remove(room)
      }
    }
  })

  // trigger initial emits
  useF(local, joined, () => local && joined && connect && connect(local))

  // re-join room when user changes
  const auth = useAuth()
  useF(auth.user, () => {
    if (room && joined) {
      local.emit(`${room}:leave`)
      setTimeout(() => local.emit(`${room}:join`))
    }
  })

  return local
}

export const useRoom = ({ room='', on, connect }: {
  room?: string,
  on?: { [key: string]: (...args)=>any },
  connect?: (socket)=>any,
}={}) => {
  const [local] = socket.use()

  // set socket.on listeners, and trigger initial emits
  useF(local, () => local && connect && connect(local))
  useE(local, on, () => {
    if (local && on) {
      Object.keys(on).forEach(evt => local.on(evt, on[evt]))
      return () => Object.keys(on).forEach(evt => local.off(evt, on[evt]))
    }
  })

  // join room when socket (local) is available
  useE(local, () => {
    if (room && local) {
      local.emit('join', room)
      joinedRooms.push(room)
      return () => {
        local.emit('leave', room)
        joinedRooms.remove(room)
      }
    }
  })

  return local
}
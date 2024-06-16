import api from './api';

interface RawQueue {
   name: string,
   space: string,
   list: RawQueueItem[],
}
interface RawQueueItem {
   i: number,
   t: number,
   msg: string,
}

export interface Queue {
   name: string,
   space: string,
   list: QueueItem[],
}
export interface QueueItem {
   i: number,
   t: Date,
   msg: any,
}

export function q_parse(response: RawQueue): Queue {
   const { name, space, list } = response
   return {
      name, space, list: list.map(({ i, t, msg}) => ({
         i, t: new Date(t), msg: JSON.parse(msg),
      }))
   }
}

export async function q_flush(id: string): Promise<Queue> {
   return api
      .get(`/q/flush/${id}`)
      .then(q_parse)
}

export async function q_add(id: string, msg: any): Promise<Queue> {
   return api
      .post(`/q/${id}`, { msg: JSON.stringify(msg) })
      .then(q_parse)
      .with(console.debug)
}
import { auth, addAuthTrigger } from './auth.js';
import api from './api.js';
import { getStored, setStored } from './store.js';

export function checkin(app) {
   addAuthTrigger(auth => auth.user && api.post(`profile/checkin/${app}`))
}

const N_SCORES = 5
// local-scores/
//   app
//     scores: { user: string, score: number, t: number }[]
function getLocal(app) {
   return getStored(`local-scores/${app}`) || []
}
function setLocal(app, scores) {
   return setStored(`local-scores/${app}`, scores)
}

export async function getScore(app) {
   return new Promise((resolve, reject) => {
      if (auth.user) {
         api.get(`scores/${app}`).then(data => {
            resolve(data)
         })
      } else {
         let scores = getLocal(app)
         api.get(`scores/global/${app}`).then(data => {
            resolve({
               user: {
                  user: 'local',
                  app,
                  scores
               },
               global: data.record,
            })
         })
      }
   })
}

export async function addScore(app, score) {
   return new Promise((resolve, reject) => {
      if (auth.user) {
         api.post(`scores/${app}`, { score }).then(data => {
            resolve(data)
         })
      } else {
         let scoreEntry = {
            score,
            user: 'local',
            t: Date.now()
         }
         let scores = [scoreEntry].concat(getLocal(app))
                  .sort((a, b) => (b.score - a.score) || a.t - b.t) // desc by score, then asc by time
                  .slice(0, N_SCORES)
         setLocal(app, scores)

         api.get(`scores/global/${app}`).then(data => {
            resolve({
               user: {
                  user: 'local',
                  app,
                  scores
               },
               global: data.record,
            })
         })
      }
   })
}
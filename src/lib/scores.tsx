import { auth } from './auth';
import api from './api';
import { store } from './store';

const N_SCORES = 5
// local-scores/
//   app
//     scores: { user: string, score: number, t: number }[]
function getLocal(app) {
   return store.get(`local-scores/${app}`) || []
}
function setLocal(app, scores) {
   return store.set(`local-scores/${app}`, scores)
}

export async function getScore(app) {
   return new Promise((resolve, reject) => {
      if (auth.user) {
         api.get(`scores/${app}`).then(data => {
            resolve(data)
         })
      } else {
         const scores = getLocal(app)
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

export async function addScore(app, score, desc=true) {
   return new Promise((resolve, reject) => {
      if (auth.user) {
         api.post(`scores/${app}`, { score, desc }).then(data => {
            resolve(data)
         })
      } else {
         const scoreEntry = {
            score,
            user: 'local',
            t: Date.now()
         }
         const scores = [scoreEntry].concat(getLocal(app))
                  .sort((a, b) => (desc ? b.score - a.score : a.score - b.score) || a.t - b.t) // desc by score, then asc by time
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
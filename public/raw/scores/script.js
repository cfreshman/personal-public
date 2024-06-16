import { auth, addAuthTrigger, login, logout } from '/lib/modules/site/auth.js'
import api from '/lib/modules/site/api.js'
import { getScore, addScore } from '/lib/modules/site/scores.js'

let el = {
   user: document.querySelector('#user'),
   scores: document.querySelector('#scores'),

   scoreApp: document.querySelector('#score-app'),
   scoreValue: document.querySelector('#score-value'),
   scoreSubmit: document.querySelector('#score-submit'),

   loginUser: document.querySelector('#login-user'),
   loginPass: document.querySelector('#login-pass'),
   loginSubmit: document.querySelector('#login-submit'),

   logoutUser: document.querySelector('#logout-user'),
   logoutSubmit: document.querySelector('#logout-submit'),
}
addAuthTrigger(auth => {
   console.log(auth)
   el.user.textContent = auth.user
   el.logoutUser.textContent = auth.user
   if (auth.user) {
      api.get('scores/first/user').then(data => {
         el.scores.textContent = JSON.stringify(data, 0, 2)
      })
   } else {
      api.get('scores/first/global').then(data => {
         el.scores.textContent = JSON.stringify(data, 0, 2)
      })
   }
})
el.scoreSubmit.addEventListener('click', e => {
   let app = el.scoreApp.value
   let score = el.scoreValue.value
   addScore(app, score).then(data => {
      el.scores.textContent = JSON.stringify(data, 0, 2)
   })
})
el.loginSubmit.addEventListener('click', e => {
   let user = el.loginUser.value
   let pass = el.loginPass.value
   if (user && pass) {
      login(user, pass)
   }
})
el.logoutSubmit.addEventListener('click', e => {
   logout()
})

export const test = 'test'
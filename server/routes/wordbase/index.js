import express from 'express';
import * as M from './model';
import { J, U, P } from '../../util';
import { F, isFriend } from '../profile';
import { addWord, removeWord } from './dict';

const R = express.Router();
const H = {
    invites: '/i(nvites)?',
    games: '/g(ames)?',
    gameId: `/g(ames)?/:id`
}

R.get(H.games, J(rq => M.getUserInfo(rq.user)));
R.post(`${H.games}/unhide`, J(rq => M.unhide(rq.user)));

// get & play info/save
R.get(H.gameId, J(rq => M.getInfo(rq.user, rq.params.id)));
R.get(`${H.gameId}/board`, J(rq => M.getState(rq.user, rq.params.id)));
R.post(H.gameId, J(rq => M.play(rq.user, rq.params.id, rq.body.info, rq.body.state)));

// game options
R.post(`${H.gameId}/resign`, J(rq => M.resign(rq.user, rq.params.id)));
R.post(`${H.gameId}/delete`, J(rq => M.remove(rq.user, rq.params.id)));
R.post(`${H.gameId}/hide`, J(rq => M.hide(rq.user, rq.params.id)));
R.post(`${H.gameId}/rematch`, J(rq => M.rematch(rq.user, rq.params.id, rq.body)));
R.post(`${H.gameId}/accept`, J(rq => M.accept(rq.user, rq.params.id)));
R.post(`${H.gameId}/settings`, J(rq => M.settings(rq.user, rq.params.id, rq.body)));

// invites
R.get(H.invites, J(rq => M.getInvites()));
R.get(`${H.invites}/custom`, J(rq => M.getInvites(true)));
R.post(`${H.invites}/accept`, J(rq => M.accept(rq.user)));
R.post(`${H.invites}/open`, J(rq => M.open(rq.user, rq.body)));
R.post(`${H.invites}/private`, J(rq => M.create(rq.user, undefined, rq.body)));
R.post(`${H.invites}/friend/:user`, J(rq => M.friend(rq.user, rq.params.user, rq.body)));
// challenges
// enable/randomize/disable challenge link
R.get(`/challenge/hash`, J(rq => M.challengeHash(U(rq))));
R.post(`/challenge/hash`, J(rq => M.challengeHash(U(rq), true)));
// get user / settings for challenge, or assign challenge settings as user
R.get(`/challenge/hash/user/:hash`, J(rq => M.challengeUser(rq.user, P(rq, 'hash'))));
R.post(`/challenge/hash/user/:hash`, J(rq => M.challengeUser(U(rq), P(rq, 'hash'), rq.body)));
R.get(`/challenge/hash/link`, J(async rq => `https://wordbase.app/new/` + await M.challengeHash(U(rq))));
R.get(`${H.invites}/new`, J(rq => M.toggleChallenges(rq.user)));
R.post(`${H.invites}/new`, J(rq => M.toggleChallenges(rq.user, rq.body.enable)));
R.post(`${H.invites}/new/:hash`, J(rq => M.challenge(rq.user, P(rq, 'hash'), rq.body)));

// server-side logic
R.post(`${H.gameId}/check`, J(rq => M.check( U(rq), rq.params.id, rq.body.word)));
// R.post(`/s/${H.gameId}/play`, J(rq => M.playS(rq.user, rq.params.id, rq.body.info)));
// R.post(`/s/${H.gameId}/rematch`, J(rq => M.rematchS(rq.user, rq.params.id)));
// R.post(`/s/${H.invites}/open`, J(rq => M.openS(rq.user)));
// R.post(`/s/${H.invites}/private`, J(rq => M.createS(rq.user, undefined)));
// R.post(`/s/${H.invites}/friend/:user`, J(rq => M.challengeS(rq.user, rq.params.user)));

// other
// R.get(`/stats/:user`, J(async rq => M.stats(await F(rq, 'user'), rq.params.user)));
R.get(`/stats/:user`, J(async rq => M.stats(await isFriend(rq, 'user'), rq.params.user)));

R.post(`/compete/:id`, J(async rq => M.compete(rq.params.id, U(rq), rq.body)));

R.post(`/compete/:id/seed`, J(async rq => M.seedCompetition(rq.params.id, U(rq), rq.body)))
R.get(`/compete/:id`, J(async rq => M.getCompetition(rq.params.id, U(rq), rq.body)))
R.post(`/compete/:id/generate`, J(async rq => M.generateCompetition(rq.params.id, U(rq), rq.body)))
R.get(`/compete/:id/bracket`, J(async rq => M.getCompetitionBracket(rq.params.id, U(rq), rq.body)))
R.get(`/compete/:id/bracket/cyrus`, J(async rq => M.getCompetitionBracket(rq.params.id, 'cyrus', rq.body)))

// R.get('/states', J(rq => M.states()));

R.get('/add/:language?/:word', J(rq => addWord(P(rq, 'word'), P(rq, 'language'))));
R.get('/remove/:language?/:word', J(rq => removeWord(P(rq, 'word'), P(rq, 'language'))));

// replays & sharing
// R.get(`${H.gameId}/replay`, J(rq => M.enablePublicReplay(rq.user, rq.params.id)));
R.post(`${H.gameId}/image`, J(rq => M.updateProgressImage(rq.user, rq.params.id, rq.body)))
R.post(`${H.gameId}/replay`, J(rq => M.enablePublicReplay(rq.user, rq.params.id, rq.body)))
R.get(`${H.gameId}/twitter`, (rq, rs) => M.resultTwitterHTML( rs, rq.params.id ));


export default {
    routes: R,
    model: M, ...M,
}

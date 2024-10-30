import { list } from "./util";

const _projects = {
  search: 'search across all pages',
  // terrain: ['terrain generation', 'procedurally generated landscape'],
  // terrain: 'simple procedurally generated landscape',
  terrain: '3D landscape generation',
  nonogram: ['nonogram solver', 'solve <a href="https://en.wikipedia.org/wiki/Nonogram">nonograms</a> (e.g. <a href="https://apps.apple.com/us/app/picture-cross/id977150768">Picture Cross</a>)'],
  snakes: 'one- or two-player co-op snake',
  wordbase: 'clone of discontinued word game',
  snackman: "(it's Pac-Man)",
  befruited: 'bejeweled as fruit',
  // graffiti: ['graffiti wall', 'open to all (be nice)'],
  graffiti: 'graffiti wall, open to all (be nice)',
  'turt-smurts': 'wise tortoise',
  // 'turt-smurts-2D': 'wise tortoise in two dimensions',
  insult: "sometimes it's funny",
  floating: 'morphed Delaunay triangulation',
  models: 'simple 3D things created in Blender',
  // domains: 'list of domains for this site',
  u: ['user profile', ''],
  notify: 'manage page notifications',
  reset: 'update password',
  home: 'landing page',
  about: 'bio and contact',
  projects: 'highlighted project list',
  speckle: 'colorful points follow your cursor',
  // ly: 'link shortener & aggregator',
  cloud: `phasing color cube`, // reminiscent of '<a href="https://www.youtube.com/watch?v=10Jg_25ytU0">Lusine - Just A Cloud</a>'
  live: 'live chat',
  chat: 'message friends',
  records: 'personal & global game scoreboards',
  tally: 'simple habit tracker',
  // slime: 'automata behavior visualization',
  slime: 'mass simulated behavior',
  coffee: '\'buy me a coffee\'',
  minesweeper: '~minesweeper~',
  arm: 'a sticky hand follows your cursor (<a href="https://en.wikipedia.org/wiki/Inverse_kinematics#Heuristic_methods">FABRIK</a>)',
  color: 'generate gradients',
  // pixelworld: 'pixelated 2D world generation',
  pixelworld: 'pixelated 2D landscape generation',
  bubble: 'a colorful grid avoids your cursor',
  tube: 'pulsating color circle',
  'dots-and-boxes': 'classic paper & crayon game',
  wordle: [
      'wordle solver',
      'solve <a href="https://www.powerlanguage.co.uk/wordle/">Wordles</a>, <a href="wordle/#/leaderboard">compare solvers</a>'],
  ':<': ':<',
  wall: 'can hold up to 24x24 messages',
  garden: 'pixel art graffiti wall',
  txt: 'for grocery lists & ASCII art',
  paths: 'path planning demo',
  guestbook: `leave a message on a receipt`,
  mountain: 'from the top of a mountain',
  bloom: 'bloom filter demo',
  // aoc: 'interactive Advent of Code solutions (incomplete)'
  egg: 'egg',
  settings: 'manage account settings',
  'follow-sync': 'sync Twitter & Mastodon follows',
  cookies: 'view stored info',
  'mastodon-dm': 'link to a Mastodon DM',
  'pico-repo': 'discover & share Pico apps',
  'dinder': 'find a recipe to make with someone',
  'fishbowl': 'a party game (made for your smartwatch)',
  'spot': 'minimal Spotify player',
  ...list('icons'),
}

const alpha = 'qwertyuiopasdfghjklzxcvbnm'
export const searchProjects = Object.keys(_projects)
  .sort()
  .sort((a, b) => (alpha.includes(a[0]) ? 0 : 1) - (alpha.includes(b[0]) ? 0 : 1));
searchProjects.forEach(key => {
  if (typeof _projects[key] === 'string') {
      _projects[key] = ['', _projects[key]]
  }
})
export const projects = _projects;
export const project_years = {
  // wordbase: `'21`,
  nonogram: `'18`,
  // wordle: `'22`,
  // fishbowl: `'23`,
  // paths: `'22`,
  // guestbook: `'22`,
  // bloom: `'22`,
  // 'follow-sync': `'22`,
}

export const tags = {
  all: '',
  game: 'befruited snackman snakes wordbase minesweeper dots-and-boxes',
  visual: 'cloud floating models terrain graffiti slime speckle arm color pixelworld bubble tube garden egg',
  social: 'chat graffiti live records speckle turt-smurts turt-smurts-2D u wordbase dots-and-boxes garden wall dinder',
  site: 'notify reset search settings cookies',
  tool: 'tally txt follow-sync mastodon-dm',
  edu: 'paths bloom',
  me: 'about coffee domains home projects guestbook',
}
export const projectTags = {}
Object.keys(tags).forEach(key => {
  tags[key] = new Set(tags[key].split(' '))
  tags[key].forEach(project => {
      projectTags[project] = (projectTags[project] ?? []).concat(key)
  })
})

import { projects } from "./projects"
import { squash } from "./util"

export const domains = {
  'wordbase': 'wordbase.app',
  'pico-repo': 'pico-repo.com',
  'dinder': 'dinder.social',
  'tally': 'tally.gallery',
  'crowdmeal': 'crowdmeal.app',
  'buystream': 'buystream.app',
  'fishbowl': 'basin.fish', 'basin': 'basin.fish',
}

const common = {
  'fishbowl': {
    title: 'bowl.fish',
    description: 'fishbowl, party game for 6-18',
    icon: 'https://freshman.dev/raw/fishbowl/icon.png',
    keywords: 'fishbowl, a, party, game, for, 6, to, 18, watch, smartwatch, Apple Watch, watchOS, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
  },
  'profile': {
    title: 'your profile on freshman.dev',
    description: '',
    keywords: 'profile, u, social, social media, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/profile/icon-64.png',
  },
  'capitals': {
    // title: 'capitals',
    // description: 'word strategy game',
    // keywords: 'capitals, word, strategy, game, multiplayer, singleplayer, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    title: 'lettercomb',
    description: 'word strategy game',
    keywords: 'lettercomb, capitals, word, strategy, game, multiplayer, singleplayer, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/capitals/icon-small.png',
    twitter: {
      image: 'https://freshman.dev/raw/capitals/icon.png',
    },
  },
  plat: {
    title: 'plat: US plate chat',
    description: 'message other drivers in the US by license plate',
    icon: 'https://freshman.dev/raw/plat/icon-64.png',
    keywords: 'plat, plate-chat, license plate, US plate chat, message other drivers in the US, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
  },
  chat: {
    title: 'chat',
    description: 'view messages on freshman.dev',
    keywords: 'chat, messages, messenger, social, social media, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/chat/icon-64.png',
    twitter: {
      image: 'https://freshman.dev/raw/chat/icon.png',
    },
  },
}
export const replace = {
  ...squash(Object.entries(projects).map(([k, v]) => {
    return {
      [k]: { description: v[0] || v[1] }
    }
  })),
  ...common,
  'wordbase': {
    title: 'wordbase.app',
    description: 'word strategy game',
    icon: 'https://freshman.dev/raw/wordbase/icon.png',
    keywords: 'cyrus, wiggin, freshman, freshman_dev, wordbase, play, discontinued, multiplayer, word, strategy, game, app',
    manifest: 'https://freshman.dev/raw/wordbase/manifest.json',
    og: true,
    twitter: {
      twitter_url: 'https://wordbase.app?ref=twitter-card',
      image: 'https://freshman.dev/raw/wordbase/icon-large.png',
    },
  },
  'follow-sync': {
    description: 'Sync follows between Twitter & Mastodon',
    icon: 'https://freshman.dev/raw/follow-sync/icon.png',
  },
  'pico-repo': {
    description: `Unofficial Raspberry Pi Pico 'App Store'`,
    icon: 'https://freshman.dev/raw/pico-repo/icon.png',
    keywords: 'cyrus, wiggin, freshman, freshman_dev, pico-repo, raspberry, pi, pico, w, microcontroller, program, app store, download, getting started, guide',
  },
  'dinder': {
    title: 'Dinder',
    description: 'Find someone to make dinner with tonight',
    icon: '/raw/dinder/icon.png',
    keywords: 'cyrus, wiggin, freshman, freshman_dev, dinder, match, recipe, for, dinner, tonight',
    og: {
      image: 'https://dinder.social/api/file/public-match-3-simplified-twitter-card.png',
    },
    twitter: {
      card: 'summary_large_image',
      twitter_url: 'https://dinder.social?ref=twitter-card',
    },
  },
  'tally': {
    title: '/tally',
    description: 'Habit tracker',
    icon: 'https://tally.gallery/raw/tally/icon.png',
    keywords: 'cyrus, wiggin, freshman, freshman_dev, freshman.dev, tally, habit, tracker',
    twitter: {
      card: 'summary_large_image',
      twitter_url: 'https://tally.gallery?ref=twitter-card',
    },
  },
  'crowdmeal': {
    title: 'CROWDMEAL',
    description: 'one meal made daily',
    icon: 'https://crowdmeal.app/raw/crowdmeal/icon.png',
    keywords: 'cyrus, wiggin, freshman, freshman_dev, freshman.dev, crowdmeal, daily, meal, meals, order, cook, kitchen, deliver, delivery, local, vegan',
    url: 'https://crowdmeal.app',
    twitter: {
      card: 'summary_large_image',
      twitter_url: 'https://crowdmeal.app?ref=twitter-card',
    },
  },
  'buystream': {
    title: 'buystream',
    description: 'Buy albums for streaming access',
    keywords: 'cyrus, wiggin, freshman, freshman_dev, freshman.dev, buystream, music, albums, stream, streaming',
    twitter: {
      card: 'summary_large_image',
      twitter_url: 'https://buystream.app?ref=twitter-card',
    },
  },
  'bowl': common.fishbowl,
  'fishbowl-landing': common.fishbowl,
  'wwl-builder': {
    title: 'wwl-builder',
    description: 'Generate a wwl.js app skeleton',
    keywords: 'wwl, web, watch, library, wwl.js, builder, wwl-builder, web, app, web app, smartwatch, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/wwl/icon-js.png',
  },
  'audio_form': {
    title: 'audio_form',
    description: 'an audio-based social media',
    keywords: 'audio_form, audio, form, social, media, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/audio_form/icon.png',
  },
  'greeter': {
    title: 'greeter',
    description: 'a social diary. collect hangouts!',
    keywords: 'greeter, meet, meets, meetings, hangout, hangouts, social, social media, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/greeter/icon.png',
  },
  'u': common.profile,
  selfchat: common.chat,
  'notify': {
    title: 'notify',
    description: 'manage notifications for freshman.dev',
    keywords: 'notify, notifications, email, telegram, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/notify/icon-64.png',
  },
  'lettercomb': common.capitals,
  'quadbase': {
    title: 'quadbase',
    description: '4-player word game',
    keywords: 'quadbase, word, strategy, game, multiplayer, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/quadbase/icon-small.png',
  },
  'multipals': {
    title: 'multipals',
    description: '3- or 6- player word game',
    keywords: 'multipals, word, strategy, game, multiplayer, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/multipals/icon-small.jpg',
  },
  'letterpress': {
    title: 'letterpress',
    description: 'word strategy game',
    keywords: 'letterpress, word, strategy, game, multiplayer, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/letterpress/icon.png',
    twitter: {
      image: 'https://freshman.dev/raw/letterpress/icon-large.png',
    },
  },
  'link-timer': {
    title: '/link-timer',
    description: 'open that thing u gotta work on, later!', // 'put off links',
    keywords: 'link-timer, link, links, timer, timers, alarm, utility, lazy, procrastination, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/link-timer/icon2-64.png',
  },
  'proses': {
    title: 'p•rose•s',
    description: 'a place for poetry and, possibly, even romance',
    keywords: 'proses, prose, poetry, poet, poets, social media, social, media, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/proses/icon-64.png',
  },
  'optimal-maps': {
    description: 'countries from a better angle',
    keywords: 'optimal-maps, optimal, angle, maps, earth, countries, country, wow, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/optimal-maps/icon-64.png',
  },
  'donoboard': {
    // description: 'leaderboard for 8334 site sponsor slots',
    description: 'donation leaderboard',
    keywords: 'donoboard, donation, donations, sponsor, sponsors, leaderboard, 6000, 8334, $1, one, dollar, slots, wow, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/donoboard/icon-64.png',
    // og: {
    //   image: 'https://freshman.dev/raw/donoboard/icon.png', // TOO BIG IN IMESSAGE
    // },
    twitter: {
      card: 'summary_large_image',
      twitter_url: 'https://freshman.dev/donoboard?ref=twitter-card',
      image: 'https://freshman.dev/raw/donoboard/icon.png',
    },
  },
  'coffee': {
    title: 'donate a coffee!',
    description: 'i really do like coffee a lot',
    keywords: 'donate, me, a, coffee, donoboard, donation, donations, sponsor, sponsors, leaderboard, 6000, 8334, $1, one, dollar, slots, wow, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/coffee/mug.jpg',
  },
  plat: common.plat, 'plate-chat': common.plat,
  'daffodil': {
    title: 'LEGO daffodil instructions',
    description: '',
    keywords: 'daffodil, LEGO daffodils, instructions, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/daffodil/icon-64.png',
  },
  'not-linkedin': {
    title: 'not LinkedIn',
    description: '',
    keywords: 'not-linkedin, not LinkedIn, professional network, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/not-linkedin/icon-64.png',
  },
  'splink': {
    title: '/splink: smaller spotify link preview',
    description: '',
    keywords: 'splink, smaller spotify link preview, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/splink/icon-64.png',
  },
  'developer-program': {
    title: 'build web apps on freshman.dev',
    description: '',
    keywords: 'developer-program, build web apps on freshman.dev, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/developer-program/icon-64.png',
  },
  'itly': {
    title: '/itly: smaller iMessage link preview',
    description: '',
    keywords: 'itly, smaller iMessage link preview, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/itly/icon-64.png',
  },
  'printgames': {
    title: '/printgames: 3D print board games',
    description: '',
    keywords: 'printgames, 3D print board games, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/printgames/icon-65.png',
  },
  'euphoria': {
    title: 'track days you felt true euphoria',
    description: '',
    keywords: 'euphoria, track days you felt true euphoria, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/euphoria/icon-64.png',
  },
  'twitter': {
    title: 'install Twitter blue Threads icon',
    description: 'link to best twitter',
    keywords: 'twitter, link to best twitter, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/twitter/icon.png',
    manifest: {
      name: 'twitter',
      display: 'standalone',
      start_url: '/twitter',
      theme_color: '#1DA1F2',
      icons: [{
        src: '/raw/twitter/icon.svg',
        sizes: 'any',
      }],
    }
  },
  'radio': {
    title: 'freshman.dev radio',
    description: '',
    keywords: 'dj, cyrus, freshman, spotify, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/radio/icon.png',
  },
  'rent-splitter': {
    title: '/rent-splitter',
    description: 'assign rooms with fair rents',
    keywords: 'rent-splitter, split rent fairly, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/rent-splitter/icon-64.png',
    twitter: {
      image: 'https://freshman.dev/raw/rent-splitter/icon.png',
    },
  },
  'settings': {
    title: '/settings',
    description: 'freshman.dev settings',
    keywords: 'settings, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/settings/icon-64.png',
  },
  'search': {
    title: '/search',
    description: 'freshman.dev search',
    keywords: 'search, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/search/icon-64.png',
  },
  'collector': {
    title: '/collector',
    description: 'lists of links',
    keywords: 'collector, collections of links, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/collector/icon-64.png',
  },
  'apple-orange-banana': {
    title: '/apple-orange-banana',
    description: 'collect your fruits',
    keywords: 'apple-orange-banana, collect fruits and sell for gold, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/apple-orange-banana/icon-64.png',
    twitter: {
      image: 'https://freshman.dev/raw/apple-orange-banana/icon.png',
    },
  },
  'recurder': {
    title: '/recurder',
    description: 'periodic reminders',
    keywords: 'recurder, periodic reminders, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/recurder/icon-64.png',
    twitter: {
      image: 'https://freshman.dev/raw/recurder/icon.png',
    },
  },
  'spot': {
    title: '/spot',
    description: 'text-based spotify interface',
    keywords: 'spot, text-based spotify interface, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/spot/icon-64.png',
  },
  'boggle': {
    title: '/boggle',
    description: 'BOGGLE',
    keywords: 'boggle, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/boggle/icon2-64.png',
  },
  'uglychat': {
    title: '/uglychat',
    description: 'ugllychat',
    keywords: 'uglychat, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/uglychat/icon-64.png',
    twitter: {
      image: 'https://freshman.dev/raw/uglychat/icon.png',
    },
  },
  'sitechat': {
    title: '/sitechat',
    description: 'site chat',
    keywords: 'sitechat, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/sitechat/icon-64.png',
    twitter: {
      image: 'https://freshman.dev/raw/sitechat/icon.png',
    },
  },
  'cowork': {
    title: '/cowork',
    description: 'coworking dashboard',
    keywords: 'cowork, coworking dashboard, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/cowork/icon-64.png',
    twitter: {
      image: 'https://freshman.dev/raw/cowork/icon.png',
    },
  },
  'chess': {
    title: '/chess',
    description: 'its just chess',
    keywords: 'chess, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/chess-app/icon-64.png',
    twitter: {
      image: 'https://freshman.dev/raw/chess-app/icon.png',
    },
  },
  'wordle': {
    title: '/wordle',
    description: 'Wordle solver and solver leaderboard',
    keywords: 'Wordle, solver, leaderboard, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/wordle/icon-64.png',
    twitter: {
      image: 'https://freshman.dev/raw/wordle/icon.png',
    },
  },
  'you': {
    title: '/you',
    description: 'draw on your camera',
    keywords: 'you, draw on your camera, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/you/icon-64.png',
    twitter: {
      image: 'https://freshman.dev/raw/you/icon.png',
    },
  },
  'light': {
    title: '/light',
    description: 'light twitter',
    keywords: 'light, tweets, twitter, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/light/icon-64.png',
    twitter: {
      image: 'https://freshman.dev/raw/light/icon.png',
    },
  },
  'sushi': {
    title: '/sushi',
    description: 'the healthiest food',
    keywords: 'sushi, food, healthy, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/sushi/icon-64.png',
    twitter: {
      image: 'https://freshman.dev/raw/sushi/icon.png',
    },
  },
  'dating': {
    title: '/dating',
    description: 'find a relationship',
    keywords: 'dating, find a relationship, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/dating/icon-64.png',
    twitter: {
      image: 'https://freshman.dev/raw/dating/icon.png',
    },
  },
  'running': {
    title: '/running',
    description: 'stay on pace',
    keywords: 'running, pacing, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/running/icon.png',
  },
  'solar': {
    title: '/solar',
    description: 'sun and ground',
    keywords: 'solar, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/images/icon-solar.png',
  },
  'stream-pledge': {
    title: '/stream-pledge',
    description: 'hit a pledge goal before you start streaming',
    keywords: 'stream-pledge, stream, streaming, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/stream-pledge/icon-64.png',
    twitter: {
      image: 'https://freshman.dev/raw/stream-pledge/icon.png',
    },
  },
  'spacetext': {
    title: '/spacetext',
    description: 'generate spacetext',
    keywords: 'spacetext, generator, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/images/icon-spacetext.png',
  },
  'textage': {
    title: '/textage',
    description: 'generate text responses',
    keywords: 'textage, text generator, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/images/icon-textage.png',
  },
  'emoji-banner': {
    title: '/emoji-banner',
    description: 'generate an emoji banner!',
    keywords: 'emoji-banner, generate an emoji banner, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/images/icon-emoji-banner-64.png',
  },
  'whale': {
    title: '/whale',
    description: 'whale friend',
    keywords: 'whale, friend, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/images/icon-whale.png',
  },
  'graffiti': {
    title: '/graffiti',
    description: 'graffiti wall open to all (be nice)',
    keywords: 'graffiti, wall, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/images/icon-graffiti.png',
  },
  'guestbook': {
    title: '/guestbook',
    description: 'sign my guestbook!',
    keywords: 'guestbook, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/images/icon-guestbook-64.png',
    twitter: {
      image: 'https://freshman.dev/raw/images/icon-guestbook.png',
    },
  },
  'list-picker': {
    title: '/list-picker',
    description: 'pick a random item from a menu',
    keywords: 'list-picker, menu, picker, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/images/icon-list-picker.png',
  },
  'poll': {
    title: '/poll',
    description: 'run a simple poll',
    keywords: 'poll, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/images/icon-poll-64.png',
    twitter: {
      image: 'https://freshman.dev/raw/images/icon-poll.png',
    },
  },
  'beam': {
    title: '/beam',
    description: '1hr download link',
    keywords: 'beam, web, app, web app, javascript, cyrus, wiggin, freshman, freshman_dev, freshman.dev',
    icon: 'https://freshman.dev/raw/images/icon-beam-64.png',
    twitter: {
      image: 'https://freshman.dev/raw/images/icon-beam.png',
    },
  },
}

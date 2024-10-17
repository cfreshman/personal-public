import { useE, useF, useRerender, useS } from "./hooks"
import { message } from "./message"
import { store } from "./store"
import { S } from "./util"

const { named_log, Q, keys, entries, from, values, node, set, on, unpick, rand, defer, strings } = window as any
const log = named_log('track_player')

export const track_lists = {
    NONE: 'misc',
    THEME: 'theme',
    CHOSIC_FREE: 'Chosic free',
    APORIA: 'iwamizu Aporia',
}
export const track_ids = {
    STARDUST: 'stardust',
    YOU_KNOW_WHY: 'you_know_why',
    JOY_TO_THE_WORLD: 'joy_to_the_world',
    LOVE_THEY: 'love_they',

    FUR_ELISE: 'fur_elise',
    THE_GIRL_FROM_FRANCE: 'the_girl_from_france',
    BABY_I_MADE_A_MISTAKE: 'baby_i_made_a_mistake',
    LAME_WALTZ: 'lame_waltz',
    SHOUZEN: 'shouzen',
    LA_CAMPANELLA: 'la_campanella',
    UTOPIA: 'utopia',
    FLOCCINAUCINIHILIPILIFICATION: 'floccinaucinihilipilification',
    WATCH_MY_SOUL_SPEAK: 'watch_my_soul_speak',
    WROTE_YOU_A_LETTER_BUT_BURNED_IT_MYSELF_SO_I_WROTE_A_SONG_ABOUT_YOU_INSTEAD_AND_MOVED_IT_TO_TRASH: 'wrote_you_a_letter_but_burned_it_myself_so_i_wrote_a_song_about_you_instead_and_moved_it_to_trash',

    IM_GOD: 'im_god',
    RALLY_HOUSE: 'rally_house',
    VON_DUTCH: 'von_dutch',
    KANGAROO_COURT: 'kangaroo_court',
    RUSH: 'rush',
    HEARTBEAT: 'heartbeat',
    n3005: '3005',
    HELLO_SEATTLE: 'hello_seattle',
    ITS_NICE_TO_BE_ALIVE: 'its_nice_to_be_alive',
    RADIO: 'radio',
    THE_LESS_I_KNOW_THE_BETTER: 'the_less_i_know_the_better',
    FRENESI: 'frenesi',

    ALL_THE_THINGS_SHE_SAID: 'all_the_things_she_said',
    ANGELS: 'angels',
    BEAUTIFUL: 'beautiful',
    CLOVERS: 'clovers',
    DEEP_SEA: 'deep_sea',
    DOSES_AND_MIMOSAS: 'doses_and_mimosas',
    EVERYTHING_IS_EMBARASSING: 'everything_is_embarassing',
    FANTASY: 'fantasy',
    MY_FAVORITE_FISH: 'my_favorite_fish',
    FIELDS_OF_GOLD: 'fields_of_gold',
    GIVE_IT_TO_ME_STRAIGHT: 'give_it_to_me_straight',
    HAUNTED: 'haunted',
    I_DONT_KNOW_YOU: 'i_dont_know_you',
    I_SAY_FEVER: 'i_say_fever',
    IF_YOURE_NOT_THE_ONE: 'if_youre_not_the_one',
    ILLUSION: 'illusion',
    IS_THIS_HOW_YOU_FEEL: 'is_this_how_you_feel',
    LEAVE_ME_LIKE_THIS: 'leave_me_like_this',
    NEW_RULES: 'new_rules',
    OSAKA_LOOP_LINE: 'osaka_loop_line',
    PUSH: 'push',
    RED: 'red',
    SANTA_FE: 'santa_fe',
    SEXY_TO_SOMEONE: 'sexy_to_someone',
    SOMEBODY_THAT_I_USED_TO_KNOW: 'somebody_that_i_used_to_know',
    SPIT_IN_MY_FACE: 'spit_in_my_face',
    I_WISH_I_WAS_STEPHEN_MALKMUS: 'i_wish_i_was_stephen_malkmus',
    THE_PERFECT_GIRL: 'the_perfect_girl',
    VAMPIRE_EMPIRE: 'vampire_empire',
    WHEN_AM_I_GONNA_LOSE_YOU: 'when_am_i_gonna_lose_you',
    WHEN_I_GET_HOME: 'when_i_get_home',
    // STARRY_NIGHT: 'starry_night',
    YOURE_THE_ONE: 'youre_the_one',
    NULL: 'null',
    SUPERSONIC: 'supersonic',
}

export type track = {
    title: string,
    artist: string,
    album: string,
    list: string,
    audio: string,
    image: string,
    href: string,
}
export const tracks: { [id:string]: {
    title: string,
    artist: string,
    album: string,
    list: string,
    audio: string,
    image: string,
    href: string,
    id?: string,
    flavor?: string,
} } = {
    [track_ids.STARDUST]: {
        title: 'Stardust',
        artist: 'JSH',
        album: undefined,
        list: track_lists.CHOSIC_FREE,
        audio: '/raw/audio/tracks/chosic-free/stardust.mp3',
        image: 'https://www.chosic.com/wp-content/uploads/FreeMusicTagsImages/120/Beats.jpg',
        href: 'https://www.chosic.com/download-audio/27019/',
    },
    [track_ids.YOU_KNOW_WHY]: {
        title: 'You Know Why',
        artist: 'Loyalty Freak Music',
        album: undefined,
        list: track_lists.CHOSIC_FREE,
        audio: '/raw/audio/tracks/chosic-free/you_know_why.mp3',
        image: 'https://www.chosic.com/wp-content/uploads/FreeMusicTagsImages/120/Beats.jpg',
        href: 'https://www.chosic.com/download-audio/24220/',
    },
    [track_ids.JOY_TO_THE_WORLD]: {
        title: 'Joy to the World Master',
        artist: 'John Bartmann',
        album: undefined,
        list: track_lists.CHOSIC_FREE,
        audio: '/raw/audio/tracks/chosic-free/joy_to_the_world_master.mp3',
        image: 'https://www.chosic.com/wp-content/uploads/FreeMusicTagsImages/120/Ambient.jpg',
        href: 'https://www.chosic.com/download-audio/28351/',
    },
    [track_ids.LOVE_THEY]: {
        title: 'Love They',
        artist: 'Loyalty Freak Music',
        album: undefined,
        list: track_lists.CHOSIC_FREE,
        audio: '/raw/audio/tracks/chosic-free/love_they.mp3',
        image: 'https://www.chosic.com/wp-content/uploads/FreeMusicTagsImages/120/Relaxing.jpg',
        href: 'https://www.chosic.com/download-audio/25151/',
    },

    [track_ids.FUR_ELISE]: {
        title: 'Für Elise',
        artist: 'iwamizu',
        album: 'Aporia',
        list: track_lists.APORIA,
        audio: '/raw/audio/tracks/aporia/01-fur_elise.mp3',
        image: '/raw/audio/tracks/aporia/cover.jpg',
        href: 'https://iwamizu.bandcamp.com/album/aporia',
    },
    [track_ids.THE_GIRL_FROM_FRANCE]: {
        title: 'The Girl from France',
        artist: 'iwamizu',
        album: 'Aporia',
        list: track_lists.APORIA,
        audio: '/raw/audio/tracks/aporia/02-the_girl_from_france.mp3',
        image: '/raw/audio/tracks/aporia/cover.jpg',
        href: 'https://iwamizu.bandcamp.com/album/aporia',
    },
    [track_ids.BABY_I_MADE_A_MISTAKE]: {
        title: 'Baby I Made a Mistake',
        artist: 'iwamizu',
        album: 'Aporia',
        list: track_lists.APORIA,
        audio: '/raw/audio/tracks/aporia/03-baby_i_made_a_mistake.mp3',
        image: '/raw/audio/tracks/aporia/cover.jpg',
        href: 'https://iwamizu.bandcamp.com/album/aporia',
    },
    [track_ids.LAME_WALTZ]: {
        title: 'Lame Waltz',
        artist: 'iwamizu',
        album: 'Aporia',
        list: track_lists.APORIA,
        audio: '/raw/audio/tracks/aporia/04-lame_waltz.mp3',
        image: '/raw/audio/tracks/aporia/cover.jpg',
        href: 'https://iwamizu.bandcamp.com/album/aporia',
    },
    [track_ids.SHOUZEN]: {
        title: '悄然 / Shouzen',
        artist: 'iwamizu',
        album: 'Aporia',
        list: track_lists.APORIA,
        audio: '/raw/audio/tracks/aporia/05-shouzen.mp3',
        image: '/raw/audio/tracks/aporia/cover.jpg',
        href: 'https://iwamizu.bandcamp.com/album/aporia',
    },
    [track_ids.LA_CAMPANELLA]: {
        title: 'La Campanella',
        artist: 'iwamizu',
        album: 'Aporia',
        list: track_lists.APORIA,
        audio: '/raw/audio/tracks/aporia/06-la_campanella.mp3',
        image: '/raw/audio/tracks/aporia/cover.jpg',
        href: 'https://iwamizu.bandcamp.com/album/aporia',
    },
    [track_ids.UTOPIA]: {
        title: 'Utopia',
        artist: 'iwamizu',
        album: 'Aporia',
        list: track_lists.APORIA,
        audio: '/raw/audio/tracks/aporia/07-utopia.mp3',
        image: '/raw/audio/tracks/aporia/cover.jpg',
        href: 'https://iwamizu.bandcamp.com/album/aporia',
    },
    [track_ids.FLOCCINAUCINIHILIPILIFICATION]: {
        title: 'Floccinaucinihilipilification',
        artist: 'iwamizu',
        album: 'Aporia',
        list: track_lists.APORIA,
        audio: '/raw/audio/tracks/aporia/08-floccinaucinihilipilification.mp3',
        image: '/raw/audio/tracks/aporia/cover.jpg',
        href: 'https://iwamizu.bandcamp.com/album/aporia',
    },
    [track_ids.WATCH_MY_SOUL_SPEAK]: {
        title: 'Watch My Soul Speak',
        artist: 'iwamizu',
        album: 'Aporia',
        list: track_lists.APORIA,
        audio: '/raw/audio/tracks/aporia/09-watch_my_soul_speak.mp3',
        image: '/raw/audio/tracks/aporia/cover.jpg',
        href: 'https://iwamizu.bandcamp.com/album/aporia',
    },
    [track_ids.WROTE_YOU_A_LETTER_BUT_BURNED_IT_MYSELF_SO_I_WROTE_A_SONG_ABOUT_YOU_INSTEAD_AND_MOVED_IT_TO_TRASH]: {
        title: 'Wrote You a Letter But Burned It Myself So I Wrote a Song About You Instead and Moved It to Trash',
        artist: 'iwamizu',
        album: 'Aporia',
        list: track_lists.APORIA,
        audio: '/raw/audio/tracks/aporia/10-wrote_you_a_letter_but_burned_it_myself_so_i_wrote_a_song_about_you_instead_and_moved_it_to_trash.mp3',
        image: '/raw/audio/tracks/aporia/cover.jpg',
        href: 'https://iwamizu.bandcamp.com/album/aporia',
    },


    [track_ids.IM_GOD]: {
        title: 'I\'m God',
        artist: 'Clams Casino',
        album: 'Instrumental Relics',
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/im_god.mp3',
        image: '/raw/audio/tracks/theme/im_god.jpg',
        href: 'https://clamscasinoofficial.bandcamp.com/track/im-god-with-imogen-heap',
        flavor: 'blasphemous!',
    },
    [track_ids.RALLY_HOUSE]: {
        title: 'Rally House',
        artist: 'prod. DTM',
        album: 'Rally House',
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/rally_house_by_pedalalex.mp3',
        image: '/raw/audio/tracks/theme/rally_house.webp',
        href: 'https://soundcloud.com/prod-dtm/rally-house?in=pedalalex/sets/rally-house',
        flavor: 'rally car house music?',
    },
    // [track_ids.VON_DUTCH]: {
    //     title: 'Von Dutch (Official Video)',
    //     artist: 'Charlie XCX',
    //     album: 'Von Dutch',
    //     list: track_lists.THEME,
    //     audio: '/raw/audio/tracks/theme/von_dutch_by_charlie_xcx.mp3',
    //     image: '/raw/audio/tracks/theme/von_dutch.jpg',
    //     href: 'https://www.youtube.com/watch?v=cwZ1L_0QLjw',
    // },
    [track_ids.KANGAROO_COURT]: {
        title: 'Kangaroo Court',
        artist: 'Capital Cities',
        album: 'In A Tidal Wave of Mystery',
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/kangaroo_court_by_capital_cities.mp3',
        image: '/raw/audio/tracks/theme/tidal_wave_capital_cities.jpg',
        href: 'https://www.youtube.com/watch?v=CJinWua98NA',
        flavor: 'animals need jobs too',
    },
    [track_ids.RUSH]: {
        title: 'Rush',
        artist: 'Troye Sivan',
        album: 'Something To Give Each Other',
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/rush_by_troye_sivan.mp3',
        image: '/raw/audio/tracks/theme/rush_troye_sivan.png',
        href: 'https://amazon.com/music/player/albums/B0C9PZG46V?marketplaceId=ATVPDKIKX0DER&musicTerritory=US&ref=dm_sh_pfsLeStmiShFCpE5R9fz1vXIx&trackAsin=B0C9PX4634',
        flavor: 'hi troye sivan',
    },
    [track_ids.HEARTBEAT]: {
        title: 'Heartbeat',
        artist: 'Childish Gambino',
        album: 'Camp',
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/heartbeat_by_childish_gambino.mp3',
        image: '/raw/audio/tracks/theme/camp_by_childish_gambino.jpg',
        href: 'https://www.youtube.com/watch?v=dFVxGRekRSg',
        flavor: '<3',
    },
    [track_ids.n3005]: {
        title: '3005',
        artist: 'Childish Gambino',
        album: 'Because the Internet',
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/3005_by_childish_gambino.mp3',
        image: '/raw/audio/tracks/theme/because_the_internet.jpeg',
        href: 'https://www.youtube.com/watch?v=tG35R8F2j8k',
        flavor: 'im going to live forever',
    },
    [track_ids.HELLO_SEATTLE]: {
        title: 'Hello Seattle',
        artist: 'Owl City',
        album: 'Ocean Eyes',
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/hello_seattle_by_owl_city.mp3',
        image: '/raw/audio/tracks/theme/ocean_eyes_by_owl_city.jpg',
        href: 'https://www.youtube.com/watch?v=7uvc46jujn8',
        flavor: 'animals need jobs too',
    },
    [track_ids.ITS_NICE_TO_BE_ALIVE]: {
        title: 'It\'s Nice To Be Alive',
        artist: 'Vegyn',
        album: '',
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/its_nice_to_be_alive_by_vegyn.mp3',
        image: '/raw/audio/tracks/theme/its_nice_to_be_alive_by_vegyn.jpg',
        href: 'https://vegyn.bandcamp.com/track/its-nice-to-be-alive',
        flavor: 'live 4ever love 4ever',
    },
    [track_ids.RADIO]: {
        title: 'Radio',
        artist: 'Sylvan Esso',
        album: 'What Now',
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/radio_sylvan_esso.mp3',
        image: '/raw/audio/tracks/theme/radio_sylvan_esso.jpg',
        href: 'https://sylvanesso.bandcamp.com/track/radio-2',
        flavor: 'the 3:30 website'
    },
    [track_ids.THE_LESS_I_KNOW_THE_BETTER]: {
        title: 'The Less I Know The Better',
        artist: 'Tame Impala',
        album: 'Currents',
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/the_less_i_know_the_better_by_tame_impala.mp3',
        image: '/raw/audio/tracks/theme/currents_by_tame_impala.jpeg',
        href: 'https://amazon.com/music/player/albums/B00WO1YR7K?marketplaceId=ATVPDKIKX0DER&musicTerritory=US&ref=dm_sh_vcxYBZnlz6U1m1ym3qTKLrHZP&trackAsin=B00WO1ZC2O',
        flavor: 'i know too much',
    },
    [track_ids.FRENESI]: {
        title: 'Frenesi',
        artist: 'Machine Girl',
        album: 'WLFGRL',
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/frenesi_by_machine_girl.mp3',
        image: '/raw/audio/tracks/theme/frenesi_by_machine_girl.jpg',
        href: 'https://dredcollective.bandcamp.com/track/machine-girl-gabbertrap-mix-frenesi-remix',
        flavor: 'machine guy',
    },
    /*
    [track_ids.]: {
        title: '',
        artist: '',
        album: '',
        list: track_lists.THEME,
        audio: '',
        image: '',
        href: '',
        flavor: '',
    },
    */
    [track_ids.ALL_THE_THINGS_SHE_SAID]: {
        title: 'All The Things She Said',
        artist: 'Poppy',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/all_the_things_she_said.mp3',
        image: '/raw/audio/tracks/theme/all_the_things_she_said.jpg',
        href: 'https://open.spotify.com/track/0wH55ChKuoZkmGhbIYtOI4?si=156e9b9c68794f80',
        flavor: 'all the clicks (i track each one)',
    },
    [track_ids.ANGELS]: {
        title: 'Angels',
        artist: 'The xx',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/angels.mp3',
        image: '/raw/audio/tracks/theme/angels.jpg',
        href: 'https://open.spotify.com/track/1zuKjpp4t7BS8JPKi6mkQr?si=79a474e2b8504472',
        flavor: 'born in LA! jk :/',
    },
    [track_ids.BEAUTIFUL]: {
        title: 'Beautiful',
        artist: 'Rhye',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/beautiful.mp3',
        image: '/raw/audio/tracks/theme/beautiful.jpg',
        href: 'https://open.spotify.com/track/0UldHegZYf4q7bYDSGBZhq?si=cc9433e443344b3c',
        flavor: 'so beautiful',
    },
    [track_ids.CLOVERS]: {
        title: 'Clovers',
        artist: 'Barrie',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/clovers.mp3',
        image: '/raw/audio/tracks/theme/clovers.jpg',
        href: 'https://open.spotify.com/track/20pGTJQx9VkRrW7Pvw5R2m?si=27042b52aefc44e2',
        flavor: 'im a leprechaun',
    },
    [track_ids.DEEP_SEA]: {
        title: 'Deep Sea',
        artist: 'Snail Mail',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/deep_sea.mp3',
        image: '/raw/audio/tracks/theme/deep_sea.jpg',
        href: 'https://open.spotify.com/track/3MqVcAd41C9pC4RoS3IV1j?si=5c183a5a37e0421d',
        flavor: 'i love marine bio',
    },
    [track_ids.DOSES_AND_MIMOSAS]: {
        title: 'Doses & Mimosas',
        artist: 'Cherub',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/doses_and_mimosas.mp3',
        image: '/raw/audio/tracks/theme/doses_and_mimosas.jpg',
        href: 'https://open.spotify.com/track/44CZRkOxv7UItaAUmh8PgN?si=bb238ae51dd74c76',
        flavor: 'brunch? contact me',
    },
    [track_ids.EVERYTHING_IS_EMBARASSING]: {
        title: 'Everything Is Embarrassing',
        artist: 'Sky Ferreira',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/everything_is_embarrassing.mp3',
        image: '/raw/audio/tracks/theme/everything_is_embarrassing.jpg',
        href: 'https://open.spotify.com/track/7j3nbSiaWphYU2cFgyQXd9?si=0cb1498f2d664654',
        flavor: 'a little embarassing',
    },
    [track_ids.FANTASY]: {
        title: 'Fantasy',
        artist: 'STRFKR',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/fantasy.mp3',
        image: '/raw/audio/tracks/theme/fantasy.jpg',
        href: 'https://open.spotify.com/track/0rh0VNi3ILEAdZVIzltaBX?si=3177ae124a214715',
        flavor: 'sci-fi',
    },
    [track_ids.FIELDS_OF_GOLD]: {
        title: 'Fields Of Gold',
        artist: 'Sting',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/fields_of_gold.mp3',
        image: '/raw/audio/tracks/theme/fields_of_gold.jpg',
        href: 'https://open.spotify.com/track/1VI7sH93UcY0stZYVqvMoH?si=e1fc0009bfa6440a',
        flavor: 'surf the web of gold',
    },
    // [track_ids.GIVE_IT_TO_ME_STRAIGHT]: {
    //     title: 'Give It To Me Straight',
    //     artist: 'Gus Dapperton',
    //     album: undefined,
    //     list: track_lists.THEME,
    //     audio: '/raw/audio/tracks/theme/give_it_to_me_straight.mp3',
    //     image: '/raw/audio/tracks/theme/give_it_to_me_straight.jpg',
    //     href: 'https://open.spotify.com/track/0K1WiEPee04d00CltQVcrT?si=62e516e522a94eac',
    //     flavor: 'im straight',
    // },
    [track_ids.HAUNTED]: {
        title: 'Haunted',
        artist: 'Laura Les',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/haunted.mp3',
        image: '/raw/audio/tracks/theme/haunted.jpg',
        href: 'https://open.spotify.com/track/1toNKayLMeCcVlsLGXJl7n?si=f359cefab6834289',
        flavor: 'moon\'s haunted',
    },
    [track_ids.I_DONT_KNOW_YOU]: {
        title: 'I Don\'t Know You',
        artist: 'The Marias',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/i_dont_know_you.mp3',
        image: '/raw/audio/tracks/theme/i_dont_know_you.jpg',
        href: 'https://open.spotify.com/track/4cJOLN346rtOty3UPACsao?si=8b235b06c5574b48',
        flavor: 'do i know you',
    },
    [track_ids.I_SAY_FEVER]: {
        title: 'I Say Fever',
        artist: 'Ramona Falls',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/i_say_fever.mp3',
        image: '/raw/audio/tracks/theme/i_say_fever.jpg',
        href: 'https://open.spotify.com/track/0W1YtIKd2npLkP213C3gR0?si=7fdc531ccb10436d',
        flavor: 'i code code',
    },
    [track_ids.I_WISH_I_WAS_STEPHEN_MALKMUS]: {
        title: 'I Wish I Was Stephen Malkmus',
        artist: 'beabadoobee',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/i_wish_i_was_stephen_malkmus.mp3',
        image: '/raw/audio/tracks/theme/i_wish_i_was_stephen_malkmus.jpg',
        href: 'https://open.spotify.com/track/0MXwuLvZU9cauIEXlMZcdC?si=b2313b7a643e4bda',
        flavor: 'i wish i was Dua Lipa',
    },
    [track_ids.IF_YOURE_NOT_THE_ONE]: {
        title: 'If You\'re Not The One',
        artist: 'Daniel Bedingfield',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/if_youre_not_the_one.mp3',
        image: '/raw/audio/tracks/theme/if_youre_not_the_one.jpg',
        href: 'https://open.spotify.com/track/4gJoAvFpDvaeqm2EKYGmhb?si=0127fa7e421647a6',
        flavor: 'neo is the one',
    },
    [track_ids.ILLUSION]: {
        title: 'Illusion',
        artist: 'Dua Lipa',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/illusion.mp3',
        image: '/raw/audio/tracks/theme/illusion.jpg',
        href: 'https://open.spotify.com/track/59xD5osEFsaNt5PXfIKUnX?si=db32ae1588b44cc5',
        flavor: 'is no trick',
    },
    [track_ids.IS_THIS_HOW_YOU_FEEL]: {
        title: 'Is This How You Feel?',
        artist: 'The Preatures',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/is_this_how_you_feel.mp3',
        image: '/raw/audio/tracks/theme/is_this_how_you_feel.jpg',
        href: 'https://open.spotify.com/track/7ud2JzdO2ozova6lBcCRmR?si=ca1ac9f6551f4131',
        flavor: 'is this real',
    },
    [track_ids.LEAVE_ME_LIKE_THIS]: {
        title: 'Leave Me Like This',
        artist: 'Skrillex',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/leave_me_like_this.mp3',
        image: '/raw/audio/tracks/theme/leave_me_like_this.jpg',
        href: 'https://open.spotify.com/track/6NRvZuFXn2ixp8YdzUvG5n?si=5fa283a2127748c8',
        flavor: 'don\'t leave',
    },
    [track_ids.MY_FAVORITE_FISH]: {
        title: 'My Favorite Fish',
        artist: 'Gus Dapperton',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/my_favorite_fish.mp3',
        image: '/raw/audio/tracks/theme/my_favorite_fish.jpg',
        href: 'https://open.spotify.com/track/1bda1uGY3RK54S59aNq4f7?si=e129cfccda504091',
        flavor: 'my favorite website',
    },
    [track_ids.NEW_RULES]: {
        title: 'New Rules',
        artist: 'Dua Lipa',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/new_rules.mp3',
        image: '/raw/audio/tracks/theme/new_rules.jpg',
        href: 'https://open.spotify.com/track/6tF92PMv01Ug9Dh8Rmy6nH?si=e2718f51efcb4be8',
        flavor: 'new apps every month',
    },
    [track_ids.OSAKA_LOOP_LINE]: {
        title: 'Osaka Loop Line',
        artist: 'Discovery',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/osaka_loop_line.mp3',
        image: '/raw/audio/tracks/theme/osaka_loop_line.jpg',
        href: 'https://open.spotify.com/track/4H9FGIjS07wouhMIHNNjEb?si=bb324beb262647a8',
        flavor: 'if statements & for loops',
    },
    [track_ids.PUSH]: {
        title: 'Push',
        artist: 'Skrillex',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/push.mp3',
        image: '/raw/audio/tracks/theme/push.jpg',
        href: 'https://open.spotify.com/track/29OFLlrrfKIEVwbVMTjBYe?si=2cb68d9c4eae408c',
        flavor: 'Pop',
    },
    [track_ids.RED]: {
        title: 'red',
        artist: 'KAI',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/red.mp3',
        image: '/raw/audio/tracks/theme/red.jpg',
        href: 'https://open.spotify.com/track/5xjCG1XNmz5eWkYMLrGFZl?si=003435906cf14009',
        flavor: 'i\'ll give you anything u want',
    },
    [track_ids.SANTA_FE]: {
        title: 'Santa Fe',
        artist: 'Beirut',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/santa_fe.mp3',
        image: '/raw/audio/tracks/theme/santa_fe.jpg',
        href: 'https://open.spotify.com/track/6c9t15M38cWxyt3uLnLfD8?si=e11ce105ad994f41',
        flavor: 'prov ri',
    },
    [track_ids.SEXY_TO_SOMEONE]: {
        title: 'Sexy to Someone',
        artist: 'Clairo',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/sexy_to_someone.mp3',
        image: '/raw/audio/tracks/theme/sexy_to_someone.jpg',
        href: 'https://open.spotify.com/track/2Nq4SFbvYYZa8AF7lD7CWU?si=375b687769f34693',
        flavor: 'can a website be sexy',
    },
    [track_ids.SOMEBODY_THAT_I_USED_TO_KNOW]: {
        title: 'Somebody That I Used To Know',
        artist: 'Gotye, Kimbra',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/somebody_that_i_used_to_know.mp3',
        image: '/raw/audio/tracks/theme/somebody_that_i_used_to_know.jpg',
        href: 'https://open.spotify.com/track/4wCmqSrbyCgxEXROQE6vtV?si=9c7857b1c4344b12',
        flavor: 'KNOW ME BETTER',
    },
    [track_ids.SPIT_IN_MY_FACE]: {
        title: 'SPIT IN MY FACE!',
        artist: 'ThxSoMch',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/spit_in_my_face.mp3',
        image: '/raw/audio/tracks/theme/spit_in_my_face.jpg',
        href: 'https://open.spotify.com/track/1N8TTK1Uoy7UvQNUazfUt5?si=82d7378e96304e65',
        flavor: 'USE MY WEBSITE!',
    },
    [track_ids.THE_PERFECT_GIRL]: {
        title: 'The Perfect Girl',
        artist: 'Mareux',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/the_perfect_girl.mp3',
        image: '/raw/audio/tracks/theme/the_perfect_girl.jpg',
        href: 'https://open.spotify.com/track/5RBOcBpJXaNnHCGViJmYhh?si=370a57dc5fba4294',
        flavor: 'the perfect website',
    },
    [track_ids.VAMPIRE_EMPIRE]: {
        title: 'Vampire Empire',
        artist: 'Big Thief',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/vampire_empire.mp3',
        image: '/raw/audio/tracks/theme/vampire_empire.jpg',
        href: 'https://open.spotify.com/track/0ToG55iJZCOzZkcpWbXxpW?si=ebf6575d828d4489',
        flavor: 'thanks Obama',
    },
    [track_ids.WHEN_AM_I_GONNA_LOSE_YOU]: {
        title: 'When Am I Gonna Lose You',
        artist: 'Local Natives',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/when_am_i_gonna_lose_you.mp3',
        image: '/raw/audio/tracks/theme/when_am_i_gonna_lose_you.jpg',
        href: 'https://open.spotify.com/track/7ze7X8r4fopBs9ZRtwYFOX?si=f9ea0b87a9204c53',
        flavor: 'user rentention 👀',
    },
    [track_ids.WHEN_I_GET_HOME]: {
        title: 'When I Get Home',
        artist: 'Post Animal',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/when_i_get_home.mp3',
        image: '/raw/audio/tracks/theme/when_i_get_home.jpg',
        href: 'https://open.spotify.com/track/1R06KfLRjBFEh7S1cmLfWk?si=31ce4a2252b04dc7',
        flavor: 'i live here',
    },

    // [track_ids.STARRY_NIGHT]: {
    //     title: 'Starry Night',
    //     artist: 'Peggy Gou',
    //     album: undefined,
    //     list: track_lists.THEME,
    //     audio: '/raw/audio/tracks/theme/starry_night.mp3',
    //     image: '/raw/audio/tracks/theme/starry_night.jpg',
    //     href: 'https://peggygou.bandcamp.com/track/starry-night',
    //     flavor: 'cyrus means \'the sun\'',
    // },
    [track_ids.YOURE_THE_ONE]: {
        title: 'YOU\'RE THE ONE',
        artist: 'Kaytranada',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/youre_the_one.mp3',
        image: '/raw/audio/tracks/theme/youre_the_one.jpg',
        href: 'https://open.spotify.com/track/2b4SSorCTQ2VzmllaeWuuT?si=b683740a86b9452e',
        flavor: 'u can only have one tab of an app',
    },

    [track_ids.NULL]: {
        title: 'Ø',
        artist: 'Lorn',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/null_by_lorn.mp3',
        image: '/raw/audio/tracks/theme/null_by_lorn.jpg',
        href: 'https://ofdreamforever.bandcamp.com/track/-',
        flavor: 'null set',
    },
    [track_ids.SUPERSONIC]: {
        title: 'Supersonic (my existence)',
        artist: 'Skrillex',
        album: undefined,
        list: track_lists.THEME,
        audio: '/raw/audio/tracks/theme/supersonic.mp3',
        image: '/raw/audio/tracks/theme/supersonic.jpg',
        href: 'https://www.youtube.com/watch?v=U41bONK2V-U',
        flavor: 'i code supersonic',
    },
}
Object.entries(tracks).map(([id, track]) => track.id = id)

export const get_tracks = (list:string|string[]): track[] => {
    if (typeof(list) === 'string') {
        return values(tracks).filter(track => track.list === list)
    } else {
        return list.map(id => tracks[id]).filter(x=>x)
    }
}

const EMPTY_TRACK = '/raw/audio/tracks/2-seconds-of-silence.mp3'
export const TRACK_PLAYER_COOKIE = {
    STATE: 'music-player-state',
}
let play_success = false
const state: {
    node: any,
    inited: boolean,
    tracks: track[], order?: number[],
    index: number,
    paused: boolean,
    off: boolean,
} = {
    node: undefined,
    inited: false,
    ...(store.get(TRACK_PLAYER_COOKIE.STATE) || {
        tracks: [],
        index: -1,
        paused: false,
        off: false,
    }),
}
state.off = true // ALWAYS START OFF
const save_track_player_state = () => store.set(TRACK_PLAYER_COOKIE.STATE, unpick(state, 'node'))
export const get_current_track = () => state.tracks[state.order ? state.order[state.index % state.tracks.length] : state.index % state.tracks.length]

window['_track_player_message'] = message
export const create_track_show = ({do_play_without_click=true}={}) => {
    const track = get_current_track()
    return () => {
        message.trigger({ delete: 'track-player-toggle track-player-notification' })
        message.trigger({
            // html: `<div class='row' style='gap:.5em'>
            //     <a onclick="
            //     if (${!state.off}) event.stopPropagation()
            //     const off = music_off(${!state.off}) // || defer(() => _track_player_curr_show_track_info(), 500)
            //     _track_player_message.trigger({ delete: off ? 'track-player-notification track-player-toggle' : 'track-player-toggle' })
            //     ">${state.off ? 'enable' : 'disable'} music</a>
            // </div>`,
            html: `<div class='row' style='gap:.5em'>
                <a onclick="
                if (${!state.off}) event.stopPropagation()
                const off = music_off(null, true) // || defer(() => next_track(), 500)
                _track_player_message.trigger({ delete: off ? 'track-player-notification track-player-toggle' : 'track-player-toggle' })
                ">${state.off ? 'play' : 'disable'} music</a>
            </div>`,
            id: 'track-player-toggle', delete: 'track-player-toggle',
            ms: 5_000,
        })
        message.trigger({
            html: `<div class='row' style='gap:.5em'>
                <img src='${track.image}' style="width:3em"></img>
                <div class='column'>
                    <div style="
                    white-space: nowrap;
                    // max-width: 15em;
                    text-overflow: ellipsis;
                    overflow: hidden;
                    "><a target='_blank' href='${track.href}'>${track.title}</a></div>
                    <div>${track.artist}</div>
                </div>
                ${state.off && 0 ? '' : `<div class='column' style='flex-shrink:0; padding-left:.5em; border-left: 1px solid #8884'>
                    <span>${track.list}</span>
                    ${state.off || do_play_without_click ? `<span class="row wide end gap" style="user-select:none"><a style="display:none;text-decoration:none;border:none" onclick="
                    music_off(null, true)
                    ">⏯</a><a style="text-decoration:none;border:none" onclick="
                    next_track()
                    ">⏭</a></span>` : `<span style='opacity:.5'>(after click)</span>`}
                </div>`}
            </div>`,
            id: 'track-player-notification', delete: 'track-player-notification',
            ms: 5_000,
        })
    }
}
window['show_track'] = create_track_show()

export const music_off = window['music_off'] = (off=true, toggle=false) => {
    off = toggle ? !state.off : off
    state.inited = true
    state.off = state.paused = off
    save_track_player_state()
    if (state.off) {
        state.node.pause()
    } else {
        state.node.play()
        // defer(() => state.node.play(), 500) // IDK WHY THIS IS NEEDED BUT IT IS UGHH
    }
    log('music_off', state.off, state, { paused: state.node.paused })
    return state.off
}

export const next_track = window['next_track'] = () => {
    state.index += 1
    save_track_player_state()

    const track = get_current_track()
    if (track) {
        defer(async () => {
            // const blob = await fetch(track.audio).then(r=>r.blob())
            // const url = URL.createObjectURL(blob)
            // state.node.src = url // track.audio
            state.node.src = track.audio
            state.node.addEventListener('canplay', () => {
                const do_play_without_click = play_success || state.inited
                if (do_play_without_click) {
                    // state.off || state.node.play()
                    state.off || music_off(false)
                } else {
                    state.off || window.addEventListener('click', () => {
                        // state.off || state.node.play()
                        state.off || music_off(false)
                        play_success = true
                        message.trigger({ delete: 'track-player-notification track-player-toggle', })
                    }, { once:true })
                }
                window['_track_player_curr_show_track_info'] = next_track // show_track_info
                window['_track_player_message'] = message
                // message.trigger({
                //     // html: `<div class='row' style='gap:.5em'>
                //     //     <a onclick="
                //     //     if (${!state.off}) event.stopPropagation()
                //     //     const off = music_off(${!state.off}) // || defer(() => _track_player_curr_show_track_info(), 500)
                //     //     _track_player_message.trigger({ delete: off ? 'track-player-notification track-player-toggle' : 'track-player-toggle' })
                //     //     ">${state.off ? 'enable' : 'disable'} music</a>
                //     // </div>`,
                //     html: `<div class='row' style='gap:.5em'>
                //         <a onclick="
                //         if (${!state.off}) event.stopPropagation()
                //         const off = music_off(${!state.off}) // || defer(() => _track_player_curr_show_track_info(), 500)
                //         _track_player_message.trigger({ delete: off ? 'track-player-notification track-player-toggle' : 'track-player-toggle' })
                //         ">${state.off ? 'play' : 'disable'} music</a>
                //     </div>`,
                //     id: 'track-player-toggle', delete: 'track-player-toggle',
                //     ms: 4_000,
                // })
                // state.off || show_track_info()
                create_track_show({ do_play_without_click })()
                // message.trigger({
                //     html: `<div class='row' style='gap:.5em'>
                //         <div class='column' style='flex-shrink:0'>
                //             <span>now playing:</span>
                //             ${play_success ? '' : `<span style='opacity:.5'>(after click)</span>`}
                //         </div>
                //         <img src='${track.image}' style="width:3em"></img>
                //         <div class='column'>
                //             <div style="
                //             white-space: nowrap;
                //             max-width: 15em;
                //             text-overflow: ellipsis;
                //             overflow: hidden;
                //             "><a href='${track.href}'>${track.title}</a></div>
                //             <div>${track.artist}</div>
                //         </div>
                //     </div>`,
                //     id: 'track-player-notification', delete: 'track-player-notification',
                //     ms: 3_000,
                // })
            }, { once:true })
        })
    } else {
        state.node.pause()
        state.node.src = ''
    }
}
export const track_play = (list:string|string[], {do_shuffle=false,do_first_shuffle=false}={}) => {
    const last_state = strings.json.clone(state)
    state.tracks = get_tracks(list)
    state.order = do_shuffle ? rand.shuffle_order(state.tracks.length) : undefined
    const is_same_list = strings.json.equal(state.tracks, last_state.tracks)
    const is_first_track = (state.index + 1) % state.tracks.length == 0
    const actually_do_first_shuffle = do_first_shuffle && is_same_list && is_first_track
    log('track_play', {list, do_shuffle, do_first_shuffle, is_same_list, last_index:last_state.index, is_first_track, actually_do_first_shuffle})
    if (is_same_list && !is_first_track) {
        state.index = last_state.index
    } else {
        state.index -= 1
        if (do_first_shuffle) state.order = rand.shuffle_order(state.tracks.length)
    }
    next_track()
}
export const DropdownTrackPlayerFill = () => {
    const rerender = useRerender()
    const [time, set_time] = useS(0)
    useE(() => {
        return on(state.node, 'timeupdate', () => {
            if (!state.paused) set_time(state.node.currentTime)
        })
    })
    useE(() => {
        return on(state.node, 'canplay', () => {
            if (!state.paused) set_time(state.node.currentTime)
        })
    })

    const track = get_current_track()
    const total_time = state.node?.duration
    const render_time = (ms) => `${Math.floor(ms / 60).toString().padStart(2, '0')}:${Math.floor(ms % 60).toString().padStart(2, '0')}`

    return track ? <>
        <span style={S(`
        max-width: 15em;
        text-overflow: ellipsis;
        overflow: hidden;
        `)}>{track.title}</span>
        <span>{render_time(time)}{total_time ? <> / {render_time(total_time)}</> : null}</span>
        <span><a onClick={e => {
            state.paused = !state.node?.paused
            save_track_player_state()
            if (state.paused) {
                state.node.pause()
            } else {
                state.off || state.node.play()
            }
            rerender()
        }}>{state.node?.paused ? 'unpause' : 'pause'}</a> / <a onClick={e => {
            state.paused = false
            next_track()
        }}>next</a></span>
        <hr/>
    </> : null
}
export const GlobalTrackPlayer = () => {
    state.inited = false
    state.paused = true
    save_track_player_state()
    useF(() => {
        const outer_node = node('<div><div><div><audio /></div></div></div>')
        state.node = Q(outer_node, 'audio')
        state.node.src = EMPTY_TRACK
        on(state.node, 'ended', () => next_track())
        // window.addEventListener('canplaythrough', () => {
        //     state.node.play().catch(() => {
        //         window.addEventListener('click', () => state.node.play(), { once:true })
        //     })
        // })
        const really_try_to_play = () => {
            state.node.play().then(() => play_success = true).catch(() => {
                // window.addEventListener('click', () => {
                //     state.node.play()
                //     play_success = true
                //     if (state.paused) defer(() => state.node.pause())
                // }, { once:true })
            }).finally(() => {
                // if (play_success) {
                //     message.trigger({ delete: 'track_player-play' })
                //     defer(() => state.off || state.node.play(), 500)
                // }
            })
        }
        document.body.append(outer_node)
        really_try_to_play()
        // window['global-track-player-play'] = () => really_try_to_play()
        // message.trigger({
        //     html: `<a onclick="window['global-track-player-play']()">play soundtrack</a>`,
        //     id: 'track_player-play',
        // })
    })
    return <></>
}
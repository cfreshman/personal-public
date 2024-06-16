import { store } from './store';
import { trigger } from './trigger';
import { defer, randi } from './util';

const { set, list } = window as any


export const languages: { [key: string]: string} = {
    english: 'scrabble-count.txt',
    danish: 'lang/danish.txt',
    finnish: 'lang/finnish-count.txt',
    portuguese: 'lang/portuguese-count.txt',
    german: 'lang/german-count.txt',
}

export const dict = trigger.implicit({
    lang: 'english',
    loaded: true,
    words: new Set<string>(),
    anagrams: {} as { [key:string]: string[] },
    letters: [],
})
export const set_lang = (lang: string) => {
    console.debug(`LIBDICT LANG`, lang)
    dict.set({
        lang,
        loaded: false,
        words: new Set<string>(),
        anagrams: {},
        letters: [],
    })
    return load_lang(lang).then(value => {
        if (value?.lang !== lang) {
            console.debug(value)
            throw `unexpected language: ` + value?.lang
        }
        dict.set(value)
        console.debug('LIBDICT LANG LOADED', dict.lang)
    })
}

const dicts = {}
let last_loaded = undefined
export const load_lang = (lang: string='english'): Promise<any> => Promise.resolve(Object.load(dicts, lang, () => {
    if (!languages[lang]) throw `${lang} language not supported`
    console.debug(`loading ${lang} dictionary`)
    last_loaded = lang

    const fetch_dict = () => {
        const start = Date.now()
        let fetched
        return dicts[lang] = fetch(`/lib/dict/${languages[lang]}`)
        .then(res => {
            console.debug(`LIBDICT DICT FETCHED`, lang)
            if (!languages[lang].includes('-count')) {
                return res.text().then(x => x.split('\n'))
            }

            // dictionaries can be large
            // optimize storage, read, & representation
            fetched = Date.now()

            // parse condensed dict - see public/lib/dict/optimizations.txt
            const reader = res.body.getReader()
            let prefix = ''
            const charCode9 = '9'.charCodeAt(0)
            const textDecoder = new TextDecoder()
            let words
            let w_i = 0
            const decode = () => reader.read().then(async ({ done, value: bytes }) => {
                if (done) {
                    if (!words) return [] // didn't receive any data
                    words[w_i] = prefix // current prefix is final word
                    return words
                }

                // defer dict loading until after rest of app to reduce visual load time
                await defer()
                let begin = 0
                if (!words) {
                    // initialize list
                    while (bytes[begin] <= charCode9) begin++
                    words = Array.from({ length: Number(textDecoder.decode(bytes.subarray(0, begin))) })
                }

                // parse bytes as words delimited by common prefix length
                // (an efficient storage format for a sorted dictionary)
                // e.g. ab1cd2ef0gh -> [ab, acd, acef, gh]
                await defer()
                for (let i = begin; i < bytes.length; i++) {
                    if (bytes[i] <= charCode9) {
                        // start of new word, end previous & reset prefix
                        words[w_i] = prefix + textDecoder.decode(bytes.subarray(begin, i))
                        begin = i
                        i++
                        while (bytes[i] <= charCode9) i++
                        prefix = words[w_i].slice(0, Number(textDecoder.decode(bytes.subarray(begin, i))))
                        begin = i
                        w_i++
                    }
                    if (i % 1_000 === 0) {
                        await defer() // read 1_000 words at a time
                    }
                }
                if (begin < bytes.length) {
                    // read through end if in middle of word
                    prefix += textDecoder.decode(bytes.subarray(begin))
                }

                // read next chunk
                return decode()
            })
            return decode()
        })
        .then(word_list => {
            console.debug(`LIBDICT DICT DESERIALIZED`, lang)

            const parsed = Date.now()

            // const dictList: string[] = text.split('\n')
            //     .map(s => s.trim())
            //     .filter(s => s && s[0] !== '#')
            // window['dictList'] = dictList

            window['words'] = word_list
            console.debug(word_list)

            // const abbrevList = [dictList[0]]
            // dictList.slice(1).map((word, i) => {
            //     const prev = dictList[i]
            //     let prefix = ''
            //     let j = 0
            //     while (prev[j] === word[j]) {
            //         prefix += prev[j]
            //         j += 1
            //     }
            //     abbrevList.push(word.replace(prefix, String(prefix.length)))
            // })
            // window['abbrevList'] = abbrevList

            const anagrams = {}
            word_list.map(word => {
                const anagram = list(word,'').sort().join('')
                if (!anagrams[anagram]) anagrams[anagram] = []
                anagrams[anagram].push(word)
            })

            dict.set({
                loaded: true,
                lang,
                words: new Set(word_list),
                anagrams,
                letters: {
                    english: 'qwertyuiopasdfghjklzxcvbnm'.split(''),
                    danish: Object.keys(danish_freqs),
                    finnish: Object.keys(finnish_freqs),
                    portuguese: Object.keys(portuguese_freqs),
                    german: Object.keys(german_freqs),
                }[lang].sort((a, b) => a.localeCompare(b)),
            })

            const _dict = dict.get()
            const now = Date.now()
            console.debug('loaded', _dict.words.size, _dict.lang, `words in ${now - start}ms total`,
                `(${fetched - start}ms + ${now - fetched}ms (${parsed - fetched} ${now - parsed}))`, _dict.letters)

            dicts[lang] = _dict
            try {
                store.set(`libdict-dict`, { ..._dict, words: [..._dict.words] })
            } catch {} // too large
            return _dict
        })
        .catch(e => console.debug('Error loading dictionary', lang, e))
    }

    const existing = store.get(`libdict-dict`)
    console.debug('existing', existing)
    if (existing?.lang === lang) {
        dict.set({ ...existing, words: new Set(existing.words) })
        fetch_dict()
        return Promise.resolve(existing)
    } else {
        return fetch_dict()
    }
}))
load_lang('english')


/**
 * is_valid_word: check if a word is in the dictionary
 */
export const is_valid_word = (word: string, lang?: string): boolean => {
    return (lang ? dicts[lang] : dict)?.words.has(word) || (lang||dict.lang==='english'&&['a','i'].includes(word))
}

/**
 * get_dict: get entire dictionary
 */
export const get_dict = (): Set<string> => dict.words

const b1 = 'potncldocbrsexeieninyetltnrsossynilsiphaadfleamsitpeuxatenrsslchertesurygnsodtneahtilvicibtamuvcauhkehsleoltceroabgnsiasbemnipoerb'
const b2 = 'futafalsridoslrlgantnkwnniesnseysgatmeoeiwadrunapstysivrvrkissdrieotaenltetdsaodgpaseaudtpsmslotnbeytioresrakucldcuatrnshhakbtestdc'
const b3 = 'rnedcinragsedrteudesiuriosclhinfealrupbolglmwloeruowierpniscineihlgoaewsaresrnshuotlntoifcdscosmsfesnehkeatoweeanhwrzrlnpstceaniof'
const b4 = 'dcrasieineeiutnmanuovrsdoesdgbeiexslevorptckitagibliatroftliaxisfcaiyavreniolrbriatdradpdeempylehuirivedtisevebdtusqfnaiskyouawylp'
const b5 = 'wnduchgnefirgsisntovtitntvinuiohaciactcrdpeoytionewspmerngrdamoanuiztoslisedmaoelderdflgewetdneiuimeraeiodytsintipmhlalheotanisiwo'
const b6 = 'fawrbteafbcnuslsteukekslagertrartgcdnprsuinyrtpiekgecniaelvbspteodsrlmnisaegptougugrtnosinlseoieritrnyiluadegarchrctlypmaoeosiacib'
const b7 = 'stcsneasojpeaietsigatasltvinygitoaeatesomlemushrpeosiaelydhustdzuphemkpoeseaoniaepormtbectraiwuytslsmlkgnugtpueperidincmrsavslasan'
const alpha = {
    english: b1 + b2 + b3 + b4 + b5 + b6 + b7,
}

/**
 * rand_alpha: random letter with relative frequency
 */
export const rand_alpha = () => {
    const langAlpha = alpha[dict.get().lang]
    return langAlpha[randi(langAlpha.length)];
}



const portuguese_freqs = {
    "p": 0.022224568154197925,
    "o": 0.06103148163953392,
    "t": 0.04852879116927502,
    "n": 0.044502688695591805,
    "c": 0.03431245576762345,
    "l": 0.027674952339914367,
    "d": 0.04489478870896035,
    "b": 0.012516600411225837,
    "r": 0.08433665597020486,
    "s": 0.09906763388533925,
    "e": 0.10656178928586728,
    "x": 0.00386226925999896,
    "i": 0.0862157909477974,
    "y": 0.000004852302311249794,
    "h": 0.00843338624216272,
    "a": 0.15763874387837598,
    "f": 0.014721219188282873,
    "m": 0.039920959037042965,
    "u": 0.030114142805485855,
    "g": 0.013424489502108977,
    "v": 0.02849231974017951,
    "k": 0.000026270724236178395,
    "w": 0.000025550331776746492,
    "z": 0.006411014324508649,
    "q": 0.002159419929614395,
    "j": 0.0021485167745727584
}
alpha['portuguese'] = Object.entries(portuguese_freqs)
    .map(entry => entry[0].repeat(1000 * entry[1])).join('')


const finnish_freqs = {
    "p": 0.032717003341234424,
    "o": 0.047266168829296205,
    "t": 0.0982280836642157,
    "n": 0.06372915168423303,
    "c": 0.0002154008690488548,
    "l": 0.055077159706211846,
    "d": 0.008689706486637484,
    "b": 0.0014832512388204579,
    "r": 0.036015143431364506,
    "s": 0.06929105248872404,
    "e": 0.06286538522118743,
    "x": 0.00003640182667831507,
    "i": 0.11214249822233587,
    "y": 0.026124565874768167,
    "h": 0.021220097721703406,
    "a": 0.11652061926510228,
    "f": 0.002039932305150204,
    "m": 0.025213489456080717,
    "u": 0.07759205844745719,
    "g": 0.0026296726322718087,
    "v": 0.0383832644816316,
    "k": 0.10043008224755312,
    "w": 0.00013747661282372816,
    "z": 0.0000582860799441291,
    "q": 0.00001413177941641399,
    "j": 0.008494328257653424,
    "ä": 0.07759205844745719,
    "ö": 0.00013747661282372816,
}
alpha['finnish'] = Object.entries(finnish_freqs)
    .map(entry => entry[0].repeat(1000 * entry[1])).join('')

const danish_freqs: { [key:string]: number } = {
    "a": 0.058699156792234655,
    "h": 0.01376100675973113,
    "p": 0.020396638191691196,
    "g": 0.037367084326822175,
    "l": 0.05314550787918257,
    "e": 0.14309187178382957,
    "n": 0.08145233013350138,
    "r": 0.08850618879285066,
    "j": 0.007630163031290698,
    "v": 0.018623999616078277,
    "d": 0.04454822953363774,
    "t": 0.06436734485182857,
    "s": 0.0890979587615019,
    "u": 0.02356736670987192,
    "b": 0.020302063724538414,
    "c": 0.008056544846036,
    "i": 0.06105048987746233,
    "m": 0.02889221852250781,
    "y": 0.008971920709479093,
    "o": 0.04440032219055837,
    "k": 0.037337324769516914,
    "å": 0.0038155501700911014,
    "f": 0.019901317307975754,
    "ø": 0.009311929509872276,
    "w": 0.001286362722700492,
    "æ": 0.010378821355627038,
    "x": 0.0005666500903589205,
    "q": 0.000244309562570594,
    "z": 0.0012293274766524557
}
alpha['danish'] = Object.entries(danish_freqs)
    .map(entry => entry[0].repeat(1000 * entry[1])).join('')

const german_freqs: { [key:string]: number } = {
    "a": 174639,
    "c": 83094,
    "h": 123359,
    "e": 386158,
    "n": 229212,
    "r": 222689,
    "s": 193443,
    "l": 133730,
    "b": 69565,
    "o": 82864,
    "g": 105706,
    "f": 62945,
    "i": 180224,
    "t": 195865,
    "m": 67486,
    "k": 67092,
    "z": 34691,
    "ä": 18865,
    "u": 112997,
    "p": 48130,
    "w": 30134,
    "d": 63174,
    "j": 4404,
    "v": 23419,
    "ü": 16942,
    "ö": 7559,
    "ß": 4614,
    "y": 4182,
    "é": 206,
    "q": 1477,
    "x": 2407,
}
alpha['german'] = Object.entries(german_freqs)
    .map(entry => entry[0].repeat(entry[1] / 100)).join('')

// generate language letter freqs
// set to english, then target language
const target = '' // 'danish'
const freqsCalc = {}
target && dict.add(() => {
    console.debug('LIBDICT FREQ', target, dict)
    if (target !== dict.lang) return

    let letters: { [key: string]: number } = {}
    let total = 0
    dict.words.forEach(word => {
        word.split('').forEach(letter => {
            letters[letter] = (letters[letter] ?? 0) + 1
            total += 1
        })
    })
    console.debug(total, Object.values(letters).reduce((a, b) => a + b))
    Object.keys(letters).forEach(letter => {
        letters[letter] = letters[letter] / total
    })
    freqsCalc[dict.lang] = letters
    console.debug('LIBDICT FREQ', target, freqsCalc)
    if (Object.keys(freqsCalc).length === 2) {
        letters = {}
        total = 0
        alpha['english'].split('').forEach(letter => {
            letters[letter] = (letters[letter] ?? 0) + 1
            total += 1
        })
        Object.keys(letters).forEach(letter => {
            letters[letter] = letters[letter] / total
        })
        freqsCalc['alpha'] = letters
        {
            const shift = { ...letters }
            Object.keys(shift).forEach(l => {
                shift[l] = freqsCalc[target][l] / freqsCalc['english'][l] * freqsCalc['alpha'][l]
            })
            freqsCalc['target-alpha'] = shift
            console.log('LIBDICT FREQ', target, freqsCalc)
        }
    }
})
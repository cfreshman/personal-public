import { execSync, exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import db from '../../db';
import mail from '../mail';
import { basedir, staticPath } from '../../util';

// const DICT_PATH = basedir + '/scrabble.txt'
const DICT_PATH = path.join(staticPath, 'lib/dict/')

const languages = {
    english: 'scrabble.txt',
    danish: 'lang/danish.txt',
    finnish: 'lang/finnish.txt',
    portuguese: 'lang/portuguese.txt',
    german: 'lang/german.txt',
}

let dicts = {}
const loadLang = (lang='english') => {
    if (lang === 'danish') {
        console.debug('[DICT] skipping danish')
        return
    }
    return new Promise(resolve => {
        if (dicts[lang]) return resolve(dicts[lang])
        fs.readFile(DICT_PATH + languages[lang], 'utf8', async (error, text) => {
            if (error) {
                let msg = `error loading ${lang} dict ${DICT_PATH}`
                console.log(msg, error)
                return
            }
            let dictList = text.split('\n').map(s => s.trim()).filter(s => s && s[0] !== '#')
            dicts[lang] = new Set(dictList);
            console.log('loaded', dicts[lang].size, lang, 'words');

            await _outputDict(lang, true)
            resolve()
        });
    })
}
db.queueInit(async () => await Promise.all('english portuguese finnish danish german'.split(' ').map(loadLang)))

/**
 * isValidWord: check if a word is in the dictionary
 */
const isValidWord = (word, lang='english') => dicts[lang].has(word);

function _outputDict(lang, initial=false) {
    // generate abbreviated & compressed form
    const words = [...dicts[lang]].sort()
    const plainPath = path.join(DICT_PATH, languages[lang])

    const metaPath = plainPath + '.meta'
    const meta = JSON.stringify({
        count: words.length
    })
    try {
        if (meta === fs.readFileSync(metaPath).toString()) {
            console.log(lang, 'has no changes')
            return
        }
    } catch (e) {
        console.error(e)
    }
    fs.writeFileSync(metaPath, meta)

    const plain = words.join('\n')
    if (!initial) {
        console.log('writing', words.length, lang, 'words')
        fs.writeFileSync(plainPath, plain)
    }
    console.log(lang, '- compressed')
    exec(`gzip -c ${plainPath} > ${plainPath}.gz`) // can async

    const abbrev = words.length + '\n' + words.map((word, i, arr) => {
        if (i) {
            const prev = arr[i-1]
            let j = 0
            while (prev[j] === word[j]) j += 1
            return j + word.slice(j)
        } else return word
    }).join('')
    const abbrevPath = plainPath.replace('.txt', '-count.txt')
    console.log(lang, '- abbreviated')
    fs.writeFileSync(abbrevPath, abbrev)
    console.log(lang, '- compressed abbreviated')
    exec(`gzip -c ${abbrevPath} > ${abbrevPath}.gz`) // can async
}

/*  Add a word to the dictionary & regenerate compressed form
*/
async function addWord(word, lang='english') {
    word = word.toLowerCase()
    return new Promise((resolve, reject) => {
        const dict = dicts[lang]
        if (dict.has(word)) resolve(`${word} already found in ${lang}`)

        dict.add(word)
        _outputDict(lang)
        mail.send('cyrus@freshman.dev', `added ${lang} ${word}`, `undo: https://api.f3n.co/wordbase/del/${word}`)
        resolve(`added ${word} to ${lang} and regenerated compressed file`)
    })
}

/*  Remove a word from the dictionary & regenerate compressed form
*/
async function removeWord(word, lang='english') {
    word = word.toLowerCase()
    return new Promise((resolve, reject) => {
        const dict = dicts[lang]
        if (!dict.has(word)) resolve(`${word} not found in ${lang}`)

        dict.delete(word)
        _outputDict(dict, lang)
        resolve(`removed ${word} from ${lang} and regenerated compressed file`)
    })
}

export {
    languages,
    loadLang,
    isValidWord,
    addWord,
    removeWord,
};

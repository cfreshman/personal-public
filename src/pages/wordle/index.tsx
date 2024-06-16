import { setDefaultResultOrder } from 'dns';
import React, { Fragment, Fragment as JSX, useState } from 'react';
import { meta } from '../../lib/meta';
import { truthy } from '../../lib/types';
import styled from 'styled-components';
import { Comment, InfoBadges, InfoBody } from '../../components/Info';
import api from '../../lib/api';
import { useF, useI, useM, useR, useSkip, useStyle } from '../../lib/hooks';
import { useAuth, usePageSettings, usePathHashState, useTypedPathHashState, useTypedPathState } from '../../lib/hooks_ext';
import { S, percentArr, randi, strToStyle } from '../../lib/util';
import { Select, SettingStyles } from '../settings';
import { allowed as allowedInit, allowedNYT, allowedNYTOld, order, orderNYT, wordles, wordlesNYT, wordlesNYTOld, orderNYTOld } from './dict';
import { Leaderboard } from './leaderboard';
import { store } from '../../lib/store';
import { message } from 'src/lib/message';


const { named_log, datetime } = window as any
const log = named_log('wordle')

const WORDLE_START_DATE = datetime.new('2021-06-19')
const DAY_NYT_RANDOM_START = 506

const dateShiftDay = (from: Date, days: number) => {
  return datetime.offset(from, datetime.duration({ d:days }))
}
const dateToInputValue = (d: Date) => datetime.input(d)

// fetch daily words from NYT
let wordlesNYTAfterRandomization

let answers, allowed
let allAnswerSet: Set<string>
let answerSet: Set<string>
let answerDays: { [key:string]: number }
let allowedSet: Set<string>
let memo: { [key: string]: { guess: string, split?: boolean } } = {}
const setAnswers = (after: false | number = 0, nyt=0) => {
  const lists = nyt
    ?
      nyt === 2
      ? {
        answers: wordlesNYT,
        order: orderNYT,
        allowed: allowedNYT,
      }
      : {
        answers: wordlesNYTOld,
        order: orderNYTOld,
        allowed: allowedNYTOld,
      }
    : {
      answers: wordles,
      order,
      allowed: allowedInit,
    }
  allAnswerSet = new Set(lists.answers)
  after = after && Math.min(after, lists.answers.length - 1)
  answers = after
    ? lists.answers.filter((_, i) => lists.order[i] > (after as number))
    : lists.answers
  // if (after && wordlesNYTAfterRandomization) {
  //   answers = answers.concat(wordlesNYTAfterRandomization).filter((_, i) => i >= after)
  // }
  answerSet = new Set(answers)
  allowed = Array.from(new Set(lists.answers.concat(lists.allowed)))
  allowedSet = new Set(allowed)
  memo = {}
  answerDays = {}
  lists.answers.map((word, i) => {
    answerDays[word] = lists.order[i] - 1 // slight mis-match b/n days & order
  })
}

export const randomWordle = (): string => answers[randi(answers.length)]
console.debug('percents', percentArr(wordles.join('')))
setAnswers()
console.debug(randomWordle())

interface Tile {
  letter: string
  result: number
}
export interface Guess {
  word: string
  tiles: Tile[]
  left: string[]
  split?: boolean
  groups?: number
  stats?: { total: number, turn: number }
}
export const wordToGuess = (word: string, left: string[] = []): Guess => {
  return {
    word,
    tiles: word.split('').map(letter => ({ letter, result: 0 })),
    left,
    split: false,
  }
}

interface Counter {
  word: string
  letters: string[]
  letterSet: Set<string>
  counts: { [key: string]: number }
}
const wordToCounter = (word: string): Counter => {
  const counts = {}
  const letters = word.split('')
  letters.forEach(letter => {
    counts[letter] = 1 + (counts[letter] ?? 0)
  })
  return {
    word,
    letters,
    letterSet: new Set(letters),
    counts,
  }
}

// this function converts the guess results into a string like 12100
const guessToBucket = (guess: Guess): string =>
  guess.tiles.map(tile => `${tile.result}`).join('')

const bucketize = (guess: Guess): void => {
  const guessCopy = wordToGuess(guess.word)
  const buckets: { [key: string]: number } = {}
  let n = 0
  guess.left?.forEach((word, i) => {
    word = word.slice(0, 5)
    markAnswer(guessCopy, word)
    const bucket = guessToBucket(guessCopy)
    if (!buckets[bucket]) {
      n += 1
      buckets[bucket] = n
    }
    guess.left[i] = `${word} ${guessToBucket(guessCopy)} ${buckets[bucket]}`
  })
  guess.groups = n
  guess.split = guess.groups > 2 && guess.groups === guess.left.length
}

const getLeft = (guesses: Guess[]): string[] => _getLeft(guesses).wordlesLeft

const alpha = 'qwertyuiopasdfghjklzxcvbnm'
const _getLeft = (guesses: Guess[]): {
  wordlesLeft: string[],
  letters: Set<string>,
  found: string[],
  min: { [key: string]: number },
} => {
  // const left = new Set(alpha.split(''))
  const possible = Array.from({ length: 5 }).map(() => new Set(alpha.split('')))
  // const freqs: { [key: string]: Set<number> } = {}
  const max: { [key: string]: number } = {}
  answers.forEach(word => {
    const counter = wordToCounter(word)
    Object.entries(counter.counts).forEach(([letter, count]) => {
      max[letter] = Math.max(max[letter] ?? 0, count)
    })
  })
  console.debug('max', max)
  const min: { [key: string]: number } = {}
  const letters = new Set<string>()
  const found = Array.from({ length: 5 }).map(() => '')
  guesses.forEach(guess => {
    guess.tiles.forEach((tile, i) => {
      if (tile.result === 0) {
        if (!letters.has(tile.letter)) {
          possible.forEach(place => place.delete(tile.letter))
        } else {
          possible[i].delete(tile.letter)
          max[tile.letter] = guess.tiles
            .filter(t => t.letter === tile.letter && t.result > 0)
            .length
        }
        // left.delete(tile.letter)
      } else if (tile.result === 1) {
        possible[i].delete(tile.letter)
        letters.add(tile.letter)
      } else if (tile.result === 2) {
        possible[i] = new Set([tile.letter])
        letters.add(tile.letter)
        // left.add(tile.letter)
        found[i] = tile.letter
      }
      if (tile.result > 0) {
        min[tile.letter] = Math.max(min[tile.letter] ?? 0, guess.tiles
            .filter(t => t.letter === tile.letter && t.result > 0)
            .length)
      }
    })
  })
  console.debug('min', min)
  console.debug(possible)
  const wordlesLeft: string[] = answers.slice()
  .filter(word => {
    const wordLetters = word.split('')
    const wordLettersSet = new Set(wordLetters)
    const counter = wordToCounter(word)
    return wordLetters.every((letter, i) => possible[i].has(letter))
      && Array.from(letters).every(letter => wordLettersSet.has(letter))
      && Object.entries(counter.counts).every(([letter, count]) =>
        count <= max[letter] && count >= (min[letter] ?? 0))
  })
  return { wordlesLeft, letters, found, min }
}
const markGuess = (guess: Guess, min: { [key: string]: number }, possible: Set<string>[]): void => {
  const counter = wordToCounter(guess.word)
  possible.map(set => Array.from(set)).forEach((list, i) => {
    if (list.length === 1 && list[0] === guess.tiles[i].letter) {
      guess.tiles[i].result = 2
    }
  })
  guess.tiles.slice().reverse().forEach(tile => {
    const letterMin = min[tile.letter] ?? 0
    if (tile.result === 0 && letterMin > 0) {
      if (counter.counts[tile.letter] <= letterMin) {
        tile.result = 1
      } else {
        counter.counts[tile.letter] -= 1
      }
    }
  })
}
const computeNext = (guesses: Guess[], hardMode: boolean, start?: string): Guess => {
  // if (guesses.length === 0 && start) return wordToGuess(start, wordles)
  const { wordlesLeft, letters, min } = _getLeft(guesses)
  console.debug(wordlesLeft)
  const numLeft = wordlesLeft.length
  if (numLeft === 0) throw `no words left, are tiles correct?`
  const possible: Set<string>[] = Array.from({ length: 5 }).map(() => new Set())
  const total: {[key: string]: number} = {}
  const counts = Array.from({ length: 5 }).map(() => ({}))
  wordlesLeft.forEach(word => {
    new Set(word.split('')).forEach(char => {
      total[char] = 1 + (total[char] ?? 0)
    })
    word.split('').forEach((char, i) => {
      possible[i].add(char)
      counts[i][char] = 1 + (counts[i][char] ?? 0)
    })
  })
  const starts = (start || starter || defaultStarter).split(',')
  const { guess: splitter, split } = (guesses.length < starts.length && (starter || wordlesLeft.length > 50))
    ? { guess: starts[guesses.length], split: false }
    : splitWords(wordlesLeft, hardMode && guesses);
  if (splitter) {
    const guess = wordToGuess(splitter, wordlesLeft)
    guess.split = split
    markGuess(guess, min, possible)
    bucketize(guess)
    return guess
  }
  throw 'unexpected error'
  console.debug(Object.entries(total).sort((a, b) => b[1] - a[1]))
  const actualLeft = new Set(wordlesLeft)
  const scores = allowed
    .map(word => {
      const used: {[key: string]: number} = {}
      word.split('')
        .forEach((char, i) => {
          used[char] = letters.has(char) ? 0 : Math.max(used[char] ?? 0, total[char] ?? 0)
          // used[char] = letters.has(char) ? 0 : Math.max(used[char] ?? 0, counts[i][char] ?? 0)
          // used[char] = letters.has(char)
          //   ? 0
          //   : Math.max(used[char] ?? 0, (total[char] ?? 0) + (counts[i][char] ?? 0))
        })
      let score = Object.values(used)
        .reduce((sum, val) => sum + val)
      if (score === 0 && !actualLeft.has(word)) {
        score = -1
        // score += 1 // hacky
        // console.log({ word, score })
      }
      return { word, score }
    })
    // .sort((a, b) => b.score - a.score)
    .sort((a, b) => a.score - b.score)
    .reverse()

  // use best ordering of highest scoring letters
  let best = []
  for (let i = 0; i < scores.length && scores[i].score === scores[0].score; i++) {
    best.push(scores[i])
  }
  best = best.map(({ word }) => {
    const score = word.split('')
      .map((char, i) => counts[i][char] ?? 0)
      .reduce((sum, val) => sum + val)
    return { word, score }
  }).sort((a, b) => b.score - a.score)
  console.debug('best', best)
  const guess = wordToGuess(best[0].word, wordlesLeft)
  markGuess(guess, min, possible)
  bucketize(guess)
  return guess
}
const computeManual = (guesses: Guess[], word: string): Guess => {
  const { wordlesLeft, min } = _getLeft(guesses)
  console.debug(wordlesLeft)
  // const numLeft = wordlesLeft.length
  // if (numLeft === 0) throw `no words left, are tiles entered correctly?`
  const possible: Set<string>[] = Array.from({ length: 5 }).map(() => new Set())
  wordlesLeft.forEach(word => word.split('').forEach((char, i) => possible[i].add(char)))
  const guess = wordToGuess(word, wordlesLeft)
  markGuess(guess, min, possible)
  bucketize(guess)
  return guess
}
const recompute  = (guesses: Guess[], guess: Guess): void => {
  const { wordlesLeft } = _getLeft(guesses)
  guess.left = wordlesLeft
  bucketize(guess)
}

// mark guess results based on answer
const markAnswer = (guess: Guess, answer: string): void => {
  const counter = wordToCounter(answer)
  // mark letters in the correct position as green (2) and all others gray (0)
  guess.tiles.forEach((tile, i) => {
    if (counter.letters[i] === tile.letter) {
      tile.result = 2
      counter.counts[tile.letter] -= 1
    } else {
      tile.result = 0
    }
  })
  // mark letters which are found in a different position yellow (1)
  // this accounts for the counts of letters
  // e.g. ANNEX guessing TENOR will result in 00210, not 01210
  guess.tiles.forEach(tile => {
    if (tile.result === 0 && counter.counts[tile.letter]) {
      tile.result = 1
      counter.counts[tile.letter] -= 1
    }
  })
}

// determine if a guess can split remaining words
// const optimal = 'salet'
let starter = ''
const defaultStarter = 'salet'
const splitWords = (words: string[], hardMode: false | Guess[], limit=false): { guess?: string, split?: boolean } => {
  // for each guess, each remaining word will have a certain response
  // e.g. if gray=0 yellow=1 green=2, 12100 is a possible response
  // try to find a guess which results in a different response for each remaining word
  // this means we'll know the answer on the next turn
  // the rest of this code refers to these separate responses as 'buckets'

   // based on testing, current max split is 10 – can change if previous guesses change, but this improves speed
  // if (words.length > 20) return undefined
  // if (words.length > 110) return undefined
  limit || console.debug('split', words)
  // if (words.length > 2000) return { guess: starter }
  if (words.length < 3) return { guess: words[0] }

  const key = words.join('')
  if (memo[key]) {
    console.debug(memo[key])
    return memo[key]
  }

  let guesses: string[]
  if (limit) {
    guesses = words
  } else {
    // optimization to avoid checking useless guesses:
    // determine unknown letters – from positions with multiple remaining letters across words
    // e.g. if PATCH and WATCH are remaining, { P, W } are still unknown
    const places: Set<string>[] = Array.from({ length: 5 }).map(() => new Set())
    words.forEach(word => word.split('').forEach((letter, i) => places[i].add(letter)))
    const unknowns = new Set<string>()
    places.forEach(set => {
      if (set.size > 1) set.forEach(letter => unknowns.add(letter))
    })
    // then filter guesses down to words which contain an unknown letter
    // and try actual remaining words first (to guess the answer this turn if possible)
    guesses = words.concat(
      allowed.filter(word => word.split('').some(letter => unknowns.has(letter))))

    console.debug('HARD MODE', !!hardMode, guesses.length)
    if (hardMode) {
      guesses = filterHardMode(hardMode, guesses)
      console.debug('HARD MODE', guesses.length)
    }

    console.debug('splitter guesses', guesses.length)
  }

  // try to find perfect splitter
  outer:
  for (let i = 0; i < guesses.length; i++) {
    const guess = wordToGuess(guesses[i])
    const buckets = new Set<string>()
    for (let j = 0; j < words.length; j++) {
      markAnswer(guess, words[j])
      const bucket = guessToBucket(guess)
      // if another word has been assigned to the same bucket, continue to the next guess
      if (buckets.has(bucket)) {
        continue outer
      }
      buckets.add(bucket)
    }
    // if we've reached this point, this guess splits all remaining words
    memo[key] = { guess: guesses[i], split: true }
    return { guess: guesses[i], split: true }
  }

  if (limit) return { split: false }

  // return guess which splits the most words
  let best: { word?: string, splits: number } = { splits: 0 }
  const all: { word, size }[] = []
  for (let i = 0; i < guesses.length; i++) {
    const guess = wordToGuess(guesses[i])
    const buckets = new Set<string>()
    for (let j = 0; j < words.length; j++) {
      markAnswer(guess, words[j])
      const bucket = guessToBucket(guess)
      buckets.add(bucket)
    }
    all.push({ word: guesses[i], size: buckets.size })
    if (buckets.size > best.splits) {
      best = { word: guesses[i], splits: buckets.size }
    }
  }
  console.debug('best split', best)
  console.debug(all.sort((a, b) => b.size - a.size))
  console.debug(words.length)
  // memo[key] = { guess: best.word }
  // return { guess: best.word }
  // if (words.length < 100) {
  //   memo[key] = { guess: best.word }
  //   return { guess: best.word }
  // }

  // break ties by max buckets split by a remaining word
  let max: { word?: string, total: number } = { total: 0 }
  const highest: { word, total }[] = []
  let lastBuckets: any
  for (let i = 0; i < all.length && all[i].size === all[0].size; i++) {
    const word = all[i].word
    const guess = wordToGuess(word)
    const buckets: { [key: string]: string[] } = {}
    words.forEach(answer => {
      markAnswer(guess, answer)
      const bucket = guessToBucket(guess)
      if (!buckets[bucket]) buckets[bucket] = []
      buckets[bucket].push(answer)
    })
    console.debug(word, buckets)
    let total = 0
    Object.entries(buckets).forEach(([bucket, matches]) => {
      // if (bucket === '22222') total += 1
      if (matches.length < 3 || splitWords(matches, false, true).split) total += 1
    })
    highest.push({ word, total })
    if (total > max.total) {
      if (max.word) {
        console.warn({ ...max, buckets: lastBuckets }, { word, total, buckets })
      }
      max = { word, total }
      lastBuckets = buckets
    }
  }
  console.debug('max split', max)
  console.debug(highest.sort((a, b) => a.total - b.total))

  memo[key] = { guess: max.word }
  return { guess: max.word }

  // if (words.length > 35) {
  //   memo[key] = { guess: best.word }
  //   return { guess: best.word }
  // }

  // let max: { word?: string, total: number } = { total: 0 }
  // const highest: { word, total }[] = []
  // all.slice(0, 15).forEach(({ word }) => {
  //   const guess = wordToGuess(word)
  //   const buckets: { [key: string]: string[] } = {}
  //   for (let j = 0; j < words.length; j++) {
  //     markAnswer(guess, words[j])
  //     const bucket = guessToBucket(guess)
  //     if (!buckets[bucket]) buckets[bucket] = []
  //     buckets[bucket].push(words[j])
  //   }
  //   console.log(word, buckets)
  //   let total = 0
  //   Object.entries(buckets).forEach(([bucket, matches]) => {
  //     if (matches.length === 1) {
  //       total += 1
  //       return
  //     }
  //     // const inner = splitWords(matches)
  //     // if (inner.split || matches.length < 3) total += 1
  //   })
  //   highest.push({ word, total })
  //   if (total > max.total) {
  //     max = { word, total }
  //   }
  // })
  // console.log('max split', max)
  // console.log(highest.sort((a, b) => a.total - b.total))

  // memo[key] = { guess: max.word }
  // return { guess: max.word }


  // // choose guess from top 10 with the lowest expected score
  // let min: { word?: string, total: number } = { total: words.length * 3 }
  // const lowest: { word, total }[] = []
  // all.slice(0, 10).forEach(({ word }) => {
  //   const guess = wordToGuess(word)
  //   const buckets: { [key: string]: string[] } = {}
  //   for (let j = 0; j < words.length; j++) {
  //     markAnswer(guess, words[j])
  //     const bucket = guessToBucket(guess)
  //     if (!buckets[bucket]) buckets[bucket] = []
  //     buckets[bucket].push(word)
  //   }
  //   let total = 0
  //   Object.entries(buckets).forEach(([bucket, words]) => {
  //     if (bucket === '22222') return
  //     const inner = splitWords(words)
  //     words.forEach(actual => {
  //       if (actual === inner.guess) total += 1
  //       else if (inner.split || words.length < 3) total += 2
  //       else total += 3
  //       // else total += 2
  //     })
  //   })
  //   lowest.push({ word, total })
  //   if (total < min.total) {
  //     min = { word, total }
  //   }
  // })
  // console.log('min split', min)
  // console.log(lowest.sort((a, b) => b.total - a.total))

  // memo[key] = { guess: min.word }
  // return { guess: min.word }

  // // if we've reached this point, none of the guesses split the remaining words
  // return undefined
}

export const sim = (word: string, hardMode: boolean, start?: string | Guess[], tree?, fast?): Guess[] => {
  word = word.toLowerCase()
  const guesses: Guess[] = []
  if (start && typeof(start) !== 'string') {
    start.forEach(guess => markAnswer(guess, word))
    guesses.push(...start)
    start = undefined
  }
  while (!guesses.length || guesses[guesses.length - 1].word !== word) {
    const next = tree
      ? (fast
        ? wordToGuess(treeToWord(tree, guesses))
        : computeManual(guesses, treeToWord(tree, guesses)))
      : computeNext(guesses, hardMode, (start as string))
    markAnswer(next, word)
    guesses.push(next)
    // } while (guesses.length < 7 && guesses[guesses.length - 1].word !== word)
  }
  return guesses
}

const maxLeftShown = 2315
export const GuessElem = ({ guess, update, showLeft, setOpen, search }: {
  guess: Guess,
  update: any,
  // openLeft: Guess,
  // setOpenLeft: any,
  showLeft: boolean,
  setOpen: any,
  search: any,
}) => {
  // const showLeft = openLeft === guess
  const [expanded, setExpanded] = useState(false)
  const handle = {
    click: i => {
      guess.tiles[i].result = (guess.tiles[i].result + 1) % 3
      update(guess)
    },
    show: () => {
      // setOpenLeft(showLeft ? false : guess)
      setOpen(!showLeft)
    }
  }
  useF(guess.word, () => {
    setExpanded(false)
    if (showLeft) setOpen(false)
  })
  return <div className='guess'>
    <div className={`word ${!guess.word ? 'word-empty' : ''}`}>
      {guess.tiles.map((tile, i) => tile.letter === ' '
      ? <div key={i} className='tile'><Loader /></div>
      : <div
        key={i}
        className={`tile tile-${tile.result}`}
        onClick={() => handle.click(i)}>
          {tile.letter}
      </div>)}
    </div>
    <div className='left' style={{opacity: showLeft ? 1 : .8}}>
      <span className='left-toggle' onClick={handle.show}>
        {/* {guess.left.length || '???'} left */}
        {guess.left.length} left
        {/* {guess.stats && guess.left.length > 1 ? ` / ${
        Math.ceil((guess.stats.total / guess.left.length + guess.stats.turn) * 1000)/1000
        } avg` : ''} */}
      </span>
      {/* {guess.stats && guess.left.length > 1 ? ` ${
        Math.ceil((guess.stats.total / guess.left.length + guess.stats.turn) * 1000)/1000
        } avg` : ''} */}
      {guess.stats && guess.left.length > 1 ? <span style={{opacity: .7}}> {
        Math.ceil((guess.stats.total / guess.left.length + guess.stats.turn) * 1000)/1000
        } avg</span> : ''}
      {guess.split ? '\nsplit!' : ''}
      {showLeft ? <div className='left-list'>
        {guess.split || guess.left.length < 3
        ? ''
        : <span className='groups'>{guess.groups} groups</span>}
        {guess.left.slice(0, expanded
        ? maxLeftShown
        : guess.left.length === 21 ? 21 : 20)
        .map(word => {
          const parts = word.split(' ')
          if (parts.length > 1) {
            word = parts[0]
            const results = parts[1].split('')
            return <div key={word} className='left-entry'
            onClick={() => search(word)} style={{cursor:'pointer'}}>
              - {word}
              &nbsp;
              <span className='results'>
                {results.map((result, i) =>
                <span key={i} className={`result result-${result}`}>{result}</span>)}
              </span>
              &nbsp;
              <span className='bucket'>{parts[2]}</span>
            </div>
          }
          return <div key={word}>- {word}</div>
        })}
        {/* {guess.left.length > 20 ? <div>...</div> : ''} */}
        {/* {guess.left.length > 20 ? <div>+ {guess.left.length - 20} more</div> : ''} */}
        {expanded || guess.left.length <= 21
        ? ''
        : <div className='left-entry'
        style={{cursor: 'pointer'}}
        onClick={() => setExpanded(true)}>+ {guess.left.length - 20} more</div>}
      </div> : ''}
    </div>
  </div>
}
export const GuessBoard = ({ guesses, setGuesses, openLeft, setOpenLeft, handle }: {
  guesses: Guess[], setGuesses,
  openLeft: number, setOpenLeft,
  handle: { search },
}) => {
  return <>
    {guesses.map((guess, i) => <>
      <GuessElem update={guess => {
        const newGuesses = guesses.slice()
        newGuesses[i] = guess
        newGuesses.forEach((guess, j) => {
          if (j > i) {
            recompute(newGuesses.slice(0, j), guess)
          }
        })
        setGuesses(newGuesses)
        }} {...{
          guess,
          showLeft: openLeft === i,
          setOpen: open => setOpenLeft(open ? i : false),
          search: word => handle.search(word, guesses.slice(0, i + 1)) }}/>
    </>)}
  </>
}

const compactToLines = (compact: string): string[] => {
  const array = JSON.parse(compact.replace(/\w+/g, '"$&"'))
  const lines = []
  const recurse = (node, previous=[]) => {
    if (typeof(node) === 'string') {
      lines.push(previous.concat([node]))
    } else {
      const next = previous.concat([node[0]])
      if (typeof(node[1]) === 'string') {
        recurse(node[1], next)
      } else {
        node[1].forEach(inner => recurse(inner, next))
      }
    }
  }
  recurse(array)
  return lines.map(line => line.join(','))
}
const treeToCompact = (tree): string => {
  const recurse = (node, compact=[]) => {
    console.debug(node, compact)
    if (typeof(node) === 'string') {
      compact.push(node)
    } else {
      const next = []
      compact.push([node[0], next])
      Object.values(node[1]).forEach(inner => recurse(inner, next))
    }
    return compact
  }
  return JSON.stringify(recurse(tree)[0]).replace(/"/g, '').replace(/\[(\w+)\]/g, '$1')
}

const linesToTree = (lines: string[]): any => {
  lines = lines.map(line => line.toLowerCase().replace(/\r/g, ''))
  const starter = lines[0].split(',')[0]
  if (!allowedSet.has(starter)) throw `invalid tree: lines do not start with allowed guess`
  const tree = [starter, {}]
  lines.filter(s=>s).map(line => {
    const guesses: Guess[] = line.split(',').filter(s=>s).map(word => wordToGuess(word))
    if (guesses[0].word !== starter) throw `invalid tree: found different starting words ${guesses[0].word} and ${starter}`
    const n = guesses.length
    const answer = guesses[n-1].word
    let node = tree
    guesses.slice(0, n-1).map((guess, i) => {
      // if (!allowedSet.has(guess.word)) throw `${guess.word} not a valid guess`
      // if (node[0] !== guess.word) throw `${guess.word} must match previous ${node[0]}`
      const buckets = node[1]
      markAnswer(guess, answer)
      const bucket = guessToBucket(guess)
      if (!buckets[bucket]) {
        buckets[bucket] = guesses[i+1].word
      }
      const isLeaf = typeof(buckets[bucket]) === 'string'
      const splitter = isLeaf ? buckets[bucket] : buckets[bucket][0]
      if (splitter !== guesses[i+1].word) {
        const sequence = guesses.slice(0, i+1).map(g => g.word).join(',')
        console.debug(line, splitter.split(''), guesses[i+1].word.split(''), splitter !== guesses[i+1].word)
        throw `invalid tree: ${line} is inconsistent with previous ${sequence},${splitter}`
      }
      if (isLeaf && i < n-2) {
        buckets[bucket] = [buckets[bucket], {}]
      }
      node = buckets[bucket]
    })
  })
  return tree
}
export const compactToTree = (compact: string): any => linesToTree(compactToLines(compact))

const guessesToDebug = (guesses: Guess[]): string =>
  guesses.map(guess => `${guess.word}:${guessToBucket(guess)}`).join(',')
const treeToWord = (tree, guesses: Guess[]): string => {
  let node = tree
  for (let i = 0; i < guesses.length; i++) {
    const guess = guesses[i]
    if (typeof(node) === 'string') throw `tree is out of options after ${guessesToDebug(guesses)}`
    if (node[0] !== guess.word) throw `${guess.word} must match ${node[0]}`
    const bucket = guessToBucket(guess)
    node = node[1][bucket]
  }
  if (!node) throw `tree is out of options after ${guessesToDebug(guesses)}`
  return typeof(node) === 'string' ? node : node[0]
}

const filterHardMode = (guesses: Guess[], words: string[]): string[] => {
  // return words.filter(word => checkHardMode(guesses.concat([wordToGuess(word)])))
  const known = Array.from({ length: 5 }).map(() => '')
  let min: { [key: string]: number } = {}
  for (let i = 0; i < guesses.length; i++) {
    const guess = guesses[i]
    if (i > 0) {
      const counter = wordToCounter(guess.word)
      const missedGreen = counter.letters
        .some((letter, j) => known[j] && known[j] !== letter)
      const missedYellow = Object.entries(min)
        .some(([letter, n]) => n > (counter.counts[letter] || 0))
      if (missedGreen || missedYellow) {
        console.debug('hard mode failed:', guesses.map(g => g.word), JSON.stringify({ known, min, guess: guess.word }, null, 2))
        return []
      }
    }
    min = {}
    guess.tiles.forEach(({ letter, result }, i) => {
      if (result === 2) known[i] = letter
      if (result > 0) {
        min[letter] = 1 + (min[letter] ?? 0)
      }
    })
  }
  return words.filter(word => {
    const counter = wordToCounter(word)
    const missedGreen = counter.letters
        .some((letter, j) => known[j] && known[j] !== letter)
      const missedYellow = Object.entries(min)
        .some(([letter, n]) => n > (counter.counts[letter] || 0))
    return !(missedGreen || missedYellow)
  })
}
const checkHardMode = (guesses: Guess[]): boolean => {
  const answer = guesses[guesses.length - 1].word
  return filterHardMode(guesses.slice(0, guesses.length - 1), [answer]).length > 0
}

const commonStart = (guesses: Guess[], starts?: string[]): string[] => {
  if (!starts) return guesses.map(guess => guess.word)
  const index = guesses.findIndex((guess, i) => guess.word !== starts[i])
  return (index < 0) ? starts : starts.slice(0, index)
}

const markTurns = (node, turns: { [key: string]: number[] }, depth=1) => {
  if (typeof(node) === 'string') {
    turns[node] = [depth]
  } else {
    if (turns[node[0]] !== undefined) turns[node[0]] = turns[node[0]].concat([depth])
    Object.values(node[1]).map(inner => markTurns(inner, turns, depth + 1))
  }
}
window['markTurns'] = markTurns
const markStats = (guess: Guess, node, turn: number): void => {
  const turns: { [key: string]: number[] } = {}
  guess.left.map(word => turns[word.slice(0, 5)] = [])
  markTurns(node, turns)
  guess.left.map(word => {
    word = word.slice(0, 5)
    if (turns[word].length > 1) {
      const guesses = sim(word, false, [], node, true)
      turns[word] = [guesses.length]
    }
  })
  const total: number = Object.values(turns).reduce((sum, t) => sum + t[0], 0)
  guess.stats = { total, turn }
}
window['markStats'] = markStats

export default () => {
  const auth = useAuth()
  const [guesses, setGuesses]: [Guess[], any] = useState([])
  const [error, setError]: any[] = useState(false)
  const [stats, setStats]: any[] = useState('')
  const [openLeft, setOpenLeft] = useState(undefined)
  let [advanced, setAdvanced] = useState(false)
  const [progress, setProgress]: any[] = useState(false)
  const [output, setOutput] = useState({ starter: '', lines: [] })
  const [tree, setTree] = useState(undefined)
  const [isUpload, setIsUpload] = useState(false)
  const [isHardMode, setHardMode] = store.local.use('wordle-hardmode', { default: false })
  const [doExclude, setExclude] = store.local.use('wordle-exclude', { default: false })
  const [isNYT, setNYT] = store.local.use('wordle-nyt', { default: false })
  const [versionNYT, setNYTVersion]: [number, any] = store.local.use('wordle-nyt-version', { default: 2 })
  const today = useM(() => Math.floor(datetime.elapsed(WORDLE_START_DATE) / (1000 * 60 * 60 * 24)))
  const [_day, setDay] = useState(today)
  useF(today, () => setDay(today))
  const day = Math.min(_day, wordlesNYTAfterRandomization ? 1e6 : DAY_NYT_RANDOM_START)
  useF(today, day, wordlesNYTAfterRandomization, () => log({today,day,wordlesNYTAfterRandomization}))
  advanced = advanced || !!tree
  window['tree'] = tree

  const [exec, setExec] = useState(undefined)
  // useF(exec, () => exec && exec[0](...exec.slice(1)))
  useF(exec, () => exec && exec[0].bind(this)(...exec.slice(1)))

  useF(() => {
    wordlesNYTAfterRandomization
    || api.get('/wordle/played').then(played => {
      console.debug('PLAYED', played)
      // re-write orderNYT values with actual post-randomization
      wordlesNYT.map((word, i) => {
        // slight mis-match (+1) b/n date reported by NYT & existing word order
        if (played.dates[word] !== undefined) orderNYT[i] = played.dates[word] + 1
        else if (orderNYT[i] > DAY_NYT_RANDOM_START) orderNYT[i] = wordlesNYT.length // unknown date
      })
      wordlesNYTAfterRandomization = played.words
      // setDay(0)
      // setDay(Math.ceil((new Date().setHours(0,0,0,0) - new Date(2021,5,19,0,0,0,0).setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)))
      setDay(today)
    }).catch(() => wordlesNYTAfterRandomization = false)
  })

  // account for /wordle/leaderboard and old /wordle/#/leaderboard
  // otherwise, /<>/#/HASH loads the given HASH tree
  const [[leaderboard, treeMeta], _setLeaderboardAndTreeMeta] = useTypedPathHashState<[
    boolean,
    { id:string, name:string },
  ]>({
    prefix: 'wordle',
    from: (path, hash) => [(path + hash).includes('leaderboard'), (x => {
      if (x) {
        const [id, name] = x.split('/')
        return { id, name }
      } else {
        return undefined
      }
    })(path.replace(/leaderboard\/?/, ''))],
    to: ([leaderboard, treeMeta]) => [
      [leaderboard && 'leaderboard', treeMeta?.id, treeMeta?.name].filter(truthy).join('/'),
      ''],
  })
  const setLeaderboard = x => _setLeaderboardAndTreeMeta([x, treeMeta])
  const setTreeMeta = x => _setLeaderboardAndTreeMeta([leaderboard, x])

  const handle = {
    setLeaderboard, treeMeta, setTreeMeta,
    setIsUpload,
    reset: (soft?) => {
      const starts = (starter || defaultStarter).split(',')
      if (tree) {
        setGuesses([computeManual([], tree[0])])
      } else if (soft || (guesses.length > 1 && guesses[0].word === starts[0])) {
        // setGuesses([computeNext([], isHardMode)])
        handle.enter(starter || defaultStarter, true)
      } else {
        setGuesses([])
      }
      answers && console.debug(answers[randi(answers.length)])
    },
    guess: () => {
      // ${getLeft(guesses).length}/2315
      if (guesses.length > 0 && getLeft(guesses).length > 15) {
        setProgress({ guess: `searching` })
        setGuesses(guesses.concat([{
          word: '',
          tiles: ['', '', ' ', '', ''].map(letter => ({ letter, result: 0 })),
          left: getLeft(guesses),
        }]))
      }
      setTimeout(() => {
        try {
          if (tree) return handle.enter(treeToWord(tree, guesses))
          const nextGuess = computeNext(guesses, isHardMode)
          setGuesses(guesses.concat([nextGuess]))
          if (nextGuess.split) setOpenLeft(guesses.length)
          else setOpenLeft(false)
        } catch (error) {
          setError(error)
          setOpenLeft(false)
        }
      }, 50)
    },
    enter: (string, reset?) => {
      const newGuesses = reset ? [] : guesses.slice()
      if (string.split(',').some(word => {
        if (!allowedSet.has(word)) {
          setError(`${word.toUpperCase()} is not an allowed guess`)
          return true
        }
        newGuesses.push(computeManual(newGuesses, word))
      })) return
      setGuesses(newGuesses)
      setOpenLeft(false)
    },
    // enter: (word, reset?) => {
      // if (!allowedSet.has(word)) {
      //   setError(`${word.toUpperCase()} is not an allowed guess`)
      //   return
      // }
      // reset
      //   ? setGuesses([computeManual([], word)])
      //   : setGuesses(guesses.concat([computeManual(guesses, word)]))
      //   // setGuesses(guesses.concat([wordToGuess(word, getLeft(guesses))]))
      // setOpenLeft(false)
    // },
    undo: () => {
      setGuesses(guesses.slice(0, guesses.length - 1))
    },
    random: () => {
      handle.search(answers[randi(answers.length)])
    },
    day: (_day=day) => {
      setDay(_day)
      handle.search(answers.find(x => answerDays[x] === _day))
    },
    search: (word, guesses?) => {
      word = word.toLowerCase()
      console.debug('[SEARCH]', day, word, guesses)
      if (answerSet.has(word)) {
        setProgress({ search: `solving for ${word.toUpperCase()}` })
        setTimeout(() => {
          try {
            const newGuesses = sim(word, isHardMode, guesses, tree)
            setGuesses(newGuesses)
            const split = newGuesses.find(guess => guess.split)
            if (split) setOpenLeft(Math.min(openLeft || 100, newGuesses.indexOf(split)))
          } catch (error) {
            handle.reset()
            setTimeout(() => setError(error), 50)
          }
        }, 50)
      } else {
        setError(`${word.toUpperCase()} ${
          allAnswerSet.has(word)
          ? `was Wordle #${answerDays[word] + 1}`
          : 'is not a possible Wordle'
        }`)
      }
    },
    // search: (word, guesses?) => {
    //   word = word.toLowerCase()
    //   if (answerSet.has(word)) {
    //     setProgress({ search: `searching for ${word.toUpperCase()}` })
    //     setTimeout(() => {
    //       try {
    //         const newGuesses = sim(word, isHardMode, guesses, tree)
    //         setGuesses(newGuesses)
    //         const split = newGuesses.find(guess => guess.split)
    //         if (split) setOpenLeft(Math.min(openLeft || 100, newGuesses.indexOf(split)))
    //       } catch (error) {
    //         handle.reset()
    //         setTimeout(() => setError(error), 50)
    //       }
    //     }, 50)
    //   } else {
    //     setError(`${word.toUpperCase()} is not a possible Wordle`)
    //   }
    // },
    stats: (start?) => {
      start = start ?? (tree ? tree[0] : starter || defaultStarter)
      const statsTree = tree
      setTimeout(async () => {
        const turns = []
        const turns6plus = []
        let bestSplit = { word: '', answer: '', split: 0 }
        setStats({ avg: 0, failed: `0% (0/0)`})
        setOutput({ starter: '', lines: [] })
        // solve async so text can update
        const lines = []
        const statsEl = document.querySelector('#stats div')
        const now = Date.now()
        let hardMode = true
        let hardModeViolation: Guess[]
        let starts = undefined
        await Promise.all(answers.map(async (wordle, i) => {
          return new Promise(resolve => {
            setTimeout(() => {
              const avg = turns.reduce((sum, val) => sum + val, 0) / (i || 1)
              const over6 = turns.filter(val => val > 6).length
              if (statsEl) statsEl.textContent = `solving ${
                start ? start.toUpperCase() + ' ' : ''
              }${i+1}/${answers.length}: ${wordle.toUpperCase()}\n${JSON.stringify({
                avg: `${Math.ceil(avg * 1000)/1000}`,
                failed: `${Math.ceil(10000 * over6 / (i || 1))/100}% (${over6}/${i || 1})`,
              }, null, 2)}`
              try {
                const guesses = sim(wordle, isHardMode, start, statsTree, true)
                if (hardMode) {
                  hardMode = checkHardMode(guesses)
                  if (!hardMode) hardModeViolation = guesses
                }
                starts = commonStart(guesses, starts)
                // hardMode = hardMode && checkHardMode(guesses)
                lines.push(guesses.map(g => g.word).join(','))
                turns.push(guesses.length)
                if (guesses.length > 5) turns6plus.push(wordle)
                const split = guesses.find(guess => guess.split)
                if (split && split.left.length >= bestSplit.split) {
                  bestSplit = { word: split.word, answer: wordle, split: split.left.length }
                  console.warn(bestSplit)
                }
              } catch (error) {
                turns.push(7)
                hardMode = false
                console.warn(wordle, error)
              }
              resolve(true)
            })
          })
        }))
        const compute = (Date.now() - now) / 1000
        // const turns = answers.map((wordle, i) => {
        //   document.querySelector('#stats').textContent = `solving ${i+1}/${answers.length}`
        //   const guesses = sim(wordle)
        //   return guesses.length
        // })
        console.debug(turns6plus)
        console.debug(bestSplit)
        const total = turns.reduce((sum, val) => sum + val)
        const avg = total / answers.length
        const over6 = turns.filter(val => val > 6).length
        start = starts.join(',')
        setStats({
          starter: start.toUpperCase(),
          total,
          avg: Math.ceil(avg * 10000)/10000,
          failed: `${Math.ceil(10000 * over6 / answers.length)/100}% (${over6}/${answers.length})`,
          distribution: {
            1: turns.filter(t => t === 1).length,
            2: turns.filter(t => t === 2).length,
            3: turns.filter(t => t === 3).length,
            4: turns.filter(t => t === 4).length,
            5: turns.filter(t => t === 5).length,
            6: turns.filter(t => t === 6).length,
            X: turns.filter(t => t > 6).length,
          },
          ...(tree ? {} : { time: compute }),
          mode: hardMode ? 'hard' : 'normal',
          ...(hardMode ? {} : { reason: hardModeViolation.map(g => g.word).join(',') }),
        })

        setOutput({ starter: start, lines })
        // setTree(linesToTree(lines))
      }, 10)
    },
    compare: async (ids: string[]) => {
      if (ids.length === 2) {
        const names = []
        const results = []
        const wordResults = []
        await Promise.all(ids.map(id => new Promise(resolve => {
          api.get(`/wordle/${id}/tree`)
          .then(({ name, starter, compact, mode, total }) => {
            const tree = compactToTree(compact)
            const turns: { [key: string]: number } = {}
            const words: { [key: string]: string[] } = {}
            answers.map(answer => {
              try {
                const guesses = sim(answer, false, [], tree, true)
                turns[answer] = guesses.length
                words[answer] = guesses.map(g => g.word)
              } catch (error) {
                turns[answer] = 7
                words[answer] = ['error']
              }
            })
            results.push(turns)
            wordResults.push(words)
            names.push(
              [name, starter, total, mode === 'hard' ? 'hard' : ''].filter(s=>s).join('-'))
            resolve(true)
          })
          .catch(error => {
            setError(error)
            resolve(false)
          })
        })))
        if (results.length === 2) {
          console.debug('diffed', results)
          const lines = []
          lines.push(names.join(' → '))
          // const diffs: { [key: string]: number } = {}
          const diffs: { [key: string]: { answer: string, diff: number } } = {}
          const change = [0, 0, 0]
          const net = [0, 0, 0]
          answers.map(answer => {
            const diff = results[1][answer] - results[0][answer]
            const c_i = diff > 0 ? 0 : diff === 0 ? 1 : 2
            change[c_i] += 1
            net[c_i] += diff
            diffs[answer] = { answer, diff }
          })
          // const sortedDiffs = Object.entries(diffs).sort((a, b) => b[1] - a[1])
          const sortedDiffs = Object.entries(diffs).sort((a, b) =>
            // (b[1].diff - a[1].diff) || (results[0][a[1].answer] - results[0][b[1].answer]))
            (b[1].diff - a[1].diff) || (results[0][b[1].answer] - results[0][a[1].answer]))
          const sames = []
          const equals = []
          const avg_diff = (net[0] + net[2]) / answers.length
          lines.push(`${Math.abs(avg_diff).toFixed(3)} ${avg_diff < 0 ? 'fewer' : 'more'} turns on average`)
          lines.push(`${change[0]} words take more turns (+${net[0]} total)`)
          lines.push(`${change[2]} words take fewer turns (${net[2]} total)`)
          lines.push(`${change[1]} words take equal turns`)
          lines.push('\ndifferent turns:')
          sortedDiffs.map(([answer, diff]) => {
            const ws1 = wordResults[0][answer]
            const ws2 = wordResults[1][answer]
            const w1 = ws1.join(',')
            const w2 = ws2.join(',')
            if (w1 === w2) {
              sames.push(`${answer} ${results[0][answer]}   ${w1}`)
              // sames.push(`${answer} ${results[0][answer]}`)
            } else {
              // lines.push(
              //   `${diff < 0 ? '-' : '+'}${Math.abs(diff)} ${answer} `
              //   + `${[results[0][answer], results[1][answer]].join(' → ')}   `
              //   + `${[w1, w2].join(' → ')}`)
              // lines.push(
              //   `${diff < 0 ? '-' : '+'}${Math.abs(diff)} ${answer} `
              //   + `${[results[0][answer], results[1][answer]].join(' → ')}`)
              // lines.push(
              //   `${diff.diff < 0 ? '-' : '+'}${Math.abs(diff.diff)} ${answer} `
              //   + `${[results[0][answer], results[1][answer]].join(' → ')}`)
              // lines.push(
              //   `${diff.diff < 0 ? '-' : '+'}${Math.abs(diff.diff)} ${answer} `
              //   + `${[results[0][answer], results[1][answer]].join(' → ')}   `
              //   + `${[w1, w2].join(' → ')}`)
              const start = []
              let s_i = 0
              for (; ws1[s_i] === ws2[s_i]; s_i++) start.push(ws1[s_i])
              const end = []
              let e_i = 0
              for (; ws1[ws1.length - 1 - e_i] === ws2[ws2.length - 1 - e_i]; e_i++)
                end.push(ws1[ws1.length - 1 - e_i])
              const guesses =
                (s_i ? `${start.join(',')},(` : `(`)
                + `${[ws1.slice(s_i, ws1.length - e_i), ws2.slice(s_i, ws2.length - e_i)]
                  .map(w=>w.join(',')).join(' → ')}`
                + `),${end.reverse().join(',')}`
              if (diff.diff === 0) {
                equals.push(
                  `${answer} `
                  + `${results[0][answer]}   `
                  + guesses
                )
              } else {
                lines.push(
                  `${diff.diff < 0 ? '-' : '+'}${Math.abs(diff.diff)} ${answer} `
                  + `${[results[0][answer], results[1][answer]].join(' → ')}   `
                  + guesses
                  )
              }
            }
            // const same = w1 === w2
            // lines.push(
            //   `${diff < 0 ? '-' : '+'}${Math.abs(diff)} ${answer} `
            //   + `${same
            //     ? results[0][answer] + '    '
            //     : [results[0][answer], results[1][answer]].join(' → ')}   `
            //   + `${same ? w1 : [w1, w2].join(' → ')}`)
          })
          lines.push('\nequal turns:')
          lines.push(...equals)
          lines.push('\nsame guesses:')
          // lines.push(...sames.sort((a, b) => Number(a[6]) - Number(b[6])))
          lines.push(...sames)
          handle._download(lines.join('\n'), names.join(' vs '))
        }
        return true
      }
      return false
    },
    download: () => {
      let txt
      if (output.starter) {
        txt = output.lines.join('\n')
      } else if (tree) {
        txt = compactToLines(treeToCompact(tree)).join('\n')
      }
      handle._download(txt, `wordle-${output.starter.toUpperCase()}`)
      // download.setAttribute('href','data:text/plain;charset=utf-8,'
      //   + encodeURIComponent(JSON.stringify(linesToTree(output.lines), null, 2)))
      // download.setAttribute('href','data:text/plain;charset=utf-8,'
      //   + encodeURIComponent(treeToCompact(tree)))
      // console.log(treeToCompact(tree))
      // console.log(JSON.stringify(linesToTree(output.lines), null, 2))
    },
    _download: (txt: string, filename: string) => {
      if (txt && filename) {
        const download = document.createElement('a')
        download.setAttribute('href',
          'data:text/plain;charset=utf-8,' + encodeURIComponent(txt))
        download.setAttribute('download', filename + '.txt')
        download.style.display = 'none'
        document.body.appendChild(download)
        download.click()
        document.body.removeChild(download)
      }
    },
    explore: (id, name=undefined) => {
      setTreeMeta({ id, name })
      api.get(`/wordle/${id}/tree`)
      .then(({ compact }) => {
        handle.setIsUpload(false)
        setTree(compactToTree(compact))
        setLeaderboard(false)
      })
      .catch(error => setError(error))
    },
  }
  useF(() => {
    if (treeMeta && !leaderboard) handle.explore(treeMeta.id, treeMeta.name)
  })
  useSkip(useF, tree, leaderboard, () => {
    if (!leaderboard && !tree && treeMeta) setTreeMeta(undefined)
  })

  useF(guesses, () => {
    setError(false)
    setProgress(false)
    document.querySelector('.body').scrollTop = 0
    if (tree) {
      if (guesses.length && !guesses[guesses.length - 1].stats) {
        let node = tree
        guesses.map((guess, i) => {
          markStats(guess, node, i)
          console.log(guess.stats)
          node = node[1][guessToBucket(guess)]
        })
        console.log('SET STATS', guesses.map(g => g.stats))
        setGuesses(guesses.slice())
      }
      // let node = tree
      // guesses.map((guess, i) => {
      //   markStats(guess, node, i)
      //   console.log(guess.stats)
      //   node = node[1][guessToBucket(guess)]
      // })
    }
  })
  useI(doExclude, isNYT, versionNYT, day, leaderboard, tree, () => {
    setAnswers(doExclude && !leaderboard && !tree ? day : false, !leaderboard && !tree && isNYT && versionNYT)
    handle.reset(true)
  })
  useI(tree, isHardMode, () => {
    handle.reset(true)
    setStats('')
    setOutput({ starter: '', lines: [] })
    if (tree) handle.stats()
  })
  useI(stats, () => console.debug('STATS', stats))
  useI(isHardMode, () => { memo = {} })
  useI(error, () => {
    setProgress(false)
  })

  usePageSettings({
    checkin: 'wordle',
    expand: false,
    hideLogin: !leaderboard,
    background: '#fff',
  })

  const commonDynamicOptions = tree ? '' : <>
    <p><br/></p>
    <label className='action'>
      <input type='checkbox' checked={isHardMode}
      onChange={e => setHardMode(!isHardMode)}/>
      hard mode
    </label>
    <div className='row gap' style={S(`margin:0`)}>
      <label className='action'>
        <input type='checkbox' checked={doExclude}
        onChange={e => setExclude(e.target.checked)}/>
        exclude past answers (#<input type='number'
        value={day+1}
        min={1}
        max={(wordlesNYTAfterRandomization
          // only up to current day
          ? today + 1
          : DAY_NYT_RANDOM_START)}
        onChange={e => setDay(Number(e.target.value) - 1)} />)
      </label>
      {day !== (wordlesNYTAfterRandomization ? today : DAY_NYT_RANDOM_START) ? <div className='action' style={S(`height:100%`)} onClick={() => setDay(today)}>today</div> : ''}
    </div>
    {/* <label className='action'>
      <input type='checkbox' checked={doExclude}
      onChange={e => setExclude(e.target.checked)}/>
      exclude past answers (#
      <input type='number' value={day+1}
      min={1}
      max={1 + (wordlesNYTAfterRandomization
        // only up to current day
        ? Math.floor(Date.now() - Number(new Date(2021,5,19))) / (24 * 60 * 60 * 1000)
        : DAY_NYT_RANDOM_START)}
      onChange={e => setDay(Number(e.target.value) - 1)} />
      &nbsp;{new Date(2021,5,19 + day,0,0,0,0).toLocaleDateString(undefined, {
        month: 'numeric',
        day: 'numeric',
        year: '2-digit',
      })})
    </label> */}
    {day === DAY_NYT_RANDOM_START && wordlesNYTAfterRandomization !== undefined
    ? <div className='text notice'>{'>'} NYT randomized answers starting Nov 7 '22</div>
    : ''}
    <label className='action'>
      <input type='checkbox' checked={isNYT}
      onChange={e => setNYT(e.target.checked)}/>
      use NYT word list:&nbsp;
      <Select value={versionNYT || 2} options={[2, 1]}
      display={x => ['', 'initial', 'latest'][x]}
      onChange={e => setNYTVersion(e.target.value)} />
    </label>
  </>

  const hint_shown = useR(false)
  useF(leaderboard, () => {
    if (!leaderboard && !hint_shown.current) {
      hint_shown.current = true
      message.trigger({
        text: `enter ${guesses[0].word.toUpperCase()} into Wordle, tap letters to cycle through yellow/green, and hit SHOW NEXT`,
        ms: 10_000,
      })
    }
  })
  if (leaderboard) return <Leaderboard {...{
    outer: handle, tree: isUpload ? tree : false, setTree, linesToTree, error, setError, stats: isUpload ? stats : false, treeToCompact, compactToTree,
  }} />
  return <Style>
    <InfoBody className={advanced ? 'detailed' : ''}>
      {stats ? <>
        <div className='text notice'>
          using {treeMeta?.name ? <i>{treeMeta.name}</i> : stats.starter} tree
          {/* {treeMeta
          ? <>
            <span className='toggle-page forward'>
              &nbsp;&nbsp;<span onClick={() => setLeaderboard(true)}>
                view on leaderboard <span className='arrow'>→</span>
              </span>
            </span>
          </>
          : ''} */}
        </div>
      </> : ''}
      {guesses.length
      ?
      <div style={strToStyle(`
        display: flex;
        // justify-content: space-between;
        // width: ${3.25 * 5}rem;
        margin: 0;
        gap: .25em;
        `)}>
        <div className='action' onClick={handle.undo}>undo last</div>
        {guesses.map(x => x.word).join(',') === (starter || defaultStarter) && guesses.every(x => x.tiles.every(y => y.result === 0))
        ? ''
        : <div className='action' onClick={handle.reset}>reset</div>}
      </div>
      : ''}
      <GuessBoard {...{
        guesses, setGuesses, openLeft, setOpenLeft, handle }} />
      {/* {progress?.guess ? <div id='progress'>{progress.guess} <Loader/></div> : ''} */}
      {/* <div id='progress'><Loader/> progress </div> */}
      <div style={strToStyle(`
        display: flex;
        justify-content: space-between;
        width: ${3.25 * 5}rem;
        margin: 0;
        `)}>
        <div className='action' onClick={handle.guess}>show next</div>
        {/* {guesses.length
          ? <div className='action' onClick={handle.undo}>undo</div>
          : ''} */}
      </div>
      {/* <div className='action' onClick={handle.guess}>
        {progress?.guess ? progress?.guess+' ' : 'next guess'}
        {progress?.guess ? <Loader/> : ''}
      </div> */}
      {tree ? '' : <input className='action' type='text'
      placeholder='manual guess'
      onKeyDown={e => {
        if (e.key === 'Enter' && (e.target as any).value.length >= 5) {
          handle.enter((e.target as any).value.toLowerCase());
          (e.target as any).value = ''
        }
      }} />}
      {error ? <div className='error text'>{error.error ?? error}</div> : ''}
      {error?.includes && error.includes('was Wordle')
      ? <div className='action' onClick={() => {
        const [wordle, day] = error.split(' was Wordle #')
        console.debug(wordle, day)
        setDay(Number(day) - 1)
        setTimeout(() => setExec(() => [handle.search, wordle]), 100) // wait until day has updated
      }}>include {error.split(' ').slice(-1)[0]}—#{day+1}</div>
      : ''}
      <p><br/></p>
      {/* <div className='text'>show solution:</div> */}
      {/* <input className='action' type='text' maxLength={5} placeholder='enter puzzle'
      onKeyDown={e => {
        if (e.key === 'Enter' && (e.target as any).value.length === 5) {
          handle.search((e.target as any).value.toLowerCase());
          (e.target as any).value = ''
        }
      }} /> */}
      <div className='action' onClick={handle.random}>solve random</div>
      {/* <div className='action' onClick={handle.day}>{day === today ? `today's solution (spoiler)` : `puzzle #${day+1}`}</div> */}
      {/* <div className='action' onClick={() => handle.day(today)}>solve today (spoiler)</div>
      {day !== (wordlesNYTAfterRandomization ? today : DAY_NYT_RANDOM_START) ? <div className='action' onClick={() => handle.day(day)}>{`solve #${day+1}`}</div> : ''} */}
      <div className='action' onClick={e => {
        if ((e.target as any).classList.contains('action')) handle.day(day)
      }}>
        {/* <input type='checkbox' checked={doExclude}
        onChange={e => setExclude(e.target.checked)}/> */}
        solve&nbsp;<input type='date'
        value={dateToInputValue(dateShiftDay(WORDLE_START_DATE, day))}
        min={dateToInputValue(WORDLE_START_DATE)}
        max={dateToInputValue(dateShiftDay(WORDLE_START_DATE, today))}
        onChange={e => {
          const new_day = Math.floor(datetime.elapsed(WORDLE_START_DATE, new Date(e.target.value)) / (24 * 60 * 60 * 1000))
          console.debug(e.target.value, new_day, Array.from(allAnswerSet).find(x => answerDays[x] === new_day))
          setDay(new_day)
        }}
        />&nbsp;#<input type='number' value={day+1}
        min={1}
        max={(wordlesNYTAfterRandomization
          // only up to current day
          // ? Math.floor((Date.now() - Number(WORDLE_START_DATE) - 1) / (24 * 60 * 60 * 1000)) + 1
          ? today + 1
          : DAY_NYT_RANDOM_START)}
        onChange={e => setDay(Number(e.target.value) - 1)} />
        &nbsp;{day >= today ? '(spoiler)' : Array.from(allAnswerSet).find(x => answerDays[x] === day)?.toUpperCase()}
      </div>
      {/* <div className='action' onClick={() => handle.day(day)}>
        solve #{day+1} <input type='date' /> {answers.find(x => answerDays[x] === day).toUpperCase()}
      </div> */}
      {/* {day !== (wordlesNYTAfterRandomization ? today : DAY_NYT_RANDOM_START)
      ?
      <div style={strToStyle(`
        display: flex;
        // justify-content: space-between;
        // width: ${3.25 * 5}rem;
        margin: 0;
        `)}>
        <div className='action' onClick={() => handle.day(day)}>{`solve #${day+1} ${answers.find(x => answerDays[x] === day).toUpperCase()}`}</div>
        {day !== (wordlesNYTAfterRandomization ? today : DAY_NYT_RANDOM_START)
        ? <div className='action' onClick={() => handle.day(today)}>{`or today (spoiler)`}</div>
        :''}
      </div>
      : <div className='action' onClick={() => handle.day(today)}>{`today's solution (spoiler)`}</div>} */}
      <input className='action' type='text' maxLength={5} placeholder='enter word to solve'
      onKeyDown={e => {
        if (e.key === 'Enter') {
          handle.search((e.target as any).value.toLowerCase());
          (e.target as any).value = ''
        }
      }} />
      {progress?.search ? <div id='progress'>{progress.search} <Loader/></div> : ''}
      {commonDynamicOptions}
      {!advanced || tree ? '' : <>
        <input className='action' type='text'
        placeholder='set starter word'
        onKeyDown={e => {
          const target = (e.target as any)
          if (e.key === 'Enter' && target.value.length >= 5) {
            // handle.stats((e.target as any).value)
            const newStarter = target.value.toLowerCase()
            if (newStarter.split(',').every(word => allowedSet.has(word))) {
              starter = newStarter
              // document.querySelector('#starter').textContent = starter.toUpperCase()
              target.value = ''
              if (isHardMode) {
                memo = {}
              }
            }
            handle.enter(newStarter, true)
          }
        }} />
      </>}
      {tree ? '' : <p><br/></p>}
      {advanced
      ? <>
        {/* <div>starter: <span id='starter'>{starter.toUpperCase()}</span></div> */}
        {tree ? '' :
        versionNYT
        ? <div className='text stats'>
          <table><tbody>
            <tr><td></td><td>avg</td><td>max</td></tr>
            <tr><td>SALET</td><td>3.423</td><td>6</td></tr>
            <tr><td>REAST</td><td>3.43</td><td>5</td></tr>
          </tbody></table>
        </div>
        : <div className='text stats'>
          <table><tbody>
            <tr><td></td><td>avg</td><td>max</td><td>total</td></tr>
            <tr><td>SALET</td><td>3.423</td><td>6</td><td>7922</td></tr>
            <tr><td>REAST</td><td>3.43</td><td>5</td><td>7939</td></tr>
          </tbody></table>
        </div>}
        {tree ? <><p><br/></p>
        <div className='action' onClick={() => setLeaderboard(true)}>
          {isUpload ? 'submit your results to leaderboard' : 'solver leaderboard'}
        </div>
        <div className='action' onClick={() => { setTree(undefined); setIsUpload(false) }}>
          clear {treeMeta?.name ? <i>{treeMeta?.name}</i> : tree[0].toUpperCase()} tree
        </div>
        </> : ''}
        {tree ? '' : <div className='action' onClick={() => handle.stats()}>
          compute {tree ? 'your' : 'solver'} stats</div>}
        {/* <input className='action' type='text' maxLength={5}
        placeholder='manual starter stats'
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.target as any).value.length === 5) {
            handle.stats((e.target as any).value);
            (e.target as any).value = ''
          }
        }} /> */}
        {stats
        ? <div id='stats' className='text stats'>
          <div>{JSON.stringify(stats, null, 2)}</div>
        </div>
        : ''}
        {(auth.user === 'cyrus' && (tree || output.starter))
        ? <div className='action' onClick={handle.download}>
          download {output.starter.toUpperCase()} results
        </div>
        : ''}
        <p><br/></p>
        {tree ? '' : <div className='action' onClick={() => setLeaderboard(true)}>
          solver leaderboard
        </div>}
        {tree ? '' : <label className='action' id='upload'>
          upload your results
          <input type="file" style={{display: 'none'}} onChange={e => {
            // setProgress({ upload: 'constructing tree' })
            const reader = new FileReader()
            reader.onload = e => {
              try {
                const tree = linesToTree((e.target.result as string).split('\n'))
                setTree(tree)
                setIsUpload(true)
                // setProgress(false)
              } catch (error) {
                setError(error)
              }
            }
            reader.readAsText(e.target.files[0])
          }} />
        </label>}
        {tree || progress?.upload ? '' : <div className='text'>
          to compute stats and inspect in solver{'\n'}
          upload .txt of <a href='https://gist.github.com/cfreshman/cdcdf777450c5b5301e439061d29694c'>guesses</a> for each <a href='https://gist.github.com/cfreshman/a03ef2cba789d8cf00c08f767e0fad7b'>answer</a>:{'\n'}
          <div className='file'>
            salet,brond,aback{'\n'}
            salet,brash,abase{'\n'}
            ...{'\n'}
            salet,corni,zonal{'\n'}
          </div>
          see <a href='https://www.reddit.com/r/wordle/comments/s88iq4/a_wordle_bot_leaderboard/'>post</a> for more context{'\n'}
        </div>}
        {progress?.upload ? <div id='progress'>{progress.upload} <Loader/></div> : ''}
        <p><br/></p>
      </>
      : <>
        <div className='action' onClick={() => setLeaderboard(true)}>
          solver leaderboard
        </div>
        </>}
      {tree ? '' :
      <div className='footer'>
        <span onClick={() => setAdvanced(!advanced)}>
          {advanced ? 'hide ' : ''}advanced
        </span>
        &nbsp;
        {/* <a href={auth.user ? '/chat/#/cyrus' : '/contact'}>contact me</a> */}
        {advanced ? <a href={'/contact'}>contact me</a> : ''}
      </div>}
    </InfoBody>
  </Style>
}


const Style = styled(SettingStyles)`
--info-background: #fff !important;

max-width: 37rem;
min-width: 26rem;
// max-width: 28rem;
white-space: pre-wrap;
.body {
  display: flex; flex-direction: column; gap: 2px;
  .action { margin: 0 !important }
}
.guess {
  display: flex;
  flex-direction: row;

  .word {
    display: flex;
    flex-direction: row;
    border-radius: .2rem;
    margin-right: .25rem;
    &.word-empty {
      background: #eee6;
      .tile { background: none; }
    }
  }

  .tile {
    display: flex; align-items: center; justify-content: center;
    height: 3rem; width: 3rem;
    background: #eee;
    font-size: 1.8rem;
    border-radius: .2rem;
    text-transform: uppercase;
    margin-right: .25rem;
    &:last-child { margin-right: 0; }
    cursor: pointer;
    user-select: none;
    &.tile-1 {
      background: #ffe619;
    }
    &.tile-2 {
      background: #56be56;
    }
  }
  .left {
    font-size: .8rem;
    // opacity: .8;
    margin-left: .5rem;
    white-space: pre;
    position: relative;
    text-shadow: none;
  }

  // position: relative;
  .left-list {
    position: absolute;
    // top: 100%;
    // background: #fffd;
    // background: white;
    min-width: 100%;
    // padding: .2rem .4rem;
    z-index: 1;
    // min-height: fit-content;
    max-height: 26.4rem;
    // height: 26.4rem;
    overflow-y: auto;
    // padding-right: 1rem;
    // pointer-events: none;
    // > * { pointer-events: all; }

    // override Duospace since not actual aligned monospace
    font-family: 'Roboto Mono', monospace;

    background: #fff;
    width: 10em;
    border: 1px solid #000;
    border-radius: .2rem;
    overflow-x: hidden;
    padding-left: .25em;
  }
  .left-toggle {
    text-decoration: underline;
    cursor: pointer;
    user-select: none;
  }

  .left-entry {
    background: white;
    display: flex;
    margin-right: .5rem;
    .results {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      .result {
        display: inline-block;
        width: 0.5rem;
        height: 0.5rem;
        margin: 0.05rem;
        border-radius: 0.1rem;
        color: transparent;
      }
      .result-0 { background: #eee; }
      .result-1 { background: #ffe619; }
      .result-2 { background: #55be56; }
    }
  }
  .groups, .bucket { display: none; }
}

.error {
  color: red;
}
.notice {
  font-size: .8em !important;
}

.stats {
  td { padding: 0 .8rem 0 0; text-align: center; }
}
#progress {
  // opacity: .5;
  opacity: .8;
  display: flex;
  align-items: center;
}

.footer {
  flex-grow: 1;
  display: flex; align-items: flex-end;
  span, a {
    color: black;
    font-size: .8rem;
    // opacity: .5;
    text-decoration: underline;
    cursor: pointer;
    user-select: none;
    text-shadow: none;
  }
}

.detailed {
  .groups, .bucket { display: inline-block; !important }
  // .bucket { opacity: .5 !important; }
}

.toggle-page.forward {
  display: inline-flex;
  align-items: flex-end;
  font-size: .7rem;
  color: #0005;
  justify-content: space-between;
  span, a {
    color: inherit;
    cursor: pointer;
    user-select: none;
    text-shadow: none;
    display: flex;
    align-items: center;
    &:hover {
      text-decoration: none;
    }
  }
  * {
    margin-bottom: 0;
  }
  > span, > a {
    position: relative;
    transition: .1s;
    left: 0;
    &:hover {
      left: .25em;
      padding-right: .25em;
    }
  }
}

.action input {
  height: 100%;
  &[type=number] {
    min-width: 5em;
  }
}
`

export const Loader = () => <LoaderStyle>
  <Comment text={'from https://projects.lukehaas.me/css-loaders'} />
</LoaderStyle>
const LoaderStyle = styled.div`
  display: inline-block;
  border: .2rem solid #0002;
  border-left-color: #000;
  animation: load8 2s infinite linear;
  &, &::after {
    border-radius: 50%;
    // width: 1rem;
    // height: 1rem;
    width: .8rem;
    height: .8rem;
  }

  @keyframes load8 {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
  }
`

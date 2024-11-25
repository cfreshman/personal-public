// define /api & socket routes (separate from index for cleanliness)

import login from './login'
import profile from './profile'
import notify from './notify'
import reset from './reset'
import wordbase from './wordbase'
import graffiti from './graffiti'
import garden from './garden'
import turt from './turt'
import cityhall from './cityhall'
import contact from './contact'
import ly from './ly'
import scores from './scores'
import chat from './chat'
import tally from './tally'
import counter from './counter'
import queue from './queue'
import key from './key'
import wordle from './wordle'
import txt from './txt'
import gitly from './gitly'
import cost from './cost'
import followSync from './follow-sync'
import file from './file'
import requests from './requests'
import integrations from './integrations'
import base from './base'
// import pico_repo from './pico-repo'
import dinder from './dinder'
import _switch from './switch'
import crowdmeal from './crowdmeal'
import otp from './otp'
// import smolify from './smolify'
import audio_form from './audio_form'
import greeter from './greeter'
import capitals from './capitals'
import quadbase from './quadbase'
import multipals from './multipals'
import letterpress from './letterpress'
import fishbowl from './fishbowl'
import donoboard from './donoboard'
import plat from './plat'
import splink from './splink'
import itly from './itly'
import printgames from './printgames'
import hot from './hot'
import collector from './collector'
import rent_splitter from './rent-splitter'
import aob from './aob'
import recurder from './recurder'
import cowork from './cowork'
import image from './image'
import audio from './audio'
import chess from './chess'
import light from './light'
import dating from './dating'
import stream_pledge from './stream-pledge'
import graffiti_2 from './graffiti-2'
import list_picker from './list-picker'
import poll from './poll'
import beam from './beam'
import vibe from './vibe'
import matchbox from './matchbox'
import rephrase from './rephrase'
import tly from './tly'
import companion from './companion'
import overlay from './overlay'
import tennis from './tennis'
import ai from './ai'
import x from './x'

import io_live from '../io/live'
import io_speckle from '../io/speckle'
import io_dnb from '../io/dnb'
import io_wall from '../io/wall'
import io_handheld from '../io/handheld'
import io_chat from './chat/io'
import io_graffiti from './graffiti/io'
import { io as io_cityhall } from './cityhall'

import browserComputeBank from './browser-compute-bank'

export default {
  login,
  '((u)|profile)': profile,
  notify,
  reset,
  '((wordbase)|(wb))': wordbase,
  graffiti,
  garden,
  turt,
  cityhall,
  contact,
  ly,
  scores,
  chat,
  tally,
  '((i)|counter)': counter,
  '((q)|queue)': queue,
  key,
  wordle,
  txt,
  gitly,
  cost,
  'follow-sync': followSync,
  file,
  requests,
  integrations,
  '': base,
  // 'pico-repo': pico_repo,
  dinder,
  switch: _switch,
  crowdmeal,
  browserComputeBank,
  // smolify,
  otp,
  audio_form,
  greeter,
  capitals,
  quadbase,
  multipals,
  letterpress,
  fishbowl,
  donoboard,
  plat,
  splink,
  itly,
  printgames,
  hot,
  collector,
  'rent-splitter': rent_splitter,
  aob,
  recurder,
  image,
  audio,
  chess,
  light,
  dating,
  'stream-pledge': stream_pledge,
  'graffiti-2': graffiti_2,
  'list-picker': list_picker,
  poll,
  beam,
  vibe,
  rephrase,
  tly,
  companion,
  overlay,
  tennis,
  ai,
  x,
}

export const ios = [
  io_live,
  io_speckle,
  io_chat,
  io_graffiti,
  io_dnb,
  io_wall,
  io_handheld,
  io_cityhall,
  browserComputeBank.io,
  fishbowl.io,
  donoboard.io,
  // plat.io,
  rent_splitter.io,
  cowork.io,
  graffiti_2.io,
  matchbox.io,
  companion.io,
]

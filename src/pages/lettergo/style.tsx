import { InfoStyles } from "src/components/Info";
import styled from "styled-components";

// font-size: 2vh;
export const Style = styled(InfoStyles)`&{
  .body {
    display: flex;
    flex-direction: column;
  }

  button.action {
    font-size: 1.5em !important;
  }
  button.action, .button, .label {
    min-width: 1.67em !important;
    display: inline-flex !important;
    align-items: center !important; justify-content: center !important;
    border-radius: .25em !important;
    text-transform: uppercase;
  }

  .player-icon {
    font-size: 1.5em;
    width: 2em;
    aspect-ratio: 1/1;
    display: flex; align-items: center; justify-content: center;
    color: #fff;
    border-radius: 1e6px !important;
    text-transform: uppercase;
    font-family: Duospace, Ubuntu, sans-serif !important;
    font-weight: bold !important;

    &.click {
      cursor: pointer;
    }
  }

  #game-players, #game-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    .action {
      margin: 0 !important;
    }
    position: relative;
  }
  #game-players-vs, #game-controls-word {
    text-transform: uppercase;
    font-size: 1.5em;
  }
  #game-controls-word {
    // position: absolute;
    font-size: 3em;
    // font-family: quicksand, sans-serif;
    &:not(.empty) {
      background: var(--id-color);
    }
    &, > * {
      display: flex; align-items: center; justify-content: center;
      flex-grow: 1;
      flex-shrink: 1;
      max-width: 100%;
      flex-wrap: nowrap;
    }
    > * > * {
      // width: 1em;
      flex-shrink: 1;
      display: flex; flex-direction: row;
      // > * {
      //   flex-grow: 1;
      //   padding-left: .15em !important;
      //   padding-right: .15em !important;
      // }
      min-width: 0;
    }

    & {
      font-size: 2em;
      border: 1px solid transparent;
      height: calc(1.25em + 2px);
    }
    &:not(.empty) {
      flex-grow: 0;
      border: 1px solid var(--id-color-text);
      border-radius: 9em;
      overflow: hidden;
    }
    .game-controls-tile {
      width: 1.25em; height: 1.25em;
      line-height: 1;
      flex-shrink: 1;
      display: inline-flex; align-items: center; justify-content: center;
    }
  }
  #game-players {
    > :not(#game-players-vs) {
      width: 0; flex-grow: 1;
      user-select: none;
    }

    &.game-players-last {
      .lettergo-player-name {
        flex-grow: 0;
        width: unset;
        padding: 0 .25em; 
      }
      #game-players-action {
        font-size: 1.5em;
        position: absolute;
      }
    }
  }

  .menu-section {
    display: flex;
    flex-direction: column;
    gap: .25em;
  }
  .menu-section .menu-section {
    margin-left: .5em;
  }

  .menu-game-item {
    border: 1px solid #000;
    border-radius: .25em;
    padding: .25em;
    width: 100%;
    cursor: pointer;

    // border-radius: 0;
    background: #000;
    color: #fff;
  }

  .stats-color-block, .stats-icon-input {
    display: inline-flex;
    align-items: center; justify-content: center;
    text-align: center;
    font-size: 1.5em !important;
    width: 2em !important;
    aspect-ratio: 1/1;
    color: #fff;
  }
  .stats-color-block {
    cursor: pointer;
  }
  .stats-icon-input {
    font-size: max(16px, 3em) !important;
  }

  #board-container {
    position: relative;
    height: 0;
  }
  #chat-container {
    position: absolute;
    height: 100%;
    width: 100%;
    z-index: 10;

    &.chat-visible-false {
      display: none;
    }

    .messages {
      height: 0;
      flex-grow: 1;
      overflow: auto;
      &::-webkit-scrollbar {
        display: none;
      }
      padding-bottom: 1em;
      > * {
        margin-bottom: .1em;
      }
    }
    .edit-container {
      // margin: 0 !important;
      margin-bottom: .25em !important;
    }
    .chat-input, .chat-send {
      border: .075em solid #000 !important;
    }
    .chat-send {
      background: #000 !important;
      color: #fff !important;

      display: none;
    }

    .capital-word, .lettergo-word {
      font-size: 1.5em;
      background: none;
      color: #000;
      padding: 0.25em;
      border-radius: 0.25em;
      text-transform: uppercase;

      padding: 0;
      border-radius: 0;

      &:is(.capital-skip, .lettergo-skip) {
        color: #0004;
      }
    }
  }

  .body {
    button:last-child {
      margin-bottom: 0 !important;
    }
  }


  #board {
    user-select: none;
    display: flex; align-items: center; justify-content: center;
    flex-wrap: wrap;
    // border: 1px solid #000;
  }
  #board .tile {
    color: var(--id-color);

    display: flex; align-items: center; justify-content: center;

    font-size: .67em;
    text-transform: uppercase;
    // font-family: quicksand, sans-serif;
    font-weight: bold;
    cursor: pointer !important;

    &.selected {
      // visibility: hidden;
      background: #000 !important;
      color: #fff !important;
    }
  }


  #game-controls-word, #board .tile {
    font-family: sf-mono, sans-serif;
    &, * {
      font-weight: bold;
    }
  }
}`
import { InfoStyles } from "src/components/Info";
import styled from "styled-components";

const { devices } = window as any

export const Style = styled(InfoStyles)`&{
  ${devices.is_mobile ? `font-size: 2vh;` : ''}

  .body {
    display: flex;
    flex-direction: column;
  }

  button.action {
    font-size: 1.5em !important;
    min-width: 1.67em;
    display: inline-flex;
    align-items: center; justify-content: center;
  }
  button.action, .button, .label {
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
    z-index: 1;
  }
  #game-players-vs, #game-controls-word {
    text-transform: uppercase;
    font-size: 1.5em;
  }
  #game-controls-word {
    position: absolute;
    font-size: 2em;
    z-index: -1;
  }
  #game-players {
    .quadbase-player-name {
      width: 0;
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
      margin: 0 !important;
    }
    .chat-input, .chat-send {
      border: .075em solid #000 !important;
    }
    .chat-send {
      background: #000 !important;
      color: #fff !important;

      display: none;
    }

    .capital-word, .quadbase-word {
      font-size: 1.5em;
      background: none;
      color: #000;
      padding: 0.25em;
      border-radius: 0.25em;
      text-transform: uppercase;

      padding: 0;
      border-radius: 0;

      &:is(.capital-skip, .quadbase-skip) {
        color: #0004;
      }
    }
  }

  .body {
    button:last-child {
      margin-bottom: 0 !important;
    }
  }
}`
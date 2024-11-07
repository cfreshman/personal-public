import { InfoStyles } from "src/components/Info";
import styled from "styled-components";

export const Style = styled(InfoStyles)`&#light#light#light,&{
// * { font-family: monospace; }

.info .badges > .label, .dropdown .badges > .label {
  backdrop-filter: none;
  background: #0002;
}

overflow-x: hidden;
#light-container > :not(.badges) {
  width: 100%;
}
.light-profile, .light-edit, .light-post {
  border: 1px solid currentcolor;
  padding: .25em;
  width: 100%;

  &:not(.light-light) {
    margin-bottom: 2px;
    box-shadow: 0 2px currentcolor;
  }
  &.light-repost {
    border: none;
    padding: 0;
    margin-bottom: 0;
    box-shadow: none;
    gap: 0;

    .light-repost-header {
      border: 1px solid currentcolor;
      padding: .25em;
      width: 100%;
      border-bottom: 0;
      font-size: .9em;
    }
  }
  &.light-popup {
    border: none;
    margin-bottom: 0;
    box-shadow: none;
  }
}

.light-content {
  font-family: monospace;
  font-size: .9em;
  .link-user {
    font-weight: bold;
    // text-decoration: none;
    &:hover {
      // text-decoration: underline;
    }
  }
}
.light-deepquote {
  border: 1px dashed currentcolor;
  padding: .25em;
  font-style: italic;
  width: 100%;
}
  
.light-edit {
  textarea, input[type=text] {
    // border: none !important;
    border-radius: 0;
    padding: .25em;
    // background: var(--id-color-text-readable) !important;

    background: var(--id-color) !important;
    border: 1px dashed var(--id-color-text) !important;
    /* ANNOYING FIX FOR CSS ISSUE - left border is hidden without this */
    margin-left: .5px;
    width: calc(100% - 1px);

    &, &::placeholder {
      color: var(--id-color-text) !important;
      font-size: max(1em, 16px) !important;
    }
  }
}

.light-post-rich {
  width: 100%;
  position: relative;
  .light-post-rich-title {
    position: absolute;
    bottom: 0; right: 0; margin: 2px; max-width: calc(100% - 4px);
    background: var(--id-color-text);
    color: var(--id-color-text-readable);
    padding: 0;
    word-break: break-word;
    max-height: 50%;
  }
}

.audio_visual {
  background: var(--id-color);
  color: var(--id-color-text);
  border: 1px solid currentColor;
  font-size: 1em;
}

.badges > * {
  &.label {
    background: var(--id-color-label) !important;
    backdrop-filter: none !important;
  }
}
// .badges > * {
//   padding: 0 .5em !important;
//   border-radius: 10em !important;
//   &.label {
//     border: 1px solid transparent !important;
//     background-clip: border-box;
//   }
//   &.button {
//     background: var(--id-color) !important;
//     color: var(--id-color-text) !important;
//     border: 1px solid currentcolor !important;
//   }
// }

}`
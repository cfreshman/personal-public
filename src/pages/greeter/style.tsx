import styled from "styled-components";
import { InfoStyles } from "src/components/Info";

export const Style = styled(InfoStyles)`
.body {
  display: flex;
  flex-direction: column;
}
.section-calendar {
  flex-grow: 1;
}

.card {
  background: #fff !important;
  color: #000 !important;
  border-radius: .25em;
  padding: .25em;
  min-width: 20em;
  white-space: pre-wrap;

  &:has(.card-inner-half) {
    width: 100%;
  }
  
  &.card-disabled {
    opacity: .67;
  }

  // background: #000; color: #fff;
}
.card-inner {
  background: #000 !important;
  color: #fff !important;
  border-radius: .25em;
  padding: .25em;
  min-width: 20em;
  text-decoration: none;

  &.card-inner-half {
    min-width: 0;
    width: 50%;
  }

  // background: #fff; color: #000;
}

.greeter-link {
  background: #fff !important; color: #000 !important;
  padding: 0 .5em;
  border-radius: .75em;
  text-decoration: none;
  // overflow-wrap: anywhere;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  z-index: 1;

  // // background: #388eff !important; color: #fff !important;
  // padding: 0 .5em; line-height: 1.3;
  
  // // background: none !important; color: inherit !important;
  // // padding: 0; text-decoration: underline;

  // background: #dfe8e3 !important; color: #222 !important;
  // border: 0.5px solid #fff;
  // // box-shadow: 0 0 .025em .025em #fff1;
  
  // background: #bcffda !important;
  // // border: 0;

  // background: #7fffb8 !important;
  // background: #c7dad0 !important;

  // background: #eee !important;
  // background: #111 !important; color: #eee !important;
  // border-color: #aaa !important;

  // &:is(.mobile *) {
  //   line-height: 1.5;
  // }
}
.button {
  // background: #dfe8e3 !important; color: #222 !important;
  // background: #eee !important;
}

.calendar-container {
  // border: 0 !important;
  --id-color: #000;
  --id-color-text: #fff;
  --id-color-text-readable: #000;
  background: var(--id-color);
}
.calendar {
  max-width: 20em !important;
  padding-right: calc(100% - 20em) !important;
  padding: 0 calc((100% - 20em) / 2) !important;
  padding-bottom: .5em !important;
  box-sizing: content-box !important;
  // filter: invert(1);
  &, .week {
    gap: 1px !important;
  }
  .date {
    margin: 0 !important;
    min-width: calc((100% - 1px) / 8) !important;
    flex-grow: 0;
  }
  .date:not(.spacer) {
    box-shadow: none !important;
    border-color: var(--id-color-text) !important;
    box-shadow: .25px .25px .5px .5px #0004 !important;
    box-shadow: 0 0 .5px .5px #fff2, .25px .25px .5px .25px #0004 !important;
    
    border: none !important;
    box-shadow: none !important;
    display: flex; align-items: center; justify-content: center;
    border-radius: 0 !important;

    &.date-image {
      // border: none !important;
    }
    &:not(.date-entry) {
      color: var(--id-color-text) !important;
      background: none !important;
      &.invert {
        color: var(--id-color) !important; background: var(--id-color-text) !important;
        color: var(--id-color-text-readable) !important; background: var(--id-color-text) !important;
        color: var(--id-color-text) !important; background: var(--id-color-text-readable) !important;
        border-color: transparent !important;
        // color: #000 !important; background: #fff !important;

        &.date-group {
          color: var(--id-color-text-readable) !important; background: var(--id-color-text) !important;
        }
      }
    }
    font-size: 12px !important;

    .date-date, .month {
      color: inherit !important;
    }
    .month {
      display: flex;
      flex-direction: column;
      justify-content: center;
      height: 100%;
    }
    &.invert .date-date {
      // font-weight: bold !important;
    }

    &.date-image {
      // filter: invert();

      &.date-image-border {
        // border: 1px solid var(--id-color-text) !important;
      }
      &.date-keep-text .date-date {
        background: none !important; color: #000 !important;
      }
      &:not(.date-keep-text) .date-date {
        background: none !important; color: #fff !important;
        mix-blend-mode: difference;
        color: transparent !important;
      }
      .month {
        color: var(--id-color-text) !important;
        // filter: invert();
      }
    }
    &.date-entry:not(.date-image) {
      background: #fff !important; color: #000 !important;
    }

    &:not(.date-entry) {
      &:not(:hover) {
        // opacity: .5;
      }
      // &:hover {
      //   background: var(--id-color-text) !important;
      //   color: var(--id-color-text-readable) !important;
      // }
    }
  }
  
  ::-webkit-scrollbar-track:hover, ::-webkit-scrollbar-track:active {
    background: #ffffff0b;
  }
  ::-webkit-scrollbar-thumb {
      background-color: #fff2;
  }
  ::-webkit-scrollbar-thumb:hover, ::-webkit-scrollbar-thumb:active {
      background-color: #fff5;
  }
}

input, textarea {
  background: var(--id-color-text) !important;
  color: var(--id-color-text-readable) !important;
  border-radius: 0 !important;
  &[type=date] {
    width: fit-content;
  }
  &::placeholder {
    color: var(--id-color) !important;
  }
  &.card-inner.card-inner.card-inner.card-inner.card-inner {
    background: #000 !important;
    color: #fff !important;
    border-radius: .25em !important;
    padding: .25em !important;
    border: 0 !important;
    &::placeholder {
      color: inherit !important;
    }
  }
}

.qr-lib {
  filter: invert();
  background: #fff;
  border: 1em solid #fff;
  cursor: pointer;

  & img {
    height: 100%; width: 100%;
  }
}

@media print
{    
    .no-print {
        display: none !important;
    }
}

.greeter-ai-text {
  background: var(--id-color-text);
  color: var(--id-color);
  padding: .25em;
  border-radius: .25em;
  white-space: pre-wrap;
}
`
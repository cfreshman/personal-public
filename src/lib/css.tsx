export const mixin = {

    get relative() {return`
    position: relative;`},
    get absolute() {return`
    position: absolute;`},

    // get left() {return`
    // text-align: left;`},
    // get right() {return`
    // text-align: right;`},

    get full() {return`
    margin: 0; height: 100%; width: 100%;`},
    get fill() {return`
    ${mixin.full}
    position: absolute; top: 0; left: 0;`},

    get flex() {return`
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;`},
    get row() {return`
    ${mixin.flex}
    flex-direction: row;`},
    get column() {return`
    ${mixin.flex}
    flex-direction: column;`},

    get center() {return`
    ${mixin.flex}
    align-items: center;
    text-align: center;`},
    get center_row() {return`
    ${mixin.row}
    ${mixin.center}`},
    get center_column() {return`
    ${mixin.column}
    ${mixin.center}`},

    get middle() {return`
    ${mixin.center}
    justify-content: center;
    text-align: center;`},
    get middle_row() {return`
    ${mixin.row}
    ${mixin.middle}`},
    get middle_column() {return`
    ${mixin.column}
    ${mixin.middle}`},

    get inline() {return`
    display: inline-flex;`},
    get gap() {return`
    ${mixin.flex}
    gap: .25em;`},
    get wrap() {return`
    ${mixin.flex}
    flex-wrap: wrap;`},
    get start() {return`
    ${mixin.flex}
    justify-content: flex-start;`},
    get end() {return`
    ${mixin.flex}
    justify-content: flex-end`},


    get monospace() {return`
    font-family: 'Duospace', monospace;
    font-family: monospace;`},
    get uppercase() {return`
    text-transform: uppercase;`},
    get lowercase() {return`
    text-transform: lowercase;`},
    get capitalize() {return`
    text-transform: capitalize;`},
}

export const common = {
    get reset() {return`
    * {
        box-sizing: border-box;
    }`},

    get base() {return`
    ${common.reset}
    html, body {
        ${mixin.full}
        ${mixin.center_column}
        ${mixin.monospace}
    }
    ${Object.keys(mixin).map(k => `.${k.replace(/_/g, '-')}{${mixin[k]}}`).join('')}
    .spacer {
        flex-grow: 1;
    }
    .description {
        font-size: .7em;
    }
    `}
}

const css = { mixin, common }
export default css

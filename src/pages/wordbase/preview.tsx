import { Board, Player } from "./board"
import { theme as _theme, themes } from "./common"

export const GamePreview = ({ board, theme=undefined }: { board:Board, theme? }) => {
  if (theme) {
    if (typeof(theme) === 'string') theme = themes[theme]
    if (theme['_']) theme = theme['_']
  } else theme = _theme

  return <div className='game-preview' style={{
    float: 'right',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    }}>
    <div style={{
    border: `.15em solid ${theme.bomb_1}`,
    borderRadius: '.2em',
    width: 'fit-content',
    }}>
    {board.rows((r, r_i) =>
    <div key={r_i} style={{
      display: 'flex',
      height: '.5em'
    }}>{r.map((c, c_i) =>
      <div key={c_i} style={{
        display: 'inline-block',
        height: '.5em', width: '.5em',
        background:
          c.owner === Player.p1 ? theme.blue :
          c.owner === Player.p2 ? theme.orange :
          c.isBomb === 2 ? theme.superbomb :
          c.isBomb ? theme.bomb :
          !c.letter ? theme.bomb_1 : // ignore blanks, preview is messy
          theme.tile
      }}/>)}</div>)}
    </div>
    {/* <div className='description'>(will re-roll)</div> */}
  </div>
}

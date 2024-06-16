import api from "../../lib/api"
import { meta } from "../../lib/meta"
import { compose, pass } from "../../lib/types"
import url from "../../lib/url"
import { theme } from "./common"
import { Info, Save } from "./save"
import html2canvas from 'html2canvas'
import { pick, Q, QQ } from "../../lib/util"


export const drawBoard = (info: Info, save: Save): HTMLCanvasElement => {
    const dim = [save.board.board.length, save.board.board[0].length]
    const scale = 8 * Math.ceil(144 / Math.max(...dim))
    const { tile, blue, orange, bomb, superbomb, tile_2, tile_9, bomb_1 } = theme._theme
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    canvas.height = scale * dim[0]
    canvas.width = scale * dim[1]
  
    const rows = save.board.rows()
    const interior = rows.slice(1, -1)
    const ends = [rows.shift(), rows.pop()]
  
    const drawTile = x => {
        ctx.fillStyle = [tile, blue, orange][x.owner + 1]
        if (x.isBomb) ctx.fillStyle = x.isBomb === 2 ? superbomb : bomb
        if (!x.letter) ctx.fillStyle = bomb_1
        ctx.fillRect(x.col * scale, x.row * scale, scale, scale)
        // if (Tile.has(finalPlay, x)) {
            ctx.fillStyle = x.isBomb ? tile : bomb
            ctx.font = `bold ${Math.ceil(scale * .6)}px Ubuntu`
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(x.letter.toLocaleUpperCase(),
                x.col * scale + scale/2, x.row * scale + scale/2 + 1)
        // }
    }
  
    // draw end tiles first for stripes
    ends.flatMap(pass).map(drawTile)
    ctx.strokeStyle = tile_2
    ctx.lineWidth = scale/6
    ctx.beginPath()
    for (let end = 0; end < 2; end++) {
        const startY = end ? canvas.height : scale
        for (let x = -scale; x < canvas.width; x += scale/2) {
            ctx.moveTo(x - scale, startY + scale)
            ctx.lineTo(x + scale + scale, startY - scale - scale)
        }
    }
    ctx.stroke()
  
    // draw interior tiles
    interior.flatMap(pass).map(drawTile)

    return canvas
}



export const drawReplay = async (info: Info, save: Save) => {
    // construct replay image

    const dim = [save.board.board.length, save.board.board[0].length]
    const scale = 8 * Math.ceil(144 / Math.max(...dim))
    const { tile, blue, orange, bomb, superbomb, tile_2, tile_9, bomb_1 } = theme._theme
    const canvas = drawBoard(info, save)

    // redraw canvas inside 2x1 image for preview
    const canvas2x1 = document.createElement('canvas')
    canvas2x1.height = canvas.height
    canvas2x1.width = 2 * canvas.height
    const left = canvas2x1.width/2 - canvas.width/2
    const right = canvas2x1.width/2 + canvas.width/2
    const side = (canvas2x1.width - canvas.width)/2
    const margin = .67 * scale
    const textSide = side - margin*2
    const ctx2x1 = canvas2x1.getContext('2d')
    ;[
        bomb,
        tile_9,
    ].map(layer => {
        ctx2x1.fillStyle = layer
        ctx2x1.fillRect(0, 0, canvas2x1.width, canvas2x1.height)
    })
    ctx2x1.drawImage(canvas, canvas2x1.width/2 - canvas.width/2, 0)

    const halfHeight = 1.5*scale/2

    ctx2x1.fillStyle = bomb
    ctx2x1.font = `bold ${1.2 * Math.ceil(scale * .7)}px Ubuntu`
    ctx2x1.textBaseline = 'middle'

    ctx2x1.textAlign = 'left'
    ctx2x1.fillText(info.status === 0
        ? info.p1+' wins!'
        : 'vs '+info.p1,
        canvas2x1.width/2 + canvas.width/2 + margin,
        canvas.height - margin - halfHeight/2,
        textSide)

    ctx2x1.textAlign = 'right'
    ctx2x1.fillText(info.status === 1
        ? info.p2+' wins!'
        : 'vs '+info.p2,
        canvas2x1.width/2 - canvas.width/2 - margin,
        margin + halfHeight/2,
        textSide)

    // pre-calculate play
    const play = info.lastWord.toUpperCase()
    if (play[0] !== '.') {
        ctx2x1.font = `bold ${1.5*scale}px Ubuntu`
        const playWidth = Math.min(ctx2x1.measureText(play).width, textSide)
        const cornerRadius = scale * .15
        const halfWidth = playWidth/2 + cornerRadius
        // halfHeight used above
        ctx2x1.textAlign = 'center'
        let x, y
        // y = canvas.height/2
        if (info.status === 0) {
            ctx2x1.fillStyle = blue
            // x = right + side/2
            x = right + margin + halfWidth
            // y = canvas.height - scale*5/2
            y = margin + halfHeight
        } else {
            ctx2x1.fillStyle = orange
            // x = left - side/2
            x = left - margin - halfWidth
            // y = scale*5/2
            y = canvas.height - margin - halfHeight
        }

        const cornerOffX = halfWidth - cornerRadius
        const cornerOffY = halfHeight - cornerRadius
        const corners = [
            [x - cornerOffX, y - cornerOffY],
            [x + cornerOffX, y - cornerOffY],
            [x + cornerOffX, y + cornerOffY],
            [x - cornerOffX, y + cornerOffY],
        ]
        ctx2x1.beginPath()
        corners.map(x => ctx2x1.arc(x[0], x[1], cornerRadius, 0, Math.PI*2))
        ctx2x1.fill()
        ctx2x1.fillRect(
            corners[0][0] - cornerRadius, corners[0][1],
            halfWidth*2, cornerOffY*2)
        ctx2x1.fillRect(
            corners[0][0], corners[0][1] - cornerRadius,
            cornerOffX*2, halfHeight*2)

        ctx2x1.fillStyle = bomb
        ctx2x1.fillText(play, x, y, playWidth)
    }

    const result = new Promise(resolve => {
        const iconImg = document.createElement('img')
        iconImg.onload = () => {
        const imgSize = textSide - scale
        if (info.status === 0) {
            ctx2x1.drawImage(
                iconImg,
                0, 0, iconImg.width, iconImg.height,
                left - margin - imgSize,
                // canvas.height/2 - imgSize/2,
                canvas.height - margin - imgSize,
                imgSize, imgSize)
        } else {
            ctx2x1.drawImage(
                iconImg,
                0, 0, iconImg.width, iconImg.height,
                right + margin,
                // canvas.height/2 - imgSize/2,
                margin,
                imgSize, imgSize)

        }
        const img = canvas2x1.toDataURL()
        console.debug(img)
        // api.post(`/wordbase/games/${info.id}/replay`, { img })
        resolve(img)
        }
        iconImg.src = meta.icon.get() as string
    })
    return await result
}

export const drawProgress = async (info: Info, save: Save, width:number|false=512) => {
    if (theme.css || true) {
        // temporarily hide UI button for screenshot
        const reshowButtons = compose(()=>{}, ...QQ('.control.button').map(x => {
            const save = x.style.visibility
            x.style.visibility = 'hidden'
            return () => x.style.visibility = save
        }))
        return new Promise(resolve => 
            html2canvas(Q('.wordbase-game'))
            .then(canvas => {
                reshowButtons()
                // const gameCanvas = canvas

                // draw game without UI controls
                const game = Q('.wordbase-game').getBoundingClientRect()
                const controls = Q('.control-container').getBoundingClientRect()
                const scale = canvas.width / game.width
                controls.y = (controls.y - 1 - game.y) * scale
                controls.height = (controls.height + 2) * scale
                // ;[game, controls].map(x => Object.keys(x).map(k => x[k] *= scale))
                // controls.y -= game.y
                const gameCanvas = document.createElement('canvas')
                gameCanvas.width = canvas.width
                gameCanvas.height = canvas.height - controls.height
                // console.debug('draw', game.y, controls.y, game.height, canvas.height, game.width, canvas.width, scale)
                const ctx = gameCanvas.getContext('2d')
                ctx.drawImage(canvas, 0, 0)
                ctx.drawImage(
                    canvas,
                    0, controls.y + controls.height, canvas.width, canvas.height,
                    0, controls.y, canvas.width, canvas.height)

                // scale down to width
                let canvasScaled
                if (width) {
                    canvasScaled = document.createElement('canvas')
                    canvasScaled.width = width
                    canvasScaled.height = gameCanvas.height / gameCanvas.width * 512
                    const ctxScaled = canvasScaled.getContext('2d')
                    ctxScaled.drawImage(
                        gameCanvas, 
                        0, 0, gameCanvas.width, gameCanvas.height, 
                        0, 0, canvasScaled.width, canvasScaled.height)
                } else {
                    canvasScaled = gameCanvas
                }

                console.debug(canvasScaled.toDataURL())
                resolve(canvasScaled.toDataURL())
            }))
        // return new Promise(resolve => 
        //     html2canvas(document.querySelector('.wordbase-game'))
        //     .then(canvas => resolve(canvas.toDataURL())))
        return new Promise(resolve => 
            html2canvas(document.body)
            .then(canvas => {
                const scale = canvas.width / document.body.clientWidth

                // draw game without UI controls
                const gameL = Q('.wordbase-game')
                const gameRect = gameL.getBoundingClientRect()
                const controlsL = Q(gameL, '.control-container')
                const controlsRect = controlsL.getBoundingClientRect()
                controlsRect.height *= 1.15
                const gameCanvas = document.createElement('canvas')
                gameCanvas.width = gameRect.width * scale
                gameCanvas.height = (gameRect.height - controlsRect.height) * scale
                console.debug('WORDBASE draw', gameRect, controlsRect, pick(gameCanvas, 'width height'))
                const ctx = gameCanvas.getContext('2d')
                ctx.drawImage(canvas, -gameRect.x * scale, -gameRect.y * scale)
                console.debug(
                    -gameRect.x * scale, -(controlsRect.y + controlsRect.height) * scale, gameRect.width * scale, gameRect.height * scale,
                    0, (controlsRect.y - gameRect.y) * scale, gameRect.width * scale, gameRect.height * scale)
                ctx.drawImage(
                    canvas,
                    gameRect.x * scale, (controlsRect.y + controlsRect.height) * scale, gameRect.width * scale, gameRect.height * scale,
                    0, (controlsRect.y - gameRect.y) * scale, gameRect.width * scale, gameRect.height * scale)

                // scale down to 512 width
                const canvas512 = document.createElement('canvas')
                canvas512.width = 512
                canvas512.height = gameCanvas.height / gameCanvas.width * 512
                const ctx512 = canvas512.getContext('2d')
                ctx512.drawImage(
                    gameCanvas, 
                    0, 0, gameCanvas.width, gameCanvas.height, 
                    0, 0, canvas512.width, canvas512.height)

                console.debug(canvas512.toDataURL())
                resolve(canvas512.toDataURL())
            }))
    }

    // construct progress image
    const board = drawBoard(info, save)
    const play = info.lastWord.toUpperCase()

    let result
    if (play[0] === '.') result = board
    else {
        // draw last play
        const { tile, blue, orange, bomb, feed } = theme._default // theme._theme
        const dim = [save.board.board.length, save.board.board[0].length]
        const scale = 8 * Math.ceil(144 / Math.max(...dim))
        const margin = scale / 10
        const header = margin * 2 + 1.1*scale
        const canvas = document.createElement('canvas')
        canvas.width = board.width
        canvas.height = board.height + header
        const ctx = canvas.getContext('2d')
        ;[
            feed
        ].map(layer => {
            ctx.fillStyle = layer
            ctx.fillRect(0, 0, canvas.width, canvas.height)
        })
        const isOrange = info.turn % 2 === 0
        ctx.drawImage(board, 0, isOrange ? header : 0)

        ctx.font = `bold ${scale}px Ubuntu`
        const halfHeight = 1.1*scale/2
        ctx.textBaseline = 'middle'
        const playWidth = Math.min(ctx.measureText(play).width, canvas.width - margin*2)
        const cornerRadius = scale * .15
        const halfWidth = playWidth/2 + cornerRadius
        ctx.textAlign = 'center'
        let x, y
        if (isOrange) {
            ctx.fillStyle = orange
            x = margin + halfWidth
            y = header/2
        } else {
            ctx.fillStyle = blue
            x = canvas.width - margin - halfWidth
            y = board.height + header/2
        }
        x = canvas.width / 2
        x = margin + halfWidth

        const cornerOffX = halfWidth - cornerRadius
        const cornerOffY = halfHeight - cornerRadius
        const corners = [
            [x - cornerOffX, y - cornerOffY],
            [x + cornerOffX, y - cornerOffY],
            [x + cornerOffX, y + cornerOffY],
            [x - cornerOffX, y + cornerOffY],
        ]
        ctx.beginPath()
        corners.map(x => ctx.arc(x[0], x[1], cornerRadius, 0, Math.PI*2))
        ctx.fill()
        ctx.fillRect(
            corners[0][0] - cornerRadius, corners[0][1],
            halfWidth*2, cornerOffY*2)
        ctx.fillRect(
            corners[0][0], corners[0][1] - cornerRadius,
            cornerOffX*2, halfHeight*2)

        ctx.fillStyle = bomb
        ctx.fillText(play, x, y, playWidth)

        result = canvas
    }
    return await Promise.resolve(result.toDataURL())
}

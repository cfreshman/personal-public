const MAX_INPUT_DIM = 31

var allPos = {};
function getAllPos(size, nums) {
    if (nums.length === 0 || nums[0] === 0)
        return [0];

    let key = [size].concat(nums).join();
    if (allPos[key] !== undefined)
        return allPos[key];

    let [n, endNums] = [nums[0], nums.slice(1)];
    let minEndSize = endNums.reduce((acc, n) => acc+n, 0) + endNums.length;
    let degrees = (size - n) - minEndSize + 1;

    let blockPerms = [];
    let bit_v = ((1 << n) - 1) << (size - n);
    for (let i = 0; i < degrees; i++) {
        if (endNums.length === 0) {
            blockPerms.push(bit_v);
        } else {
            let endSize = size - ((n + 1) + i);
            let ends = getAllPos(endSize, endNums);
            for (let e_i = 0; e_i < ends.length; e_i++)
                blockPerms.push(bit_v | ends[e_i]);
        }

        bit_v >>>= 1;
    }

    allPos[key] = blockPerms;
    return blockPerms;
}

var moves;
function solve(down, across) {
    if (down.length !== across.length)
        console.log(down.length, across.length);

    let rows = [];
    for (let i = 0; i < across.length; i++)
        rows[i] = [0, 0];

    let cols = [];
    for (let i = 0; i < down.length; i++)
        cols[i] = [0, 0];

    let board = {
        down: down,
        across: across,
        rows: rows,
        cols: cols
    };

    constructBoard(board, false);

    moves = [];
    possiblePos = {};

    let downUpdated = updateVectors(false, board);
    let acrossUpdated = updateVectors(true, board);
    while (downUpdated || acrossUpdated) {
        downUpdated = (acrossUpdated) ? updateVectors(false, board) : false;
        acrossUpdated = (downUpdated) ? updateVectors(true, board) : false;
    }

    if (!isSolution(board))
        board = trySolve(board) || board;

    return board;
}

function trySolve(board) {
    console.log();
    console.log("decision point reached");
    logB(board);

    let allPosCopy = JSON.parse(JSON.stringify(allPos));
    let possiblePosCopy = JSON.parse(JSON.stringify(possiblePos))

    let size = board.cols.length;
    for (let r = 0; r < board.rows.length; r++) {
        let row = board.rows[r];
        if ((row[0] ^ row[1]) === ((1 << size)-1))
            continue;

        let unknown_v = ~(row[0] ^ row[1]);
        for (let c = 0; c < board.cols.length; c++) {
            if (unknown_v & 1) {
                let tryBoard = JSON.parse(JSON.stringify(board));

                tryBoard.rows[r][0] |= (1 << c);

                moves.push({
                    guess: true,
                    val: 1,
                    pos: [r, board.cols.length - 1 -c]
                });

                fixVectors(tryBoard.cols, board.rows.length, tryBoard.rows[r], r);

                console.log(r, c);
                console.log(b(tryBoard.rows[r][0], size));

                try {
                    let downUpdated = updateVectors(false, tryBoard);
                    let acrossUpdated = updateVectors(true, tryBoard);
                    if (downUpdated || acrossUpdated) {
                        while (downUpdated || acrossUpdated) {
                            downUpdated = (acrossUpdated) ? updateVectors(false, tryBoard) : false;
                            acrossUpdated = (downUpdated) ? updateVectors(true, tryBoard) : false;
                        }

                        if (!isSolution(tryBoard))
                            tryBoard = trySolve(tryBoard);

                        if (tryBoard)
                            return tryBoard;
                    }
                } catch (e) {}

                allPos = JSON.parse(JSON.stringify(allPosCopy));
                possiblePos = JSON.parse(JSON.stringify(possiblePosCopy));
                moves.push({
                    reset: JSON.parse(JSON.stringify(board))
                })
            }

            unknown_v >>= 1;
        }
    }

    return false;
}

var possiblePos = {};
function updateVectors(isRow, board) {
    let vectors = (isRow) ? board.rows : board.cols;
    let size = (isRow) ? board.cols.length : board.rows.length;

    let isChanged = false;
    for (let i = 0; i < vectors.length; i++) {
        let nums = (isRow) ? board.across[i] : board.down[i];
        let [true_v, false_v] = vectors[i];

        moves.push({
            isRow: isRow,
            i: i
        });

        let key = [isRow, i].join();
        let prev = possiblePos[key] || getAllPos(size, nums);
        let possible = prev.filter(
            v => (v & true_v) === true_v && (v & false_v) === 0
        )
        possiblePos[key] = possible;

        if (possible.length === 0) {
            console.log(isRow, i);
            logB(board);
            throw 'Invalid board';
        }

        true_v |= possible.reduce((acc, v) => acc & v);
        false_v |= possible.reduce((acc, v) => acc | v) ^ ((1 << size) - 1);

        let diff_true = true_v ^ vectors[i][0];
        let diff_false = false_v ^ vectors[i][1];
        let unknown = ~(true_v ^ false_v);

        let toAdd = [];
        for (let j = size-1; j >= 0; j--) {
            if ((diff_true & 1) || (diff_false & 1)) {
                toAdd.push({
                    isRow: isRow,
                    i: i,
                    val: (diff_true & 1) ? 1 : 2,
                    pos: isRow ? [i, j] : [j, i]
                });
            }

            if ((diff_true & 1) || (diff_false & 1) || (unknown & 1)) {
                toAdd.push({
                    isRow: isRow,
                    i: i,
                    val: 0,
                    pos: isRow ? [i, j] : [j, i]
                });
            }

            diff_true >>= 1;
            diff_false >>= 1;
            unknown >>= 1;
        }
        moves.push(...toAdd.reverse());

        if (true_v !== vectors[i][0] || false_v !== vectors[i][1]) {
            isChanged = true;
            vectors[i] = [true_v, false_v];
            fixVectors( (isRow) ? board.cols : board.rows, vectors.length, vectors[i], i);
            moves.push({
                isRow: isRow,
                i: i
            });
        }
    }

    // moves = (getMoveTime() > 0) ? moves : [];
    // console.log(moves);

    return isChanged;
}

function fixVectors(vectors, size, fix, index) {
    let [true_v, false_v] = fix;
    let pos = size - index - 1;
    for (let i = vectors.length-1; i >= 0; i--) {
        vectors[i][0] |= ((true_v & 1) << pos);
        vectors[i][1] |= ((false_v & 1) << pos);
        true_v >>= 1;
        false_v >>= 1;
    }
}

function isSolution(board) {
    return board.rows.every(r => (r[0] ^ r[1]) === ((1 << board.cols.length)-1));
}

function convertBoard(board) {
    let converted = [];
    for (let r = 0; r < board.rows.length; r++) {
        let boxes = [];
        let [true_v, false_v] = board.rows[r];
        for (let c = 0; c < board.cols.length; c++) {
            let val = (true_v & 1) | ((false_v & 1) << 1);
            boxes.unshift(val);
            true_v >>= 1;
            false_v >>= 1;
        }
        converted.push(boxes);
    }
    return converted;
}

function logB(board) {
    let converted = convertBoard(board);
    for (let i = 0; i < converted.length; i++)
        console.log(i.toString().padStart(3) + '| ',
            converted[i].join(' ')
            .split('0').join('?')
            .split('1').join('O')
            .split('2').join(' '));
    if (!isSolution(board))
        console.log('Incomplete');
}

function bl(l, size) {
    return l.map(v => b(v, size));
}

function b(v, size) {
    return ((v >>> 0) & ((1 << size) - 1)).toString(2).padStart(size, '0');
}


function parseNums(line) {
    let groups = line.trim().split(' ').filter(g => g);
    let nums = groups.map(g => g.trim().split(',').map(Number));

    return nums;
}

var valMap = [' ', '', 'X'];
function constructBoard(board, isFinal=true) {
    console.debug(board.down, board.across)
    if (Math.max(board.down.length, board.across.length) > MAX_INPUT_DIM) return

    let boardVals = convertBoard(board);
    let innerHTML = '<table>';

    let borderAcross = `<tr class="border">
        <td class="border horizontal"></td>
        ${(window.chrome || window.parent?.chrome) ? '<td class="numbers end not border horizontal"></td>' : ''}
    </tr>\n`;
    let borderDown = '<td class="border vertical"></td>';

    innerHTML += `<tr class="numbers">`
    // innerHTML += `<td class="numbers down across"><div>${board.rows.length}x${board.cols.length}</div></td>`
    innerHTML += `<td class="not border vertical">
        <div class="numbers down across"><div>${board.rows.length}x${board.cols.length}</div></div>
    </td>`;
    for (let c = 0; c < board.cols.length; c++) {
        innerHTML += `<td class="numbers down"><div>${board.down[c].join('</div><div>')}</div></td>`;
    }
    innerHTML += '<td class="not border vertical"></td></tr>\n';

    innerHTML += borderAcross;

    for (let r = 0; r < board.rows.length; r++) {
        innerHTML += '<tr>'
        // innerHTML += `<td class="numbers across"><div>${board.across[r].join('</div><div>')}</div></td>`
        innerHTML += `<td class="border vertical r${r}">
            <div class="numbers across"><div>${board.across[r].join('</div><div>')}</div></div>
        </td>`;
        for (let c = 0; c < board.cols.length; c++) {
            innerHTML += `<td class="r${r} c${c} v${boardVals[r][c]}">${valMap[boardVals[r][c]]}</td>`;
        }
        // innerHTML += `<td class="border vertical r${r}"></td>` + '</tr>';
        innerHTML += '</tr>'
    }

    innerHTML += borderAcross;

    innerHTML += '</table>';

    $('#board').html(innerHTML);

    $('.r0').addClass('border-top');
    $('.c0').addClass('border-left');
    $(`.r${board.rows.length - 1}`).addClass('border-bottom');
    $(`.c${board.cols.length - 1}`).addClass('border-right');

    if (isFinal) {
        $('.highlight').removeClass('highlight down across');
        if (getMoveTime() > 0) {
            setTimeout(() => $('.v2').addClass('slow done'))
        } else {
            $('.v2').addClass('done')
        }
    } else {
        $('.v2').show();
    }

    if (board.cols.length === 1) {
        $('tr.border').css('width', '1.9rem');
    } else {
        $('tr.border').css('width', 'auto');
    }

    $('#board table').css('visibility', 'hidden');
    setTimeout(() => resizeBoard(), 0);
}

function updateBoard(move) {
    let timeScale = 1;
    $('.selected').removeClass('selected');
    if (move.reset) {
        let boardVals = convertBoard(move.reset);
        for (let r = 0; r < move.reset.rows.length; r++) {
            for (let c = 0; c < move.reset.cols.length; c++) {
                $(`.r${r}.c${c}`).removeClass('v0 v1 v2').addClass(`v${boardVals[r][c]}`);
                $(`.r${r}.c${c}.v0`).removeClass('guess');
                $(`.r${r}.c${c}:not(.guess)`).text(valMap[boardVals[r][c]]);
            }
        }
        timeScale = 2;
    } else {
        $('.highlight').removeClass('highlight down across');
        if (move.isRow) {
            $(`.r${move.i}`).addClass('highlight across');
        } else {
            $(`.c${move.i}`).addClass('highlight down');
        }

        if (move.pos) {
            let [r, c] = move.pos;
            if (move.val === 0) {
                $(`.r${r}.c${c}`).addClass(`selected`).text(valMap[move.val]);
            } else {
                $(`.r${r}.c${c}:not(.guess)`).removeClass('v0').addClass(`v${move.val}`).text(valMap[move.val]);
            }

            if (move.guess) {
                $(`.r${r}.c${c}`).addClass(`guess`).text('?');
            }
            timeScale = 0;
        }
        // $(`.r${r}.c${c}`).removeClass('v0').addClass(`v${move.val} selected`).text(valMap[move.val]);
    }
    return timeScale;
}

const errorElement = (l) => {
    const _t = l.style.cssText
    l.style.cssText += `
    background: #f00d;
    `
    setTimeout(() => l.style.cssText = _t, 1_000)
}
function showSolve(down, across) {
    try {
        if (timeoutId)
            clearTimeout(timeoutId);

        let board = solve(down, across);
        timeoutId = true;
        if (getMoveTime() > 0) {
            moves.push(board);
            timeoutId = setTimeout(showNextMove, 0);
        } else {
            constructBoard(board);
            timeoutId = false;
        }

        $('html, body').animate({
            scrollTop: $("#board").offset().top
        }, 1);
    } catch (e) {
        // $('#inputs').effect('shake');
        errorElement(document.querySelector('#inputs button'))
    }
}

var timeoutId;
function showNextMove(moveTime) {
    moveTime = moveTime ?? getMoveTime();
    if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = undefined
    }

    let timeScale;
    while (!timeScale) {
        if (moveTime === 0) {
            constructBoard(moves.pop());
            return;
        } else if (moves.length === 1) {
            updateBoard(moves.shift());
            $('.highlight').removeClass('highlight down across');
            setTimeout(() => $('.v2').addClass('slow done'))
            return;
        } else {
            timeScale = updateBoard(moves.shift());
        }
    }

    timeoutId = setTimeout(showNextMove, moveTime * timeScale);
}

function getMoveTime(sliderVal) {
    sliderVal = sliderVal || (timeoutId ? document.querySelector('#slider input').value : 0);

    sliderVal = Math.max(0, Math.min(sliderVal, 100))

    return Math.ceil(
        Math.pow(sliderVal, 3) / 500
    );
}

/*

Main Script

*/
let sliderText = document.querySelector('#slider label')
let slider = document.querySelector('#slider input')
slider.addEventListener('input', e => {
    let ms = getMoveTime(e.target.value);
    console.log(e.target.value, ms)
    sliderText.textContent = ms ? `${ms}ms/action` : 'instant'
})

let hello = {
    title: 'Hello',
    down: '3 9 11 4,2 2 1 6 3,2 2 6 6 2,3 4,2 2 3,2 10 2,5 2,6,2 4,2 3,2 10 2,5 2,6,2 4,2 2 2 4 6 1,2 2,2 5',
    across: '2,2,2 2,4,4 2,1,1,1,1 2,1,2,1,2 2,1,2,1,2 2,2,2,1,2,1 2,3,4,2,1,2,1,3 4,2,2,1,4,4,2,2 3,2,2,1,3,3,2,1 2,2,4,2,2,3,1 3,1,3,3,3,4,1 2,4,4,4,4,4 2,2,2,2,2,2'
}

let board = solve(parseNums(hello.down), parseNums(hello.across));
constructBoard(board);
// timeoutId = false;

var down, across;
$('#inputs input').on('input', function() {
    timeoutId && showNextMove(0)

    let formData = new FormData(document.querySelector('form'));

    let downInput = formData.get('down');
    let acrossInput = formData.get('across');

    let re = /^ *\d{1,2}(,\d{1,2})*( (\d{1,2}(,\d{1,2})*)?)*$/

    down = (downInput.match(re)) ? parseNums(downInput) : down;
    across = (acrossInput.match(re)) ? parseNums(acrossInput) : across;

    // if (!(down.length > 1 && across.length > 0))
    if (!down || !across) {
        return;
    }

    let rows = [];
    for (let i = 0; i < across.length; i++) rows[i] = [0, 0];

    let cols = [];
    for (let i = 0; i < down.length; i++) cols[i] = [0, 0];

    let board = {
        down: down,
        across: across,
        rows: rows,
        cols: cols
    };

    constructBoard(board, false);
});

$('#submit-button').on('click', function() {
    let formData = new FormData(document.querySelector('form'));

    let downInput = formData.get('down');
    let acrossInput = formData.get('across');

    let re = /^ *\d{1,2}(,\d{1,2})*( (\d{1,2}(,\d{1,2})*)?)*$/
    if (!downInput.match(re) || !acrossInput.match(re)) {
        // $('#inputs').effect('shake')
        errorElement(document.querySelector('#inputs button'))
        return;
    }

    let down = parseNums(downInput);
    let across = parseNums(acrossInput);

    const showInputError = (i, message) => {
        const input = document.querySelectorAll('input')[i]
        const value = input.value
        input.value = message
        const _clearInputError = () => {
            input.value = value
            clearTimeout(timeoutHandle)
            input.removeEventListener(listenerHandle)
        }
        const timeoutHandle = setTimeout(_clearInputError, 3000)
        const listenerHandle = input.addEventListener('click', _clearInputError)
    }
    if (down.length > MAX_INPUT_DIM) showInputError(0, 'Too many columns');
    if (across.length > MAX_INPUT_DIM) showInputError(1, 'Too many rows');

    if (down.length <= MAX_INPUT_DIM && across.length <= MAX_INPUT_DIM) {
        showSolve(down, across);
    } else {
        $('#inputs').effect('shake');
    }
});

let examples = [
    /*{
        down: '1 1',
        across: '1 1'
    },*/
    {
        down: '1,1 2,1 1 2',
        across: '2 1 1,2 1,1'
    },
    {
        title: 'Pine Cone',
        down: '2 5 2,3 1,2,1 6 3,1 5 2',
        across: '2 5 1,3 6 1,2,1 3,2 5 2'
    },
    /*{
        title: 'Invader',
        down: '3 2 1,5 2,2,1 4,1 4 4,1 2,2,1 1,5 2 3',
        across: '1,1 1,1 7 2,3,2 11 1,7,1 1,1,1,1 2,2'
    },
    {
        title: 'Chameleon',
        down: '1,2 1,4 2,1,1,2 3,1,2 1,5,3 11 4,4 9 8 6 5 3',
        across: '2 1,4 8 9 1,7 5,4 8 2,7 2,4,1 2,4 5 3'
    },*/
    {
        title: 'Kitty',
        down: '1,2 4,1,1 3,6 7 3,6 4,4 1,3 2 3,1 2,3',
        across: '1,1 2,2 5 2,1,2,1 5,2 3,1 6,2 1,5,1 8 2,4'
    },
    {
        title: 'Skull',
        down: '7 2,2,3 2,2,1 1,2 1,1,1 1,2 1,2,1 1,2,3 2,3 2,3 7',
        across: '7 2,2 2,2 1,1 1,1 3,2,1 3,1,2,1 1,2 2,4 1,1,1,3 8'
    },
    {
        title: 'Panda',
        down: '2,7 6,5 3,2 4,3,2 3,5,1 2,1,3,1,2 2,4,2,2 1,2,4 2,4,2,2 2,1,3,1,2 3,5,1 4,3,2 3,2 6,5 2,7',
        across: '2,2 13 7,7 4,4 1,3,3,1 2,2,1,1,2,2 2,4,4,2 1,4,4,1 2,2,1,2,2 2,1,2 2,2,2,2 2,3,2 3,1,3 11 5'
    },
    {
        title: 'Scorpion',
        down: '5 2,1 2,4 1,1,1 2,2 5 6,2 3,2,2,1 1,3,1,1,1 1,1,2,2,1 2,1,1,1,1,1 1,1,1,1,1,2 3,2,1,1,2,1,2 5,1,5,2 2,1,1,9 3,2,6,1 2,2,2,3,4 1,2,4,1,1 6,4 1',
        across: '6 1,6 1,2,1,1 1,1,3 2,3 1,1,1 4,5 2,3,2,3 2,3,3,2,1 1,1,4,2,3 1,1,4,4 1,1,1,1,2,7 1,2,3,6,1 2,3,4,1 3,1,1,2 1,1,1,1 1,2,2,2 4,3 1,2,2 5'
    },
    {
        title: 'Man with Pipe',
        down: '2,2,1 1,6,4,4 3,3,1,1,4 2,2 1,3,3,3 1,1,1,2,1,2 2,1,1,1,1 2,4,3,3 3,1,2,3,1 1,4,2,1 3,1,2 2,1,1 3,3 7,4 5,4 3,2,1,3 3,4,1 9,2 8,3 1,8,2',
        across: '1,3,2,1 1,2,2 3,4 2,3,2 2,1,6 2,13,1 1,1,8 2,1,1,7 1,2,2,2,3 3,1,1,1,3 1,2,1,1,3 2,1,1,3 1,5,5 1,1,3 4,2 2,2,1,2,1 2,1,2,3,2 4,1,6,1 3,4,3,2 4,2'
    },
    {
        title: 'Bird',
        down: '0 1 1 4 2,3 7 9,1 6,3,2 4,2,2 3,2,1,3 6,2,5 7,1,2,3 7,3,3 7,2,3 7,1,3 6,1,4 8,5 6,3,3 7,3 3,3,4 3,3,3 3,2,3 4,1,3 3,1,4 2,3 1,3',
        across: '0 4 6,2 1,5,6 14,7 20 4,10 2,10 1,12 2,14 1,11 2,1 3,5 4,1 1,2,3 2,1,7 2,11 1,11 11 9 7'
    },
    /*{
        title: 'Pterodactyl',
        down: '1 2 3,1 3,2 5,2,1 6,3,2 14 12 11 5 1,6 2,8 4,4 1,2,5 4,6 1,1,7 1,1,6 1,1,5 1,1,4 1,1,3',
        across: '3 4 5 6,2 5,4 5,1,6 4,4 4,10 6 6,2 11 13 14 2,3,7 2,5 2,4 2,3 3 2 1'
    },*/
    hello
];

let exampleButtons = examples.map(
    (ex, i) => $('<button class="sm"></button>').text(i+1).on('click', function() {
        $('input[name="down"]').val(ex.down);
        $('input[name="across"]').val(ex.across);
        showSolve(parseNums(ex.down), parseNums(ex.across));
    }).prop('title', ex.title)
);

$('#examples').append(exampleButtons);

// new board resizing code
let boardEl = document.querySelector('#board')
let bodyEl = document.querySelector('body')
let rI
function resizeBoard() {
    let tableEl = document.querySelector('#board table')
    if (tableEl) {
        let boardRect = boardEl.getBoundingClientRect()
        let bodyRect = bodyEl.getBoundingClientRect()
        let tableRect = tableEl.getBoundingClientRect()
        // console.log(boardRect, tableRect)
        let scale = Math.round(Math.min(
            bodyRect.width / (tableRect.width + 120),
            boardRect.height / tableRect.height) * 100)/100;
        scale = Math.min(scale, bodyRect.width / (boardRect.width * 1.35))
        // scale = (scale - 1) * .9 + 1;
        // console.log(`scale(${scale});`)
        // rI && clearInterval(rI)
        // rI = setInterval(() => $('#board table').css('transform', `scale(${scale})`), 100)
        setTimeout(() => {
            $('#board table').css('transform', `scale(${scale})`)
            $('#board table').css('visibility', 'visible');
        }, 50)
        // $('#board table').css('transform', `scale(${scale})`)
        // tableEl.style.transform = `scale(${scale});`
    }
}
window.addEventListener('resize deviceorientation', resizeBoard)
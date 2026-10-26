
let popup = document.getElementById("popup");

function test() {
    console.log("test");
}

function openPopup(panel) {
    document.querySelectorAll("#popup .panel").forEach(p => p.style.display = "none");
    const targetPanel = document.getElementById("panel-" + panel);
    if (targetPanel) targetPanel.style.display = "flex";
    document.getElementById("popup").classList.add("open");
}

function closePopup(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById("popup").classList.remove("open");
}

document.addEventListener("keydown", e => {
    if (e.key === "Escape") closePopup();
});

//GAME LOGIC

// Estado do Jogo: 5x5
// 0 = Vazio, 1 = Player 1 (ex: #2c3e50), 2 = Player 2 (ex: #e74c3c)
let initialState = [
    [0, 2, 0, 0, 0],
    [0, 2, 0, 0, 0],
    [0, 2, 0, 1, 0], 
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0]
];

let boardState = [
    [0, 2, 0, 0, 0],
    [0, 2, 0, 0, 0],
    [0, 2, 0, 1, 0], 
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0]
];

let currentPlayer = 1;
let selectedPiece = null; // guarda {row, col} da peça selecionada
let chainPiece = null;
let gameStarted = false;

//timer variables
let timerInterval = null;
let timeLeft1 = 600; //10min
let timeLeft2 = 600;

//adiciona um listnener pra cada peça do tabuleiro
document.addEventListener("DOMContentLoaded", () => {
    const circles = document.querySelectorAll(".pieces circle");
    circles.forEach(circle => {
        console.log(`circle name; ${circle}`); 
        circle.addEventListener("click", (e) => {
            const row = parseInt(circle.getAttribute("data-row"));
            const col = parseInt(circle.getAttribute("data-col"));
            console.log(`Clicado na posição: (${row}, ${col})`); // Para testares se já funciona!
            handleCellClick(row, col);
        });
    });

    updateBoardUI(); //atualiza visual
});

function handleCellClick(row, col) {
    if (!gameStarted) {
        return;
    }

    const clickedPieceOwner = boardState[row][col];

    // Nenhuma peça selecionada: seleciona se for tua
    if (!selectedPiece) {
        if (clickedPieceOwner === currentPlayer) {
            selectedPiece = { row, col };
            updateBoardUI();
        }
        return;
    }

    // Já existe peça selecionada
    if (clickedPieceOwner === currentPlayer) {
        if (chainPiece) {
            // a meio de uma captura múltipla: clicar na própria peça termina a jogada
            if (chainPiece.row === row && chainPiece.col === col) {
                logMoveText(`Jogador ${currentPlayer} terminou a captura.`);
                endTurn();
            }
            return; // não pode trocar para outra peça
        }

        if (selectedPiece.row !== row || selectedPiece.col !== col) {
            selectedPiece = { row, col };
        } else {
            selectedPiece = null;
        }
        updateBoardUI();
        return;
    }

    // Clicou numa peça adversária
    if (clickedPieceOwner !== 0) {
        if (!chainPiece) {
            selectedPiece = null;
            updateBoardUI();
        }
        return;
    }

    // Clicou num espaço vazio: tenta mover
    const canStep = !chainPiece && isvalidMove(selectedPiece.row, selectedPiece.col, row, col);
    const canEat = isvalidEat(selectedPiece.row, selectedPiece.col, row, col);

    if (!canStep && !canEat) {
        console.log("Movimento inválido!");
        return;
    }

    const rowDiff = row - selectedPiece.row;
    const colDiff = col - selectedPiece.col;
    const isCapture = canEat; // só é captura se foi validado como salto

    if (isCapture) {
        boardState[selectedPiece.row + rowDiff / 2][selectedPiece.col + colDiff / 2] = 0;
    }

    boardState[row][col] = currentPlayer;
    boardState[selectedPiece.row][selectedPiece.col] = 0;
    const oldRow = selectedPiece.row;
    const oldCol = selectedPiece.col;

    // Log ANTES de trocar o jogador
    logMove(oldRow, oldCol, row, col, isCapture);

    const { p1Count, p2Count } = updatePieceCounts();
    if (p1Count === 0 || p2Count === 0) {
        selectedPiece = null;
        chainPiece = null;
        updateBoardUI();
        endGame();
        return;
    }

    // Captura múltipla: mantém a vez e bloqueia na peça que acabou de saltar
    if (isCapture && canCaptureFrom(row, col)) {
        chainPiece = { row, col };
        selectedPiece = { row, col };
        updateBoardUI();
        return;
    }

    // Fim da jogada
    endTurn();
}

function updatePieceCounts() {
    let p1Count = 0;
    let p2Count = 0;
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            if (boardState[r][c] === 1) p1Count++;
            if (boardState[r][c] === 2) p2Count++;
        }
    }
    document.getElementById("p1-count").textContent = p1Count;
    document.getElementById("p2-count").textContent = p2Count;
    return { p1Count, p2Count };
}



function updateBoardUI() {
    const circles = document.querySelectorAll(".pieces circle");

    circles.forEach(circle => {
        const row = parseInt(circle.getAttribute("data-row"));
        const col = parseInt(circle.getAttribute("data-col"));
        const owner = boardState[row][col];
        
        //verifica se esta é a peça selecionada
        const isSelected = selectedPiece && selectedPiece.row === row && selectedPiece.col === col;

        //Vê se casa vazia é um movimento válido para a peça selecionada
        let isValidDestination = false;
        if (selectedPiece && owner === 0) { 
            isValidDestination = (!chainPiece && isvalidMove(selectedPiece.row, selectedPiece.col, row, col)) || isvalidEat(selectedPiece.row, selectedPiece.col, row, col);
        }

        //definir cor consoante o dono
        if (owner === 1) {
            circle.setAttribute("fill", "#2c3e50"); // Player 1 color
            circle.setAttribute("stroke", "#241403"); 
            circle.setAttribute("r", "20");
        } else if (owner === 2) {
            circle.setAttribute("fill", "#e74c3c"); // Player 2 color
            circle.setAttribute("stroke", "#241403"); 
            circle.setAttribute("r", "20");
        } else if (isValidDestination) {
            circle.setAttribute("fill", "#b6b6b6"); // Círculo amarelo/dourado para dica de movimento!
            circle.setAttribute("stroke", "#241403"); 
            circle.setAttribute("r", "10");
        }else {
            circle.setAttribute("fill", "transparent"); // Empty space
            circle.setAttribute("stroke", "transparent"); 
        }

        //efeito 3D na peça selecionada
        if (isSelected) {
            circle.style.transform = "translateY(-6px)";
            circle.style.filter = "drop-shadow(0px 8px 4px rgba(0, 0, 0, 0.4))";
        } else {
            circle.style.transform = "none";
            circle.style.filter = "none";
        }
    });
}

//dá log do movimento no painel de texto
function logMove(fromR, fromC, toR, toC, isCapture) {
    const gameText = document.getElementById("gameText");
    if (gameText && fromR !== undefined) {
        const colsName = ['a', 'b', 'c', 'd', 'e'];
        const fromStr = `${colsName[fromC]}${fromR + 1}`;
        const toStr = `${colsName[toC]}${toR + 1}`;
        
        if (isCapture) {
            gameText.innerHTML += `<br>> ⚔️ Jogador ${currentPlayer} capturou saltando de ${fromStr} para ${toStr}`;
        } else {
            gameText.innerHTML += `<br>> Jogador ${currentPlayer} moveu de ${fromStr} para ${toStr}`;
        }
        gameText.scrollTop = gameText.scrollHeight;
    }
}


//muda o UI do turno de cada player
function updateTurnIndicator() {
    const turnIndicator = document.getElementById("turn-indicator");
    const p1Card = document.getElementById("player1-card");
    const p2Card = document.getElementById("player2-card");

    if (turnIndicator) {
        turnIndicator.textContent = `Turn: Player ${currentPlayer}`;
    }

    if (p1Card && p2Card) { //atualiza o card do active player
        if (currentPlayer === 1) {
            p1Card.classList.add("active");
            p2Card.classList.remove("active");
        } else {
            p2Card.classList.add("active");
            p1Card.classList.remove("active");
        }
    }
}

function isvalidMove(fromRow, fromCol, toRow, toCol) {
    const rowDiff = toRow - fromRow;          // Positivo = desce, Negativo = sobe
    const colDiff = toCol - fromCol;
    const absRowDiff = Math.abs(rowDiff);
    const absColDiff = Math.abs(colDiff);
 
    //MOVIMENTO NORMAL DE 1 PASSO
    if (absRowDiff <= 1 && absColDiff <= 1 && !(absRowDiff === 0 && absColDiff === 0)) {
        //a peça n pode voltar pra tras
        if (currentPlayer === 1 && rowDiff > 0) return false;
        if (currentPlayer === 2 && rowDiff < 0) return false;
 
        //peças que NAO podem andar na diagonal
        if ((fromRow % 2 === 0) && (fromCol === 1 || fromCol === 3)) {
            if (colDiff === rowDiff || colDiff + rowDiff === 0) {
                return false; // Movimento diagonal proibido nesta posição
            }
        } 
        else if ((fromRow % 2 === 1) && (fromCol === 0 || fromCol === 2 || fromCol === 4)) {
            if (colDiff === rowDiff || colDiff + rowDiff === 0) {
                return false; // Movimento diagonal proibido nesta posição
            }
        }
        return true;
    }
 
    return false;
}

function isvalidEat(fromRow, fromCol, toRow, toCol) {
    // destino tem de estar dentro do tabuleiro e vazio
    if (!insideBoard(toRow, toCol)) return false;
    if (boardState[toRow][toCol] !== 0) return false;

    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;
    const absRowDiff = Math.abs(rowDiff);
    const absColDiff = Math.abs(colDiff);

    const isNormalJump = (absRowDiff === 2 && absColDiff === 0) ||
                             (absRowDiff === 0 && absColDiff === 2);
    const isDiagonalJump = absRowDiff === 2 && absColDiff === 2;

    if (!isNormalJump && !isDiagonalJump) return false;

    // salto diagonal só é permitido a partir de casas com diagonais
    if (isDiagonalJump && !hasDiagonals(fromRow, fromCol)) return false;

    // a peça do meio tem de ser do adversário
    const middlePiece = boardState[fromRow + rowDiff / 2][fromCol + colDiff / 2];
    return middlePiece === opponentOf(currentPlayer);
}




function updateTimerUI() {
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const timerP1 = document.getElementById("timer-p1");
    const timerP2 = document.getElementById("timer-p2");

    if (timerP1) timerP1.textContent = formatTime(timeLeft1);
    if (timerP2) timerP2.textContent = formatTime(timeLeft2);
}

function handleTimeOut(player) {
    clearInterval(timerInterval);
    gameStarted = false;
    logMoveText(`Tempo esgotado para o Jogador ${player}! Fim do jogo.`);
}

function logMoveText(message) {
    const gameText = document.getElementById("gameText");
    if (gameText) {
        if (gameText.innerHTML.trim() === "") {
            gameText.innerHTML = `${message}`;
        } else {
            gameText.innerHTML += `<br>> ${message}`;
        }
        gameText.scrollTop = gameText.scrollHeight;
    }
}

function startGame() {
    console.log("Jogo iniciado!");
    document.getElementById("start-btn").classList.add("hidden");
    document.getElementById("draw-btn").classList.remove("hidden");
    document.getElementById("resign-btn").classList.remove("hidden");
    boardState = JSON.parse(JSON.stringify(initialState)); // Reset board state
    selectedPiece = null;
    chainPiece = null;
    updateBoardUI(); //atualiza visual tabuleiro
    currentPlayer = 1; // Reset current player
    updateTurnIndicator(); //atualiza visual do jogador atual

    //msg de inicio do jogo
    const gameText = document.getElementById("gameText");
    gameText.innerHTML = ""; // Limpa o log do jogo
    logMoveText("Jogo iniciado! Jogador 1 começa.");

    gameStarted = true;
    timeLeft1 = 600;
    timeLeft2 = 600;
    updateTimerUI();

    // Se já houver um timer a correr, limpa-o antes de iniciar outro
    if (timerInterval) clearInterval(timerInterval);

    // Inicia o intervalo de 1 em 1 segundo
    timerInterval = setInterval(() => {
        if (!gameStarted) return;

        if (currentPlayer === 1) {
            if (timeLeft1 > 0) {
                timeLeft1--;
            } else {
                handleTimeOut(1);
            }
        } else {
            if (timeLeft2 > 0) {
                timeLeft2--;
            } else {
                handleTimeOut(2);
            }
        }
        updateTimerUI();
    }, 1000);
}

function endGame() {
    gameStarted = false;
    clearInterval(timerInterval);
    logMoveText(`Jogo terminado! Jogador ${currentPlayer} venceu!`);
    openPopup("endGame");
}


function canCaptureFrom(row, col) {
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            if (boardState[r][c] === 0 && isvalidEat(row, col, r, c)) {
                return true;
            }
        }
    }
    return false;
}


function opponentOf(player) {
    if (player === 1) {
        return 2;
    } else {
        return 1;
    }
}

function insideBoard(r, c) {
    return r >= 0 && r < 5 && c >= 0 && c < 5;
}

function hasDiagonals(r, c) {
    return (r + c) % 2 === 0;
}

function cloneBoard(board) {
    return board.map(row => row.slice());
}

function endTurn() {
    chainPiece = null;
    selectedPiece = null;
    updateBoardUI();
    currentPlayer = opponentOf(currentPlayer);
    updateTurnIndicator();
}
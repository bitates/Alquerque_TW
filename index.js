
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
    [2, 2, 2, 2, 2],
    [2, 2, 2, 2, 2],
    [2, 2, 0, 1, 1], // Nota: no teu SVG o centro tem um espaço vazio e posições intermédias
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1]
];

let boardState = [
    [2, 2, 2, 2, 2],
    [2, 2, 2, 2, 2],
    [2, 2, 0, 1, 1], // Nota: no teu SVG o centro tem um espaço vazio e posições intermédias
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1]
];

let currentPlayer = 1;
let selectedPiece = null; // guarda {row, col} da peça selecionada
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
    if (!selectedPiece) {
        if (clickedPieceOwner === currentPlayer) {
            selectedPiece = { row, col };
            console.log(`Selected piece at (${row}, ${col})`);
            updateBoardUI(); //atualiza visual pra mostrar circulos amarelos
        }
    //ja existe peça selecionada, o jogador clica no destino(ou noutra oeça tua)
    } else {
        // Se clicar numa peca diferente tua, muda a selecao para essa nova peça
        if (clickedPieceOwner === currentPlayer) {
            selectedPiece = { row, col };
            console.log(`Selected piece changed to: (${row}, ${col})`);
            updateBoardUI();
            return;
        }

        // Se clicar num espaço vazio, tenta mover
        if( clickedPieceOwner === 0) {
            if(isvalidMove(selectedPiece.row, selectedPiece.col, row, col)) {
                // Verificar se foi um movimento de captura (salto de 2 casas)
                const rowDiff = row - selectedPiece.row;
                const colDiff = col - selectedPiece.col;
                const isCapture = Math.abs(rowDiff) === 2 || Math.abs(colDiff) === 2;

                let capturedRow, capturedCol;
                if (isCapture) {
                    capturedRow = selectedPiece.row + rowDiff / 2;
                    capturedCol = selectedPiece.col + colDiff / 2;
                    // Remove a peça adversária capturada
                    boardState[capturedRow][capturedCol] = 0;
                }
                
                // Move a peça principal
                boardState[row][col] = currentPlayer;
                boardState[selectedPiece.row][selectedPiece.col] = 0;
                const oldRow = selectedPiece.row;
                const oldCol = selectedPiece.col;
                selectedPiece = null;

                updateBoardUI(); //atualiza visual tabuleiro
                updatePieceCounts(); // Atualiza os contadores no painel lateral
                if (isCapture) {
                    logMove(oldRow, oldCol, row, col, true);
                } else {
                    logMove(oldRow, oldCol, row, col, false);
                }

                // Alterna o jogador
                currentPlayer = currentPlayer === 1 ? 2 : 1;
                updateTurnIndicator(); //atualiza visual do jogador atual
            } else {
                console.log("Movimento inválido!");
            }
        } else {
            selectedPiece = null; //dá clear no fim
            updateBoardUI();
        }
    }
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
            isValidDestination = isvalidMove(selectedPiece.row, selectedPiece.col, row, col);
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
    const absRowDiff = Math.abs(rowDiff);     // Correção: usar Math.abs
    const absColDiff = Math.abs(colDiff);     // Correção: usar Math.abs

    // Destino tem de estar vazio
    if (boardState[toRow][toCol] !== 0) return false;
    
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

    //CAPTURA DE 2 PASSOS (SALTO)
    if ((absRowDiff === 2 && absColDiff === 0) || 
        (absRowDiff === 0 && absColDiff === 2) || 
        (absRowDiff === 2 && absColDiff === 2)) {
        
        //posição da peça intermédia que está a ser saltada
        const middleRow = fromRow + rowDiff / 2;
        const middleCol = fromCol + colDiff / 2;
        const middlePiece = boardState[middleRow][middleCol];

        // A peça do meio tem de pertencer ao adversário
        const opponent = currentPlayer === 1 ? 2 : 1;
        if (middlePiece !== opponent) return false;

        // Nota regra do Alquerque: Saltos de captura podem ser feitos para trás em qualquer direção,
        // exceto se as peças estiverem na última fila (regras avançadas podem ser ajustadas depois, mas esta base cobre os saltos padrão).
        return true;
    }

    // Se nao passou as validações, retorna false
    return false;
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
    boardState = JSON.parse(JSON.stringify(initialState)); // Reset board state
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



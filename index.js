
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

function test() {
    console.log("test");
}

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
    const clickedPieceOwner = boardState[row][col];
    if (!selectedPiece) {
        if (clickedPieceOwner === currentPlayer) {
            selectedPiece = { row, col };
            console.log(`Selected piece at (${row}, ${col})`);
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
                // Move a peça
                boardState[row][col] = currentPlayer;
                boardState[selectedPiece.row][selectedPiece.col] = 0;
                console.log(`Moved piece from (${selectedPiece.row}, ${selectedPiece.col}) to (${row}, ${col})`);

                updateBoardUI(); //atualiza visual tabuleiro
                logMove(selectedPiece.row, selectedPiece.col, row, col); //log do movimento

                // Alterna o jogador
                currentPlayer = currentPlayer === 1 ? 2 : 1;
                console.log(`Current player is now: ${currentPlayer}`);
                updateTurnIndicator(); //atualiza visual do jogador atual
            } else {
                console.log("Movimento inválido!");
            }
        }
        selectedPiece = null; //dá clear no fim
    }
}

function updateBoardUI() {
    const circles = document.querySelectorAll(".pieces circle");

    circles.forEach(circle => {
        const row = parseInt(circle.getAttribute("data-row"));
        const col = parseInt(circle.getAttribute("data-col"));
        const owner = boardState[row][col];
        //definir cor consoante o dono
        if (owner === 1) {
            circle.setAttribute("fill", "#2c3e50"); // Player 1 color
            circle.setAttribute("stroke", "#241403"); 
        } else if (owner === 2) {
            circle.setAttribute("fill", "#e74c3c"); // Player 2 color
            circle.setAttribute("stroke", "#241403"); 
        } else {
            circle.setAttribute("fill", "transparent"); // Empty space
            circle.setAttribute("stroke", "transparent"); 
        }
    });
}

//dá log do movimento no painel de texto
function logMove(fromR, fromC, toR, toC) {
    const gameText = document.getElementById("gameText");
    if (gameText) {
        const colsName = ['a', 'b', 'c', 'd', 'e'];
        const fromStr = `${colsName[fromC]}${fromR + 1}`;
        const toStr = `${colsName[toC]}${toR + 1}`;
        
        gameText.innerHTML += `<br>> Jogador ${currentPlayer} moveu de ${fromStr} para ${toStr}`;
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
    const absRowDiff = Math.abs(rowDiff);     // Correção: usar Math.abs
    const absColDiff = Math.abs(colDiff);     // Correção: usar Math.abs

    // 1. O movimento tem de ser estritamente adjacente (1 casa em qualquer direção)
    if (absRowDiff > 1 || absColDiff > 1 || (absRowDiff === 0 && absColDiff === 0)) {
        return false;
    }

    // 2. Regra de direção: A peça não pode retroceder em direção à sua fila inicial
    if (currentPlayer === 1 && rowDiff > 0) {
        console.log("Movimento inválido: Jogador 1 não pode retroceder!");
        return false;
    }
    if (currentPlayer === 2 && rowDiff < 0) {
        console.log("Movimento inválido: Jogador 2 não pode retroceder!");
        return false;
    }

    // 3. Restrições de nós onde NÃO se pode andar na diagonal
    // (Corrigidos os typos para verificar corretamente fromCol)
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

    // Se passou por todas as validações, o movimento é válido!
    return true;
}

function startGame() {
    console.log("Jogo iniciado!");
    boardState = JSON.parse(JSON.stringify(initialState)); // Reset board state
    updateBoardUI(); //atualiza visual tabuleiro
    currentPlayer = 1; // Reset current player
    updateTurnIndicator(); //atualiza visual do jogador atual
}



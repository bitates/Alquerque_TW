
let popup = document.getElementById("popup");

/*abre popups para as opcoes do jogo*/
function openPopup(panel) {
    if(panel === "draw") { 
        playSound("Audio/DrawResignSFX.mp3");
    } else if (panel !== "endGame") {
        playSound("Audio/clickSFX.mp3");
    }

    if (panel === "draw" && vsAI && gameStarted) {
        requestDraw();
        return;
    }

    document.querySelectorAll("#popup .panel").forEach(p => p.style.display = "none");
    const targetPanel = document.getElementById("panel-" + panel);
    if (targetPanel) targetPanel.style.display = "flex";
    document.getElementById("popup").classList.add("open");
}

/*fecha o popup atual*/
function closePopup(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById("popup").classList.remove("open");
}

document.addEventListener("keydown", e => {
    if (e.key === "Escape") closePopup();
});


// Estado Inicial do Jogo: 5x5
// 0 = Vazio, 1 = Player 1, 2 = Player 2
let initialState = [
    [2, 2, 2, 2, 2],
    [2, 2, 2, 2, 2],
    [2, 2, 0, 1, 1], 
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1]
];

// Estado Atual do Jogo: 5x5
let boardState = [
    [2, 2, 2, 2, 2],
    [2, 2, 2, 2, 2],
    [2, 2, 0, 1, 1], 
    [1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1]
];

//variáveis globais para o jogo
let currentPlayer = 1;
let selectedPiece = null; // guarda {row, col} da peça selecionada
let chainPiece = null;
let chainVisited = []; // casas já ocupadas pela peça durante a captura múltipla
let gameStarted = false;
let vsAI = false;
let huffTarget = null; // { offender, lastPiece } 
let aiTimeout = null;

//variáveis do timer
let timerInterval = null;
let timeLeft1 = 600; //10min
let timeLeft2 = 600;

let gameTime = 600;

let turnCounter = 0;
let lastDrawOfferTurn = -99;
let drawPending = false;
const DRAW_COOLDOWN = 5;  // mínimo de turnos entre propostas
let lastAiDrawOfferTurn = -99; // última vez que a IA propôs


//adiciona um listnener pra cada peça do tabuleiro (espera por um clique)
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

    loadTheme();
    applyTheme();
});

/*controla as várias opções para um clique da peça(avançar para uma casa, passar a vez, comer outra peça)*/
function handleCellClick(row, col) {
    if (!gameStarted) {
        return;
    }
    if (vsAI && currentPlayer === 2) return;

    if (!gameStarted || drawPending) return;

    const clickedPieceOwner = boardState[row][col];

    if (huffTarget && clickedPieceOwner === huffTarget.offender) {
    handleHuffClick(row, col);
    return;
}

    // Nenhuma peça selecionada: seleciona se for tua
    if (!selectedPiece) {
        if (clickedPieceOwner === currentPlayer) {
            selectedPiece = { row, col };
            playSound("Audio/clickSFX.mp3");
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
                endTurn({ offender: currentPlayer, lastPiece: chainPiece });
            }
            return; // não pode trocar para outra peça
        }

        if (selectedPiece.row !== row || selectedPiece.col !== col) {
            selectedPiece = { row, col };
            playSound("Audio/clickSFX.mp3");
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

    huffTarget = null;
    const rowDiff = row - selectedPiece.row;
    const colDiff = col - selectedPiece.col;
    const isCapture = canEat; // só é captura se foi validado como salto

    const skippedCapture = !isCapture && playerHasCapture();

    if (isCapture) {
        if (!chainPiece) chainVisited = [{ row: selectedPiece.row, col: selectedPiece.col }];

        boardState[selectedPiece.row + rowDiff / 2][selectedPiece.col + colDiff / 2] = 0;
        playSound("Audio/eatPieceSFX.mp3");
    }

    boardState[row][col] = currentPlayer;
    boardState[selectedPiece.row][selectedPiece.col] = 0;
    const oldRow = selectedPiece.row;
    const oldCol = selectedPiece.col;

    if (isCapture) chainVisited.push({ row, col }); // regista a nova casa
    
    // Log ANTES de trocar o jogador
    logMove(oldRow, oldCol, row, col, isCapture);

    const { p1Count, p2Count } = updatePieceCounts();
    if (p1Count === 0 || p2Count === 0) {
        selectedPiece = null;
        chainPiece = null;
        updateBoardUI();
        endGame(currentPlayer);
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
    endTurn(skippedCapture ? { offender: currentPlayer, lastPiece: { row, col } } : null);
}

/*Atualiza o counter de peças que cada jogador tem*/
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

/*Atualiza o visual do tabuleiro(para mudar peças de sitio/mostrar moves possiveis)*/
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
            circle.setAttribute("fill", theme.p1);   // era "#2c3e50"
            circle.setAttribute("stroke", "#241403");
            circle.setAttribute("r", "20");
        } else if (owner === 2) {
            circle.setAttribute("fill", theme.p2);   // era "#e74c3c"
            circle.setAttribute("stroke", "#241403");
            circle.setAttribute("r", "20");
        } else if (isValidDestination) {
            const hintsToggle = document.getElementById("hintsToggle"); //checkbox do som tem de estar ativo
            if (hintsToggle && !hintsToggle.checked){
                circle.setAttribute("fill", "#b6b6b600"); // Círculo amarelo/dourado para dica de movimento!
                circle.setAttribute("stroke", "#24140300"); 
            } else {
                circle.setAttribute("fill", "#b6b6b6"); // Círculo amarelo/dourado para dica de movimento!
                circle.setAttribute("stroke", "#241403"); 
            }
            circle.setAttribute("r", "10");
        }else {
            circle.setAttribute("fill", "transparent"); // Empty space
            circle.setAttribute("stroke", "transparent"); 
        }

        const isLastOfOffender = huffTarget && huffTarget.lastPiece.row === row && huffTarget.lastPiece.col === col;

        if (huffTarget && owner === huffTarget.offender && !isLastOfOffender) {
            circle.setAttribute("stroke", "#87f10f");
            circle.style.strokeWidth = "5px";
        } else {
            circle.style.strokeWidth = "";
        }

        //efeito 3D na peça selecionada
        if (isSelected) {
            //circle.style.transform = "translateY(-6px)";
            circle.setAttribute("r", "22"); // Fica um pouco maior
            circle.style.filter = "drop-shadow(0px 8px 4px rgba(0, 0, 0, 0.4))";
        } else {
            //circle.style.transform = "none";
            circle.style.filter = "none";
        }
    });
}

//muda o UI do turno de cada player(player cards)
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

/*verifica se o movimento que o jogador selecionou é válido*/
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

/*verifica se pode "saltar" por cima de uma peça para a comer*/
function isvalidEat(fromRow, fromCol, toRow, toCol) {
    // destino tem de estar dentro do tabuleiro e vazio
    if (!insideBoard(toRow, toCol)) return false;
    if (boardState[toRow][toCol] !== 0) return false;

    if (chainVisited.some(p => p.row === toRow && p.col === toCol)) return false;

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

/*Atualiza o timer a cada segundo*/
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

//dá log do movimento no painel de logs
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

/*também dá log de outras mensagens no painel de logs*/
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

/*chama várias funções e prepara o tabuleiro para o jogo começar*/
function startGame(mode) {
    turnCounter = 0;
    lastDrawOfferTurn = -99;
    drawPending = false;
    clearTimeout(aiTimeout);
    console.log("Jogo iniciado!");
    if (mode) vsAI = mode === "ai";
    
    animatePiecesToPosition();
    playSound("Audio/clickSFX.mp3");
    playSound("Audio/slidePiecesSFX.mp3");
    if(!vsAI){
        document.getElementById("difficulty-box").classList.add("hidden");
    } else {    
        document.getElementById("difficulty-box").classList.remove("hidden");
    }
    document.getElementById("pvp-btn").classList.add("hidden");
    document.getElementById("start-ai-btn").classList.add("hidden");
    document.getElementById("draw-btn").classList.remove("hidden");
    document.getElementById("resign-btn").classList.remove("hidden");
    boardState = JSON.parse(JSON.stringify(initialState)); // Reset board state
    updatePieceCounts();
    selectedPiece = null;
    chainPiece = null;
    chainVisited = [];
    huffTarget = null;
    updateBoardUI(); //atualiza visual tabuleiro
    currentPlayer = 1; // Reset current player
    updateTurnIndicator(); //atualiza visual do jogador atual

    //msg de inicio do jogo
    const gameText = document.getElementById("gameText");
    gameText.innerHTML = ""; // Limpa o log do jogo
    logMoveText("Jogo iniciado! Jogador 1 começa.");

    gameStarted = true;
    timeLeft1 = gameTime;
    timeLeft2 = gameTime;
    updateTimerUI()

    // Se já houver um timer a correr, limpa-o antes de iniciar outro
    if (timerInterval) clearInterval(timerInterval);

    startTimer();
}   

/*começa a contagem do tempo*/
function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (currentPlayer === 1) timeLeft1--; else timeLeft2--;
        updateTimerUI();
        if (timeLeft1 <= 0) handleTimeOut(1);
        else if (timeLeft2 <= 0) handleTimeOut(2);
    }, 1000);
}

/*termina o jogo e mostra um log do vencedor*/
function endGame(winner, customMessage) {
    saveResult(winner);
    document.getElementById("start-btn").classList.remove("hidden");
    document.getElementById("draw-btn").classList.add("hidden");
    document.getElementById("resign-btn").classList.add("hidden");
    gameStarted = false;
    clearInterval(timerInterval);

    const message = customMessage || (winner ? `O Jogador ${winner} venceu!` : "Empate!");
    logMoveText(`Jogo terminado! ${message}`);
    document.getElementById("endGameMessage").textContent = message;
    openPopup("endGame");
}

/*termina o jogo se o tempo de um jogador acabar*/
function handleTimeOut(player) {
    logMoveText(`Tempo esgotado para o Jogador ${player}!`);
    endGame(opponentOf(player));
}

/*define o tempo limite do jopo(escolhido nas settings)*/
function setTime(minutes) {
    gameTime = minutes * 60;
    if (!gameStarted) {
        timeLeft1 = gameTime;
        timeLeft2 = gameTime;
        updateTimerUI();
    }
}

/*acaba o jogo se um dos jogadores desistir*/
function resignGame() {
    const loser = currentPlayer;
    playSound("Audio/DrawResignSFX.mp3");
    endGame(opponentOf(loser), `O Jogador ${loser} desistiu e perdeu o jogo.`);
}



/*retorna o opponent*/
function opponentOf(player) {
    if (player === 1) {
        return 2;
    } else {
        return 1;
    }
}

/*recomeça o jogo e chama start*/
function restartGame() {
    document.getElementById("start-btn").classList.add("hidden");
    closePopup();
    startGame();
}

/*verifica se estás dentro das margens do tabuleiro*/
function insideBoard(r, c) {
    return r >= 0 && r < 5 && c >= 0 && c < 5;
}

/*verifica se tens diagonais disponiveis para movimento(algumas peças n têm)*/
function hasDiagonals(r, c) {
    return (r + c) % 2 === 0;
}

/*usado pelo AI para gerar o tabuleiro*/
function cloneBoard(board) {
    return board.map(row => row.slice());
}

/*termina o turno e passa a vez para o outro jogador, dá um pequeno delay ao AI*/
function endTurn(huffOffence = null) {
    turnCounter++;
    huffTarget = null;
    chainPiece = null;
    selectedPiece = null;
    chainVisited = [];
    currentPlayer = opponentOf(currentPlayer);
    updateTurnIndicator();
    if (huffOffence) startHuff(huffOffence);
    updateBoardUI();
    if (generateMoves(boardState, currentPlayer).length === 0) return endGame(opponentOf(currentPlayer));
    if (vsAI && currentPlayer === 2) aiTimeout = setTimeout(aiPlay, 400);
}

/*lida com a vez do ai e chama funções para encontrar o melhor move*/
function aiPlay() {
    if (!gameStarted) return;

    if (!huffTarget && aiMaybeOffersDraw()) return;

    if (huffTarget) {
        if (difficultyName === "Easy") {
            huffTarget = null;
        } else {
            const { row, col } = huffTarget.lastPiece;
            const candidates = [];
            for (let r = 0; r < 5; r++)
                for (let c = 0; c < 5; c++)
                    if (boardState[r][c] === 1 && !(r === row && c === col)) candidates.push([r, c]);
            const [hr, hc] = chooseHuff(boardState, candidates);
            boardState[hr][hc] = 0;
            logMoveText(`A máquina soprou a peça em ${"abcde"[hc]}${hr + 1}.`);
        }
    }

    const move = findBestMove(boardState);
    if (!move) return endGame(1);
    logMove(...move.path[0], ...move.path.at(-1), move.captured.length > 0);
    boardState = applyMove(boardState, move, AI_PLAYER);
    if (move.captured.length > 0 || huffTarget) {
        playSound("Audio/eatPieceSFX.mp3"); // Altera para o caminho do teu ficheiro de captura
    } else {
        playSound("Audio/clickSFX.mp3");
    }
    updatePieceCounts();
    if (generateMoves(boardState, 1).length === 0) return endGame(2);
    endTurn();
}

// tira o estado de hidden dos botões depois de carregar no start
function showPlayButtons(){
    playSound("Audio/clickSFX.mp3");
    document.getElementById("start-btn").classList.add("hidden");
    document.getElementById("pvp-btn").classList.remove("hidden");
    document.getElementById("start-ai-btn").classList.remove("hidden");
}

//muda estão dos botoes em açoes durante o jogo
function setButtons(state) {
    const show = (id, v) => document.getElementById(id).classList.toggle("hidden", !v);
    show("start-btn",    state === "idle");
    show("pvp-btn",      state === "choose");
    show("start-ai-btn", state === "choose");
    show("draw-btn",     state === "playing");
    show("resign-btn",   state === "playing");
}

// uma pequena animação em que os botões deslizam para as suas posições no inicio do jogo
function animatePiecesToPosition() {
    const circles = document.querySelectorAll('.pieces circle');
    
    circles.forEach(circle => {
        const row = parseInt(circle.getAttribute('data-row'));
        const col = parseInt(circle.getAttribute('data-col'));
        
        // Coordenadas finais exatas no tabuleiro
        const targetX = 25 + (col * 87.5);
        const targetY = 25 + (row * 87.5);

        // Dispara o slide suave para a posição final do tabuleiro
        setTimeout(() => {
            circle.setAttribute('cx', targetX);
            circle.setAttribute('cy', targetY);
        }, 50);
    });
}

//dá play nos SFX do jogo caso o toggle do som esteja ligado
function playSound(filename) {
    const soundToggle = document.getElementById("soundToggle"); //checkbox do som tem de estar ativo
    if (soundToggle && !soundToggle.checked) return;

    //cria obj de audio para o MP3
    const audio = new Audio(filename);
    audio.play().catch(error => {
        // Previne erros caso o browser bloqueie áudio antes de haver interação do utilizador
        console.log("Erro ao reproduzir som:", error);
    });
}

// verifica o tabuleiro todo se pode comer
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


// oooooooooooooooooooooooooooooooooooooo SOPRO ooooooooooooooooooooooooooooooooooooooo


// o jogador atual tem alguma captura disponível?
function playerHasCapture() {
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            if (boardState[r][c] === currentPlayer && canCaptureFrom(r, c)) return true;
        }
    }
    return false;
}

//começa o sopro e passa a vez se o sopro não acontecer
function startHuff(offence) {
    // só há sopro se o infrator tiver outra peça além da última movida
    let others = 0;
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            const isLast = r === offence.lastPiece.row && c === offence.lastPiece.col;
            if (boardState[r][c] === offence.offender && !isLast) others++;
        }
    }
    if (others === 0) return;

    huffTarget = offence;
    logMoveText(`Sopro! O Jogador ${offence.offender} não capturou. Jogador ${currentPlayer}, clique numa peça dele para a remover (exceto a última movida), ou jogue normalmente.`);
}

// ao clicar em uma peça em mudo de sopro, retira essa pessa do board
function handleHuffClick(row, col) {
    if (row === huffTarget.lastPiece.row && col === huffTarget.lastPiece.col) {
        logMoveText("Não pode soprar a última peça movida pelo adversário.");
        return;
    }

    boardState[row][col] = 0;
    const colsName = ['a', 'b', 'c', 'd', 'e'];
    logMoveText(` Jogador ${currentPlayer} soprou a peça em ${colsName[col]}${row + 1}.`);

    huffTarget = null;
    playSound("Audio/eatPieceSFX.mp3");
    updatePieceCounts();
    updateBoardUI();
}

// O jogador humano propõe empate
function requestDraw() {
    if (!gameStarted || drawPending) return;
    if (chainPiece) {
        logMoveText("Termina a captura antes de propor empate.");
        return;
    }

    // PvP: o outro jogador decide
    if (!vsAI) {
        const other = opponentOf(currentPlayer);
        logMoveText(`Jogador ${currentPlayer} propôs empate.`);
        if (confirm(`Jogador ${currentPlayer} propõe empate. Jogador ${other}, aceitas?`)) {
            endGame(null, "Empate por acordo.");
        } else {
            logMoveText(`Jogador ${other} recusou o empate.`);
        }
        return;
    }

    // vs IA: só na vez do humano
    if (currentPlayer !== 1) return;

    if (turnCounter - lastDrawOfferTurn < DRAW_COOLDOWN) {
        logMoveText("A IA recusa-se a considerar outro empate tão cedo.");
        return;
    }
    lastDrawOfferTurn = turnCounter;
    drawPending = true;
    logMoveText("Jogador 1 propôs empate. A IA está a pensar...");

    setTimeout(() => {
        drawPending = false;
        if (!gameStarted) return;
        if (aiAcceptsDraw()) {
            logMoveText("A IA aceitou o empate.");
            endGame(null, "Empate por acordo.");
        } else {
            logMoveText("A IA recusou o empate.");
        }
    }, 800);
}


function showScores() {
    let rows = "";
    for (const level in scores) {
        rows += `<tr><td>${level}</td><td>${scores[level].human}</td><td>${scores[level].ai}</td></tr>`;
    }
    document.getElementById("lb-body").innerHTML = rows;
}



// ---------- TEMAS ----------


// lista dos fundos disponiveis 
const BACKGROUNDS = {
    wood:  { image: 'url("https://cdn.architextures.org/textures/23/2/oak-veneermdf-none-rz7xim-1200.jpg")', color: 'transparent' },
    dark:  { image: 'none', color: '#1b1917' },
    green: { image: 'none', color: '#1e5a3a' },
    blue:  { image: 'linear-gradient(135deg,#1c3b5a,#3a7bd5)', color: 'transparent' }
};

// lista dos cunjuntos de cores de peças disponiveis
const PIECE_THEMES = {
    classic: { p1: '#2c3e50', p2: '#e74c3c' },
    bw:      { p1: '#111111', p2: '#f5f5f5' },
    gold:    { p1: '#8e44ad', p2: '#f1c40f' },
    nature:  { p1: '#16a085', p2: '#d35400' }
};


let theme = {
    bg: 'wood',
    customBgUrl: null,
    pieces: 'classic',
    p1: PIECE_THEMES.classic.p1,
    p2: PIECE_THEMES.classic.p2
};


// guarda o tema - Não REMOVER IMPORTANTE!!!
function saveTheme() {
    try { localStorage.setItem("alquerqueTheme", JSON.stringify(theme)); } catch (e) {}
}

function loadTheme() {
    try {
        const saved = localStorage.getItem("alquerqueTheme");
        if (saved) theme = { ...theme, ...JSON.parse(saved) };
    } catch (e) {}
}


function markSelected(containerId, attr, value) {
    document.querySelectorAll(`#${containerId} .theme-swatch`).forEach(b => {
        b.classList.toggle("selected", b.dataset[attr] === value);
    });
}

//muda o tema das peças e do fundo, atualiza a board
function applyTheme() {
    const root = document.documentElement;

    // fundo
    if (theme.bg === "custom" && theme.customBgUrl) {
        document.body.style.setProperty("--bg-image", `url("${theme.customBgUrl}")`);
        document.body.style.setProperty("--bg-color", "transparent");
    } else {
        const bg = BACKGROUNDS[theme.bg] || BACKGROUNDS.wood;
        document.body.style.setProperty("--bg-image", bg.image);
        document.body.style.setProperty("--bg-color", bg.color);
    }

    // cores das peças (para os pontos dos cartões)
    root.style.setProperty("--p1-color", theme.p1);
    root.style.setProperty("--p2-color", theme.p2);

    // sincroniza controlos
    const c1 = document.getElementById("p1Color");
    const c2 = document.getElementById("p2Color");
    if (c1) c1.value = theme.p1;
    if (c2) c2.value = theme.p2;
    markSelected("bg-options", "bg", theme.bg);
    markSelected("piece-options", "pieces", theme.pieces);

    updateBoardUI();
    
    //muda cores do UI peças(acima do log)
    document.documentElement.style.setProperty("--theme-p1", theme.p1);
    document.documentElement.style.setProperty("--theme-p2", theme.p2);
}

// escolher um dos fundos disponiveis
function setBackground(name) {
    playSound("Audio/clickSFX.mp3");
    theme.bg = name;
    saveTheme();
    applyTheme();
}

// mudar para fundo personalizado
function setCustomBackground() {
    const url = document.getElementById("bgUrlInput").value.trim();
    if (!url) return;
    playSound("Audio/clickSFX.mp3");
    theme.bg = "custom";
    theme.customBgUrl = url;
    saveTheme();
    applyTheme();
}

// mudar a cor das peças
function setPieceTheme(name) {
    playSound("Audio/clickSFX.mp3");
    theme.pieces = name;
    theme.p1 = PIECE_THEMES[name].p1;
    theme.p2 = PIECE_THEMES[name].p2;
    saveTheme();
    applyTheme();
}

function setCustomPieceColors() {
    theme.pieces = "custom";
    theme.p1 = document.getElementById("p1Color").value;
    theme.p2 = document.getElementById("p2Color").value;
    saveTheme();
    applyTheme();
}

// devolve o tema base p1:azul, p2:vermelho, fundo: madeira
function resetTheme() {
    playSound("Audio/clickSFX.mp3");
    theme = { bg: 'wood', customBgUrl: null, pieces: 'classic',
              p1: PIECE_THEMES.classic.p1, p2: PIECE_THEMES.classic.p2 };
    saveTheme();
    applyTheme();
}
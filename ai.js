// ===================== Alpha Beta Pruning =====================

const AI_PLAYER = 2;          // a máquina é o Player 2
let aiDepth = 4;
let difficultyName = "Medium";
const WIN_SCORE = 100000;

const DIRECTIONS = [
[-1, 0], [1, 0], [0, -1], [0, 1],     // ortogonais
[-1, -1], [-1, 1], [1, -1], [1, 1]    // diagonais
];

// Capturas simples (um salto) a partir de (r, c)
function getCaptures(board, r, c, player) {
const opp = opponentOf(player);
const result = [];
for (const [dr, dc] of DIRECTIONS) {
    if (dr !== 0 && dc !== 0 && !hasDiagonals(r, c)) continue;
    const mr = r + dr, mc = c + dc;
    const tr = r + 2 * dr, tc = c + 2 * dc;
    if (!insideBoard(tr, tc)) continue;
    if (board[mr][mc] === opp && board[tr][tc] === 0) {
        result.push({ to: [tr, tc], cap: [mr, mc] });
    }
}
return result;
}


// Gera recursivamente todas as sequências de capturas encadeada
function collectCaptureSequences(board, r, c, player, path, captured, out, visited = new Set([`${r},${c}`])) {
// 1. Descobre todas as capturas possíveis a partir da posição atual, ignorando casas já visitadas na mesma cadeia
const caps = getCaptures(board, r, c, player)
    .filter(cp => !visited.has(`${cp.to[0]},${cp.to[1]}`));

if (caps.length === 0) {

    //se a peça realmente se moveu/capturou algo, guarda o caminho completo 
    if (path.length > 1) {
        out.push({ path: path.slice(), captured: captured.slice() });
    }
    return;
}

// 2. Para cada captura válida encontrada, simula o salto de forma recursiva
for (const cp of caps) {
    const key = `${cp.to[0]},${cp.to[1]}`; // Chave única para a posição de destino
    const nb = cloneBoard(board);          // Cria uma cópia temporária do tabuleiro para não alterar o real
    
    // Atualiza o tabuleiro virtual com o salto
    nb[r][c] = 0;                          // Remove a peça da origem
    nb[cp.cap[0]][cp.cap[1]] = 0;          // Remove a peça adversária capturada do meio
    nb[cp.to[0]][cp.to[1]] = player;       // Coloca a peça na nova posição de destino

    path.push(cp.to);
    captured.push(cp.cap);
    visited.add(key); // Marca a casa como visitada
    
    // Chamada recursiva: tenta encontrar mais saltos a partir desta nova posição
    collectCaptureSequences(nb, cp.to[0], cp.to[1], player, path, captured, out, visited);
    
    // Backtracking
    visited.delete(key);
    path.pop();
    captured.pop();
}
}

// Movimentos de 1 casa
function getSimpleMoves(board, r, c, player) {
const forward = player === 1 ? -1 : 1;
const result = [];
for (const [dr, dc] of DIRECTIONS) {
    if (dr === -forward) continue;
    if (dr !== 0 && dc !== 0 && !hasDiagonals(r, c)) continue;
    const tr = r + dr, tc = c + dc;
    if (insideBoard(tr, tc) && board[tr][tc] === 0) {
        result.push({ path: [[r, c], [tr, tc]], captured: [] });
    }
}
return result;
}

// Gerar jogadas possíveis para a IA
function generateMoves(board, player) {
const captures = [];
const simple = [];
for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
        if (board[r][c] !== player) continue;
        collectCaptureSequences(board, r, c, player, [[r, c]], [], captures);
        simple.push(...getSimpleMoves(board, r, c, player));
    }
}
if (captures.length > 0) {
    return captures.sort((a, b) => b.captured.length - a.captured.length);
}
return simple;
}

function applyMove(board, move, player) {
const nb = cloneBoard(board);
const [sr, sc] = move.path[0];
const [er, ec] = move.path[move.path.length - 1];
nb[sr][sc] = 0;
for (const [cr, cc] of move.captured) nb[cr][cc] = 0;
nb[er][ec] = player;
return nb;
}

function countPieces(board, player) {
let n = 0;
for (const row of board) for (const cell of row) if (cell === player) n++;
return n;
}

// Avaliação heurística
function evaluate(board) {
const human = opponentOf(AI_PLAYER);
const material = countPieces(board, AI_PLAYER) - countPieces(board, human);
// ve quem tem mais jogadas possiveis
const mobility = generateMoves(board, AI_PLAYER).length - generateMoves(board, human).length;

//pontuação final ponderada:n
return 100 * material + 2 * mobility;
}

function minimax(board, depth, alpha, beta, player) {
const moves = generateMoves(board, player);

if (moves.length === 0) {

// Se for a vez da IA e ela não tem jogadas, perde
if (player === AI_PLAYER) {
    return -WIN_SCORE - depth;
} 

// Se for a vez do humano e ele não tem jogadas, o humano perdeu 
else {
    return WIN_SCORE + depth;
}
}
if (depth === 0) return evaluate(board);

const next = opponentOf(player);

// Alpha Beta Pruning

if (player === AI_PLAYER) {           // MAX
    let best = -Infinity;
    for (const m of moves) {
        best = Math.max(best, minimax(applyMove(board, m, player), depth - 1, alpha, beta, next));
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
    }
    return best;


} else {                              // MIN
    let best = Infinity;
    for (const m of moves) {
        best = Math.min(best, minimax(applyMove(board, m, player), depth - 1, alpha, beta, next));
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
    }
    return best;
}
}




function aiAcceptsDraw() {
    const aiCount = countPieces(boardState, AI_PLAYER);
    const humanCount = countPieces(boardState, opponentOf(AI_PLAYER));

    // aceita só se tiver menos de 4 peças E menos peças que o adversário
    return aiCount < 4 && aiCount < humanCount;
}



// Escolhe a melhor jogada da máquina
function findBestMove(board, depth = aiDepth) {
const moves = generateMoves(board, AI_PLAYER);
if (moves.length === 0) return null;

let bestScore = -Infinity;
let bestMoves = [];
for (const m of moves) {
    let alpha;

    if (bestScore === -Infinity) {
    alpha = -Infinity;
    } 

    else {
        alpha = bestScore - 1;
    }

    const score = minimax(applyMove(board, m, AI_PLAYER), depth - 1, alpha, Infinity, opponentOf(AI_PLAYER));
    if (score > bestScore) {
        bestScore = score;
        bestMoves = [m];
    } else if (score === bestScore) {
        bestMoves.push(m);
    }
}
return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

// Escolha do Sopro pela IA
function chooseHuff(board, candidates, depth = aiDepth) {
if(difficultyName === "Easy") findbestMove(board, 1);
let best = candidates[0];
let bestScore = -Infinity;
for (const [r, c] of candidates) {
    const nb = cloneBoard(board);
    nb[r][c] = 0;
    const score = minimax(nb, Math.max(depth - 1, 1), -Infinity, Infinity, AI_PLAYER);
    if (score > bestScore) {
        bestScore = score;
        best = [r, c];
    }
}
return best;
}

function difficulty(depth, name) {
    difficultyName = name;
    aiDepth = depth;
    const span = document.getElementById("difficulty-name");
    span.textContent = name;
    span.style.color = { Easy: "#27ae60", Medium: "#dad303", Hard: "#e74c3c" }[name];
    playSound("Audio/clickSFX.mp3");
}

let scores = {
    Easy: { human: 0, ai: 0 },
    Medium: { human: 0, ai: 0 },
    Hard: { human: 0, ai: 0 }
};

function saveResult(winner) {
    if (!vsAI || !winner) return;
    if (winner === AI_PLAYER) {
        scores[difficultyName].ai++;
    } else {
        scores[difficultyName].human++;
    }
}
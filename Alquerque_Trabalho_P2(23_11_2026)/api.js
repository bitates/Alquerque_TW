// api -> comunicação com o servidor
// subtsituir o server e o test

const SERV_URL = "http://twserver.alunos.dcc.fc.up.pt:8008"; 
const GROUP_ID = 32; 

window.currentUser = null; // {nick, password}, só depois do login ou do registo

// ------------------ auxiliar ------------------

function assertString(name, value) {
    if (typeof value !== "string" ||value.length === 0) {
        throw new Error(`${name} cannot be empty.`);
    }
}

// POST usando  JSON; 
async function request(endpoint, payload) {
    const response = await fetch(`${SERV_URL}/${endpoint}`, {
        method: "POST",
        body: JSON.stringify(payload)
    });
 
    let data = {};
    try { data = await response.json(); } catch { /* nada = sucesso */ }
 
    if (!response.ok || data.error) {
        throw new Error(data.error || "Error while communicating with the server.");
    }
    return data;
}

// ------------------ pedidos ------------------

// register: nick + password. (registo e login)
async function apiRegister(nick, password) {
    assertString("Username", nick);
    assertString("Password", password);
    const data = await request("register", { nick, password });
    window.currentUser = { nick, password };
    return data;
}

// join: grupo + nick + password -> {game : aaaaa} "devolve o id do jogo"
async function apiJoin(){
    if (window.currentUser === null) {
        throw new Error("Faça login primeriro.");
    }
    const {nick, password} = window.currentUser;
    const data = await request("join", {group: GROUP_ID, nick, password});
    window.currentGame = data.game;
    return data.game;
}
 
function apiLeave(game){
    if (window.currentUser === null) {
        throw new Error("Faça login primeriro.");
    }
    const {nick, password} = window.currentUser;
    return request("leave", {nick, password, game});
}

function apiDraw(game) {
    if (window.currentUser === null) {
        throw new Error("Faça login primeriro.");
    }
    const {nick, password} = window.currentUser;
    return request("draw", {nick, password, game});
}

function apiNotify(game, position) {
    const {nick, password} = window.currentUser;
    //devolve o erro caso este ocorra
    return request("notify", {nick, password, game, position}); 
}


function apiRanking() {
    return request("ranking", {group: GROUP_ID});
}


// update: 
function apiUpdate(game, onMessage, onError) {
    const { nick } = window.currentUser;
    // é boa pratica utilizar o encoderURIcomponent para evitar problemas com caracteres especiais
    const url = `${SERV_URL}/update?nick=${encodeURIComponent(nick)}&game=${encodeURIComponent(game)}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.error) { 
            if (onError) 
                onError(new Error(data.error)); 
            return; 
        }
        onMessage(data);
    };

    eventSource.onerror = (err) => { if (onError) onError(err); };

    // devolve o EventSource para poder ser fechado depois
    return eventSource;
}

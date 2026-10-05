let estado = null;
let selecionada = null;


async function carregarEstado() {
  // "await" -> espera aqui até o servidor responder.
  const resp = await fetch("/estado");

  estado = await resp.json();

  // Com os dados novos, desenha o tabuleiro no ecrã.
  desenhar();
}

function desenhar() {
  // Esta função apaga e volta a desenhar tudo
  // sempre que o estado muda.
}


function aoClicar(l, c) {
    // l -> linha, c -> coluna (se não souberes isto é complicado)
  // 1 ->  se ainda não há peça selecionada, o clique escolhe a peça.
  // Se já há, o clique escolhe o destino e envia a jogada.
}

async function enviarJogada(de, para) {
  // Manda um pedido à rota /jogar do Flask.
  const resp = await fetch("/jogar", {
    // POST = estamos a ENVIAR dados (não só a pedir).
    method: "POST",

    // Avisa o Flask que os dados vão em formato JSON.
    headers: { "Content-Type": "application/json" },

    // Os dados em si: a origem e o destino da jogada,
    // convertidos em texto para viajarem pela rede.
    body: JSON.stringify({ de, para }),
  });

  // O Flask responde com o estado novo. Guardamos e redesenhamos.
  estado = await resp.json();
  desenhar();
}


// ---------- BOTÃO REINICIAR ----------
// Procura na página o elemento com id="reiniciar" (o botão)
// e define o que acontece quando alguém clica nele.
document.getElementById("reiniciar").onclick = async () => {
  // Diz ao Python para voltar à posição inicial.
  await fetch("/reiniciar", { method: "POST" });

  // Pede o estado novo e desenha-o.
  carregarEstado();
};


carregarEstado();
from flask import Flask, jsonify, request, render_template

app = Flask(__name__)

# reseta o estado do tabuleiro
# -----------
# XXXXX
# XXXXX
# XX OO
# OOOOO
# OOOOO
# -----------
def estado_base():
    estado = {"tabuleiro": [[" "] * 5 for _ in range(5)], "turno": "X"}
    for i in range (5):
        if i == 0 or i == 1: 
            estado["tabuleiro"][i] = "XXXXX"
        elif i == 3 or i == 4:
            estado["tabuleiro"][i] = "OOOOO"
        else:
            estado["tabuleiro"][i] = "XX OO"
    return estado

estado = estado_base()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/estado")
def ver_estados(l, c):
    
    ## devolver as jogadas legais de um certo ponto
    
    return jsonify(estado)

@app.route("/jogar", methods=["POST"])
def jogar():
    dados = request.get_json()
    #  chamar a função ver estados para um ponto em especifico -> vai devolver todos os estados legais
    #  pedir para o jogador escolher uma das jogadas possiveis
    #  aplicar essa jogada

    return jsonify(estado)

if __name__ == "__main__":
    app.run(debug=True)
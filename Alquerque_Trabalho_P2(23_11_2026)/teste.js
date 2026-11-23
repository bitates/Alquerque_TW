document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("panel-login");
    const regForm = document.getElementById("panel-register");
    const registerUrl = "http://twserver.alunos.dcc.fc.up.pt:8008/register";

    // Trocar entre os painéis de login e registo
    function mostrar(mostrarForm, esconderForm) {
        esconderForm.classList.add("hidden");
        mostrarForm.classList.remove("hidden");
    }

    document.querySelectorAll('a[href="#panel-register"], a[href="#panel-login"]').forEach(function (link) {
        link.addEventListener("click", function (e) {
            e.preventDefault();
            loginForm.classList.toggle("hidden");
            regForm.classList.toggle("hidden");
        });
    });

    function ligarFormulario(form, userId, passId, mensagemSucesso) {
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const nick = document.getElementById(userId).value.trim();
            const password = document.getElementById(passId).value;

            try {
                const response = await fetch(registerUrl, {
                    method: "POST",
                    body: JSON.stringify({ nick, password })
                });
                const data = await response.json();
                if (!response.ok || data.error) throw new Error(data.error || "Error communicating with the server.");
                alert(mensagemSucesso);
            } catch (error) {
                alert(error.message);
            }
        });
    }

    ligarFormulario(loginForm, "log-user", "log-pass", "Successfully logged in!");
    ligarFormulario(regForm, "reg-user", "reg-pass", "Successfully registered!");
});
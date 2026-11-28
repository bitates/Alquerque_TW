// não usar este código, é apenas para testes. 
// O código final deve usar o api.js


document.addEventListener("DOMContentLoaded", () => {
    const regForm = document.getElementById("panel-register");
    const registerUrl = "http://twserver.alunos.dcc.fc.up.pt/register";
    window.currentUser = null;

    async function sendRegisterRequest(nick, password) {
        if (!nick || typeof nick !== "string") {
            throw new Error("Username cannot be empty!");
        }

        if (typeof password !== "string" || password.length === 0) {
            throw new Error("Password cannot be empty.");
        }
        
        //faz um pedido POST para o servidor de registo(dados user)
        const response = await fetch(registerUrl, {
            method: "POST",
            body: JSON.stringify({
                nick: nick,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(data.error || "Error while communicating with the server.");
        }

        return data;
    }

    if (regForm) {
        regForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const nick = document.getElementById("reg-user").value.trim();
            const password = document.getElementById("reg-pass").value;

            try {
                await sendRegisterRequest(nick, password);
                alert("Successfully Registered!");
                window.currentUser = { nick, password };
                closePopup();
            } catch (error) {
                alert(error.message);
            }
        });
    }
});

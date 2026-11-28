document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("panel-register").addEventListener("submit", async (e) => {
        e.preventDefault();
        const nick = document.getElementById("reg-user").value.trim();
        const password = document.getElementById("reg-pass").value;
        try {
            await apiRegister(nick, password);
            alert("Autenticado com sucesso!");
            closePopup();
        } catch (err) { alert(err.message); }
    });
});

let popup = document.getElementById("popup");

function test() {
    console.log("test");
}

function openPopup(panel) {
    document.querySelectorAll("#popup .panel").forEach(p => p.style.display = "none");
    document.getElementById("panel-" + panel).style.display = "flex";
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
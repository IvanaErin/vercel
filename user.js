function orderItem(name, price) {
    fetch("save_order.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `item=${name}&price=${price}`
    });

    let n = document.getElementById("notif");
    n.innerText = name + " added!";
    n.style.display = "block";
    setTimeout(() => n.style.display = "none", 2000);
}

/*** AI Icon ***/
function toggleChat() {
    let box = document.getElementById("chat-box");
    box.style.display = (box.style.display === "block") ? "none" : "block";
}

function sendChat() {
    let input = document.getElementById("chat-input");
    let log = document.getElementById("chat-log");

    let q = input.value;
    input.value = "";

    log.innerHTML += `<p><b>You:</b> ${q}</p>`;
    log.innerHTML += `<p><b>AI:</b> The canteen is open, and yes ${q}</p>`;
}

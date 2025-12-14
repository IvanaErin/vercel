function orderItem(name, price, menuId) {
  fetch("/api/add_to_cart", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      menu_id: menuId,
      quantity: 1,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (!data.success) {
        alert("Failed to add item");
        return;
      }

      const n = document.getElementById("notif");
      n.innerText = name + " added!";
      n.style.display = "block";
      setTimeout(() => (n.style.display = "none"), 2000);
    })
    .catch((err) => {
      console.error(err);
      alert("Error adding item");
    });
}

/*** AI Icon ***/
function toggleChat() {
  const box = document.getElementById("chat-box");
  box.style.display = box.style.display === "block" ? "none" : "block";
}

function sendChat() {
  const input = document.getElementById("chat-input");
  const log = document.getElementById("chat-log");

  const q = input.value.trim();
  if (!q) return;

  input.value = "";

  log.innerHTML += `<p><b>You:</b> ${q}</p>`;
  log.innerHTML += `<p><b>AI:</b> The canteen is open, and yes ${q}</p>`;
}

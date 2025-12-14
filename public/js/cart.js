const token = localStorage.getItem("token");
if (!token) location.href = "/login.html";

const box = document.getElementById("cartItems");
const totalItemsEl = document.getElementById("totalItems");
const totalPriceEl = document.getElementById("totalPrice");

fetch("/api/cart", {
  headers: { Authorization: "Bearer " + token }
})
.then(r => r.json())
.then(data => {
  if (!data.success) throw "unauthorized";

  if (data.items.length === 0) {
    box.innerHTML = "<p>Your cart is empty.</p>";
    return;
  }

  let totalItems = 0;
  let totalPrice = 0;
  box.innerHTML = "";

  data.items.forEach(item => {
    totalItems += item.quantity;
    totalPrice += item.price * item.quantity;

    box.innerHTML += `
      <div class="cart-item">
        <img src="${item.image}" class="cart-img">
        <div>
          <h3>${item.name}</h3>
          <p>₱${item.price}</p>

          <div class="qty-controls">
            <button onclick="updateQty(${item.cart_id}, -1)">-</button>
            <span>${item.quantity}</span>
            <button onclick="updateQty(${item.cart_id}, 1)">+</button>
          </div>

          <button class="remove-btn" onclick="removeItem(${item.cart_id})">
            Remove
          </button>
        </div>
      </div>
    `;
  });

  totalItemsEl.innerText = totalItems;
  totalPriceEl.innerText = totalPrice;
})
.catch(() => location.href = "/login.html");

function updateQty(cart_id, delta) {
  fetch("/api/cart-update", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ cart_id, delta })
  }).then(() => location.reload());
}

function removeItem(cart_id) {
  fetch("/api/cart-remove", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token
    },
    body: JSON.stringify({ cart_id })
  }).then(() => location.reload());
}

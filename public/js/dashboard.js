const token = localStorage.getItem("token");

// ------------------------
// AUTH GUARD
// ------------------------
if (!token) {
  location.href = "/login.html";
}

// ------------------------
// LOAD USER
// ------------------------
fetch("/api/me", {
  headers: { Authorization: "Bearer " + token }
})
.then(r => {
  if (!r.ok) throw "unauthorized";
  return r.json();
})
.then(data => {
  document.getElementById("username").innerText = data.user.username;
})
.catch(() => {
  localStorage.removeItem("token");
  location.href = "/login.html";
});

// ------------------------
// LOAD MENU
// ------------------------
fetch("/api/menu")
.then(r => r.json())
.then(data => {
  const box = document.getElementById("menuContainer");
  box.innerHTML = "";

  data.forEach(item => {
    box.innerHTML += `
      <div class="card">
        <img src="${item.image}">
        <h3>${item.name}</h3>
        <p><b>₱${item.price}</b></p>
        <p>${item.description || ""}</p>
        <button onclick="addToCart(${item.id})">Add to Cart</button>
      </div>
    `;
  });
});

// ------------------------
// LOAD COUNTS (SAFE)
// ------------------------
const cartCountEl = document.getElementById("cartCount");
const notifCountEl = document.getElementById("notifCount");

fetch("/api/cart-count", {
  headers: { Authorization: `Bearer ${token}` }
})
.then(r => r.ok ? r.json() : { total: 0 })
.then(d => cartCountEl.innerText = d.total || 0);

fetch("/api/notifications", {
  headers: { Authorization: `Bearer ${token}` }
})
.then(r => r.ok ? r.json() : { total: 0 })
.then(d => notifCountEl.innerText = d.total || 0);

// ------------------------
// ADD TO CART (FIXED)
// ------------------------
function addToCart(menuId) {
  fetch("/api/add-to-cart", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ menu_id: menuId })
  })
  .then(r => r.json())
  .then(() => {
    cartCountEl.innerText = Number(cartCountEl.innerText) + 1;
    alert("✅ Added to cart");
  })
  .catch(() => alert("❌ Failed to add to cart"));
}

// ------------------------
// LOGOUT
// ------------------------
function logout() {
  localStorage.removeItem("token");
  location.href = "/login.html";
}

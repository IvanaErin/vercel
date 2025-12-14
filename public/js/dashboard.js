const token = localStorage.getItem("token");

if (!token) {
  location.href = "/login.html";
}

// ------------------------
// LOAD USER
// ------------------------
fetch("/api/me", {
  headers: { Authorization: "Bearer " + token }
})
.then(r => r.json())
.then(data => {
  if (!data.success) throw "unauthorized";
  document.getElementById("username").innerText = data.user.username;
})
.catch(() => location.href = "/login.html");

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
        <button onclick="addToCart(${item.id})">Add to Cart</button>
      </div>
    `;
  });
});

// ------------------------
// LOAD COUNTS
// ------------------------
fetch("/api/cart-count", { headers:{Authorization:`Bearer ${token}`}})
  .then(r=>r.json()).then(d=>cartCount.innerText=d.total);

fetch("/api/notifications", { headers:{Authorization:`Bearer ${token}`}})
  .then(r=>r.json()).then(d=>notifCount.innerText=d.total);

// ------------------------
function logout() {
  localStorage.removeItem("token");
  location.href = "/login.html";
}

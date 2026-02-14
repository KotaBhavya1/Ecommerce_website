// ===============================
// GLOBAL VARIABLES
// ===============================
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let ticking = false;
let header;

const orderID = generateOrderID();


// Store temporary quantities before adding to cart
let tempQty = {};

function updateTempQty(id, delta) {
    if (!tempQty[id]) tempQty[id] = 1;

    tempQty[id] += delta;

    if (tempQty[id] < 1) tempQty[id] = 1;

    const qtyEl = document.getElementById("qty-" + id);
    if (qtyEl) qtyEl.innerText = tempQty[id];
}

function addToCartWithQty(name, price, id) {
    const quantity = tempQty[id] || 1;

    const item = cart.find(p => p.name === name);

    if (item) {
        item.qty += quantity;
    } else {
        cart.push({ name, price, qty: quantity });
    }

    tempQty[id] = 1; // reset after adding

    const qtyEl = document.getElementById("qty-" + id);
    if (qtyEl) qtyEl.innerText = 1;

    saveCart();
    updateCartCount();
    renderCart();
    toast("Added to cart");
}

function updatePrice(productId) {
    const select = document.getElementById(productId + "-size");
    if (!select) return;

    const price = select.value;
    const priceEl = document.getElementById("price-" + productId);

    if (priceEl) {
        priceEl.innerText = "₹" + price;
    }
}
function addSelectedProduct(productName, productId) {
    const select = document.getElementById(productId + "-size");
    if (!select) return;

    const price = parseInt(select.value);
    const label = select.options[select.selectedIndex].getAttribute("data-label");

    const finalName = productName + " (" + label + ")";

    addToCartWithQty(finalName, price, productId);
}


// ===============================
// SAVE CART
// ===============================
function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
}


// ===============================
// UPDATE CART COUNT (All Pages)
// ===============================
function updateCartCount() {
    const countEl = document.getElementById("cartCount");
    if (!countEl) return;

    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    countEl.innerText = count;
}


// ===============================
// ADD TO CART
// ===============================
function addToCart(name, price) {
    const item = cart.find(p => p.name === name);

    if (item) {
        item.qty++;
    } else {
        cart.push({ name, price, qty: 1 });
    }

    saveCart();
    updateCartCount();
    renderCart();
    toast("Added to cart");
}


// ===============================
// REMOVE ITEM
// ===============================
function removeItem(name) {
    cart = cart.filter(item => item.name !== name);
    saveCart();
    updateCartCount();
    renderCart();
}


// ===============================
// CHANGE QUANTITY
// ===============================
function changeQty(name, delta) {
    const item = cart.find(p => p.name === name);
    if (!item) return;

    item.qty += delta;

    if (item.qty <= 0) {
        removeItem(name);
        return;
    }

    saveCart();
    updateCartCount();
    renderCart();
}


// ===============================
// RENDER CART (Cart Page Only)
// ===============================
function renderCart() {
    const list = document.getElementById("cartItems");
    const totalEl = document.getElementById("total");
    const deliveryEl = document.getElementById("deliveryCharge");
    const deliveryText = document.getElementById("deliveryText");

    if (!list || !totalEl) return;

    list.innerHTML = "";
    let subtotal = 0;

    const frag = document.createDocumentFragment();

    cart.forEach(item => {
        subtotal += item.price * item.qty;

        const li = document.createElement("li");

        li.innerHTML = `
            <div class="cart-row">
                <div class="cart-info">
                    <strong>${item.name}</strong>
                    <span class="price">₹${item.price} × ${item.qty}</span>
                </div>

                <div class="cart-actions">
                    <button class="qty-btn" onclick="changeQty('${item.name}', -1)">−</button>
                    <span class="qty">${item.qty}</span>
                    <button class="qty-btn" onclick="changeQty('${item.name}', 1)">+</button>
                    <button class="remove-btn" onclick="removeItem('${item.name}')">Remove</button>
                </div>
            </div>
        `;

        frag.appendChild(li);
    });

    list.appendChild(frag);

    const delivery = calculateDelivery(subtotal);


    const finalTotal = subtotal + delivery;

    // Update delivery text nicely
    if (deliveryText) {
        if (subtotal === 0) {
            deliveryText.innerHTML = `Delivery charge: ₹0`;
        }
        else if (subtotal >= 1299) {
            deliveryText.innerHTML =
                `🚚 Delivery: <span style="color:green;font-weight:600;">FREE</span>`;
        }
        else {
            const remaining = 1299 - subtotal;
            deliveryText.innerHTML =
                `Delivery charge: ₹${delivery}
                 <br><small>Add ₹${remaining} more for FREE delivery</small>`;
        }
    }

    if (deliveryEl) deliveryEl.innerText = delivery;

    totalEl.innerText = finalTotal;
}
function calculateDelivery(total) {
    if (total === 0) return 0;
    return total >= 1299 ? 0 : 80;
}

// ===============================
// WHATSAPP ORDER
// ===============================
function placeOrder() {

    if (cart.length === 0) {
        alert("Cart is empty");
        return;
    }

    const name = document.getElementById("custName")?.value.trim();
    const phone = document.getElementById("custPhone")?.value.trim();
    const address = document.getElementById("custAddress")?.value.trim();

    if (!name || !phone || !address) {
        alert("Please fill all details");
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const delivery = calculateDelivery(subtotal);

    const total = subtotal + delivery;

    if (subtotal < 99) {
        alert("Minimum order ₹99 required");
        return;
    }

    const orderID = generateOrderID();
    const date = new Date().toLocaleString();

    // Format items for sheet
    const itemsText = cart.map(i =>
        `${i.name} x${i.qty} (₹${i.price * i.qty})`
    ).join(", ");

    const orderData = {
        orderID,
        date,
        name,
        phone,
        address,
        items: itemsText,
        subtotal,
        delivery,
        total
    };

    // 🔹 Send to Google Sheet
    fetch("https://script.google.com/macros/s/AKfycbyhrK5Jqi9TBmV1nvPMeQwnJXru9YuF30TDcC-OWNvMg3QWvYDvK7PzsrkomUm1fTk7/exec", {
        method: "POST",
        body: JSON.stringify(orderData)
    });

    // 🔹 Prepare WhatsApp message
    // 🔹 Prepare WhatsApp message
    let message = `Vijayalakshmi Foods\n\n`;
    message += `Order ID: ${orderID}\n\n`;

    cart.forEach(i => {
        message += `• ${i.name} x ${i.qty} - Rs.${i.price * i.qty}\n`;
    });

    message += `\nDelivery: Rs.${delivery}`;
    message += `\nTotal: Rs.${total}\n\n`;

    message += `Name: ${name}\nPhone: ${phone}\nAddress: ${address}\n\n`;
    message += `Please confirm my order.`;

    // Proper encoding
    const encodedMsg = encodeURI(message);

    // Open WhatsApp
    window.open(
        `https://wa.me/919618082853?text=${encodedMsg}`,
        "_blank"
    );


    // Clear cart after order
    cart = [];
    saveCart();
    updateCartCount();
    renderCart();
    toggleCart();
}




// ===============================
// LOAD SAVED CUSTOMER
// ===============================
function loadCustomer() {
    const data = JSON.parse(localStorage.getItem("customer"));
    if (!data) return;

    const nameEl = document.getElementById("custName");
    const phoneEl = document.getElementById("custPhone");
    const addressEl = document.getElementById("custAddress");

    if (nameEl) nameEl.value = data.name;
    if (phoneEl) phoneEl.value = data.phone;
    if (addressEl) addressEl.value = data.address;
}

const productData = {
    turmeric: {
        name: "Organic Turmeric",
        price: 180,
        img: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5",
        desc: "Pure Telangana turmeric, stone ground and chemical free."
    }
};

function openProduct(id) {
    localStorage.setItem("selectedProduct", id);
    window.location.href = "product.html";
}

function toggleCheckout() {
    const section = document.getElementById("checkoutSection");
    if (!section) return;

    section.classList.toggle("active");
}


function loadProductDetail() {
    const id = localStorage.getItem("selectedProduct");
    if (!id || !productData[id]) return;

    const product = productData[id];

    document.getElementById("detailName").innerText = product.name;
    document.getElementById("detailPrice").innerText = "₹" + product.price;
    document.getElementById("detailDesc").innerText = product.desc;
    document.getElementById("detailImg").src = product.img;

    document.getElementById("detailAddBtn").onclick = () => {
        addToCart(product.name, product.price);
    };
}



// ===============================
// PRODUCT FILTER
// ===============================
function filterProducts(category) {
    const cards = document.querySelectorAll(".products .card");
    const buttons = document.querySelectorAll(".filters button");

    if (!cards.length) return;

    buttons.forEach(btn => btn.classList.remove("active"));

    cards.forEach(card => {
        if (category === "all" || card.dataset.category === category) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }
    });
}

function toggleMenu() {
    document.getElementById("navMenu").classList.toggle("active");
}
// ===============================
// TOAST MESSAGE
// ===============================
function toast(text) {
    const t = document.createElement("div");
    t.innerText = text;

    t.style.cssText = `
        position:fixed;
        bottom:20px;
        right:20px;
        background:#2f6b2f;
        color:white;
        padding:12px 22px;
        border-radius:8px;
        font-weight:600;
        font-size:14px;
        box-shadow:0 4px 10px rgba(0,0,0,0.2);
        z-index:9999;
    `;

    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
}

function generateOrderID() {
    const date = new Date();
    const random = Math.floor(1000 + Math.random() * 9000);
    return "VL" + date.getTime().toString().slice(-6) + random;
}


function toggleCart() {
    const sidebar = document.getElementById("cartSidebar");
    const overlay = document.getElementById("overlay");

    if (sidebar) sidebar.classList.toggle("active");
    if (overlay) overlay.classList.toggle("active");
}



// ===============================
// HEADER SCROLL EFFECT
// ===============================
window.addEventListener("scroll", () => {
    if (!header) return;

    if (!ticking) {
        window.requestAnimationFrame(() => {
            header.classList.toggle("scrolled", window.scrollY > 20);
            ticking = false;
        });
        ticking = true;
    }
});


// ===============================
// INITIALIZATION
// ===============================

document.addEventListener("DOMContentLoaded", () => {
    header = document.querySelector("header");
    updateCartCount();
    renderCart();
    loadCustomer();
    filterProducts("all");
    loadProductDetail();
});




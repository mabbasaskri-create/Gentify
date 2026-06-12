// ===== FIREBASE AUTH =====
// Replace with your Firebase project config from console.firebase.google.com
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

function signInWithGoogle() {
  return auth.signInWithPopup(googleProvider);
}

function signOutGoogle() {
  return auth.signOut();
}

auth.onAuthStateChanged(function(firebaseUser) {
  if (firebaseUser) {
    var users = getUsers();
    var existing = users.find(function(u) { return u.uid === firebaseUser.uid; }) || users.find(function(u) { return u.email === firebaseUser.email; });
    if (!existing) {
      users.push({
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || 'Google User',
        email: firebaseUser.email,
        password: 'firebase_managed',
        orders: generateMockOrders(firebaseUser.displayName || 'Google User', firebaseUser.email)
      });
      saveUsers(users);
    } else if (!existing.uid) {
      existing.uid = firebaseUser.uid;
      saveUsers(users);
    }
    saveCurrentUser({ name: firebaseUser.displayName || 'Google User', email: firebaseUser.email, uid: firebaseUser.uid });
  } else {
    saveCurrentUser(null);
  }
  updateUserNav();
});

// ===== PRODUCT DATA =====
const products = {
  caps: [
    { id: 'c1', name: 'Classic White Cap', desc: 'Cotton twill, adjustable strap. A timeless silhouette that pairs with everything — from weekend denim to tailored sports coats.', price: 29.99, badge: null, category: 'Caps',
      images: [
        'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&q=80',
        'https://images.unsplash.com/photo-1534215754734-18e55d13e346?w=600&q=80',
        'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80'
      ],
      sizes: ['S', 'M', 'L', 'XL'],
      colors: [{ name: 'White', hex: '#F5F5F0' }, { name: 'Black', hex: '#1A1A1A' }, { name: 'Navy', hex: '#1B2A4A' }] },
    { id: 'c2', name: 'Beige Dad Hat', desc: 'Vintage washed cotton with a relaxed, worn-in feel. The perfect low-profile cap for sunny days and easy errands.', price: 32.00, badge: 'Popular', category: 'Caps',
      images: [
        'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=600&q=80',
        'https://images.unsplash.com/photo-1595433707800-5b393e94297a?w=600&q=80',
        'https://images.unsplash.com/photo-1556306535-38febf6782e7?w=600&q=80'
      ],
      sizes: ['S', 'M', 'L', 'XL'],
      colors: [{ name: 'Beige', hex: '#D4C5A9' }, { name: 'Black', hex: '#1A1A1A' }, { name: 'Olive', hex: '#4A5D23' }] },
    { id: 'c3', name: 'Navy Snapback', desc: 'Structured crown with a flat brim. A bold, street-ready look backed by premium construction and all-day comfort.', price: 34.50, badge: null, category: 'Caps',
      images: [
        'https://images.unsplash.com/photo-1556306535-38febf6782e7?w=600&q=80',
        'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=600&q=80',
        'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&q=80'
      ],
      sizes: ['M', 'L', 'XL'],
      colors: [{ name: 'Navy', hex: '#1B2A4A' }, { name: 'Black', hex: '#1A1A1A' }, { name: 'Gray', hex: '#6B6B6B' }] },
    { id: 'c4', name: 'Olive Field Cap', desc: 'Heavy-duty canvas with a rugged, military-inspired build. Ready for the outdoors and built to last for years.', price: 36.00, badge: 'New', category: 'Caps',
      images: [
        'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=600&q=80',
        'https://images.unsplash.com/photo-1534215754734-18e55d13e346?w=600&q=80',
        'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=600&q=80'
      ],
      sizes: ['S', 'M', 'L', 'XL'],
      colors: [{ name: 'Olive', hex: '#4A5D23' }, { name: 'Tan', hex: '#C4A882' }, { name: 'Black', hex: '#1A1A1A' }] },
  ],
  watches: [
    { id: 'w1', name: 'Heritage Chronograph', desc: 'Stainless steel case with a premium leather strap. A precision chronograph that bridges classic style with everyday wearability.', price: 249.00, badge: 'Best Seller', category: 'Watches',
      images: [
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
        'https://images.unsplash.com/photo-1542496658-e33a6d38d2f6?w=600&q=80',
        'https://images.unsplash.com/photo-1587836374828-4dbafa94cfbe?w=600&q=80'
      ],
      sizes: ['Standard', 'Large'],
      colors: [{ name: 'Brown', hex: '#6B4226' }, { name: 'Black', hex: '#1A1A1A' }] },
    { id: 'w2', name: 'Minimalist Black', desc: '40mm case with scratch-resistant sapphire crystal. Clean, architectural design for those who believe less is always more.', price: 179.00, badge: null, category: 'Watches',
      images: [
        'https://images.unsplash.com/photo-1594534475808-b18fc33b045e?w=600&q=80',
        'https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=600&q=80',
        'https://images.unsplash.com/photo-1548171915-e79a380a2a4b?w=600&q=80'
      ],
      sizes: ['Standard', 'Large'],
      colors: [{ name: 'Black', hex: '#1A1A1A' }, { name: 'Silver', hex: '#C0C0C0' }] },
    { id: 'w3', name: 'Silver Classic', desc: 'Mesh band with a refined silver dial. Water resistant to 50m — elegant enough for the office, tough enough for the weekend.', price: 199.00, badge: null, category: 'Watches',
      images: [
        'https://images.unsplash.com/photo-1548171915-e79a380a2a4b?w=600&q=80',
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
        'https://images.unsplash.com/photo-1594534475808-b18fc33b045e?w=600&q=80'
      ],
      sizes: ['Standard'],
      colors: [{ name: 'Silver', hex: '#C0C0C0' }, { name: 'Gold', hex: '#C8965A' }] },
    { id: 'w4', name: 'Pilot Automatic', desc: 'Automatic movement with a 42mm case. Inspired by aviation instruments, built for the man who values precision and purpose.', price: 329.00, badge: 'Premium', category: 'Watches',
      images: [
        'https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=600&q=80',
        'https://images.unsplash.com/photo-1542496658-e33a6d38d2f6?w=600&q=80',
        'https://images.unsplash.com/photo-1587836374828-4dbafa94cfbe?w=600&q=80'
      ],
      sizes: ['Standard', 'Large'],
      colors: [{ name: 'Brown', hex: '#5C3A1E' }, { name: 'Black', hex: '#1A1A1A' }] },
  ],
  wallets: [
    { id: 'wl1', name: 'Bifold Leather Wallet', desc: 'Full-grain Italian leather that develops a rich patina over time. Eight card slots and a spacious bill compartment in a slim profile.', price: 79.00, badge: 'Best Seller', category: 'Wallets',
      images: [
        'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&q=80',
        'https://images.unsplash.com/photo-1606503825008-909a67e63c3d?w=600&q=80',
        'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&q=80'
      ],
      sizes: null,
      colors: [{ name: 'Brown', hex: '#6B4226' }, { name: 'Black', hex: '#1A1A1A' }, { name: 'Tan', hex: '#C4A882' }] },
    { id: 'wl2', name: 'Slim Card Holder', desc: 'RFID-protected with 8 card slots. Ultra-slim construction that disappears into your front pocket while keeping everything secure.', price: 49.00, badge: null, category: 'Wallets',
      images: [
        'https://images.unsplash.com/photo-1611010344444-5f9e4d86a6d8?w=600&q=80',
        'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&q=80',
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80'
      ],
      sizes: null,
      colors: [{ name: 'Black', hex: '#1A1A1A' }, { name: 'Brown', hex: '#6B4226' }, { name: 'Navy', hex: '#1B2A4A' }] },
    { id: 'wl3', name: 'Brown Trifold', desc: 'Classic three-fold design with a dedicated coin pocket. More carrying capacity without the bulk — the traditionalist\'s choice.', price: 89.00, badge: 'New', category: 'Wallets',
      images: [
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80',
        'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&q=80',
        'https://images.unsplash.com/photo-1606503825008-909a67e63c3d?w=600&q=80'
      ],
      sizes: null,
      colors: [{ name: 'Brown', hex: '#6B4226' }, { name: 'Tan', hex: '#C4A882' }, { name: 'Black', hex: '#1A1A1A' }] },
    { id: 'wl4', name: 'Money Clip Wallet', desc: 'Minimalist construction with a metal money clip and leather card slot. The fastest way to carry your daily essentials — nothing more.', price: 65.00, badge: null, category: 'Wallets',
      images: [
        'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&q=80',
        'https://images.unsplash.com/photo-1611010344444-5f9e4d86a6d8?w=600&q=80',
        'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&q=80'
      ],
      sizes: null,
      colors: [{ name: 'Black', hex: '#1A1A1A' }, { name: 'Brown', hex: '#6B4226' }] },
  ]
};

// ===== ACTIVE NAV =====
(function setActiveNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === page) a.classList.add('active');
  });
})();

// ===== CART STATE =====
let cart = JSON.parse(localStorage.getItem('dapperCart') || '[]');

// ===== DETAIL STATE =====
let detailProduct = null;
let detailSelectedSize = null;
let detailSelectedColor = null;
let detailQty = 1;
let detailCurrentImage = 0;

// ===== RENDER PRODUCTS =====
function renderProducts(list, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = list.map(p => `
    <div class="product-card" onclick="openProductDetail('${p.id}')">
      <div class="product-img-wrap">
        <img src="${p.images[0]}" alt="${p.name}" loading="lazy" />
        ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
      </div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.desc}</div>
        <div class="product-footer">
          <span class="product-price">$${p.price.toFixed(2)}</span>
          <button class="add-btn" onclick="event.stopPropagation(); quickAdd('${p.id}')">Add to Cart</button>
        </div>
      </div>
    </div>
  `).join('');
}

renderProducts(products.caps, 'capsGrid');
renderProducts(products.watches, 'watchesGrid');
renderProducts(products.wallets, 'walletsGrid');

// ===== QUICK ADD =====
function quickAdd(id) {
  const product = allProducts.find(p => p.id === id);
  if (!product) return;
  const size = product.sizes ? product.sizes[0] : null;
  const color = product.colors ? product.colors[0].name : null;
  addToCart(product, size, color, 1);
}

// ===== PRODUCT DETAIL =====
const allProducts = [...products.caps, ...products.watches, ...products.wallets];

function openProductDetail(id) {
  const product = allProducts.find(p => p.id === id);
  if (!product) return;
  detailProduct = product;
  detailQty = 1;
  detailCurrentImage = 0;
  detailSelectedSize = product.sizes ? product.sizes[0] : null;
  detailSelectedColor = product.colors ? product.colors[0].name : null;

  document.getElementById('detailCategory').textContent = product.category;
  document.getElementById('detailName').textContent = product.name;
  document.getElementById('detailPrice').textContent = '$' + product.price.toFixed(2);
  document.getElementById('detailDesc').textContent = product.desc;
  document.getElementById('detailQty').textContent = '1';

  updateDetailGallery();
  updateDetailOptions();
  updateDetailAddBtn();

  document.getElementById('detailOverlay').classList.add('open');
  document.body.classList.add('no-scroll');
}

function closeProductDetail(e) {
  if (e && e.target !== document.getElementById('detailOverlay')) return;
  document.getElementById('detailOverlay').classList.remove('open');
  document.body.classList.remove('no-scroll');
  detailProduct = null;
}

function updateDetailGallery() {
  if (!detailProduct) return;
  const mainImg = document.getElementById('detailMainImg');
  mainImg.src = detailProduct.images[detailCurrentImage];
  mainImg.alt = detailProduct.name;

  const thumbs = document.getElementById('detailThumbnails');
  thumbs.innerHTML = detailProduct.images.map((img, i) => `
    <div class="detail-thumb ${i === detailCurrentImage ? 'active' : ''}" onclick="switchDetailImage(${i})">
      <img src="${img}" alt="${detailProduct.name} view ${i + 1}" />
    </div>
  `).join('');
}

function switchDetailImage(index) {
  detailCurrentImage = index;
  updateDetailGallery();
}

function updateDetailOptions() {
  const container = document.getElementById('detailOptions');
  let html = '';

  if (detailProduct.sizes) {
    html += `<div class="option-group">
      <div class="option-label">Size <span>${detailSelectedSize}</span></div>
      <div class="size-options">
        ${detailProduct.sizes.map(s => `
          <button class="size-btn ${s === detailSelectedSize ? 'active' : ''}" onclick="selectDetailSize('${s}')">${s}</button>
        `).join('')}
      </div>
    </div>`;
  }

  if (detailProduct.colors) {
    html += `<div class="option-group">
      <div class="option-label">Color <span>${detailSelectedColor}</span></div>
      <div class="color-options">
        ${detailProduct.colors.map(c => `
          <label class="color-option">
            <span class="color-swatch ${c.name === detailSelectedColor ? 'active' : ''}" style="background:${c.hex}" onclick="selectDetailColor('${c.name}')"></span>
            <span class="color-swatch-label">${c.name}</span>
          </label>
        `).join('')}
      </div>
    </div>`;
  }

  container.innerHTML = html;
}

function selectDetailSize(size) {
  detailSelectedSize = size;
  updateDetailOptions();
}

function selectDetailColor(color) {
  detailSelectedColor = color;
  updateDetailOptions();
}

function detailQtyChange(delta) {
  detailQty = Math.max(1, detailQty + delta);
  document.getElementById('detailQty').textContent = detailQty;
  updateDetailAddBtn();
}

function updateDetailAddBtn() {
  const btn = document.getElementById('detailAddBtn');
  if (!detailProduct) return;
  btn.textContent = 'Add to Cart \u2014 $' + (detailProduct.price * detailQty).toFixed(2);
}

function detailAddToCart() {
  if (!detailProduct) return;
  addToCart(detailProduct, detailSelectedSize, detailSelectedColor, detailQty);
  closeProductDetail();
}

// ===== CART LOGIC =====
function addToCart(product, size, color, qty) {
  const cartKey = product.id + '|' + (size || '') + '|' + (color || '');
  const existing = cart.find(i => i.cartKey === cartKey);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ ...product, cartKey, selectedSize: size, selectedColor: color, qty });
  }
  saveCart();
  updateCartUI();
  showToast(`"${product.name}" added to cart`);
}

function saveCart() {
  localStorage.setItem('dapperCart', JSON.stringify(cart));
}

function updateCartUI() {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);

  const countEl = document.getElementById('cartCount');
  const totalEl = document.getElementById('cartTotal');
  const itemsEl = document.getElementById('cartItems');
  const footerEl = document.getElementById('cartFooter');

  if (countEl) countEl.textContent = count;
  if (totalEl) totalEl.textContent = '$' + total.toFixed(2);
  if (!itemsEl) return;

  if (cart.length === 0) {
    itemsEl.innerHTML = `<div class="cart-empty"><div class="empty-icon">&#x1F6CD;</div><p>Your cart is empty.<br>Start adding some essentials.</p></div>`;
    if (footerEl) footerEl.style.display = 'none';
  } else {
    if (footerEl) footerEl.style.display = 'block';
    itemsEl.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img src="${item.images[0]}" alt="${item.name}" />
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-options">${[item.selectedSize, item.selectedColor].filter(Boolean).join(' \u00B7 ')}</div>
          <div class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</div>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="changeQty('${item.cartKey}', -1)">&minus;</button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" onclick="changeQty('${item.cartKey}', 1)">+</button>
          </div>
          <button class="remove-item" onclick="removeItem('${item.cartKey}')">Remove</button>
        </div>
      </div>
    `).join('');
  }
}

function changeQty(cartKey, delta) {
  const item = cart.find(i => i.cartKey === cartKey);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => i.cartKey !== cartKey);
  saveCart();
  updateCartUI();
}

function removeItem(cartKey) {
  cart = cart.filter(i => i.cartKey !== cartKey);
  saveCart();
  updateCartUI();
}

function openCart() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  if (drawer) drawer.classList.add('open');
  if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  if (drawer) drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', () => {
  const cartBtn = document.getElementById('cartBtn');
  if (cartBtn) cartBtn.addEventListener('click', openCart);
});

function checkout() {
  showToast('Redirecting to checkout\u2026 (demo mode)');
  setTimeout(closeCart, 800);
}

// ===== TOAST =====
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window._toastTimeout);
  window._toastTimeout = setTimeout(() => t.classList.remove('show'), 2600);
}

// ===== NEWSLETTER =====
function subscribeNewsletter() {
  const val = document.getElementById('emailInput');
  if (!val) return;
  const email = val.value.trim();
  if (!email || !email.includes('@')) {
    showToast('Please enter a valid email address.');
    return;
  }
  val.value = '';
  showToast('You\'re subscribed! Welcome to Dapper.');
}

// ===== HAMBURGER =====
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburger');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      document.getElementById('navLinks').classList.toggle('open');
    });
  }
});

// ===== KEYBOARD =====
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const detail = document.getElementById('detailOverlay');
    if (detail && detail.classList.contains('open')) {
      closeProductDetail();
    } else {
      const drawer = document.getElementById('cartDrawer');
      if (drawer && drawer.classList.contains('open')) {
        closeCart();
      }
    }
  }
});

// ===== AUTH SYSTEM =====
function getUsers() { return JSON.parse(localStorage.getItem('dapperUsers') || '[]'); }
function saveUsers(users) { localStorage.setItem('dapperUsers', JSON.stringify(users)); }
function getCurrentUser() { return JSON.parse(localStorage.getItem('dapperCurrentUser') || 'null'); }
function saveCurrentUser(user) {
  if (user) localStorage.setItem('dapperCurrentUser', JSON.stringify(user));
  else localStorage.removeItem('dapperCurrentUser');
}

function loginUser(email, password) {
  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return { error: 'Invalid email or password.' };
  saveCurrentUser({ name: user.name, email: user.email });
  updateUserNav();
  return { success: true };
}

function signupUser(name, email, password) {
  const users = getUsers();
  if (users.find(u => u.email === email)) return { error: 'An account with this email already exists.' };
  if (password !== 'firebase_managed' && password.length < 6) return { error: 'Password must be at least 6 characters.' };
  users.push({ name, email, password, uid: null, orders: generateMockOrders(name, email) });
  saveUsers(users);
  saveCurrentUser({ name, email });
  updateUserNav();
  return { success: true };
}

function logoutUser() {
  auth.signOut();
  saveCurrentUser(null);
  updateUserNav();
  window.location.href = 'index.html';
}

function isLoggedIn() { return getCurrentUser() !== null; }

function requireAuth() {
  if (!isLoggedIn()) {
    const current = window.location.pathname.split('/').pop();
    window.location.href = 'login.html?redirect=' + current;
  }
}

function updateUserNav() {
  const user = getCurrentUser();
  const container = document.getElementById('userNav');
  if (!container) return;
  if (user) {
    container.innerHTML = `
      <div class="user-badge" onclick="toggleUserDropdown()">
        <span class="avatar">${user.name.charAt(0).toUpperCase()}</span>
        ${user.name.split(' ')[0]}
      </div>
      <div class="user-dropdown" id="userDropdown">
        <a href="orders.html">&#x1F4CB; My Orders</a>
        <a href="returns.html">&#x1F504; Returns</a>
        <a href="#" class="logout-option" onclick="logoutUser()">&#x2192; Logout</a>
      </div>
    `;
  } else {
    container.innerHTML = `<a href="login.html" class="user-link">Sign In</a>`;
  }
}

function toggleUserDropdown() {
  const dd = document.getElementById('userDropdown');
  if (dd) dd.classList.toggle('open');
}

document.addEventListener('click', (e) => {
  const dd = document.getElementById('userDropdown');
  if (dd && !e.target.closest('.user-badge') && !e.target.closest('.user-dropdown')) {
    dd.classList.remove('open');
  }
});

function generateMockOrders(name, email) {
  const now = Date.now();
  const products_list = [...products.caps, ...products.watches, ...products.wallets];
  const statuses = ['delivered', 'shipped', 'processing'];
  const orders = [];
  for (let i = 1; i <= 3; i++) {
    const items = [];
    const count = Math.floor(Math.random() * 2) + 1;
    let total = 0;
    for (let j = 0; j < count; j++) {
      const p = products_list[Math.floor(Math.random() * products_list.length)];
      const qty = Math.floor(Math.random() * 2) + 1;
      const color = p.colors ? p.colors[0].name : null;
      const size = p.sizes ? p.sizes[0] : null;
      items.push({ id: p.id, name: p.name, img: p.images[0], qty, price: p.price, color, size });
      total += p.price * qty;
    }
    const status = statuses[Math.min(i - 1, statuses.length - 1)];
    const daysAgo = (i - 1) * 14 + Math.floor(Math.random() * 7);
    const date = new Date(now - daysAgo * 86400000);
    orders.push({
      id: 'ORD-' + String(1000 + i).slice(-4),
      date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      total,
      items,
      status,
      tracking: '1Z' + Math.random().toString(36).slice(2, 10).toUpperCase(),
      timeline: [
        { time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), text: 'Order placed' },
        { time: new Date(date.getTime() + 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), text: 'Payment confirmed' },
        { time: new Date(date.getTime() + 2 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), text: 'Order processed' },
        status !== 'processing' ? { time: new Date(date.getTime() + 3 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), text: status === 'delivered' ? 'Delivered' : 'Shipped' } : null,
        status === 'delivered' ? { time: new Date(date.getTime() + 5 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), text: 'Delivered successfully' } : null,
      ].filter(Boolean)
    });
  }
  return orders;
}

// User nav init
document.addEventListener('DOMContentLoaded', () => {
  updateUserNav();
  updateCartUI();
});

// ===== GET USER ORDERS =====
function getUserOrders() {
  const user = getCurrentUser();
  if (!user) return [];
  const users = getUsers();
  const found = users.find(u => u.email === user.email);
  return found ? (found.orders || []) : [];
}

function getOrderById(orderId) {
  const orders = getUserOrders();
  return orders.find(o => o.id === orderId);
}

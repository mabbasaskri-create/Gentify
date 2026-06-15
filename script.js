// ===== FIREBASE AUTH =====
// Firebase is initialized in firebase.js (modular SDK)

window.onAuthStateChanged(function(firebaseUser) {
  if (firebaseUser) {
    var sessionUser = { name: firebaseUser.displayName || 'Google User', email: firebaseUser.email, uid: firebaseUser.uid };
    saveCurrentUser(sessionUser);

    var userData = {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || 'Google User',
      email: firebaseUser.email,
      password: 'firebase_managed',
      orders: [],
      cart: []
    };

    if (typeof window.getFirestoreUser === 'function') {
      window.getFirestoreUser(firebaseUser.email).then(function(existing) {
        if (existing) {
          var cache = getUsers();
          var idx = cache.findIndex(function(u) { return u.email === firebaseUser.email; });
          if (idx >= 0) cache[idx] = existing;
          else cache.push(existing);
          localStorage.setItem('gentifyUsers', JSON.stringify(cache));

          if (existing.cart) {
            cart = existing.cart;
            saveCart();
          }
        } else {
          window.setFirestoreUser(firebaseUser.email, userData).catch(function() {});
          var cache = getUsers();
          if (!cache.find(function(u) { return u.email === firebaseUser.email; })) {
            cache.push(userData);
            localStorage.setItem('gentifyUsers', JSON.stringify(cache));
          }
        }
      }).catch(function() {});
    }
  } else {
    saveCurrentUser(null);
  }
  updateUserNav();
});

// ===== PRODUCT DATA =====
var DEFAULT_PRODUCTS = {
  caps: [
    { id: 'c1', name: 'Classic White Cap', desc: 'Cotton twill, adjustable strap. A timeless silhouette that pairs with everything — from weekend denim to tailored sports coats.', price: 29.99, badge: null, category: 'Caps',
      images: ['https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&q=80','https://images.unsplash.com/photo-1534215754734-18e55d13e346?w=600&q=80','https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80'],
      sizes: ['S', 'M', 'L', 'XL'], colors: [{ name: 'White', hex: '#F5F5F0' }, { name: 'Black', hex: '#1A1A1A' }, { name: 'Navy', hex: '#1B2A4A' }] },
    { id: 'c2', name: 'Beige Dad Hat', desc: 'Vintage washed cotton with a relaxed, worn-in feel.', price: 32.00, badge: 'Popular', category: 'Caps',
      images: ['https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=600&q=80','https://images.unsplash.com/photo-1595433707800-5b393e94297a?w=600&q=80','https://images.unsplash.com/photo-1556306535-38febf6782e7?w=600&q=80'],
      sizes: ['S', 'M', 'L', 'XL'], colors: [{ name: 'Beige', hex: '#D4C5A9' }, { name: 'Black', hex: '#1A1A1A' }, { name: 'Olive', hex: '#4A5D23' }] },
    { id: 'c3', name: 'Navy Snapback', desc: 'Structured crown with a flat brim. A bold, street-ready look.', price: 34.50, badge: null, category: 'Caps',
      images: ['https://images.unsplash.com/photo-1556306535-38febf6782e7?w=600&q=80','https://images.unsplash.com/photo-1521369909029-2afed882baee?w=600&q=80','https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&q=80'],
      sizes: ['M', 'L', 'XL'], colors: [{ name: 'Navy', hex: '#1B2A4A' }, { name: 'Black', hex: '#1A1A1A' }, { name: 'Gray', hex: '#6B6B6B' }] },
    { id: 'c4', name: 'Olive Field Cap', desc: 'Heavy-duty canvas with a rugged, military-inspired build.', price: 36.00, badge: 'New', category: 'Caps',
      images: ['https://images.unsplash.com/photo-1521369909029-2afed882baee?w=600&q=80','https://images.unsplash.com/photo-1534215754734-18e55d13e346?w=600&q=80','https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=600&q=80'],
      sizes: ['S', 'M', 'L', 'XL'], colors: [{ name: 'Olive', hex: '#4A5D23' }, { name: 'Tan', hex: '#C4A882' }, { name: 'Black', hex: '#1A1A1A' }] }
  ],
  watches: [
    { id: 'w1', name: 'Heritage Chronograph', desc: 'Stainless steel case with a premium leather strap.', price: 249.00, badge: 'Best Seller', category: 'Watches',
      images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80','https://images.unsplash.com/photo-1542496658-e33a6d38d2f6?w=600&q=80','https://images.unsplash.com/photo-1587836374828-4dbafa94cfbe?w=600&q=80'],
      sizes: ['Standard', 'Large'], colors: [{ name: 'Brown', hex: '#6B4226' }, { name: 'Black', hex: '#1A1A1A' }] },
    { id: 'w2', name: 'Minimalist Black', desc: '40mm case with scratch-resistant sapphire crystal.', price: 179.00, badge: null, category: 'Watches',
      images: ['https://images.unsplash.com/photo-1594534475808-b18fc33b045e?w=600&q=80','https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=600&q=80','https://images.unsplash.com/photo-1548171915-e79a380a2a4b?w=600&q=80'],
      sizes: ['Standard', 'Large'], colors: [{ name: 'Black', hex: '#1A1A1A' }, { name: 'Silver', hex: '#C0C0C0' }] },
    { id: 'w3', name: 'Silver Classic', desc: 'Mesh band with a refined silver dial.', price: 199.00, badge: null, category: 'Watches',
      images: ['https://images.unsplash.com/photo-1548171915-e79a380a2a4b?w=600&q=80','https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80','https://images.unsplash.com/photo-1594534475808-b18fc33b045e?w=600&q=80'],
      sizes: ['Standard'], colors: [{ name: 'Silver', hex: '#C0C0C0' }, { name: 'Gold', hex: '#C8965A' }] },
    { id: 'w4', name: 'Pilot Automatic', desc: 'Automatic movement with a 42mm case.', price: 329.00, badge: 'Premium', category: 'Watches',
      images: ['https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=600&q=80','https://images.unsplash.com/photo-1542496658-e33a6d38d2f6?w=600&q=80','https://images.unsplash.com/photo-1587836374828-4dbafa94cfbe?w=600&q=80'],
      sizes: ['Standard', 'Large'], colors: [{ name: 'Brown', hex: '#5C3A1E' }, { name: 'Black', hex: '#1A1A1A' }] }
  ],
  wallets: [
    { id: 'wl1', name: 'Bifold Leather Wallet', desc: 'Full-grain Italian leather.', price: 79.00, badge: 'Best Seller', category: 'Wallets',
      images: ['https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&q=80','https://images.unsplash.com/photo-1606503825008-909a67e63c3d?w=600&q=80','https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&q=80'],
      sizes: null, colors: [{ name: 'Brown', hex: '#6B4226' }, { name: 'Black', hex: '#1A1A1A' }, { name: 'Tan', hex: '#C4A882' }] },
    { id: 'wl2', name: 'Slim Card Holder', desc: 'RFID-protected with 8 card slots.', price: 49.00, badge: null, category: 'Wallets',
      images: ['https://images.unsplash.com/photo-1611010344444-5f9e4d86a6d8?w=600&q=80','https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&q=80','https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80'],
      sizes: null, colors: [{ name: 'Black', hex: '#1A1A1A' }, { name: 'Brown', hex: '#6B4226' }, { name: 'Navy', hex: '#1B2A4A' }] },
    { id: 'wl3', name: 'Brown Trifold', desc: 'Classic three-fold design.', price: 89.00, badge: 'New', category: 'Wallets',
      images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80','https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&q=80','https://images.unsplash.com/photo-1606503825008-909a67e63c3d?w=600&q=80'],
      sizes: null, colors: [{ name: 'Brown', hex: '#6B4226' }, { name: 'Tan', hex: '#C4A882' }, { name: 'Black', hex: '#1A1A1A' }] },
    { id: 'wl4', name: 'Money Clip Wallet', desc: 'Minimalist construction.', price: 65.00, badge: null, category: 'Wallets',
      images: ['https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&q=80','https://images.unsplash.com/photo-1611010344444-5f9e4d86a6d8?w=600&q=80','https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&q=80'],
      sizes: null, colors: [{ name: 'Black', hex: '#1A1A1A' }, { name: 'Brown', hex: '#6B4226' }] }
  ]
};

function getProducts() {
  var stored = localStorage.getItem('gentifyProducts');
  if (stored) {
    var parsed = JSON.parse(stored);
    if (Object.keys(parsed).length > 0) return parsed;
  }
  return {};
}

function saveProducts(prods) {
  localStorage.setItem('gentifyProducts', JSON.stringify(prods));
  products = prods;
  allProducts = getAllProductsFlat();
  if (typeof window.syncProductsToFirestore === 'function') {
    window.syncProductsToFirestore(prods).catch(function() {});
  }
}

function getAllProductsFlat() {
  var prods = getProducts();
  var flat = [];
  Object.keys(prods).forEach(function(k) { flat = flat.concat(prods[k]); });
  return flat;
}

function addProduct(product) {
  var prods = getProducts();
  var cat = (product.category || 'Caps').toLowerCase();
  if (cat === 'caps') cat = 'caps';
  else if (cat === 'watches') cat = 'watches';
  else if (cat === 'wallets') cat = 'wallets';
  else cat = 'caps';
  if (!prods[cat]) prods[cat] = [];
  prods[cat].push(product);
  saveProducts(prods);
}

function updateProduct(id, updates) {
  var prods = getProducts();
  Object.keys(prods).forEach(function(k) {
    prods[k] = prods[k].map(function(p) { return p.id === id ? Object.assign({}, p, updates) : p; });
  });
  saveProducts(prods);
}

function deleteProduct(id) {
  var prods = getProducts();
  Object.keys(prods).forEach(function(k) {
    prods[k] = prods[k].filter(function(p) { return p.id !== id; });
  });
  saveProducts(prods);
}

let products = {};
let allProducts = [];

// ===== FIRESTORE SYNC =====
function loadProdFromFirestore() {
  if (typeof window.loadProductsFromFirestore !== 'function') return Promise.resolve(null);
  return window.loadProductsFromFirestore();
}

function syncToFirestore(prods) {
  if (typeof window.syncProductsToFirestore === 'function') {
    window.syncProductsToFirestore(prods || getProducts()).then(function() {
      // Use Firestore's timestamp as the authoritative one
      localStorage.setItem('gentifyProductsTS', String(Date.now()));
    }).catch(function() {});
  }
}

function syncFromFirestore(callback) {
  loadProdFromFirestore().then(function(result) {
    if (result && result.data && Object.keys(result.data).length > 0) {
      var localTS = parseInt(localStorage.getItem('gentifyProductsTS') || '0');
      if (result.updated > localTS || !localStorage.getItem('gentifyProducts')) {
        localStorage.setItem('gentifyProductsTS', String(result.updated));
        localStorage.setItem('gentifyProducts', JSON.stringify(result.data));
        products = result.data;
        allProducts = getAllProductsFlat();
      } else {
        products = getProducts();
        allProducts = getAllProductsFlat();
      }
    } else {
      products = getProducts();
      allProducts = getAllProductsFlat();
    }
    if (callback) callback();
  }).catch(function() {
    products = getProducts();
    allProducts = getAllProductsFlat();
    if (callback) callback();
  });
}

// Initialize: render from localStorage immediately, then sync from Firestore
(function initApp() {
  var cached = getProducts();
  if (Object.keys(cached).length > 0) {
    products = cached;
    allProducts = getAllProductsFlat();
    renderAllProductGrids();
  }
  syncFromFirestore(function() {
    renderAllProductGrids();
  });
  syncUsersFromFirestore();
})();

// ===== ACTIVE NAV =====
(function setActiveNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === page) a.classList.add('active');
  });
})();

// ===== CART STATE =====
let cart = JSON.parse(localStorage.getItem('gentifyCart') || '[]');

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
    <div class="product-card" onclick="location.href='product-detail.html?id=${p.id}'">
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

function renderAllProductGrids() {
  if (products.caps) renderProducts(products.caps, 'capsGrid');
  if (products.watches) renderProducts(products.watches, 'watchesGrid');
  if (products.wallets) renderProducts(products.wallets, 'walletsGrid');
  var premium = allProducts.filter(function(p) { return p.badge === 'Premium'; });
  if (premium.length > 0) renderProducts(premium, 'premiumGrid');
}

// ===== QUICK ADD =====
function quickAdd(id) {
  const product = allProducts.find(p => p.id === id);
  if (!product) return;
  const size = product.sizes ? product.sizes[0] : null;
  const color = product.colors ? product.colors[0].name : null;
  addToCart(product, size, color, 1);
}

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

// ===== PRODUCT DETAIL PAGE (standalone) =====
let pdProduct = null;
let pdSelectedSize = null;
let pdSelectedColor = null;
let pdQty = 1;
let pdCurrentImage = 0;

function renderProductDetailPage(id) {
  pdProduct = allProducts.find(function(p) { return p.id === id; });
  if (!pdProduct) {
    document.getElementById('pdLoading').style.display = 'none';
    document.getElementById('pdError').style.display = 'block';
    return;
  }

  pdQty = 1;
  pdCurrentImage = 0;
  pdSelectedSize = pdProduct.sizes ? pdProduct.sizes[0] : null;
  pdSelectedColor = pdProduct.colors ? pdProduct.colors[0].name : null;

  document.getElementById('pdLoading').style.display = 'none';
  document.getElementById('pdLayout').style.display = 'grid';

  document.getElementById('pdBreadcrumb').innerHTML = '<a href="' + pdProduct.category.toLowerCase() + '.html">' + pdProduct.category + '</a> <span class="pd-breadcrumb-sep">/</span> <span>' + pdProduct.name + '</span>';
  document.getElementById('pdName').textContent = pdProduct.name;
  document.getElementById('pdPrice').textContent = '$' + pdProduct.price.toFixed(2);
  document.getElementById('pdDesc').textContent = pdProduct.desc;
  document.getElementById('pdQty').textContent = '1';

  var badgeEl = document.getElementById('pdBadge');
  if (pdProduct.badge) {
    badgeEl.textContent = pdProduct.badge;
    badgeEl.style.display = 'inline-block';
  } else {
    badgeEl.style.display = 'none';
  }

  document.title = pdProduct.name + ' — Gentify Essentials';

  updatePdGallery();
  updatePdOptions();
  updatePdAddBtn();
}

function updatePdGallery() {
  if (!pdProduct) return;
  var mainImg = document.getElementById('pdMainImg');
  mainImg.src = pdProduct.images[pdCurrentImage];
  mainImg.alt = pdProduct.name;

  var thumbs = document.getElementById('pdThumbnails');
  thumbs.innerHTML = pdProduct.images.map(function(img, i) {
    return '<div class="pd-thumb' + (i === pdCurrentImage ? ' active' : '') + '" onclick="switchPdImage(' + i + ')">' +
      '<img src="' + img + '" alt="' + pdProduct.name + ' view ' + (i + 1) + '" />' +
      '</div>';
  }).join('');

  var prev = document.getElementById('pdPrevBtn');
  var next = document.getElementById('pdNextBtn');
  if (prev) prev.style.display = pdProduct.images.length > 1 ? 'flex' : 'none';
  if (next) next.style.display = pdProduct.images.length > 1 ? 'flex' : 'none';
}

function switchPdImage(index) {
  pdCurrentImage = index;
  updatePdGallery();
}

function pdPrevImage() {
  if (!pdProduct) return;
  pdCurrentImage = pdCurrentImage > 0 ? pdCurrentImage - 1 : pdProduct.images.length - 1;
  updatePdGallery();
}

function pdNextImage() {
  if (!pdProduct) return;
  pdCurrentImage = pdCurrentImage < pdProduct.images.length - 1 ? pdCurrentImage + 1 : 0;
  updatePdGallery();
}

function updatePdOptions() {
  if (!pdProduct) return;
  var container = document.getElementById('pdOptions');
  var html = '';

  if (pdProduct.sizes) {
    html += '<div class="option-group"><div class="option-label">Size <span>' + pdSelectedSize + '</span></div><div class="size-options">';
    pdProduct.sizes.forEach(function(s) {
      html += '<button class="size-btn' + (s === pdSelectedSize ? ' active' : '') + '" onclick="selectPdSize(\'' + s + '\')">' + s + '</button>';
    });
    html += '</div></div>';
  }

  if (pdProduct.colors) {
    html += '<div class="option-group"><div class="option-label">Color <span>' + pdSelectedColor + '</span></div><div class="color-options">';
    pdProduct.colors.forEach(function(c) {
      html += '<label class="color-option">' +
        '<span class="color-swatch' + (c.name === pdSelectedColor ? ' active' : '') + '" style="background:' + c.hex + '" onclick="selectPdColor(\'' + c.name + '\')"></span>' +
        '<span class="color-swatch-label">' + c.name + '</span>' +
        '</label>';
    });
    html += '</div></div>';
  }

  container.innerHTML = html;
}

function selectPdSize(size) {
  pdSelectedSize = size;
  updatePdOptions();
}

function selectPdColor(color) {
  pdSelectedColor = color;
  updatePdOptions();
}

function pdQtyChange(delta) {
  pdQty = Math.max(1, pdQty + delta);
  document.getElementById('pdQty').textContent = pdQty;
  updatePdAddBtn();
}

function updatePdAddBtn() {
  var btn = document.getElementById('pdAddBtn');
  if (!pdProduct) return;
  btn.textContent = 'Add to Cart \u2014 $' + (pdProduct.price * pdQty).toFixed(2);
}

function pdAddToCart() {
  if (!pdProduct) return;
  addToCart(pdProduct, pdSelectedSize, pdSelectedColor, pdQty);
  showToast('"' + pdProduct.name + '" added to cart');
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
  localStorage.setItem('gentifyCart', JSON.stringify(cart));
  var user = getCurrentUser();
  if (user && typeof window.getFirestoreUser === 'function') {
    window.getFirestoreUser(user.email).then(function(data) {
      if (data) {
        data.cart = cart;
        window.setFirestoreUser(user.email, data).catch(function() {});
      }
    }).catch(function() {});
  }
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
  showToast('You\'re subscribed! Welcome to Gentify.');
}

// ===== HAMBURGER =====
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (hamburger && navLinks) {
    var overlay = document.createElement('div');
    overlay.className = 'nav-overlay';
    overlay.onclick = function() { navLinks.classList.remove('open'); overlay.classList.remove('show'); };
    document.body.appendChild(overlay);
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      overlay.classList.toggle('show');
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
function getUsers() { return JSON.parse(localStorage.getItem('gentifyUsers') || '[]'); }
function saveUsers(users) {
  localStorage.setItem('gentifyUsers', JSON.stringify(users));
  if (typeof window.setFirestoreUser === 'function') {
    users.forEach(function(u) {
      if (u.email) window.setFirestoreUser(u.email, u).catch(function() {});
    });
  }
}
function getCurrentUser() { return JSON.parse(localStorage.getItem('gentifyCurrentUser') || 'null'); }
function saveCurrentUser(user) {
  if (user) localStorage.setItem('gentifyCurrentUser', JSON.stringify(user));
  else localStorage.removeItem('gentifyCurrentUser');
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
  var users = getUsers();
  if (users.find(function(u) { return u.email === email; })) return { error: 'An account with this email already exists.' };
  if (password !== 'firebase_managed' && password.length < 6) return { error: 'Password must be at least 6 characters.' };
  var newUser = { name: name, email: email, password: password, uid: null, orders: [], cart: [] };
  users.push(newUser);
  if (typeof window.setFirestoreUser === 'function') {
    window.setFirestoreUser(email, newUser).catch(function() {});
  }
  localStorage.setItem('gentifyUsers', JSON.stringify(users));
  saveCurrentUser({ name: name, email: email });
  updateUserNav();
  return { success: true };
}

function logoutUser() {
  window.signOutGoogle();
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
    var isAdmin = user.email === 'm.abbas.askri@gmail.com';
    container.innerHTML = `
      <div class="user-badge" onclick="toggleUserDropdown()">
        <span class="avatar">${user.name.charAt(0).toUpperCase()}</span>
        ${user.name.split(' ')[0]}
      </div>
      <div class="user-dropdown" id="userDropdown">
        ${isAdmin ? '<a href="admin.html">&#x1F6E1; Admin Panel</a>' : ''}
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
  var user = getCurrentUser();
  if (!user) return [];
  var users = getUsers();
  var found = users.find(function(u) { return u.email === user.email; });
  return found ? (found.orders || []) : [];
}

function getOrderById(orderId) {
  var orders = getUserOrders();
  return orders.find(function(o) { return o.id === orderId; });
}

function updateOrderStatus(userEmail, orderId, newStatus) {
  var users = getUsers();
  var user = users.find(function(u) { return u.email === userEmail; });
  if (!user || !user.orders) return;
  var order = user.orders.find(function(o) { return o.id === orderId; });
  if (!order) return;
  order.status = newStatus;
  saveUsers(users);
  showToast('Order ' + orderId + ' updated to ' + newStatus);
}

function syncUsersFromFirestore(callback) {
  if (typeof window.getFirestoreUsers !== 'function') {
    if (callback) callback();
    return;
  }
  window.getFirestoreUsers().then(function(users) {
    if (users && users.length > 0) {
      users.forEach(function(u) {
        if (!u.cart) u.cart = [];
        if (!u.orders) u.orders = [];
      });
      localStorage.setItem('gentifyUsers', JSON.stringify(users));
    }
    if (callback) callback();
  }).catch(function() {
    if (callback) callback();
  });
}

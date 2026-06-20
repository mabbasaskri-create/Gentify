// ===== FIREBASE AUTH =====
// Firebase is initialized in firebase.js (modular SDK)

window.onAuthStateChanged(function(firebaseUser) {
  var page = window.location.pathname.split('/').pop();

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
          try { localStorage.setItem('gentifyUsers', JSON.stringify(cache)); } catch (e) {}

          if (existing.cart && !sessionStorage.getItem('gentifyCheckoutItems')) {
            existing.cart.forEach(function(fsItem) {
              if (!cart.find(function(c) { return c.cartKey === fsItem.cartKey; })) {
                cart.push(fsItem);
              }
            });
            saveCart();
            updateCartUI();
            if (typeof renderCheckout === 'function') renderCheckout();
          }
        } else {
          window.setFirestoreUser(firebaseUser.email, userData).then(function() {
            saveCart();
            updateCartUI();
            if (typeof renderCheckout === 'function') renderCheckout();
          }).catch(function() {});
          var cache = getUsers();
          if (!cache.find(function(u) { return u.email === firebaseUser.email; })) {
            cache.push(userData);
            try { localStorage.setItem('gentifyUsers', JSON.stringify(cache)); } catch (e) {}
          }
        }
      }).catch(function() {});
    }

    if (page === 'login.html' || page === 'signup.html') {
      var params = new URLSearchParams(window.location.search);
      var redirectPath = params.get('redirect') || 'orders.html';
      window.location.href = redirectPath;
      return;
    }
  } else {
    saveCurrentUser(null);
  }
  updateUserNav();
});

// ===== PRODUCT DATA =====
var DEFAULT_PRODUCTS = {
  caps: [
    { id: 'c1', name: 'Classic White Cap', desc: 'Cotton twill, adjustable strap. A timeless silhouette that pairs with everything — from weekend denim to tailored sports coats.', price: 8399, badge: null, premium: false, category: 'Caps',
      images: ['https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&q=80','https://images.unsplash.com/photo-1534215754734-18e55d13e346?w=600&q=80','https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80'],
      sizes: ['S', 'M', 'L', 'XL'], colors: [{ name: 'White', hex: '#F5F5F0' }, { name: 'Black', hex: '#1A1A1A' }, { name: 'Navy', hex: '#1B2A4A' }] },
    { id: 'c2', name: 'Beige Dad Hat', desc: 'Vintage washed cotton with a relaxed, worn-in feel.', price: 8999, badge: 'Popular', premium: false, category: 'Caps',
      images: ['https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=600&q=80','https://images.unsplash.com/photo-1595433707800-5b393e94297a?w=600&q=80','https://images.unsplash.com/photo-1556306535-38febf6782e7?w=600&q=80'],
      sizes: ['S', 'M', 'L', 'XL'], colors: [{ name: 'Beige', hex: '#D4C5A9' }, { name: 'Black', hex: '#1A1A1A' }, { name: 'Olive', hex: '#4A5D23' }] },
    { id: 'c3', name: 'Navy Snapback', desc: 'Structured crown with a flat brim. A bold, street-ready look.', price: 9699, badge: null, premium: false, category: 'Caps',
      images: ['https://images.unsplash.com/photo-1556306535-38febf6782e7?w=600&q=80','https://images.unsplash.com/photo-1521369909029-2afed882baee?w=600&q=80','https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&q=80'],
      sizes: ['M', 'L', 'XL'], colors: [{ name: 'Navy', hex: '#1B2A4A' }, { name: 'Black', hex: '#1A1A1A' }, { name: 'Gray', hex: '#6B6B6B' }] },
    { id: 'c4', name: 'Olive Field Cap', desc: 'Heavy-duty canvas with a rugged, military-inspired build.', price: 9999, badge: 'New', premium: false, category: 'Caps',
      images: ['https://images.unsplash.com/photo-1521369909029-2afed882baee?w=600&q=80','https://images.unsplash.com/photo-1534215754734-18e55d13e346?w=600&q=80','https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=600&q=80'],
      sizes: ['S', 'M', 'L', 'XL'], colors: [{ name: 'Olive', hex: '#4A5D23' }, { name: 'Tan', hex: '#C4A882' }, { name: 'Black', hex: '#1A1A1A' }] }
  ],
  watches: [
    { id: 'w1', name: 'Heritage Chronograph', desc: 'Stainless steel case with a premium leather strap.', price: 69999, badge: 'Best Seller', premium: true, category: 'Watches',
      images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80','https://images.unsplash.com/photo-1542496658-e33a6d38d2f6?w=600&q=80','https://images.unsplash.com/photo-1587836374828-4dbafa94cfbe?w=600&q=80'],
      sizes: ['Standard', 'Large'], colors: [{ name: 'Brown', hex: '#6B4226' }, { name: 'Black', hex: '#1A1A1A' }] },
    { id: 'w2', name: 'Minimalist Black', desc: '40mm case with scratch-resistant sapphire crystal.', price: 49999, badge: null, premium: false, category: 'Watches',
      images: ['https://images.unsplash.com/photo-1594534475808-b18fc33b045e?w=600&q=80','https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=600&q=80','https://images.unsplash.com/photo-1548171915-e79a380a2a4b?w=600&q=80'],
      sizes: ['Standard', 'Large'], colors: [{ name: 'Black', hex: '#1A1A1A' }, { name: 'Silver', hex: '#C0C0C0' }] },
    { id: 'w3', name: 'Silver Classic', desc: 'Mesh band with a refined silver dial.', price: 55999, badge: null, premium: true, category: 'Watches',
      images: ['https://images.unsplash.com/photo-1548171915-e79a380a2a4b?w=600&q=80','https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80','https://images.unsplash.com/photo-1594534475808-b18fc33b045e?w=600&q=80'],
      sizes: ['Standard'], colors: [{ name: 'Silver', hex: '#C0C0C0' }, { name: 'Gold', hex: '#C8965A' }] },
    { id: 'w4', name: 'Pilot Automatic', desc: 'Automatic movement with a 42mm case.', price: 92999, badge: 'Premium', premium: true, category: 'Watches',
      images: ['https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=600&q=80','https://images.unsplash.com/photo-1542496658-e33a6d38d2f6?w=600&q=80','https://images.unsplash.com/photo-1587836374828-4dbafa94cfbe?w=600&q=80'],
      sizes: ['Standard', 'Large'], colors: [{ name: 'Brown', hex: '#5C3A1E' }, { name: 'Black', hex: '#1A1A1A' }] }
  ],
  wallets: [
    { id: 'wl1', name: 'Bifold Leather Wallet', desc: 'Full-grain Italian leather.', price: 22999, badge: 'Best Seller', premium: true, category: 'Wallets',
      images: ['https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&q=80','https://images.unsplash.com/photo-1606503825008-909a67e63c3d?w=600&q=80','https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&q=80'],
      sizes: null, colors: [{ name: 'Brown', hex: '#6B4226' }, { name: 'Black', hex: '#1A1A1A' }, { name: 'Tan', hex: '#C4A882' }] },
    { id: 'wl2', name: 'Slim Card Holder', desc: 'RFID-protected with 8 card slots.', price: 13999, badge: null, premium: false, category: 'Wallets',
      images: ['https://images.unsplash.com/photo-1611010344444-5f9e4d86a6d8?w=600&q=80','https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&q=80','https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80'],
      sizes: null, colors: [{ name: 'Black', hex: '#1A1A1A' }, { name: 'Brown', hex: '#6B4226' }, { name: 'Navy', hex: '#1B2A4A' }] },
    { id: 'wl3', name: 'Brown Trifold', desc: 'Classic three-fold design.', price: 24999, badge: 'New', premium: false, category: 'Wallets',
      images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80','https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&q=80','https://images.unsplash.com/photo-1606503825008-909a67e63c3d?w=600&q=80'],
      sizes: null, colors: [{ name: 'Brown', hex: '#6B4226' }, { name: 'Tan', hex: '#C4A882' }, { name: 'Black', hex: '#1A1A1A' }] },
    { id: 'wl4', name: 'Money Clip Wallet', desc: 'Minimalist construction.', price: 18999, badge: null, premium: false, category: 'Wallets',
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
  try {
    localStorage.setItem('gentifyProducts', JSON.stringify(prods));
    localStorage.setItem('gentifyProductsTS', String(Date.now()));
  } catch (e) {
    var slim = JSON.parse(JSON.stringify(prods));
    Object.keys(slim).forEach(function(cat) {
      slim[cat].forEach(function(p) {
        if (p.images && p.images.length > 1) p.images = [p.images[0]];
      });
    });
    try {
      localStorage.setItem('gentifyProducts', JSON.stringify(slim));
      localStorage.setItem('gentifyProductsTS', String(Date.now()));
    } catch (e2) {
      var thinner = JSON.parse(JSON.stringify(slim));
      Object.keys(thinner).forEach(function(cat) {
        thinner[cat].forEach(function(p) { p.images = []; });
      });
      try {
        localStorage.setItem('gentifyProducts', JSON.stringify(thinner));
        localStorage.setItem('gentifyProductsTS', String(Date.now()));
      } catch (e3) {}
    }
  }
  products = prods;
  allProducts = getAllProductsFlat();
  syncToFirestore(prods);
}

function getAllProductsFlat() {
  var prods = getProducts();
  var flat = [];
  Object.keys(prods).forEach(function(k) { flat = flat.concat(prods[k]); });
  return flat;
}

function formatPrice(amount) {
  return 'Rs. ' + Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function addProduct(product) {
  var prods = getProducts();
  var cat = product._categoryKey || product.categoryKey || 'caps';
  if (!prods[cat]) prods[cat] = [];
  if (!product.categoryKey) product.categoryKey = cat;
  prods[cat].push(product);
  delete product._categoryKey;
  saveProducts(prods);
}

function updateProduct(id, updates) {
  var prods = getProducts();
  var newCat = updates._categoryKey;
  delete updates._categoryKey;
  var found = null;
  Object.keys(prods).forEach(function(k) {
    prods[k] = prods[k].filter(function(p) {
      if (p.id === id) { found = Object.assign({}, p, updates); return false; }
      return true;
    });
  });
  if (found) {
    var targetCat = newCat || found.categoryKey || 'caps';
    found.categoryKey = targetCat;
    if (!prods[targetCat]) prods[targetCat] = [];
    prods[targetCat].push(found);
  }
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
      try { localStorage.setItem('gentifyProductsTS', String(Date.now())); } catch (e) {}
    }).catch(function() {});
  }
}

function syncFromFirestore(callback) {
  loadProdFromFirestore().then(function(result) {
    if (result && result.data && Object.keys(result.data).length > 0) {
      var localTS = parseInt(localStorage.getItem('gentifyProductsTS') || '0', 10);
      if (result.updated > localTS) {
        try {
          localStorage.setItem('gentifyProductsTS', String(result.updated));
          localStorage.setItem('gentifyProducts', JSON.stringify(result.data));
        } catch (e) {
          var slim = JSON.parse(JSON.stringify(result.data));
          Object.keys(slim).forEach(function(cat) {
            slim[cat].forEach(function(p) {
              if (p.images && p.images.length > 1) p.images = [p.images[0]];
            });
          });
          try {
            localStorage.setItem('gentifyProducts', JSON.stringify(slim));
          } catch (e2) {
            var thinner = JSON.parse(JSON.stringify(slim));
            Object.keys(thinner).forEach(function(cat) {
              thinner[cat].forEach(function(p) { p.images = []; });
            });
            try { localStorage.setItem('gentifyProducts', JSON.stringify(thinner)); } catch (e3) {}
          }
        }
        products = result.data;
        allProducts = getAllProductsFlat();
      }
    }
    if (callback) callback();
  }).catch(function() {
    if (callback) callback();
  });
}

function syncCollectionsFromFirestore(callback) {
  if (typeof window.loadCollectionsFromFirestore !== 'function') {
    if (callback) callback();
    return;
  }
  window.loadCollectionsFromFirestore().then(function(result) {
    if (result && result.data && result.data.length > 0) {
      try { localStorage.setItem('gentifyCollections', JSON.stringify(result.data)); } catch (e) {}
    }
    if (callback) callback();
  }).catch(function() {
    if (callback) callback();
  });
}

// ===== BANNER =====
function getBannerData() {
  var d = localStorage.getItem('gentifyBanner');
  if (d) { try { return JSON.parse(d); } catch(e) {} }
  return { desktop: '', mobile: '' };
}

function scrollToShop() {
  var el = document.getElementById('collectionsGrid');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function renderBanner() {
  var hero = document.getElementById('hero');
  var bannerImg = document.getElementById('bannerImg');
  var bannerPicture = document.getElementById('bannerPicture');
  var bannerSource = document.getElementById('bannerSourceMobile');
  var heroContent = document.getElementById('heroContent');
  if (!bannerImg) return;
  var data = getBannerData();
  var hasDesktop = data.desktop && data.desktop.length > 0;
  var hasMobile = data.mobile && data.mobile.length > 0;
  if (hasDesktop) {
    bannerImg.src = data.desktop;
    if (bannerSource) {
      if (hasMobile) {
        bannerSource.srcset = data.mobile;
        bannerSource.style.display = '';
      } else {
        bannerSource.srcset = '';
        bannerSource.style.display = 'none';
      }
    }
    if (hero) hero.classList.add('banner-has-image');
  } else if (hasMobile) {
    bannerImg.src = data.mobile;
    if (bannerSource) bannerSource.style.display = 'none';
    if (hero) hero.classList.add('banner-has-image');
  } else {
    if (hero) hero.classList.remove('banner-has-image');
    bannerImg.src = '';
    if (bannerSource) {
      bannerSource.srcset = '';
      bannerSource.style.display = '';
    }
  }
  bannerImg.style.cursor = (hasDesktop || hasMobile) ? 'pointer' : '';
  bannerImg.onclick = (hasDesktop || hasMobile) ? scrollToShop : null;
}

// Initialize: render from cache instantly, then sync Firestore in background
(function initApp() {
  var cached = getProducts();
  if (Object.keys(cached).length === 0) {
    try { localStorage.setItem('gentifyProducts', JSON.stringify(DEFAULT_PRODUCTS)); } catch (e) {}
    try { localStorage.setItem('gentifyProductsTS', String(Date.now())); } catch (e) {}
    products = DEFAULT_PRODUCTS;
    allProducts = getAllProductsFlat();
  } else {
    products = cached;
    allProducts = getAllProductsFlat();
  }
  renderBanner();
  renderAllProductGrids();
  renderCollections();
  syncFromFirestore(function() {
    renderAllProductGrids();
  });
  syncCollectionsFromFirestore(function() {
    renderCollections();
  });
  syncBannerFromFirestore(function() {
    renderBanner();
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
let cart = JSON.parse(localStorage.getItem('gentifyCart') || '[]').map(function(item) {
  return { id: item.id, cartKey: item.cartKey, selectedSize: item.selectedSize, selectedColor: item.selectedColor, qty: item.qty, name: item.name, price: item.price, images: item.images || [] };
});
var DELIVERY_CHARGES = 300;

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
        <div class="product-footer">
          <span class="product-price">${formatPrice(p.price)}${p.retailPrice && p.retailPrice > p.price ? ' <span class="retail-price" style="text-decoration:line-through;color:var(--gray);margin-left:6px;font-size:0.82rem">' + formatPrice(p.retailPrice) + '</span>' : ''}</span>
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
  var premium = allProducts.filter(function(p) { return p.premium; });
  if (premium.length > 0) renderProducts(premium, 'premiumGrid');
}

// ===== SHOP BY COLLECTION =====
function getCollections() {
  var d = localStorage.getItem('gentifyCollections');
  if (d) { var p = JSON.parse(d); if (p && p.length > 0) return p; }
  return [
    { name: 'Caps', image: '', link: 'caps.html' },
    { name: 'Wallets', image: '', link: 'wallets.html' },
    { name: 'Watches', image: '', link: 'watches.html' }
  ];
}

function renderCollections() {
  var grid = document.getElementById('collectionsGrid');
  if (!grid) return;
  var cols = getCollections();
  grid.innerHTML = cols.map(function(c) {
    var img = c.image ? '<img src="' + c.image + '" alt="' + c.name + '" />' : '';
    return '<a href="' + c.link + '" class="collection-card">' +
      img + '<div class="overlay"></div>' +
      '<span class="col-name">' + c.name + '</span></a>';
  }).join('');
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
  document.getElementById('detailPrice').innerHTML = formatPrice(product.price) + (product.retailPrice && product.retailPrice > product.price ? ' <span class="retail-price" style="text-decoration:line-through;color:var(--gray);margin-left:8px;font-size:0.9rem">' + formatPrice(product.retailPrice) + '</span>' : '');
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
  btn.textContent = 'Add to Cart';
}

function detailAddToCart() {
  if (!detailProduct) return;
  addToCart(detailProduct, detailSelectedSize, detailSelectedColor, detailQty);
  closeProductDetail();
}

function detailBuyNow() {
  if (!detailProduct) return;
  var p = detailProduct, s = detailSelectedSize, c = detailSelectedColor, q = detailQty;
  closeProductDetail();
  sessionStorage.setItem('gentifyCheckoutItems', JSON.stringify([{
    id: p.id, name: p.name, price: p.price, images: p.images,
    selectedSize: s, selectedColor: c, qty: q
  }]));
  window.location.href = 'checkout.html';
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
  document.getElementById('pdPrice').innerHTML = formatPrice(pdProduct.price) + (pdProduct.retailPrice && pdProduct.retailPrice > pdProduct.price ? ' <span class="retail-price" style="text-decoration:line-through;color:var(--gray);margin-left:8px;font-size:0.9rem">' + formatPrice(pdProduct.retailPrice) + '</span>' : '');
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
  btn.textContent = 'Add to Cart';
}

function pdAddToCart() {
  if (!pdProduct) return;
  addToCart(pdProduct, pdSelectedSize, pdSelectedColor, pdQty);
  showToast('"' + pdProduct.name + '" added to cart');
}

function pdBuyNow() {
  if (!pdProduct) return;
  sessionStorage.setItem('gentifyCheckoutItems', JSON.stringify([{
    id: pdProduct.id,
    name: pdProduct.name,
    price: pdProduct.price,
    images: pdProduct.images,
    selectedSize: pdSelectedSize,
    selectedColor: pdSelectedColor,
    qty: pdQty
  }]));
  window.location.href = 'checkout.html';
}

// ===== CART LOGIC =====
function addToCart(product, size, color, qty) {
  const cartKey = product.id + '|' + (size || '') + '|' + (color || '');
  const existing = cart.find(i => i.cartKey === cartKey);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id: product.id, cartKey, selectedSize: size, selectedColor: color, qty, name: product.name, price: product.price, images: product.images ? [product.images[0]] : [] });
  }
  saveCart();
  updateCartUI();
  showToast(`"${product.name}" added to cart`);
}

function saveCart() {
  var user = getCurrentUser();
  if (user && typeof window.setFirestoreUser === 'function') {
    window.getFirestoreUser(user.email).then(function(data) {
      if (data) {
        data.cart = cart;
        window.setFirestoreUser(user.email, data).catch(function() {});
      }
    }).catch(function() {});
  } else {
    try {
      localStorage.setItem('gentifyCart', JSON.stringify(cart));
    } catch (e) {}
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
  if (totalEl) totalEl.textContent = formatPrice(total);
  if (!itemsEl) return;

  if (cart.length === 0) {
    itemsEl.innerHTML = `<div class="cart-empty"><div class="empty-icon">&#x1F6CD;</div><p>Your cart is empty.<br>Start adding some essentials.</p></div>`;
    if (footerEl) footerEl.style.display = 'none';
  } else {
    if (footerEl) footerEl.style.display = 'block';
    itemsEl.innerHTML = cart.map(item => {
      const full = allProducts.find(p => p.id === item.id);
      return `
      <div class="cart-item">
        <img src="${full ? full.images[0] : ''}" alt="${item.name}" />
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-options">${[item.selectedSize, item.selectedColor].filter(Boolean).join(' \u00B7 ')}</div>
          <div class="cart-item-price">${formatPrice(item.price * item.qty)}</div>
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="changeQty('${item.cartKey}', -1)">&minus;</button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" onclick="changeQty('${item.cartKey}', 1)">+</button>
          </div>
          <button class="remove-item" onclick="removeItem('${item.cartKey}')">Remove</button>
        </div>
      </div>`;
    }).join('');
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
  closeCart();
  if (cart.length > 0) {
    sessionStorage.setItem('gentifyCheckoutItems', JSON.stringify(cart));
    cart = [];
    saveCart();
    updateCartUI();
  }
  try { localStorage.setItem('gentifyCart', JSON.stringify(cart)); } catch (e) {}
  if (!isLoggedIn()) {
    window.location.href = 'login.html?redirect=checkout.html';
    return;
  }
  window.location.href = 'checkout.html';
}

function checkoutCart() {
  if (cart.length === 0) { showToast('Your cart is empty.'); return; }
  sessionStorage.setItem('gentifyCheckoutItems', JSON.stringify(cart));
  cart = [];
  saveCart();
  updateCartUI();
  try { localStorage.setItem('gentifyCart', JSON.stringify(cart)); } catch (e) {}
  if (!isLoggedIn()) { window.location.href = 'login.html?redirect=checkout.html'; return; }
  window.location.href = 'checkout.html';
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
  try {
    localStorage.setItem('gentifyUsers', JSON.stringify(users));
  } catch (e) {
    showToast('Storage full! Unable to save user data.');
  }
  if (typeof window.setFirestoreUser === 'function') {
    users.forEach(function(u) {
      if (u.email) window.setFirestoreUser(u.email, u).catch(function() {});
    });
  }
}
function getCurrentUser() { return JSON.parse(localStorage.getItem('gentifyCurrentUser') || 'null'); }
function saveCurrentUser(user) {
  if (user) { try { localStorage.setItem('gentifyCurrentUser', JSON.stringify(user)); } catch (e) {} }
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
  try { localStorage.setItem('gentifyUsers', JSON.stringify(users)); } catch (e) {}
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
        <span class="user-name">${user.name.split(' ')[0]}</span>
      </div>
      <div class="user-dropdown" id="userDropdown">
        ${isAdmin ? '<a href="admin.html">&#x1F6E1; Admin Panel</a>' : ''}
        <a href="orders.html">&#x1F4CB; My Orders</a>
        <a href="returns.html">&#x1F504; Returns</a>
        <a href="#" class="logout-option" onclick="logoutUser()">&#x2192; Logout</a>
      </div>
    `;
  } else {
    container.innerHTML = `<a href="login.html" class="user-link"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span class="user-label">Sign In</span></a>`;
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
  var now = Date.now();
  var products_list = getAllProductsFlat();
  if (products_list.length === 0) return [];
  var statuses = ['Delivered', 'Shipped', 'Pending'];
  var orders = [];
  for (var i = 1; i <= 3; i++) {
    var items = [];
    var count = Math.floor(Math.random() * 2) + 1;
    var subtotal = 0;
    for (var j = 0; j < count; j++) {
      var p = products_list[Math.floor(Math.random() * products_list.length)];
      var qty = Math.floor(Math.random() * 2) + 1;
      var color = p.colors ? p.colors[0].name : null;
      var size = p.sizes ? p.sizes[0] : null;
      items.push({ id: p.id, name: p.name, img: p.images[0], qty: qty, price: p.price, color: color, size: size });
      subtotal += p.price * qty;
    }
    var status = statuses[Math.min(i - 1, statuses.length - 1)];
    var daysAgo = (i - 1) * 14 + Math.floor(Math.random() * 7);
    var date = new Date(now - daysAgo * 86400000);
    var deliveryCharges = 300;
    var total = subtotal + deliveryCharges;
    orders.push({
      id: 'ORD-' + String(1000 + i).slice(-4),
      customerName: name || 'Customer',
      phone: '03123456789',
      email: email,
      address: '123 Main Street, Lahore',
      city: 'Lahore',
      postalCode: '54000',
      orderNotes: '',
      additionalInstructions: '',
      date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      dateTime: date.toISOString(),
      items: items,
      subtotal: subtotal,
      deliveryCharges: deliveryCharges,
      total: total,
      paymentMethod: 'Cash on Delivery',
      status: status,
      tracking: '1Z' + Math.random().toString(36).slice(2, 10).toUpperCase(),
      timeline: [
        { time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), text: 'Order placed' },
        { time: new Date(date.getTime() + 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), text: 'Order confirmed' },
        status !== 'Pending' ? { time: new Date(date.getTime() + 2 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), text: 'Order shipped' } : null,
        status === 'Delivered' ? { time: new Date(date.getTime() + 4 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), text: 'Delivered successfully' } : null,
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

function cancelMyOrder(orderId) {
  var user = getCurrentUser();
  if (!user) { showToast('Please sign in.'); return; }
  var users = getUsers();
  var found = users.find(function(u) { return u.email === user.email; });
  if (!found || !found.orders) return;
  var order = found.orders.find(function(o) { return o.id === orderId; });
  if (!order) return;
  var s = (order.status || '').toLowerCase();
  if (s !== 'pending' && s !== 'confirmed') {
    showToast('This order can no longer be cancelled.');
    return;
  }
  order.status = 'cancelled';
  if (!order.timeline) order.timeline = [];
  order.timeline.push({
    time: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    text: 'Order cancelled by customer'
  });
  saveUsers(users);
  showToast('Order ' + orderId + ' has been cancelled.');
  if (typeof renderOrders === 'function') renderOrders();
  if (typeof renderTracking === 'function') renderTracking();
}

function updateOrderStatus(userEmail, orderId, newStatus) {
  var users = getUsers();
  var user = users.find(function(u) { return u.email === userEmail; });
  if (!user || !user.orders) return;
  var order = user.orders.find(function(o) { return o.id === orderId; });
  if (!order) return;
  order.status = newStatus;
  if (!order.timeline) order.timeline = [];
  order.timeline.push({
    time: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    text: 'Order ' + newStatus
  });
  saveUsers(users);
  showToast('Order ' + orderId + ' updated to ' + newStatus.charAt(0).toUpperCase() + newStatus.slice(1));
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
        if (u.orders) {
          u.orders.forEach(function(o) {
            if (!o.customerName) o.customerName = u.name || 'Customer';
            if (!o.phone) o.phone = 'N/A';
            if (!o.address) o.address = 'N/A';
            if (!o.paymentMethod) o.paymentMethod = 'Cash on Delivery';
            if (!o.deliveryCharges) o.deliveryCharges = 300;
            if (!o.subtotal) o.subtotal = o.total || 0;
            if (!o.city) o.city = '';
            if (!o.postalCode) o.postalCode = '';
            if (o.status === 'processing') o.status = 'pending';
          });
        }
      });
      try { localStorage.setItem('gentifyUsers', JSON.stringify(users)); } catch (e) {}
    }
    if (callback) callback();
  }).catch(function() {
    if (callback) callback();
  });
}



import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, doc, setDoc, getDoc, deleteDoc, collection, getDocs, onSnapshot, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAt0sK3XAxsJEjKJs7G_2gq43LJK8QaDj0",
  authDomain: "gentify-bbd67.firebaseapp.com",
  projectId: "gentify-bbd67",
  storageBucket: "gentify-bbd67.firebasestorage.app",
  messagingSenderId: "1099026087608",
  appId: "1:1099026087608:web:20649071afb1b84d48fe4d",
  measurementId: "G-45BDEVN7PH"
};

const app = initializeApp(firebaseConfig);
getAnalytics(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);
var FIRESTORE_BASE = "https://firestore.googleapis.com/v1/projects/gentify-bbd67/databases/(default)/documents";
var API_KEY = "AIzaSyAt0sK3XAxsJEjKJs7G_2gq43LJK8QaDj0";

window.loadProductsFast = function() {
  return Promise.all([
    fetch(FIRESTORE_BASE + "/products?key=" + API_KEY).then(function(r) { return r.json(); }),
    fetch(FIRESTORE_BASE + "/productImages?key=" + API_KEY).then(function(r) { return r.json(); })
  ]).then(function(results) {
    var prodData = results[0];
    var imgData = results[1];
    var imagesByProduct = {};
    if (imgData && imgData.documents) {
      imgData.documents.forEach(function(doc) {
        var fields = doc.fields || {};
        var productId = fields.productId && fields.productId.stringValue;
        var dataUrl = fields.dataUrl && fields.dataUrl.stringValue;
        var index = fields.index && fields.index.integerValue;
        if (productId && dataUrl) {
          if (!imagesByProduct[productId]) imagesByProduct[productId] = [];
          imagesByProduct[productId][index || 0] = dataUrl;
        }
      });
    }
    var allProducts = [];
    var maxUpdated = 0;
    if (prodData && prodData.documents) {
      prodData.documents.forEach(function(doc) {
        var f = doc.fields || {};
        var name = doc.name || '';
        var id = name.split('/').pop();
        var p = { id: id };
        ['name','category','price','retailPrice','desc','badge'].forEach(function(k) {
          if (f[k] && f[k].stringValue) p[k] = f[k].stringValue;
          if (f[k] && f[k].doubleValue !== undefined) p[k] = f[k].doubleValue;
          if (f[k] && f[k].integerValue !== undefined) p[k] = parseInt(f[k].integerValue, 10);
        });
        p.categoryKey = (f.categoryKey && f.categoryKey.stringValue) || (p.category || 'caps').toLowerCase();
        p.category = f.category && f.category.stringValue ? f.category.stringValue : p.categoryKey.charAt(0).toUpperCase() + p.categoryKey.slice(1);
        p.price = parseFloat(p.price) || 0;
        p.retailPrice = p.retailPrice ? parseFloat(p.retailPrice) : null;
        p.premium = f.premium && f.premium.booleanValue === true;
        if (f.sizes && f.sizes.arrayValue) {
          p.sizes = f.sizes.arrayValue.values.map(function(v) { return v.stringValue; }).filter(Boolean);
        }
        if (f.colors && f.colors.arrayValue) {
          p.colors = f.colors.arrayValue.values.map(function(v) {
            var cv = v.mapValue.fields || {};
            return { name: (cv.name && cv.name.stringValue) || '', hex: (cv.hex && cv.hex.stringValue) || '#ccc' };
          });
        }
        var sepImages = imagesByProduct[id] || [];
        p.images = sepImages.length > 0 ? sepImages : [];
        var updated = f._updated && (f._updated.integerValue || f._updated.doubleValue);
        if (updated && updated > maxUpdated) maxUpdated = parseInt(updated, 10);
        allProducts.push(p);
      });
    }
    if (allProducts.length === 0) return null;
    var grouped = {};
    allProducts.forEach(function(p) {
      if (!grouped[p.categoryKey]) grouped[p.categoryKey] = [];
      grouped[p.categoryKey].push(p);
    });
    try {
      localStorage.setItem('gentifyProducts', JSON.stringify(grouped));
      localStorage.setItem('gentifyProductsTS', String(maxUpdated || Date.now()));
    } catch (e) {}
    return { data: grouped, updated: maxUpdated || Date.now() };
  }).catch(function() { return null; });
};

window.loadBannerFast = function() {
  return fetch(FIRESTORE_BASE + "/catalog/banner?key=" + API_KEY).then(function(r) { return r.json(); }).then(function(doc) {
    if (!doc || !doc.fields) return null;
    var dataJson = doc.fields.dataJson && doc.fields.dataJson.stringValue;
    if (!dataJson) return null;
    var parsed = JSON.parse(dataJson);
    if (parsed.desktop || parsed.mobile) {
      try { localStorage.setItem('gentifyBanner', JSON.stringify(parsed)); } catch (e) {}
    }
    return parsed;
  }).catch(function() { return null; });
};

window.loadCollectionsFast = function() {
  return fetch(FIRESTORE_BASE + "/catalog/collections?key=" + API_KEY).then(function(r) { return r.json(); }).then(function(doc) {
    if (!doc || !doc.fields) return null;
    var dataJson = doc.fields.dataJson && doc.fields.dataJson.stringValue;
    if (!dataJson) return null;
    var parsed = JSON.parse(dataJson);
    if (parsed && parsed.length > 0) {
      try { localStorage.setItem('gentifyCollections', JSON.stringify(parsed)); } catch (e) {}
    }
    return parsed;
  }).catch(function() { return null; });
};

enableIndexedDbPersistence(db).catch(function(err) {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence: multiple tabs open, persistence disabled.');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence: browser not supported.');
  }
});
window.uploadProductImage = function(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var dataUrl = e.target.result;
      if (dataUrl.length < 80000) { resolve(dataUrl); return; }
      var img = new Image();
      img.onload = function() {
        var MAX = 600, Q = 0.45;
        var w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        try {
          var canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          var out = canvas.toDataURL('image/jpeg', Q);
          if (out.length > 150000) out = canvas.toDataURL('image/jpeg', 0.25);
          if (out.length > 250000) {
            var s2 = Math.round(Math.sqrt(150000 / out.length) * 100) / 100;
            var nw = Math.round(w * s2), nh = Math.round(h * s2);
            canvas.width = nw; canvas.height = nh;
            ctx.drawImage(img, 0, 0, nw, nh);
            out = canvas.toDataURL('image/jpeg', 0.2);
          }
          resolve(out);
        } catch (e) { resolve(dataUrl.length > 800000 ? '' : dataUrl); }
      };
      img.onerror = function() { resolve(''); };
      img.src = dataUrl;
    };
    reader.onerror = function() { reject(new Error('File read failed')); };
    reader.readAsDataURL(file);
  });
};

window.deleteStorageImage = function() { return Promise.resolve(); };

var PRODUCTS_COL = collection(db, "products");
var COLLECTIONS_DOC = doc(db, "catalog", "collections");

getRedirectResult(auth).catch(function(err) {
  console.warn('Redirect sign-in error:', err.code || err.message);
});

window.signInWithGoogle = function() {
  return signInWithPopup(auth, googleProvider).catch(function(err) {
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/popup-closed-by-user') {
      return signInWithRedirect(auth, googleProvider);
    }
    throw err;
  });
};
window.signOutGoogle = function() { return signOut(auth); };
window.onAuthStateChanged = function(callback) { onAuthStateChanged(auth, callback); };

window.syncProductsToFirestore = function(prods) {
  var syncTime = Date.now();
  var allProducts = [];
  Object.keys(prods).forEach(function(k) {
    allProducts = allProducts.concat(prods[k]);
  });

  return getDocs(PRODUCTS_COL).then(function(snapshot) {
    var existingIds = {};
    snapshot.forEach(function(d) { existingIds[d.id] = true; });

    var newIds = {};
    allProducts.forEach(function(p) { newIds[p.id] = true; });

    return getDocs(collection(db, "productImages")).then(function(imgSnap) {
      var imgByProduct = {};
      imgSnap.forEach(function(d) {
        var img = d.data();
        if (!imgByProduct[img.productId]) imgByProduct[img.productId] = [];
        imgByProduct[img.productId].push({ id: d.id, index: img.index });
      });

      var promises = [];

      Object.keys(existingIds).forEach(function(id) {
        if (!newIds[id]) {
          promises.push(deleteDoc(doc(db, "products", id)));
          (imgByProduct[id] || []).forEach(function(img) {
            promises.push(deleteDoc(doc(db, "productImages", img.id)));
          });
        }
      });

      allProducts.forEach(function(p) {
        var images = p.images || [];
        var data = {};
        ['id','name','category','categoryKey','price','retailPrice','desc','sizes','colors','badge','premium','_categoryKey'].forEach(function(k) {
          if (p[k] !== undefined && p[k] !== null) data[k] = p[k];
        });
        data.categoryKey = (p.categoryKey || p.category || 'caps').toLowerCase();
        data._updated = syncTime;

        promises.push(setDoc(doc(db, "products", p.id), data));

        if (images.length > 0) {
          (imgByProduct[p.id] || []).forEach(function(img) {
            promises.push(deleteDoc(doc(db, "productImages", img.id)));
          });

          images.forEach(function(dataUrl, idx) {
            promises.push(setDoc(doc(collection(db, "productImages")), {
              productId: p.id,
              index: idx,
              dataUrl: dataUrl
            }));
          });
        }
      });

      promises.push(deleteDoc(doc(db, "catalog", "products")).catch(function() {}));

      return Promise.all(promises);
    });
  });
};

window.syncCollectionsToFirestore = function(data) {
  return setDoc(COLLECTIONS_DOC, { dataJson: JSON.stringify(data), updated: Date.now() });
};

window.loadCollectionsFromFirestore = function() {
  return getDoc(COLLECTIONS_DOC).then(function(snap) {
    if (snap.exists()) {
      var d = snap.data();
      if (d.dataJson) return { data: JSON.parse(d.dataJson), updated: d.updated };
      if (d.data) return { data: d.data, updated: d.updated };
    }
    return null;
  });
};

window.loadProductsFromFirestore = function() {
  return Promise.all([
    getDocs(PRODUCTS_COL),
    getDocs(collection(db, "productImages"))
  ]).then(function(results) {
    var productSnap = results[0];
    var imageSnap = results[1];

    var imagesByProduct = {};
    imageSnap.forEach(function(d) {
      var img = d.data();
      if (!imagesByProduct[img.productId]) imagesByProduct[img.productId] = [];
      imagesByProduct[img.productId][img.index] = img.dataUrl;
    });

    var allProducts = [];
    var maxUpdated = 0;
    productSnap.forEach(function(d) {
      var p = d.data();
      p.id = d.id;
      var sepImages = imagesByProduct[p.id] || [];
      p.images = (sepImages.length > 0 || !p.images) ? sepImages : (p.images || []);
      if (p._updated && p._updated > maxUpdated) maxUpdated = p._updated;
      allProducts.push(p);
    });

    if (allProducts.length === 0) return null;

    var grouped = {};
    allProducts.forEach(function(p) {
      var cat = (p.categoryKey || p.category || 'caps').toLowerCase();
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    });

    return { data: grouped, updated: maxUpdated || Date.now() };
  });
};

// ===== USERS (Firestore) =====
const USERS_COL = collection(db, "users");

window.getFirestoreUsers = function() {
  return getDocs(USERS_COL).then(function(snapshot) {
    var users = [];
    snapshot.forEach(function(d) { users.push(d.data()); });
    return users;
  });
};

window.getFirestoreUser = function(email) {
  return getDoc(doc(db, "users", email)).then(function(snap) {
    return snap.exists() ? snap.data() : null;
  });
};

window.setFirestoreUser = function(email, data) {
  return setDoc(doc(db, "users", email), data);
};

window.deleteFirestoreUser = function(email) {
  return deleteDoc(doc(db, "users", email));
};

// ===== BANNER (Firestore) =====
var BANNER_DOC = doc(db, "catalog", "banner");

window.syncBannerToFirestore = function(data) {
  return setDoc(BANNER_DOC, { dataJson: JSON.stringify(data), updated: Date.now() });
};

window.syncBannerFromFirestore = function(callback) {
  getDoc(BANNER_DOC).then(function(snap) {
    if (snap.exists()) {
      var d = snap.data();
      if (d.dataJson) {
        var parsed = JSON.parse(d.dataJson);
        // Only overwrite localStorage if Firestore actually has image data
        if (parsed.desktop || parsed.mobile) {
          try { localStorage.setItem('gentifyBanner', JSON.stringify(parsed)); } catch (e) {}
        }
      }
    }
    if (callback) callback();
  }).catch(function() {
    if (callback) callback();
  });
};

// ===== REAL-TIME LISTENERS (cross-device sync) =====
var _syncTimer = null;
var _syncReady = false;

window.subscribeProducts = function(onChange) {
  return onSnapshot(PRODUCTS_COL, function() {
    if (!_syncReady) { _syncReady = true; return; }
    if (_syncTimer) clearTimeout(_syncTimer);
    _syncTimer = setTimeout(function() {
      if (typeof window.loadProductsFast === 'function') {
        window.loadProductsFast().then(function(result) {
          if (result && result.data && Object.keys(result.data).length > 0 && onChange) {
            onChange(result);
          }
        });
      }
    }, 500);
  });
};

window.subscribeBanner = function(onChange) {
  return onSnapshot(BANNER_DOC, function(snap) {
    if (snap.exists()) {
      var d = snap.data();
      if (d.dataJson) {
        var parsed = JSON.parse(d.dataJson);
        if ((parsed.desktop || parsed.mobile) && onChange) {
          onChange(parsed);
        }
      }
    }
  });
};

window.subscribeCollections = function(onChange) {
  return onSnapshot(COLLECTIONS_DOC, function(snap) {
    if (snap.exists()) {
      var d = snap.data();
      if (d.dataJson) {
        var parsed = JSON.parse(d.dataJson);
        if (parsed.length > 0 && onChange) {
          onChange(parsed);
        }
      }
    }
  });
};

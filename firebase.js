import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, doc, setDoc, getDoc, deleteDoc, collection, getDocs } from "firebase/firestore";

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
window.uploadProductImage = function(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var dataUrl = e.target.result;
      if (dataUrl.length < 200000) { resolve(dataUrl); return; }
      var img = new Image();
      img.onload = function() {
        var MAX = 800, Q = 0.6;
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
          if (out.length > 300000) out = canvas.toDataURL('image/jpeg', 0.3);
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

getRedirectResult(auth).then(function() {}).catch(function() {});

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

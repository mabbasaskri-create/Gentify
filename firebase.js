import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, doc, setDoc, getDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

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
const storage = getStorage(app);

window.uploadProductImage = function(file) {
  var timestamp = Date.now();
  var random = Math.random().toString(36).slice(2, 8);
  var ext = file.name.split('.').pop();
  var filename = timestamp + '_' + random + '.' + ext;
  var storageRef = ref(storage, 'product_images/' + filename);
  return uploadBytes(storageRef, file).then(function() {
    return getDownloadURL(storageRef);
  });
};

window.deleteStorageImage = function(url) {
  try {
    var storageRef = ref(storage, url);
    return deleteObject(storageRef).catch(function() {});
  } catch (e) {
    return Promise.resolve();
  }
};

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

    var promises = [];

    Object.keys(existingIds).forEach(function(id) {
      if (!newIds[id]) {
        promises.push(deleteDoc(doc(db, "products", id)));
      }
    });

    allProducts.forEach(function(p) {
      var data = Object.assign({}, p);
      delete data._categoryKey;
      data.categoryKey = (p.categoryKey || p.category || 'caps').toLowerCase();
      data._updated = syncTime;
      promises.push(setDoc(doc(db, "products", p.id), data));
    });

    // Clean up old single-document format if it exists
    promises.push(deleteDoc(doc(db, "catalog", "products")).catch(function() {}));

    return Promise.all(promises);
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
  return getDocs(PRODUCTS_COL).then(function(snapshot) {
    var allProducts = [];
    var maxUpdated = 0;
    snapshot.forEach(function(d) {
      var p = d.data();
      p.id = d.id;
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

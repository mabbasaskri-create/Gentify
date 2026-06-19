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
var PRODUCTS_DOC = doc(db, "catalog", "products");
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
  return setDoc(PRODUCTS_DOC, { dataJson: JSON.stringify(prods), updated: Date.now() });
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
  return getDoc(PRODUCTS_DOC).then(function(snap) {
    if (snap.exists()) {
      var d = snap.data();
      if (d.dataJson) return { data: JSON.parse(d.dataJson), updated: d.updated };
      if (d.data) return { data: d.data, updated: d.updated };
    }
    return null;
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

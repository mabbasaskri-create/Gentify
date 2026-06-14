import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

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

window.signInWithGoogle = function() { return signInWithPopup(auth, googleProvider); };
window.signOutGoogle = function() { return signOut(auth); };
window.onAuthStateChanged = function(callback) { onAuthStateChanged(auth, callback); };

window.syncProductsToFirestore = function(prods) {
  return setDoc(PRODUCTS_DOC, { data: prods, updated: Date.now() });
};

window.loadProductsFromFirestore = function() {
  return getDoc(PRODUCTS_DOC).then(function(snap) {
    if (snap.exists()) return snap.data();
    return null;
  });
};

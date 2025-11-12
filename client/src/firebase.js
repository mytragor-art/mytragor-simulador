import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAA3bgJmOzxq-oHe8ODjk-28gSLUtIpdFQ",
  authDomain: "mytragor-simulador.firebaseapp.com",
  projectId: "mytragor-simulador",
  storageBucket: "mytragor-simulador.firebasestorage.app",
  messagingSenderId: "1007200238881",
  appId: "1:1007200238881:web:4de615fe910e815e0f9260"
};
// Basic runtime sanity checks to help catch misconfiguration early
if (!firebaseConfig.apiKey || firebaseConfig.apiKey.length < 20) {
  console.warn("[firebase] apiKey appears missing or too short. Update client/src/firebase.js with your project's credentials.");
}
if (firebaseConfig.storageBucket && !firebaseConfig.storageBucket.includes('appspot.com')) {
  console.warn("[firebase] storageBucket looks unusual. Typical buckets end with 'appspot.com'. Verify your Firebase console settings.");
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

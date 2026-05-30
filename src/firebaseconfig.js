import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "PASTE_NEW_ROTATED_API_KEY_HERE",
  authDomain: "mcdowell-tyre-app.firebaseapp.com",
  projectId: "mcdowell-tyre-app",
  storageBucket: "mcdowell-tyre-app.firebasestorage.app",
  messagingSenderId: "299380777264",
  appId: "1:299380777264:web:25b15ac214869cc8a128f5",
  measurementId: "G-N4P0R0NBVM",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
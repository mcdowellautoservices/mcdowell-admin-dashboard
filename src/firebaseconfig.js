import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD6aEonsVeyHZ6ZN1oHzUXtSc8o7G-EycM",
  authDomain: "mcdowell-tyre-app.firebaseapp.com",
  projectId: "mcdowell-tyre-app",
  storageBucket: "mcdowell-tyre-app.firebasestorage.app",
  messagingSenderId: "299380777264",
  appId: "1:299380777264:web:25b15ac214a89cc8a128f5",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "YOUR_REAL_API_KEY",
  authDomain: "YOUR_REAL_PROJECT.firebaseapp.com",
  projectId: "YOUR_REAL_PROJECT_ID",
  storageBucket: "YOUR_REAL_PROJECT.appspot.com",
  messagingSenderId: "YOUR_REAL_SENDER_ID",
  appId: "YOUR_REAL_APP_ID",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
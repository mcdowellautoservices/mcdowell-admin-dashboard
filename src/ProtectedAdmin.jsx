import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebaseconfig.js";
import App from "./App.jsx";
import Login from "./Login.jsx";

export default function ProtectedAdmin() {
  const [user, setUser] = useState(null);
  const [checkingLogin, setCheckingLogin] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setCheckingLogin(false);
    });

    return () => unsubscribe();
  }, []);

  if (checkingLogin) {
    return <p style={{ color: "white", padding: "30px" }}>Checking login...</p>;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <>
      <button
        onClick={() => signOut(auth)}
        className="logoutButton"
      >
        Logout
      </button>

      <App />
    </>
  );
}
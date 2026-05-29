import { useState } from "react";
import { useParams } from "react-router-dom";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseconfig.js";

export default function DriverPage() {
  const { id } = useParams();
  const [status, setStatus] = useState("GPS stopped");

  function startTracking() {
    if (!navigator.geolocation) {
      alert("GPS not supported");
      return;
    }

    setStatus("Waiting for GPS permission...");

    navigator.geolocation.watchPosition(
      async (position) => {
        await updateDoc(doc(db, "bookings", id), {
          driverLat: position.coords.latitude,
          driverLng: position.coords.longitude,
          driverTrackingActive: true,
          eta: "Live GPS updating",
          etaMode: "gps",
          updatedAt: serverTimestamp(),
        });

        setStatus("Live GPS running");
      },
      (error) => {
        setStatus("GPS error");
        alert(error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );
  }

  async function stopTracking() {
    await updateDoc(doc(db, "bookings", id), {
      driverTrackingActive: false,
      eta: "Driver tracking stopped",
      etaMode: "manual",
      updatedAt: serverTimestamp(),
    });

    setStatus("GPS stopped");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: "20px",
          padding: "30px",
          textAlign: "center",
        }}
      >
        <h1>Driver GPS Tracking</h1>
        <p>Job ID: {id}</p>
        <p>Status: {status}</p>

        <button onClick={startTracking}>Start Live GPS</button>
        <br />
        <br />
        <button onClick={stopTracking}>Stop GPS</button>
      </div>
    </div>
  );
}
import { useState } from "react";
import { useParams } from "react-router-dom";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseconfig.js";
import "./DriverTracker.css";

export default function DriverTracker() {
  const { id } = useParams();
  const [tracking, setTracking] = useState(false);

  function startTracking() {
    if (!navigator.geolocation) {
      alert("GPS not supported on this device");
      return;
    }

    setTracking(true);

    navigator.geolocation.watchPosition(
      async (position) => {
        await updateDoc(doc(db, "bookings", id), {
          driverLat: position.coords.latitude,
          driverLng: position.coords.longitude,
          driverTrackingActive: true,
          eta: "Live GPS active",
          etaMode: "gps",
          updatedAt: serverTimestamp(),
        });
      },
      (error) => {
        alert("GPS error: " + error.message);
        setTracking(false);
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

    setTracking(false);
  }

  return (
    <div className="driverPage">
      <div className="driverCard">
        <h1>Driver GPS Tracking</h1>
        <p>Job ID: {id}</p>
        <p>Status: {tracking ? "Live GPS running" : "GPS stopped"}</p>

        <button onClick={startTracking}>Start Live GPS</button>
        <button onClick={stopTracking}>Stop GPS</button>
      </div>
    </div>
  );
}
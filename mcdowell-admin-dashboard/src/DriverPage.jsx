import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseconfig.js";

export default function DriverPage() {
  const { id } = useParams();
  const [status, setStatus] = useState("GPS stopped");
  const [booking, setBooking] = useState(null);
  const watchRef = useRef(null);

  useEffect(() => {
    if (!id) return undefined;

    const unsubscribe = onSnapshot(doc(db, "bookings", id), (docSnap) => {
      if (docSnap.exists()) {
        setBooking({ id: docSnap.id, ...docSnap.data() });
      }
    });

    return () => unsubscribe();
  }, [id]);

  function startTracking() {
    if (!navigator.geolocation) {
      alert("GPS not supported on this device");
      return;
    }

    setStatus("Waiting for GPS permission...");

    if (watchRef.current) {
      navigator.geolocation.clearWatch(watchRef.current);
    }

    watchRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          await updateDoc(doc(db, "bookings", id), {
            driverLat: position.coords.latitude,
            driverLng: position.coords.longitude,
            driverTrackingActive: true,
            eta: "Live GPS updating",
            etaMode: "gps",
            updatedAt: serverTimestamp(),
          });

          setStatus("Live GPS running");
        } catch (error) {
          console.error(error);
          setStatus("Could not update Firebase");
          alert("Could not update job GPS. Check your internet connection.");
        }
      },
      (error) => {
        setStatus("GPS error");
        alert("GPS error: " + error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );
  }

  async function stopTracking() {
    if (watchRef.current) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }

    await updateDoc(doc(db, "bookings", id), {
      driverTrackingActive: false,
      eta: "Driver tracking stopped",
      etaMode: "manual",
      updatedAt: serverTimestamp(),
    });

    setStatus("GPS stopped");
  }

  const hasCustomerGps = booking?.customerLat && booking?.customerLng;

  return (
    <div style={{ minHeight: "100vh", background: "#020617", color: "white", display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" }}>
      <div style={{ width: "100%", maxWidth: "560px", background: "#0f172a", border: "1px solid #334155", borderRadius: "20px", padding: "30px", textAlign: "center" }}>
        <h1>Driver GPS Tracking</h1>
        <p><strong>Job ID:</strong> {id}</p>
        <p><strong>Status:</strong> {status}</p>

        {booking && (
          <div style={{ textAlign: "left", background: "#020617", borderRadius: "14px", padding: "16px", marginBottom: "18px" }}>
            <p><strong>Customer:</strong> {booking.name || booking.customerName || "Customer"}</p>
            <p><strong>Phone:</strong> {booking.phone || booking.customerPhone || "N/A"}</p>
            <p><strong>Registration:</strong> {booking.registration || booking.reg || "N/A"}</p>
            <p><strong>Address:</strong> {booking.address || booking.location || "N/A"}</p>
            <p><strong>ETA:</strong> {booking.eta || "Awaiting ETA"}</p>
          </div>
        )}

        <button onClick={startTracking} style={buttonStyle}>Start Live GPS</button>
        <button onClick={stopTracking} style={{ ...buttonStyle, background: "#ef4444" }}>Stop GPS</button>

        {hasCustomerGps && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${booking.customerLat},${booking.customerLng}`}
            target="_blank"
            rel="noreferrer"
            style={{ ...linkStyle, display: "block", marginTop: "12px" }}
          >
            Navigate To Customer
          </a>
        )}
      </div>
    </div>
  );
}

const buttonStyle = {
  width: "100%",
  marginTop: "12px",
  padding: "14px",
  borderRadius: "12px",
  border: "none",
  background: "#0284c7",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

const linkStyle = {
  padding: "14px",
  borderRadius: "12px",
  background: "#22c55e",
  color: "white",
  fontWeight: "bold",
  textDecoration: "none",
};

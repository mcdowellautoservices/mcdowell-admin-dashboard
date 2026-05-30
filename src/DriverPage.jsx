import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebaseconfig.js";

export default function DriverPage() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [status, setStatus] = useState("GPS stopped");
  const [watchId, setWatchId] = useState(null);

  useEffect(() => {
    if (!id) return;

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

    const gpsWatchId = navigator.geolocation.watchPosition(
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
        alert("GPS error: " + error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );

    setWatchId(gpsWatchId);
  }

  async function stopTracking() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }

    await updateDoc(doc(db, "bookings", id), {
      driverTrackingActive: false,
      eta: "Driver tracking stopped",
      etaMode: "manual",
      updatedAt: serverTimestamp(),
    });

    setStatus("GPS stopped");
  }

  async function updateStatus(newStatus, etaText) {
    await updateDoc(doc(db, "bookings", id), {
      status: newStatus,
      eta: etaText,
      updatedAt: serverTimestamp(),
    });
  }

  const customerGps =
    booking?.customerLat && booking?.customerLng
      ? `https://www.google.com/maps/dir/?api=1&destination=${booking.customerLat},${booking.customerLng}`
      : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "650px",
          margin: "0 auto",
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: "20px",
          padding: "25px",
        }}
      >
        <h1>Driver Job Control</h1>

        <p>
          <strong>Job ID:</strong> {id}
        </p>

        <p>
          <strong>GPS Status:</strong> {status}
        </p>

        {booking && (
          <>
            <div style={{ margin: "20px 0" }}>
              <p>
                <strong>Customer:</strong>{" "}
                {booking.name || booking.customerName || "Customer"}
              </p>

              <p>
                <strong>Phone:</strong>{" "}
                {booking.phone || booking.customerPhone || "N/A"}
              </p>

              <p>
                <strong>Vehicle:</strong>{" "}
                {booking.vehicle || "Not checked"}
              </p>

              <p>
                <strong>Registration:</strong>{" "}
                {booking.registration || booking.reg || "N/A"}
              </p>

              <p>
                <strong>Address:</strong>{" "}
                {booking.address || booking.location || "N/A"}
              </p>

              <p>
                <strong>ETA:</strong> {booking.eta || "Awaiting ETA"}
              </p>

              <p>
                <strong>Status:</strong> {booking.status || "New booking"}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              {customerGps ? (
                <a
                  href={customerGps}
                  target="_blank"
                  rel="noreferrer"
                  style={linkStyle}
                >
                  Navigate To Customer
                </a>
              ) : (
                <button disabled style={disabledButton}>
                  Customer GPS Not Shared
                </button>
              )}

              <a
                href={`tel:${booking.phone || ""}`}
                style={linkStyle}
              >
                Call Customer
              </a>
            </div>
          </>
        )}

        <div style={{ display: "grid", gap: "10px" }}>
          <button onClick={startTracking} style={buttonStyle}>
            Start Live GPS
          </button>

          <button onClick={stopTracking} style={dangerButton}>
            Stop GPS
          </button>

          <button
            onClick={() => updateStatus("On Route", "Driver is on route")}
            style={buttonStyle}
          >
            Mark On Route
          </button>

          <button
            onClick={() => updateStatus("Arrived", "Driver has arrived")}
            style={buttonStyle}
          >
            Mark Arrived
          </button>

          <button
            onClick={() => updateStatus("In Progress", "Work in progress")}
            style={buttonStyle}
          >
            Mark In Progress
          </button>

          <button
            onClick={() => updateStatus("Completed", "Completed")}
            style={successButton}
          >
            Mark Completed
          </button>
        </div>
      </div>
    </div>
  );
}

const buttonStyle = {
  padding: "14px",
  borderRadius: "12px",
  border: "none",
  background: "#0284c7",
  color: "white",
  fontWeight: "bold",
  cursor: "pointer",
};

const successButton = {
  ...buttonStyle,
  background: "#16a34a",
};

const dangerButton = {
  ...buttonStyle,
  background: "#dc2626",
};

const disabledButton = {
  ...buttonStyle,
  background: "#475569",
  cursor: "not-allowed",
};

const linkStyle = {
  ...buttonStyle,
  textAlign: "center",
  textDecoration: "none",
};
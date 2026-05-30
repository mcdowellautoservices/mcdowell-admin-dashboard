import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebaseconfig.js";
import "./CustomerTracking.css";

export default function CustomerTracking() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sharingLocation, setSharingLocation] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "bookings", id), (docSnap) => {
      if (docSnap.exists()) {
        setBooking({ id: docSnap.id, ...docSnap.data() });
      } else {
        setBooking(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  async function shareCustomerLocation() {
    if (!navigator.geolocation) {
      alert("Location services are not available on this device.");
      return;
    }

    setSharingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await updateDoc(doc(db, "bookings", id), {
            customerLat: position.coords.latitude,
            customerLng: position.coords.longitude,
            customerLocationUpdated: true,
            customerLocationUpdatedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          alert("Your location has been shared with McDowell Auto Services.");
        } catch (error) {
          console.error(error);
          alert("Could not save your location. Please try again.");
        } finally {
          setSharingLocation(false);
        }
      },
      (error) => {
        alert("Location error: " + error.message);
        setSharingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  }

  if (loading) {
    return (
      <div className="trackingPage">
        <div className="trackingCard">
          <h1>Loading job...</h1>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="trackingPage">
        <div className="trackingCard">
          <h1>Job not found</h1>
          <p>Tracking ID: {id || "Missing ID"}</p>
        </div>
      </div>
    );
  }

  const customerName = booking.name || booking.customerName || "Customer";
  const phone = booking.phone || booking.customerPhone || "N/A";
  const vehicle = booking.vehicle || booking.vehicleType || "Not checked";
  const registration = booking.registration || booking.reg || "N/A";
  const address =
    booking.address || booking.customerAddress || booking.location || "N/A";
  const notes = booking.notes || booking.message || booking.description || "N/A";
  const status = booking.status || "New booking";
  const eta = booking.eta || "Awaiting ETA";

  const steps = [
    "New booking",
    "Accepted",
    "On Route",
    "Arrived",
    "In Progress",
    "Completed",
  ];

  const activeIndex = Math.max(0, steps.indexOf(status));

  return (
    <div className="trackingPage">
      <div className="trackingCard">
        <div className="trackingHeader">
          <h1>McDowell Job Tracking</h1>
          <p>Live customer updates, ETA and driver tracking</p>
        </div>

        <p className="jobId">
          <strong>Job ID:</strong> <span>{id}</span>
        </p>

        <div className="statusPill">{status}</div>

        <div className="heroEta">
          <span>Current ETA</span>
          <strong>{eta}</strong>
          <small>ETA mode: {booking.etaMode || "manual"}</small>
        </div>

        <div className="trackingGrid">
          <div className="infoBox">
            <strong>Customer</strong>
            <span>{customerName}</span>
          </div>

          <div className="infoBox">
            <strong>Phone</strong>
            <span>{phone}</span>
          </div>

          <div className="infoBox">
            <strong>Vehicle</strong>
            <span>{vehicle}</span>
          </div>

          <div className="infoBox">
            <strong>Registration</strong>
            <span>{registration}</span>
          </div>

          <div className="infoBox">
            <strong>Address</strong>
            <span>{address}</span>
          </div>

          <div className="infoBox">
            <strong>Customer GPS</strong>
            <span>
              {booking.customerLat && booking.customerLng
                ? "Shared"
                : "Not shared yet"}
            </span>
          </div>
        </div>

        {booking.customerLat && booking.customerLng && (
          <div className="gpsPanel">
            <strong>Your shared location</strong>
            <p>
              {Number(booking.customerLat).toFixed(6)},{" "}
              {Number(booking.customerLng).toFixed(6)}
            </p>

            <a
              href={`https://www.google.com/maps?q=${booking.customerLat},${booking.customerLng}`}
              target="_blank"
              rel="noreferrer"
            >
              View Your Shared Location
            </a>
          </div>
        )}

        <div className="driverPanel">
          <h3>Driver Details</h3>

          <div className="trackingGrid">
            <div className="infoBox">
              <strong>Driver</strong>
              <span>{booking.driverName || "Not assigned"}</span>
            </div>

            <div className="infoBox">
              <strong>Driver Phone</strong>
              <span>{booking.driverPhone || "N/A"}</span>
            </div>

            <div className="infoBox">
              <strong>Driver Vehicle</strong>
              <span>{booking.driverVehicle || "N/A"}</span>
            </div>

            <div className="infoBox">
              <strong>Driver GPS</strong>
              <span>{booking.driverTrackingActive ? "Live" : "Offline"}</span>
            </div>
          </div>

          {booking.driverLat && booking.driverLng && (
            <div className="gpsPanel driverGpsPanel">
              <strong>Driver live location</strong>
              <p>
                {Number(booking.driverLat).toFixed(6)},{" "}
                {Number(booking.driverLng).toFixed(6)}
              </p>

              <a
                href={`https://www.google.com/maps?q=${booking.driverLat},${booking.driverLng}`}
                target="_blank"
                rel="noreferrer"
              >
                View Driver Location
              </a>
            </div>
          )}
        </div>

        <div className="timeline">
          {steps.map((step, index) => (
            <div
              key={step}
              className={`timelineStep ${
                index <= activeIndex ? "active" : ""
              }`}
            >
              <span></span>
              <p>{step}</p>
            </div>
          ))}
        </div>

        {booking.photoUrl && (
          <div className="infoBox fullBox">
            <strong>Photo Proof</strong>
            <a href={booking.photoUrl} target="_blank" rel="noreferrer">
              View photo
            </a>
          </div>
        )}

        {booking.signatureUrl && (
          <div className="infoBox fullBox">
            <strong>Signature</strong>
            <a href={booking.signatureUrl} target="_blank" rel="noreferrer">
              View signature
            </a>
          </div>
        )}

        <div className="infoBox fullBox">
          <strong>Notes</strong>
          <span>{notes}</span>
        </div>

        <div className="trackingActions">
          <button
            onClick={shareCustomerLocation}
            className="locationButton"
            disabled={sharingLocation}
          >
            {sharingLocation ? "Sharing Location..." : "Share My Location"}
          </button>

          <a href="tel:07592247365" className="callButton">
            Call McDowell
          </a>

          <a
            href="https://wa.me/447592247365"
            target="_blank"
            rel="noreferrer"
            className="whatsappButton"
          >
            WhatsApp McDowell
          </a>

          {booking.paymentUrl ? (
            <a
              href={booking.paymentUrl}
              target="_blank"
              rel="noreferrer"
              className="paymentButton"
            >
              Pay Invoice
            </a>
          ) : (
            <button disabled>Payment Pending</button>
          )}

          {booking.invoiceUrl ? (
            <a
              href={booking.invoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="invoiceButton"
            >
              Download Invoice
            </a>
          ) : (
            <button disabled>No Invoice Yet</button>
          )}
        </div>
      </div>
    </div>
  );
}
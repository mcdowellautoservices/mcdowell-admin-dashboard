import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebaseconfig.js";
import "./CustomerTracking.css";

export default function CustomerTracking() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const bookingRef = doc(db, "bookings", id);

    const unsubscribe = onSnapshot(
      bookingRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setBooking({
            id: docSnap.id,
            ...docSnap.data(),
          });
        } else {
          setBooking(null);
        }

        setLoading(false);
      },
      (error) => {
        console.error("Tracking error:", error);
        setBooking(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id]);

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
          <p>This tracking ID does not exist in bookings.</p>
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
        <h1>Job Tracking</h1>

        <p className="jobId">
          <strong>Job ID:</strong> <span>{id}</span>
        </p>

        <h2>{customerName}</h2>

        <div className="statusPill">{status}</div>

        <div className="infoBox">
          <strong>Phone:</strong> {phone}
        </div>

        <div className="infoBox">
          <strong>Vehicle:</strong> {vehicle}
        </div>

        <div className="infoBox">
          <strong>Registration:</strong> {registration}
        </div>

        <div className="infoBox">
          <strong>Address:</strong> {address}
        </div>

        <div className="infoBox">
          <strong>ETA:</strong> {eta}
        </div>

        <div className="infoBox">
          <strong>ETA Mode:</strong> {booking.etaMode || "manual"}
        </div>

        <div className="infoBox">
          <strong>Driver GPS:</strong>{" "}
          {booking.driverTrackingActive ? "Live" : "Offline"}
        </div>

        {booking.driverLat && booking.driverLng && (
          <div className="infoBox">
            <strong>Driver Map:</strong>{" "}
            <a
              href={`https://www.google.com/maps?q=${booking.driverLat},${booking.driverLng}`}
              target="_blank"
              rel="noreferrer"
            >
              View location
            </a>
          </div>
        )}

        <div className="infoBox">
          <strong>Notes:</strong> {notes}
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

        <div className="trackingActions">
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
            <a href={booking.invoiceUrl} target="_blank" rel="noreferrer">
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
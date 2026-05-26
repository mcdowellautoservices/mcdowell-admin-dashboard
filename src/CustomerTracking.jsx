import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebaseconfig";
import "./CustomerTracking.css";

export default function CustomerTracking() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(doc(db, "bookings", id), (docSnap) => {
      if (docSnap.exists()) {
        setBooking({
          id: docSnap.id,
          ...docSnap.data(),
        });
      } else {
        setBooking(null);
      }
    });

    return () => unsubscribe();
  }, [id]);

  if (!booking) {
    return (
      <div className="tracking-page">
        <div className="tracking-card">
          <h1>Job Tracking</h1>
          <p><strong>Job ID:</strong> {id}</p>
          <p>No booking found for this Job ID.</p>
        </div>
      </div>
    );
  }

  const customerName = booking.name || booking.customerName || "Customer";
  const phone = booking.phone || booking.customerPhone || "";
  const vehicle = booking.vehicle || booking.vehicleType || "Not checked";
  const registration = booking.registration || booking.reg || "N/A";
  const address = booking.address || booking.customerAddress || booking.location || "N/A";
  const notes = booking.notes || booking.message || booking.description || "N/A";
  const status = booking.status || "New booking";
  const eta = booking.eta || "Awaiting ETA";
  const invoiceUrl = booking.invoiceUrl || "";
  const paymentUrl = booking.paymentUrl || "";

  const whatsappMessage = encodeURIComponent(
    `Hi ${customerName}, your McDowell Auto Services job ${id} is currently: ${status}.`
  );

  const whatsappUrl = phone
    ? `https://wa.me/44${String(phone).replace(/^0/, "")}?text=${whatsappMessage}`
    : "";

  const steps = ["New booking", "Accepted", "On Route", "Arrived", "In Progress", "Completed"];

  return (
    <div className="tracking-page">
      <div className="tracking-card">
        <h1>Job Tracking</h1>

        <p className="job-id">
          <strong>Job ID:</strong> {id}
        </p>

        <h2>{customerName}</h2>

        <div className="status-pill">{status}</div>

        <div className="details-grid">
          <p><strong>Phone:</strong> {phone || "N/A"}</p>
          <p><strong>Vehicle:</strong> {vehicle}</p>
          <p><strong>Registration:</strong> {registration}</p>
          <p><strong>Address:</strong> {address}</p>
          <p><strong>ETA:</strong> {eta}</p>
          <p><strong>Notes:</strong> {notes}</p>
        </div>

        <div className="timeline">
          {steps.map((step) => (
            <div
              key={step}
              className={`timeline-step ${
                steps.indexOf(step) <= steps.indexOf(status) ? "active" : ""
              }`}
            >
              <span></span>
              <p>{step}</p>
            </div>
          ))}
        </div>

        <div className="tracking-actions">
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noreferrer">
              WhatsApp Update
            </a>
          )}

          {paymentUrl ? (
            <a href={paymentUrl} target="_blank" rel="noreferrer">
              Pay Now
            </a>
          ) : (
            <button disabled>Payment Pending</button>
          )}

          {invoiceUrl ? (
            <a href={invoiceUrl} target="_blank" rel="noreferrer">
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
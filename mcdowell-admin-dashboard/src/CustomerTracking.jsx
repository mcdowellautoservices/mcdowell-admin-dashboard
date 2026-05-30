import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseconfig.js";
import "./CustomerTracking.css";

const STEPS = ["New booking", "Accepted", "On Route", "Arrived", "In Progress", "Completed"];

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
  const address = booking.address || booking.customerAddress || booking.location || "N/A";
  const notes = booking.notes || booking.message || booking.description || "N/A";
  const status = booking.status || "New booking";
  const eta = booking.eta || "Awaiting ETA";
  const activeIndex = Math.max(0, STEPS.indexOf(status));

  return (
    <div className="trackingPage">
      <div className="trackingCard">
        <h1>Job Tracking</h1>

        <p className="jobId"><strong>Job ID:</strong> <span>{id}</span></p>
        <h2>{customerName}</h2>
        <div className="statusPill">{status}</div>

        <div className="infoBox"><strong>Phone:</strong> {phone}</div>
        <div className="infoBox"><strong>Vehicle:</strong> {vehicle}</div>
        <div className="infoBox"><strong>Registration:</strong> {registration}</div>
        <div className="infoBox"><strong>Address:</strong> {address}</div>
        <div className="infoBox"><strong>ETA:</strong> {eta}</div>
        <div className="infoBox"><strong>ETA Mode:</strong> {booking.etaMode || "manual"}</div>

        <div className="infoBox">
          <strong>Your GPS:</strong> {booking.customerLat && booking.customerLng ? "Shared" : "Not shared yet"}
        </div>

        {booking.customerLat && booking.customerLng && (
          <div className="infoBox">
            <strong>Your Location:</strong>{" "}
            <a href={`https://www.google.com/maps?q=${booking.customerLat},${booking.customerLng}`} target="_blank" rel="noreferrer">
              View shared location
            </a>
          </div>
        )}

        <div className="infoBox"><strong>Driver:</strong> {booking.driverName || "Not assigned"}</div>
        <div className="infoBox"><strong>Driver Phone:</strong> {booking.driverPhone || "N/A"}</div>
        <div className="infoBox"><strong>Driver Vehicle:</strong> {booking.driverVehicle || "N/A"}</div>
        {booking.driverNotes && <div className="infoBox"><strong>Driver Notes:</strong> {booking.driverNotes}</div>}

        <div className="infoBox">
          <strong>Driver GPS:</strong> {booking.driverTrackingActive ? "Live" : "Offline"}
        </div>

        {booking.driverLat && booking.driverLng && (
          <div className="infoBox">
            <strong>Driver Map:</strong>{" "}
            <a href={`https://www.google.com/maps?q=${booking.driverLat},${booking.driverLng}`} target="_blank" rel="noreferrer">
              View driver location
            </a>
          </div>
        )}

        {booking.photoUrl && (
          <div className="infoBox"><strong>Photo Proof:</strong> <a href={booking.photoUrl} target="_blank" rel="noreferrer">View photo</a></div>
        )}

        {booking.signatureUrl && (
          <div className="infoBox"><strong>Signature:</strong> <a href={booking.signatureUrl} target="_blank" rel="noreferrer">View signature</a></div>
        )}

        <div className="infoBox"><strong>Notes:</strong> {notes}</div>

        <div className="timeline">
          {STEPS.map((step, index) => (
            <div key={step} className={`timelineStep ${index <= activeIndex ? "active" : ""}`}>
              <span></span>
              <p>{step}</p>
            </div>
          ))}
        </div>

        <div className="trackingActions">
          <button onClick={shareCustomerLocation} className="locationButton" disabled={sharingLocation}>
            {sharingLocation ? "Sharing Location..." : "Share My Location"}
          </button>

          <a href="tel:07592247365" className="callButton">Call McDowell</a>
          <a href="https://wa.me/447592247365" target="_blank" rel="noreferrer" className="whatsappButton">WhatsApp McDowell</a>

          {booking.paymentUrl ? (
            <a href={booking.paymentUrl} target="_blank" rel="noreferrer" className="paymentButton">Pay Invoice</a>
          ) : (
            <button disabled>Payment Pending</button>
          )}

          {booking.invoiceUrl ? (
            <a href={booking.invoiceUrl} target="_blank" rel="noreferrer">Download Invoice</a>
          ) : (
            <button disabled>No Invoice Yet</button>
          )}
        </div>
      </div>
    </div>
  );
}

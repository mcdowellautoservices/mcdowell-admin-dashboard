import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseconfig.js";
import "./CustomerTracking.css";

const BUSINESS_PHONE = "447592247365";

function mapLink(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export default function CustomerTracking() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [saving, setSaving] = useState(false);
  const [manualHelp, setManualHelp] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, "bookings", id), (snapshot) => {
      if (snapshot.exists()) setBooking({ id: snapshot.id, ...snapshot.data() });
    });
    return () => unsubscribe();
  }, [id]);

  async function saveCustomerLocation(position) {
    await updateDoc(doc(db, "bookings", id), {
      customerLat: position.coords.latitude,
      customerLng: position.coords.longitude,
      customerGpsAccuracy: position.coords.accuracy,
      customerGpsShared: true,
      customerGpsSharedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  function shareMyLocation() {
    if (!navigator.geolocation) {
      setManualHelp(true);
      alert("GPS is not supported on this phone. Please use manual map sharing.");
      return;
    }
    setSaving(true);
    setManualHelp(false);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await saveCustomerLocation(position);
          alert("Location shared successfully.");
        } catch (error) {
          console.error(error);
          setManualHelp(true);
          alert("Could not save your location. Please try again.");
        } finally {
          setSaving(false);
        }
      },
      (error) => {
        setSaving(false);
        setManualHelp(true);
        alert("GPS error: " + error.message + ". Please allow location permission or use the manual map option.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  function statusReached(status) {
    const order = ["New booking", "Accepted", "On Route", "Arrived", "In Progress", "Awaiting Customer Sign-Off", "Completed"];
    return order.indexOf(booking?.status || "New booking") >= order.indexOf(status);
  }

  if (!booking) return <main className="trackingPage"><section className="trackingCard">Loading...</section></main>;

  return (
    <main className="trackingPage">
      <section className="trackingCard">
        <h1>McDowell Job Tracking</h1>
        <p>Live customer updates, ETA and driver tracking</p>
        <h2>Job ID: {id}</h2>
        <div className="mainStatus">{booking.status || "New booking"}</div>
        <div className="infoBox"><strong>Current ETA</strong><span>{booking.eta || "Awaiting ETA"}</span><small>ETA mode: {booking.etaMode || "manual"}</small></div>
        <div className="infoBox"><strong>Customer</strong><span>{booking.name || "N/A"}</span></div>
        <div className="infoBox"><strong>Phone</strong><span>{booking.phone || "N/A"}</span></div>
        <div className="infoBox"><strong>Vehicle</strong><span>{booking.vehicle || "Not checked"}</span></div>
        <div className="infoBox"><strong>Registration</strong><span>{booking.registration || "N/A"}</span></div>
        <div className="infoBox"><strong>Address</strong><span>{booking.address || "N/A"}</span></div>
        <div className="infoBox"><strong>Customer GPS</strong><span>{booking.customerGpsShared ? "Shared" : "Not shared yet"}</span>{booking.customerLat && booking.customerLng && <a href={mapLink(booking.customerLat, booking.customerLng)} target="_blank" rel="noreferrer">View My Shared Location</a>}</div>
        <h2>Driver Details</h2>
        <div className="infoBox"><strong>Driver</strong><span>{booking.driverName || "Unassigned"}</span></div>
        <div className="infoBox"><strong>Driver Phone</strong><span>{booking.driverPhone || "N/A"}</span></div>
        <div className="infoBox"><strong>Driver Vehicle</strong><span>{booking.driverVehicle || "N/A"}</span></div>
        <div className="infoBox"><strong>Driver GPS</strong><span>{booking.driverTrackingActive ? "Live" : "Offline"}</span></div>
        {booking.driverLat && booking.driverLng && booking.driverTrackingActive && booking.status !== "Completed" && <div className="driverLocationBox"><strong>Driver live location</strong><span>{booking.driverLat}, {booking.driverLng}</span><a href={mapLink(booking.driverLat, booking.driverLng)} target="_blank" rel="noreferrer">View Driver Location</a></div>}
        <div className="statusList">{["New booking", "Accepted", "On Route", "Arrived", "In Progress", "Awaiting Customer Sign-Off", "Completed"].map((status) => <div key={status} className={statusReached(status) ? "statusStep done" : "statusStep"}><span />{status}</div>)}</div>
        <div className="infoBox"><strong>Notes</strong><span>{booking.notes || "N/A"}</span></div>
        <button className="shareBtn" onClick={shareMyLocation} disabled={saving}>{saving ? "Saving Location..." : "Share My Location"}</button>
        {manualHelp && <div className="infoBox"><strong>Manual GPS Help</strong><span>Open Google Maps, tap your blue dot, press Share location, then send it to McDowell on WhatsApp.</span><a href="https://www.google.com/maps" target="_blank" rel="noreferrer">Open Google Maps</a></div>}
        <a className="callBtn" href={`tel:${BUSINESS_PHONE}`}>Call McDowell</a>
        <a className="whatsappBtn" href={`https://wa.me/${BUSINESS_PHONE}?text=${encodeURIComponent(`Hi McDowell, I am checking job ${id}`)}`} target="_blank" rel="noreferrer">WhatsApp McDowell</a>
        <div className="infoBox"><strong>Payment</strong><span>{booking.paymentStatus || "Payment Pending"}</span></div>
        {booking.invoiceUrl ? <a className="invoiceBtn" href={booking.invoiceUrl} target="_blank" rel="noreferrer">View Invoice</a> : <div className="invoiceBtn muted">No Invoice Yet</div>}
      </section>
    </main>
  );
}

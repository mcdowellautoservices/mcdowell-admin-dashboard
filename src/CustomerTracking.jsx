// src/CustomerTracking.jsx

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebaseconfig";
import "./CustomerTracking.css";

export default function CustomerTracking() {
  const { jobId } = useParams();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJob();
  }, []);

  const fetchJob = async () => {
    try {
      const docRef = doc(db, "bookings", jobId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setJob(docSnap.data());
      }

      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const createNewBooking = async () => {
    try {
      const docRef = doc(db, "bookings", jobId);

      await updateDoc(docRef, {
        newBookingRequested: true,
        updatedAt: serverTimestamp(),
      });

      alert("New booking request sent");
    } catch (error) {
      console.error(error);
      alert("Error sending request");
    }
  };

  if (loading) {
    return (
      <div className="trackingPage">
        <div className="trackingCard">
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="trackingPage">
        <div className="trackingCard">
          <h2>Job not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="trackingPage">
      <div className="trackingCard">
        <h1>Job Tracking</h1>

        <p className="jobId">
          Job ID: <span>{jobId}</span>
        </p>

        <h2>{job.customerName}</h2>

        <div className="tracking-actions">
          <button onClick={createNewBooking}>
            New booking
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
        </div>

        <div className="infoBox">
          <strong>Phone:</strong> {job.phone || "N/A"}
        </div>

        <div className="infoBox">
          <strong>Vehicle:</strong> {job.vehicle || "Not checked"}
        </div>

        <div className="infoBox">
          <strong>Registration:</strong> {job.registration || "N/A"}
        </div>

        <div className="infoBox">
          <strong>Address:</strong> {job.address || "N/A"}
        </div>

        <div className="infoBox">
          <strong>ETA:</strong> {job.eta || "Awaiting ETA"}
        </div>

        <div className="infoBox">
          <strong>Notes:</strong> {job.notes || "N/A"}
        </div>

        <div className="statusBox">
          <h3>Status</h3>
          <p>{job.status || "Pending"}</p>
        </div>
      </div>
    </div>
  );
}
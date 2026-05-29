import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebaseconfig.js";
import "./App.css";

export default function App() {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("All");
  const [newJob, setNewJob] = useState({
    service: "Mobile Tyre Fitting",
    name: "",
    phone: "",
    registration: "",
    vehicle: "Not checked",
    address: "",
  });

  useEffect(() => {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBookings(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsubscribe();
  }, []);

  async function updateJob(jobId, data) {
    await updateDoc(doc(db, "bookings", jobId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  async function createJob(e) {
    e.preventDefault();

    await addDoc(collection(db, "bookings"), {
      ...newJob,
      status: "New booking",
      eta: "Awaiting ETA",
      etaMode: "manual",
      manualEta: "",
      paymentStatus: "Unpaid",
      driverTrackingActive: false,
      paymentUrl: "",
      invoiceUrl: "",
      notes: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setNewJob({
      service: "Mobile Tyre Fitting",
      name: "",
      phone: "",
      registration: "",
      vehicle: "Not checked",
      address: "",
    });
  }

  function formatPhone(phoneValue) {
    const raw = String(phoneValue || "").replace(/\D/g, "");
    return raw.startsWith("0") ? `44${raw.slice(1)}` : raw;
  }

  function makeWhatsAppLink(job, customStatus = null) {
    const phone = formatPhone(job.phone || job.customerPhone);
    const status = customStatus || job.status || "New booking";

    const message = encodeURIComponent(
      `Hi ${job.name || job.customerName || "there"}, your McDowell Auto Services job is now: ${status}. ETA: ${
        job.eta || "Awaiting ETA"
      }. Track it here: ${window.location.origin}/tracking/${job.id}`
    );

    return `https://wa.me/${phone}?text=${message}`;
  }

  const filteredBookings =
    filter === "All"
      ? bookings
      : bookings.filter((job) => (job.status || "New booking") === filter);

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>McDowell Admin Dashboard</h1>
          <p>Live tyre, roadside, recovery and driver map tracking</p>
        </div>

        <span className="liveBadge">LIVE</span>
      </header>

      <section className="statsGrid">
        <div className="statCard">
          <h2>{bookings.length}</h2>
          <p>Total Jobs</p>
        </div>

        <div className="statCard">
          <h2>
            {
              bookings.filter(
                (j) => (j.status || "New booking") === "New booking"
              ).length
            }
          </h2>
          <p>New</p>
        </div>

        <div className="statCard">
          <h2>{bookings.filter((j) => j.driverTrackingActive).length}</h2>
          <p>Drivers Active</p>
        </div>

        <div className="statCard">
          <h2>{bookings.filter((j) => j.paymentStatus === "Paid").length}</h2>
          <p>Paid</p>
        </div>
      </section>

      <section className="createJobPanel">
        <h2>Create New Job</h2>

        <form onSubmit={createJob} className="createJobForm">
          <input
            placeholder="Customer name"
            value={newJob.name}
            onChange={(e) => setNewJob({ ...newJob, name: e.target.value })}
            required
          />

          <input
            placeholder="Phone number"
            value={newJob.phone}
            onChange={(e) => setNewJob({ ...newJob, phone: e.target.value })}
            required
          />

          <input
            placeholder="Registration"
            value={newJob.registration}
            onChange={(e) =>
              setNewJob({ ...newJob, registration: e.target.value })
            }
          />

          <input
            placeholder="Vehicle"
            value={newJob.vehicle}
            onChange={(e) => setNewJob({ ...newJob, vehicle: e.target.value })}
          />

          <input
            placeholder="Address / location"
            value={newJob.address}
            onChange={(e) => setNewJob({ ...newJob, address: e.target.value })}
          />

          <select
            value={newJob.service}
            onChange={(e) => setNewJob({ ...newJob, service: e.target.value })}
          >
            <option>Mobile Tyre Fitting</option>
            <option>Roadside Assistance</option>
            <option>Vehicle Recovery</option>
            <option>Battery Replacement</option>
            <option>Lockout Assistance</option>
          </select>

          <button type="submit">+ Create Job</button>
        </form>
      </section>

      <section className="filters">
        {[
          "All",
          "New booking",
          "Accepted",
          "On Route",
          "Arrived",
          "In Progress",
          "Completed",
          "Cancelled",
        ].map((item) => (
          <button
            key={item}
            className={filter === item ? "activeFilter" : ""}
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
      </section>

      <section className="bookingsList">
        {filteredBookings.map((job) => (
          <div className="jobCard" key={job.id}>
            <div className="jobTop">
              <div>
                <h2>{job.service || "Mobile Tyre Fitting"}</h2>

                <p className="muted">
                  Job ID:{" "}
                  <a
                    href={`/tracking/${job.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {job.id}
                  </a>
                </p>
              </div>

              <div className="badges">
                <span className="statusBadge">{job.status || "New booking"}</span>
                <span className="paymentBadge">
                  {job.paymentStatus || "Unpaid"}
                </span>
                <span
                  className={
                    job.driverTrackingActive
                      ? "driverBadge activeDriver"
                      : "driverBadge inactiveDriver"
                  }
                >
                  {job.driverTrackingActive ? "Driver Live" : "Driver Offline"}
                </span>
              </div>
            </div>

            <div className="jobGrid">
              <div>
                <small>Customer</small>
                <strong>{job.name || job.customerName || "Customer"}</strong>
              </div>

              <div>
                <small>Phone</small>
                <strong>{job.phone || job.customerPhone || "N/A"}</strong>
              </div>

              <div>
                <small>Registration</small>
                <strong>{job.registration || job.reg || "N/A"}</strong>
              </div>

              <div>
                <small>Vehicle</small>
                <strong>{job.vehicle || "Not checked"}</strong>
              </div>

              <div>
                <small>ETA</small>
                <strong>{job.eta || "Awaiting ETA"}</strong>
              </div>
            </div>

            <div className="statusButtons">
              <button
                onClick={() =>
                  updateJob(job.id, {
                    status: "Accepted",
                    eta: job.manualEta || "Awaiting manual ETA",
                    etaMode: "manual",
                  })
                }
              >
                Accept
              </button>

              <button
                onClick={() =>
                  updateJob(job.id, {
                    status: "On Route",
                    eta: "Live GPS updating",
                    etaMode: "gps",
                    driverTrackingActive: true,
                  })
                }
              >
                On Route
              </button>

              <button
                onClick={() =>
                  updateJob(job.id, {
                    status: "Arrived",
                    eta: "Arrived",
                    etaMode: "gps",
                  })
                }
              >
                Arrived
              </button>

              <button
                onClick={() =>
                  updateJob(job.id, {
                    status: "In Progress",
                    eta: "In progress",
                    etaMode: "manual",
                  })
                }
              >
                In Progress
              </button>

              <button
                onClick={() =>
                  updateJob(job.id, {
                    status: "Completed",
                    eta: "Completed",
                    etaMode: "manual",
                    driverTrackingActive: false,
                  })
                }
              >
                Complete
              </button>

              <button
                onClick={() =>
                  updateJob(job.id, {
                    status: "Cancelled",
                    eta: "Cancelled",
                    etaMode: "manual",
                    driverTrackingActive: false,
                  })
                }
              >
                Cancel
              </button>
            </div>

            <div className="etaControls">
              <input
                placeholder="Manual ETA after accepting job, e.g. 25 minutes"
                value={job.manualEta || ""}
                onChange={(e) =>
                  updateJob(job.id, {
                    manualEta: e.target.value,
                  })
                }
              />

              <button
                onClick={() =>
                  updateJob(job.id, {
                    eta: job.manualEta || "Awaiting manual ETA",
                    etaMode: "manual",
                  })
                }
              >
                Update Manual ETA
              </button>

              <a href={`/driver/${job.id}`} target="_blank" rel="noreferrer">
                Open Driver GPS
              </a>
            </div>

            <div className="adminActions">
              <button onClick={() => updateJob(job.id, { paymentStatus: "Paid" })}>
                Mark Paid
              </button>

              <button
                onClick={() => updateJob(job.id, { paymentStatus: "Unpaid" })}
              >
                Mark Unpaid
              </button>

              <button
                onClick={() =>
                  updateJob(job.id, {
                    driverTrackingActive: !job.driverTrackingActive,
                  })
                }
              >
                {job.driverTrackingActive
                  ? "Stop Driver Tracking"
                  : "Start Driver Tracking"}
              </button>

              <a href={makeWhatsAppLink(job)} target="_blank" rel="noreferrer">
                WhatsApp Customer
              </a>
            </div>

            <div className="quickWhatsApp">
              <a
                href={makeWhatsAppLink(job, "Accepted")}
                target="_blank"
                rel="noreferrer"
              >
                Send Accepted WhatsApp
              </a>

              <a
                href={makeWhatsAppLink(job, "On Route")}
                target="_blank"
                rel="noreferrer"
              >
                Send On Route WhatsApp
              </a>

              <a
                href={makeWhatsAppLink(job, "Arrived")}
                target="_blank"
                rel="noreferrer"
              >
                Send Arrived WhatsApp
              </a>

              <a
                href={makeWhatsAppLink(job, "Completed")}
                target="_blank"
                rel="noreferrer"
              >
                Send Completed WhatsApp
              </a>
            </div>

            <div className="linkInputs">
              <input
                placeholder="Paste Stripe payment link"
                defaultValue={job.paymentUrl || ""}
                onBlur={(e) => updateJob(job.id, { paymentUrl: e.target.value })}
              />

              <input
                placeholder="Paste invoice PDF link"
                defaultValue={job.invoiceUrl || ""}
                onBlur={(e) => updateJob(job.id, { invoiceUrl: e.target.value })}
              />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
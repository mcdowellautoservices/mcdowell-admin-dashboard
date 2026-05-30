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

const DRIVERS = [
  {
    name: "Peter",
    phone: "07592247365",
    vehicle: "Recovery / Tyre Van 1",
  },
  {
    name: "Sarah",
    phone: "",
    vehicle: "Admin / Dispatch",
  },
  {
    name: "Driver 2",
    phone: "",
    vehicle: "Van 2",
  },
];

export default function App() {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const [newJob, setNewJob] = useState({
    service: "Mobile Tyre Fitting",
    name: "",
    phone: "",
    registration: "",
    vehicle: "Not checked",
    address: "",
    customerLat: "",
    customerLng: "",
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
      customerLat: newJob.customerLat ? Number(newJob.customerLat) : null,
      customerLng: newJob.customerLng ? Number(newJob.customerLng) : null,
      status: "New booking",
      eta: "Awaiting ETA",
      etaMode: "manual",
      manualEta: "",
      driverName: "",
      driverPhone: "",
      driverVehicle: "",
      driverNotes: "",
      driverTrackingActive: false,
      paymentStatus: "Unpaid",
      paymentUrl: "",
      invoiceUrl: "",
      notes: "",
      photoUrl: "",
      signatureUrl: "",
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
      customerLat: "",
      customerLng: "",
    });
  }

  function hasCustomerGps(job) {
    return job.customerLat !== undefined && job.customerLat !== null && job.customerLng !== undefined && job.customerLng !== null;
  }

  function hasDriverGps(job) {
    return job.driverLat !== undefined && job.driverLat !== null && job.driverLng !== undefined && job.driverLng !== null;
  }

  function formatPhone(phoneValue) {
    const raw = String(phoneValue || "").replace(/\D/g, "");
    return raw.startsWith("0") ? `44${raw.slice(1)}` : raw;
  }

  function makeWhatsAppLink(job, customStatus = null) {
    const phone = formatPhone(job.phone || job.customerPhone);
    const status = customStatus || job.status || "New booking";

    const message = encodeURIComponent(
      `Hi ${job.name || "there"}, your McDowell Auto Services job is now: ${status}. ETA: ${
        job.eta || "Awaiting ETA"
      }. Track it here: ${window.location.origin}/tracking/${job.id}`
    );

    return `https://wa.me/${phone}?text=${message}`;
  }

  function makeDriverWhatsApp(job) {
    const phone = formatPhone(job.driverPhone);
    const message = encodeURIComponent(
      `New McDowell job assigned.\nCustomer: ${job.name || "Customer"}\nPhone: ${job.phone || "N/A"}\nReg: ${job.registration || "N/A"}\nAddress: ${job.address || "N/A"}\nDriver GPS: ${window.location.origin}/driver/${job.id}\nCustomer tracking: ${window.location.origin}/tracking/${job.id}`
    );

    return `https://wa.me/${phone}?text=${message}`;
  }

  async function assignDriver(jobId, driverName) {
    const driver = DRIVERS.find((d) => d.name === driverName);

    if (!driver) {
      await updateJob(jobId, {
        driverName: "",
        driverPhone: "",
        driverVehicle: "",
        driverNotes: "",
      });
      return;
    }

    await updateJob(jobId, {
      driverName: driver.name,
      driverPhone: driver.phone,
      driverVehicle: driver.vehicle,
      status: "Accepted",
      eta: "Driver assigned",
      etaMode: "manual",
    });
  }

  const visibleBookings = bookings.filter((job) => {
    const status = job.status || "New booking";

    if (filter === "All" && (status === "Cancelled" || status === "Completed")) return false;
    if (filter === "Completed Archive" && status !== "Completed") return false;
    if (filter === "Cancelled Jobs" && status !== "Cancelled") return false;
    if (!["All", "Completed Archive", "Cancelled Jobs"].includes(filter) && status !== filter) return false;

    const text = `${job.id} ${job.name || ""} ${job.phone || ""} ${job.registration || ""} ${job.vehicle || ""} ${job.driverName || ""}`.toLowerCase();

    return text.includes(search.toLowerCase());
  });

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>McDowell Admin Dashboard</h1>
          <p>Live jobs, ETA, GPS, drivers, payments and tracking</p>
        </div>
        <span className="liveBadge">LIVE</span>
      </header>

      <section className="statsGrid">
        <div className="statCard"><h2>{bookings.length}</h2><p>Total Jobs</p></div>
        <div className="statCard"><h2>{bookings.filter((j) => (j.status || "New booking") === "New booking").length}</h2><p>New</p></div>
        <div className="statCard"><h2>{bookings.filter((j) => j.driverTrackingActive).length}</h2><p>Drivers Active</p></div>
        <div className="statCard"><h2>{bookings.filter((j) => hasCustomerGps(j)).length}</h2><p>Customer GPS</p></div>
        <div className="statCard"><h2>{bookings.filter((j) => j.paymentStatus === "Paid").length}</h2><p>Paid</p></div>
        <div className="statCard"><h2>{bookings.filter((j) => j.status === "Completed").length}</h2><p>Completed</p></div>
        <div className="statCard"><h2>{bookings.filter((j) => j.status === "Cancelled").length}</h2><p>Cancelled</p></div>
      </section>

      <section className="createJobPanel">
        <h2>Create New Job</h2>

        <form onSubmit={createJob} className="createJobForm">
          <input placeholder="Customer name" value={newJob.name} onChange={(e) => setNewJob({ ...newJob, name: e.target.value })} required />
          <input placeholder="Phone number" value={newJob.phone} onChange={(e) => setNewJob({ ...newJob, phone: e.target.value })} required />
          <input placeholder="Registration" value={newJob.registration} onChange={(e) => setNewJob({ ...newJob, registration: e.target.value })} />
          <input placeholder="Vehicle" value={newJob.vehicle} onChange={(e) => setNewJob({ ...newJob, vehicle: e.target.value })} />
          <input placeholder="Address / location" value={newJob.address} onChange={(e) => setNewJob({ ...newJob, address: e.target.value })} />

          <select value={newJob.service} onChange={(e) => setNewJob({ ...newJob, service: e.target.value })}>
            <option>Mobile Tyre Fitting</option>
            <option>Roadside Assistance</option>
            <option>Vehicle Recovery</option>
            <option>Battery Replacement</option>
            <option>Lockout Assistance</option>
          </select>

          <button type="submit">+ Create Job</button>
        </form>
      </section>

      <input
        className="searchBox"
        placeholder="Search by name, phone, reg, driver or job ID"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <section className="filters">
        {["All", "New booking", "Accepted", "On Route", "Arrived", "In Progress", "Completed Archive", "Cancelled Jobs"].map((item) => (
          <button key={item} className={filter === item ? "activeFilter" : ""} onClick={() => setFilter(item)}>
            {item}
          </button>
        ))}
      </section>

      <section className="bookingsList">
        {visibleBookings.map((job) => (
          <div className="jobCard" key={job.id}>
            <div className="jobTop">
              <div>
                <h2>{job.service || "Mobile Tyre Fitting"}</h2>
                <p className="muted">
                  Job ID: <a href={`/tracking/${job.id}`} target="_blank" rel="noreferrer">{job.id}</a>
                </p>
              </div>

              <div className="badges">
                <span className="statusBadge">{job.status || "New booking"}</span>
                <span className="paymentBadge">{job.paymentStatus || "Unpaid"}</span>
                <span className={job.driverTrackingActive ? "driverBadge activeDriver" : "driverBadge inactiveDriver"}>
                  {job.driverTrackingActive ? "Driver Live" : "Driver Offline"}
                </span>
              </div>
            </div>

            {hasCustomerGps(job) && (
              <div className="gpsBox">
                <strong>Customer GPS Shared</strong>
                <span>{job.customerLat}, {job.customerLng}</span>
                <a href={`https://www.google.com/maps?q=${job.customerLat},${job.customerLng}`} target="_blank" rel="noreferrer">📍 Open Customer Location</a>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${job.customerLat},${job.customerLng}`} target="_blank" rel="noreferrer">🧭 Navigate To Customer</a>
              </div>
            )}

            {hasDriverGps(job) && (
              <div className="gpsBox">
                <strong>Driver GPS</strong>
                <span>{job.driverLat}, {job.driverLng}</span>
                <a href={`https://www.google.com/maps?q=${job.driverLat},${job.driverLng}`} target="_blank" rel="noreferrer">🚗 Open Driver Location</a>
              </div>
            )}

            <div className="jobGrid">
              <div><small>Customer</small><strong>{job.name || "Customer"}</strong></div>
              <div><small>Phone</small><strong>{job.phone || "N/A"}</strong></div>
              <div><small>Registration</small><strong>{job.registration || "N/A"}</strong></div>
              <div><small>Vehicle</small><strong>{job.vehicle || "Not checked"}</strong></div>
              <div><small>ETA</small><strong>{job.eta || "Awaiting ETA"}</strong></div>
              <div><small>ETA Mode</small><strong>{job.etaMode || "manual"}</strong></div>
              <div><small>Customer GPS</small><strong>{hasCustomerGps(job) ? "Shared" : "Not shared"}</strong></div>
              <div><small>Driver</small><strong>{job.driverName || "Unassigned"}</strong></div>
              <div><small>Driver Phone</small><strong>{job.driverPhone || "N/A"}</strong></div>
              <div><small>Driver Vehicle</small><strong>{job.driverVehicle || "N/A"}</strong></div>
            </div>

            <div className="driverAssignment">
              <h3>Driver Assignment</h3>

              <select value={job.driverName || ""} onChange={(e) => assignDriver(job.id, e.target.value)}>
                <option value="">Unassigned</option>
                {DRIVERS.map((driver) => (
                  <option key={driver.name} value={driver.name}>
                    {driver.name} - {driver.vehicle}
                  </option>
                ))}
              </select>

              <input
                placeholder="Driver notes"
                defaultValue={job.driverNotes || ""}
                onBlur={(e) => updateJob(job.id, { driverNotes: e.target.value })}
              />

              {job.driverPhone && (
                <a href={makeDriverWhatsApp(job)} target="_blank" rel="noreferrer">
                  WhatsApp Driver Job Details
                </a>
              )}
            </div>

            <div className="statusButtons">
              <button onClick={() => updateJob(job.id, { status: "Accepted", eta: job.manualEta || "Awaiting manual ETA", etaMode: "manual" })}>Accept</button>
              <button onClick={() => updateJob(job.id, { status: "On Route", eta: "Live GPS updating", etaMode: "gps", driverTrackingActive: true })}>On Route</button>
              <button onClick={() => updateJob(job.id, { status: "Arrived", eta: "Arrived", etaMode: "gps" })}>Arrived</button>
              <button onClick={() => updateJob(job.id, { status: "In Progress", eta: "In progress", etaMode: "manual" })}>In Progress</button>
              <button onClick={() => updateJob(job.id, { status: "Completed", eta: "Completed", etaMode: "manual", driverTrackingActive: false })}>Complete</button>
              <button onClick={() => updateJob(job.id, { status: "Cancelled", eta: "Cancelled", etaMode: "manual", driverTrackingActive: false })}>Cancel</button>
            </div>

            <div className="etaControls">
              <input
                placeholder="Manual ETA e.g. 25 minutes"
                value={job.manualEta || ""}
                onChange={(e) => updateJob(job.id, { manualEta: e.target.value })}
              />

              <button onClick={() => updateJob(job.id, { eta: job.manualEta || "Awaiting manual ETA", etaMode: "manual" })}>
                Update Manual ETA
              </button>

              <a href={`/driver/${job.id}`} target="_blank" rel="noreferrer">
                Open Driver GPS
              </a>
            </div>

            <div className="adminActions">
              <button onClick={() => updateJob(job.id, { paymentStatus: "Paid" })}>Mark Paid</button>
              <button onClick={() => updateJob(job.id, { paymentStatus: "Unpaid" })}>Mark Unpaid</button>

              <button onClick={() => updateJob(job.id, { driverTrackingActive: !job.driverTrackingActive })}>
                {job.driverTrackingActive ? "Stop Driver Tracking" : "Start Driver Tracking"}
              </button>

              <a href={makeWhatsAppLink(job)} target="_blank" rel="noreferrer">WhatsApp Customer</a>
              <a href={makeWhatsAppLink(job, "Accepted")} target="_blank" rel="noreferrer">Send Accepted WhatsApp</a>
              <a href={makeWhatsAppLink(job, "On Route")} target="_blank" rel="noreferrer">Send On Route WhatsApp</a>
              <a href={makeWhatsAppLink(job, "Arrived")} target="_blank" rel="noreferrer">Send Arrived WhatsApp</a>
              <a href={makeWhatsAppLink(job, "Completed")} target="_blank" rel="noreferrer">Send Completed WhatsApp</a>
            </div>

            <div className="linkInputs">
              <input placeholder="Paste Stripe payment link" defaultValue={job.paymentUrl || ""} onBlur={(e) => updateJob(job.id, { paymentUrl: e.target.value })} />
              <input placeholder="Paste invoice PDF link" defaultValue={job.invoiceUrl || ""} onBlur={(e) => updateJob(job.id, { invoiceUrl: e.target.value })} />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
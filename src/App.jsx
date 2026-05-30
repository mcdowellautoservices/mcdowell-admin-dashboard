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
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebaseconfig.js";
import { DRIVERS } from "./data/drivers.js";
import "./App.css";

const BUSINESS_WHATSAPP = "447592247365";

export default function App() {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState("");

  const [newJob, setNewJob] = useState({
    service: "Mobile Tyre Fitting",
    priority: "Normal",
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

  async function uploadJobFile(jobId, file, fieldName) {
    if (!file) return;

    try {
      setUploading(`${jobId}-${fieldName}`);

      const safeName = file.name.replace(/\s+/g, "-");
      const storageRef = ref(
        storage,
        `job-proof/${jobId}/${fieldName}-${Date.now()}-${safeName}`
      );

      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      await updateJob(jobId, {
        [fieldName]: downloadUrl,
        [`${fieldName}Meta`]: {
          uploadedAt: new Date().toISOString(),
          uploadedBy: "admin",
          fileName: file.name,
          fileType: file.type,
        },
      });

      alert("File uploaded successfully.");
    } catch (error) {
      console.error(error);
      alert("Upload failed: " + error.message);
    } finally {
      setUploading("");
    }
  }

  async function createJob(e) {
    e.preventDefault();

    const suggestedDriver = DRIVERS.find((driver) => driver.active);

    await addDoc(collection(db, "bookings"), {
      ...newJob,
      status: "New booking",
      eta: "Awaiting ETA",
      etaMode: "manual",
      manualEta: "",
      driverName: suggestedDriver?.name || "",
      driverPhone: suggestedDriver?.phone || "",
      driverVehicle: suggestedDriver?.vehicle || "",
      driverNotes: "",
      driverTrackingActive: false,
      paymentStatus: "Unpaid",
      paymentUrl: "",
      invoiceUrl: "",
      jobPrice: 0,
      notes: "",
      worksheet: null,
      worksheetCompleted: false,
      worksheetCompletedAt: null,
      beforePhotoUrl: "",
      beforePhotoUrlMeta: null,
      afterPhotoUrl: "",
      afterPhotoUrlMeta: null,
      signaturePhotoUrl: "",
      signaturePhotoUrlMeta: null,
      completionNotes: "",
      driverDamageWaiverAccepted: false,
      customerDisclaimerAccepted: false,
      customerSignatureName: "",
      customerDisclaimerText: "",
      completedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    setNewJob({
      service: "Mobile Tyre Fitting",
      priority: "Normal",
      name: "",
      phone: "",
      registration: "",
      vehicle: "Not checked",
      address: "",
    });
  }

  function hasCustomerGps(job) {
    return job.customerLat && job.customerLng;
  }

  function hasDriverGps(job) {
    return job.driverLat && job.driverLng;
  }

  function assignDriver(jobId, driverName) {
    const driver = DRIVERS.find((d) => d.name === driverName);

    if (!driver) {
      return updateJob(jobId, {
        driverName: "",
        driverPhone: "",
        driverVehicle: "",
      });
    }

    return updateJob(jobId, {
      driverName: driver.name,
      driverPhone: driver.phone,
      driverVehicle: driver.vehicle,
      status: "Accepted",
      eta: "Driver assigned",
      etaMode: "manual",
    });
  }

  function formatPhone(phone) {
    const cleaned = String(phone || "").replace(/\D/g, "");
    return cleaned.startsWith("0") ? `44${cleaned.slice(1)}` : cleaned;
  }

  function whatsappCustomer(job, status = null) {
    const phone = formatPhone(job.phone);
    const message = encodeURIComponent(
      `Hi ${job.name || "there"}, your McDowell Auto Services job is now: ${
        status || job.status || "New booking"
      }. ETA: ${job.eta || "Awaiting ETA"}. Track here: ${
        window.location.origin
      }/tracking/${job.id}`
    );

    return `https://wa.me/${phone}?text=${message}`;
  }

  function whatsappDriver(job) {
    const phone = formatPhone(job.driverPhone);
    const message = encodeURIComponent(
      `New McDowell job assigned.\nCustomer: ${job.name || "N/A"}\nPhone: ${
        job.phone || "N/A"
      }\nReg: ${job.registration || "N/A"}\nAddress: ${
        job.address || "N/A"
      }\nDriver GPS: ${window.location.origin}/driver/${
        job.id
      }\nCustomer tracking: ${window.location.origin}/tracking/${job.id}`
    );

    return `https://wa.me/${phone}?text=${message}`;
  }

  function businessWhatsApp(message = "Hi McDowell Auto Services") {
    return `https://wa.me/${BUSINESS_WHATSAPP}?text=${encodeURIComponent(
      message
    )}`;
  }

  const visibleBookings = bookings.filter((job) => {
    const status = job.status || "New booking";

    if (filter === "All" && ["Cancelled", "Completed"].includes(status)) {
      return false;
    }

    if (filter === "Completed Archive" && status !== "Completed") return false;
    if (filter === "Cancelled Jobs" && status !== "Cancelled") return false;

    if (
      !["All", "Completed Archive", "Cancelled Jobs"].includes(filter) &&
      status !== filter
    ) {
      return false;
    }

    const text = `${job.name || ""} ${job.phone || ""} ${
      job.registration || ""
    } ${job.driverName || ""} ${job.priority || ""}`.toLowerCase();

    return text.includes(search.toLowerCase());
  });

  const totalRevenue = bookings.reduce(
    (sum, job) => sum + Number(job.jobPrice || 0),
    0
  );

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>McDowell Admin Dashboard</h1>
          <p>Live jobs, GPS, drivers, payments, proof and dispatch</p>
        </div>

        <div className="headerActions">
          <span className="liveBadge">LIVE</span>
          <a
            href={businessWhatsApp("Hi McDowell Auto Services")}
            target="_blank"
            rel="noreferrer"
            className="businessWhatsAppBtn"
          >
            Business WhatsApp
          </a>
        </div>
      </header>

      <section className="statsGrid">
        <div className="statCard"><h2>{bookings.length}</h2><p>Total Jobs</p></div>
        <div className="statCard"><h2>{bookings.filter((j) => j.status === "New booking").length}</h2><p>New Jobs</p></div>
        <div className="statCard"><h2>{bookings.filter((j) => j.status === "On Route").length}</h2><p>On Route</p></div>
        <div className="statCard"><h2>{bookings.filter((j) => j.status === "In Progress").length}</h2><p>In Progress</p></div>
        <div className="statCard"><h2>{bookings.filter((j) => j.status === "Completed").length}</h2><p>Completed</p></div>
        <div className="statCard"><h2>{bookings.filter((j) => j.paymentStatus === "Paid").length}</h2><p>Paid</p></div>
        <div className="statCard"><h2>£{totalRevenue}</h2><p>Revenue</p></div>
        <div className="statCard"><h2>{DRIVERS.filter((d) => d.active).length}</h2><p>Drivers Online</p></div>
        <div className="statCard emergencyCard"><h2>{bookings.filter((j) => j.priority === "Emergency").length}</h2><p>Emergency</p></div>
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

          <select value={newJob.priority} onChange={(e) => setNewJob({ ...newJob, priority: e.target.value })}>
            <option>Normal</option>
            <option>Urgent</option>
            <option>Emergency</option>
          </select>

          <button type="submit">+ Create Job</button>
        </form>
      </section>

      <input
        className="searchBox"
        placeholder="Search jobs..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <section className="filters">
        {[
          "All",
          "New booking",
          "Accepted",
          "On Route",
          "Arrived",
          "In Progress",
          "Awaiting Customer Sign-Off",
          "Completed Archive",
          "Cancelled Jobs",
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
        {visibleBookings.map((job) => (
          <div key={job.id} className="jobCard">
            <div className="jobTop">
              <div>
                <h2>{job.service || "Mobile Tyre Fitting"}</h2>
                <p>
                  Job ID:{" "}
                  <a href={`/tracking/${job.id}`} target="_blank" rel="noreferrer">
                    {job.id}
                  </a>
                </p>
              </div>

              <div className="badges">
                <span className={`priority ${job.priority || "Normal"}`}>
                  {job.priority || "Normal"}
                </span>
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
                <a
                  href={`https://www.google.com/maps?q=${job.customerLat},${job.customerLng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  📍 Open Customer Location
                </a>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${job.customerLat},${job.customerLng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  🧭 Navigate
                </a>
              </div>
            )}

            {hasDriverGps(job) && job.status !== "Completed" && (
              <div className="gpsBox driverGps">
                <strong>Driver GPS</strong>
                <span>{job.driverLat}, {job.driverLng}</span>
                <a
                  href={`https://www.google.com/maps?q=${job.driverLat},${job.driverLng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  🚗 Open Driver Location
                </a>
              </div>
            )}

            <div className="jobGrid">
              <div><small>Customer</small><strong>{job.name || "N/A"}</strong></div>
              <div><small>Phone</small><strong>{job.phone || "N/A"}</strong></div>
              <div><small>Registration</small><strong>{job.registration || "N/A"}</strong></div>
              <div><small>Vehicle</small><strong>{job.vehicle || "Not checked"}</strong></div>
              <div><small>ETA</small><strong>{job.eta || "Awaiting ETA"}</strong></div>
              <div><small>Driver</small><strong>{job.driverName || "Unassigned"}</strong></div>
              <div><small>Driver Phone</small><strong>{job.driverPhone || "N/A"}</strong></div>
              <div><small>Driver Vehicle</small><strong>{job.driverVehicle || "N/A"}</strong></div>
              <div><small>Price</small><strong>£{job.jobPrice || 0}</strong></div>
              <div><small>Worksheet</small><strong>{job.worksheetCompleted ? "Completed" : "Not completed"}</strong></div>
              <div><small>Driver Waiver</small><strong>{job.driverDamageWaiverAccepted ? "Accepted" : "Not accepted"}</strong></div>
              <div><small>Customer Disclaimer</small><strong>{job.customerDisclaimerAccepted ? "Accepted" : "Not accepted"}</strong></div>
            </div>

            <div className="driverAssignment">
              <h3>Driver Assignment</h3>

              <select value={job.driverName || ""} onChange={(e) => assignDriver(job.id, e.target.value)}>
                <option value="">Unassigned</option>
                {DRIVERS.map((driver) => (
                  <option key={driver.id} value={driver.name}>
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
                <a href={whatsappDriver(job)} target="_blank" rel="noreferrer">
                  WhatsApp Driver Job Details
                </a>
              )}
            </div>

            <div className="proofSection">
              <h3>Completion Proof</h3>

              <label>
                Arrival / Before Photo Upload
                <input type="file" accept="image/*" onChange={(e) => uploadJobFile(job.id, e.target.files[0], "beforePhotoUrl")} />
              </label>

              <label>
                After Photo Upload
                <input type="file" accept="image/*" onChange={(e) => uploadJobFile(job.id, e.target.files[0], "afterPhotoUrl")} />
              </label>

              <label>
                Signature / Extra Proof Upload
                <input type="file" accept="image/*" onChange={(e) => uploadJobFile(job.id, e.target.files[0], "signaturePhotoUrl")} />
              </label>

              {uploading.startsWith(job.id) && <p>Uploading...</p>}

              <textarea
                placeholder="Completion Notes"
                defaultValue={job.completionNotes || ""}
                onBlur={(e) => updateJob(job.id, { completionNotes: e.target.value })}
              />

              <div className="proofCards">
                {job.beforePhotoUrl && (
                  <div className="proofCard">
                    <h4>Before Photo</h4>
                    <a href={job.beforePhotoUrl} target="_blank" rel="noreferrer">View Before Photo</a>
                  </div>
                )}

                {job.afterPhotoUrl && (
                  <div className="proofCard">
                    <h4>After Photo</h4>
                    <a href={job.afterPhotoUrl} target="_blank" rel="noreferrer">View After Photo</a>
                  </div>
                )}

                {job.signaturePhotoUrl && (
                  <div className="proofCard">
                    <h4>Signature / Extra Proof</h4>
                    <a href={job.signaturePhotoUrl} target="_blank" rel="noreferrer">View Proof</a>
                  </div>
                )}
              </div>
            </div>

            <div className="statusButtons">
              <button onClick={() => updateJob(job.id, { status: "Accepted", eta: "Driver assigned" })}>
                Accept
              </button>

              <button onClick={() => updateJob(job.id, { status: "On Route", eta: "Live GPS updating", etaMode: "gps", driverTrackingActive: true })}>
                On Route
              </button>

              <button onClick={() => updateJob(job.id, { status: "Arrived", eta: "Arrived - photo required" })}>
                Arrived
              </button>

              <button onClick={() => updateJob(job.id, { status: "In Progress", eta: "In progress" })}>
                In Progress
              </button>

              <button
                onClick={() => {
                  if (!job.beforePhotoUrl) {
                    alert("Before/arrival photo is required before completion.");
                    return;
                  }

                  if (!job.worksheetCompleted) {
                    alert("Roadside worksheet must be completed before customer sign-off.");
                    return;
                  }

                  if (!job.afterPhotoUrl) {
                    alert("After photo is required before completion.");
                    return;
                  }

                  if (!job.driverDamageWaiverAccepted) {
                    alert("Driver damage waiver must be accepted first.");
                    return;
                  }

                  updateJob(job.id, {
                    status: "Awaiting Customer Sign-Off",
                    eta: "Awaiting customer sign-off",
                    driverTrackingActive: false,
                  });
                }}
              >
                Request Customer Sign-Off
              </button>

              <button onClick={() => updateJob(job.id, { status: "Cancelled", eta: "Cancelled", driverTrackingActive: false })}>
                Cancel
              </button>
            </div>

            <div className="etaControls">
              <input
                placeholder="Manual ETA"
                defaultValue={job.manualEta || ""}
                onBlur={(e) => updateJob(job.id, { manualEta: e.target.value })}
              />

              <button onClick={() => updateJob(job.id, { eta: job.manualEta || "Awaiting manual ETA", etaMode: "manual" })}>
                Update ETA
              </button>

              {job.status !== "Completed" ? (
                <a href={`/driver/${job.id}`} target="_blank" rel="noreferrer">
                  Open Driver GPS
                </a>
              ) : (
                <button disabled>Driver GPS Closed</button>
              )}
            </div>

            <div className="adminActions">
              <button onClick={() => updateJob(job.id, { paymentStatus: "Paid" })}>Mark Paid</button>
              <button onClick={() => updateJob(job.id, { paymentStatus: "Unpaid" })}>Mark Unpaid</button>

              <a href={whatsappCustomer(job)} target="_blank" rel="noreferrer">WhatsApp Customer</a>
              <a href={whatsappCustomer(job, "Accepted")} target="_blank" rel="noreferrer">Accepted WhatsApp</a>
              <a href={whatsappCustomer(job, "On Route")} target="_blank" rel="noreferrer">On Route WhatsApp</a>
              <a href={whatsappCustomer(job, "Arrived")} target="_blank" rel="noreferrer">Arrived WhatsApp</a>
              <a href={whatsappCustomer(job, "Completed")} target="_blank" rel="noreferrer">Completed WhatsApp</a>

              <a
                href={businessWhatsApp(
                  `McDowell job update:\nCustomer: ${job.name || "N/A"}\nReg: ${
                    job.registration || "N/A"
                  }\nStatus: ${job.status || "New booking"}\nETA: ${
                    job.eta || "Awaiting ETA"
                  }\nTracking: ${window.location.origin}/tracking/${job.id}`
                )}
                target="_blank"
                rel="noreferrer"
              >
                Send To Business WhatsApp
              </a>
            </div>

            <div className="linkInputs">
              <input
                placeholder="Job price"
                type="number"
                defaultValue={job.jobPrice || ""}
                onBlur={(e) => updateJob(job.id, { jobPrice: Number(e.target.value || 0) })}
              />

              <input
                placeholder="Stripe payment link"
                defaultValue={job.paymentUrl || ""}
                onBlur={(e) => updateJob(job.id, { paymentUrl: e.target.value })}
              />

              <input
                placeholder="Invoice PDF link"
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
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebaseconfig.js";
import DriversWorksheet from "./DriversWorksheet.jsx";

export default function DriverPage() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [status, setStatus] = useState("GPS stopped");
  const [watchId, setWatchId] = useState(null);
  const [uploading, setUploading] = useState("");

  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(doc(db, "bookings", id), (docSnap) => {
      if (docSnap.exists()) {
        setBooking({ id: docSnap.id, ...docSnap.data() });
      }
    });

    return () => unsubscribe();
  }, [id]);

  const jobCompleted = booking?.status === "Completed";

  function getGpsStamp() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({
          lat: null,
          lng: null,
          accuracy: null,
          gpsAvailable: false,
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            gpsAvailable: true,
          });
        },
        () => {
          resolve({
            lat: null,
            lng: null,
            accuracy: null,
            gpsAvailable: false,
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        }
      );
    });
  }

  function startTracking() {
    if (jobCompleted) {
      alert("GPS is disabled because this job is completed.");
      return;
    }

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
      eta: jobCompleted ? "Completed" : "Driver tracking stopped",
      etaMode: "manual",
      updatedAt: serverTimestamp(),
    });

    setStatus("GPS stopped");
  }

  async function updateStatus(newStatus, etaText) {
    if (newStatus === "Arrived") {
      alert("Please upload an arrival/before-work photo before proceeding.");
    }

    await updateDoc(doc(db, "bookings", id), {
      status: newStatus,
      eta: etaText,
      updatedAt: serverTimestamp(),
    });
  }

  async function uploadJobFile(file, fieldName) {
    if (!file) return;

    try {
      setUploading(fieldName);

      const gpsStamp = await getGpsStamp();
      const uploadedAtIso = new Date().toISOString();
      const safeName = file.name.replace(/\s+/g, "-");

      const storageRef = ref(
        storage,
        `job-proof/${id}/${fieldName}-${Date.now()}-${safeName}`
      );

      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      await updateDoc(doc(db, "bookings", id), {
        [fieldName]: downloadUrl,
        [`${fieldName}Meta`]: {
          uploadedAt: uploadedAtIso,
          uploadedBy: "driver",
          fileName: file.name,
          fileType: file.type,
          gps: gpsStamp,
        },
        updatedAt: serverTimestamp(),
      });

      alert("Photo uploaded with time and GPS stamp.");
    } catch (error) {
      alert("Upload failed: " + error.message);
    } finally {
      setUploading("");
    }
  }

  async function requestCustomerSignOff() {
    if (!booking?.beforePhotoUrl) {
      alert("Arrival / before photo is required before completion.");
      return;
    }

    if (!booking?.worksheetCompleted) {
      alert("Roadside worksheet must be completed before customer sign-off.");
      return;
    }

    if (!booking?.afterPhotoUrl) {
      alert("After photo is required before completion.");
      return;
    }

    if (!booking?.driverDamageWaiverAccepted) {
      alert("Driver damage waiver must be accepted before completion.");
      return;
    }

    await stopTracking();

    await updateDoc(doc(db, "bookings", id), {
      status: "Awaiting Customer Sign-Off",
      eta: "Awaiting customer sign-off",
      driverTrackingActive: false,
      updatedAt: serverTimestamp(),
    });

    alert("Customer sign-off requested.");
  }

  async function saveCompletionNotes(value) {
    await updateDoc(doc(db, "bookings", id), {
      completionNotes: value,
      updatedAt: serverTimestamp(),
    });
  }

  const customerGps =
    booking?.customerLat && booking?.customerLng
      ? `https://www.google.com/maps/dir/?api=1&destination=${booking.customerLat},${booking.customerLng}`
      : null;

  if (jobCompleted) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1>Job Completed</h1>
          <p>This job has been completed. Driver GPS is now closed.</p>
          <p>
            <strong>Job ID:</strong> {id}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h1>Driver Job Control</h1>

        <p>
          <strong>Job ID:</strong> {id}
        </p>

        <p>
          <strong>GPS Status:</strong> {status}
        </p>

        {booking && (
          <>
            <div style={boxStyle}>
              <p>
                <strong>Customer:</strong>{" "}
                {booking.name || booking.customerName || "Customer"}
              </p>
              <p>
                <strong>Phone:</strong>{" "}
                {booking.phone || booking.customerPhone || "N/A"}
              </p>
              <p>
                <strong>Vehicle:</strong> {booking.vehicle || "Not checked"}
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
              <p>
                <strong>Worksheet:</strong>{" "}
                {booking.worksheetCompleted ? "Completed" : "Not completed"}
              </p>
            </div>

            <div style={gridStyle}>
              {customerGps ? (
                <a href={customerGps} target="_blank" rel="noreferrer" style={linkStyle}>
                  Navigate To Customer
                </a>
              ) : (
                <button disabled style={disabledButton}>
                  Customer GPS Not Shared
                </button>
              )}

              <a href={`tel:${booking.phone || ""}`} style={linkStyle}>
                Call Customer
              </a>
            </div>

            <div style={sectionStyle}>
              <h3>Required Job Proof</h3>

              <label style={labelStyle}>
                Arrival / Before Photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) =>
                    uploadJobFile(e.target.files[0], "beforePhotoUrl")
                  }
                />
              </label>

              <label style={labelStyle}>
                After Photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) =>
                    uploadJobFile(e.target.files[0], "afterPhotoUrl")
                  }
                />
              </label>

              <label style={labelStyle}>
                Extra Proof / Signature Photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) =>
                    uploadJobFile(e.target.files[0], "signaturePhotoUrl")
                  }
                />
              </label>

              {uploading && <p>Uploading {uploading}...</p>}

              {booking.beforePhotoUrl && (
                <PhotoLink
                  title="View Before Photo"
                  url={booking.beforePhotoUrl}
                  meta={booking.beforePhotoUrlMeta}
                />
              )}

              {booking.afterPhotoUrl && (
                <PhotoLink
                  title="View After Photo"
                  url={booking.afterPhotoUrl}
                  meta={booking.afterPhotoUrlMeta}
                />
              )}

              {booking.signaturePhotoUrl && (
                <PhotoLink
                  title="View Extra Proof"
                  url={booking.signaturePhotoUrl}
                  meta={booking.signaturePhotoUrlMeta}
                />
              )}

              <textarea
                placeholder="Completion notes"
                defaultValue={booking.completionNotes || ""}
                onBlur={(e) => saveCompletionNotes(e.target.value)}
                style={textareaStyle}
              />

              <label style={waiverStyle}>
                <input
                  type="checkbox"
                  checked={!!booking.driverDamageWaiverAccepted}
                  onChange={async (e) => {
                    await updateDoc(doc(db, "bookings", id), {
                      driverDamageWaiverAccepted: e.target.checked,
                      driverDamageWaiverAcceptedAt: e.target.checked
                        ? serverTimestamp()
                        : null,
                      updatedAt: serverTimestamp(),
                    });
                  }}
                />
                I confirm required photos are taken and any visible
                damage/issues have been recorded before leaving.
              </label>
            </div>

            {booking.beforePhotoUrl ? (
              <DriversWorksheet booking={booking} jobId={id} />
            ) : (
              <div style={warningBox}>
                Arrival / before photo must be uploaded before completing the
                roadside worksheet.
              </div>
            )}
          </>
        )}

        <div style={gridStyle}>
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
            onClick={() =>
              updateStatus("Arrived", "Driver has arrived - photo required")
            }
            style={buttonStyle}
          >
            Mark Arrived / Request Photo
          </button>

          <button
            onClick={() => updateStatus("In Progress", "Work in progress")}
            style={buttonStyle}
          >
            Mark In Progress
          </button>

          <button onClick={requestCustomerSignOff} style={successButton}>
            Request Customer Sign-Off
          </button>
        </div>
      </div>
    </div>
  );
}

function PhotoLink({ title, url, meta }) {
  return (
    <div style={photoMetaBox}>
      <a href={url} target="_blank" rel="noreferrer" style={linkStyle}>
        {title}
      </a>

      {meta && (
        <small>
          Time: {meta.uploadedAt || "N/A"}
          <br />
          GPS:{" "}
          {meta.gps?.gpsAvailable
            ? `${meta.gps.lat}, ${meta.gps.lng}`
            : "Not available"}
        </small>
      )}
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#020617",
  color: "white",
  padding: "20px",
};

const cardStyle = {
  width: "100%",
  maxWidth: "650px",
  margin: "0 auto",
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "20px",
  padding: "25px",
};

const gridStyle = {
  display: "grid",
  gap: "10px",
  marginBottom: "20px",
};

const boxStyle = {
  margin: "20px 0",
  padding: "15px",
  border: "1px solid #334155",
  borderRadius: "14px",
};

const sectionStyle = {
  display: "grid",
  gap: "12px",
  margin: "20px 0",
  padding: "15px",
  border: "1px solid #334155",
  borderRadius: "14px",
};

const labelStyle = {
  display: "grid",
  gap: "8px",
  fontWeight: "bold",
};

const waiverStyle = {
  display: "flex",
  gap: "10px",
  alignItems: "flex-start",
  lineHeight: "1.4",
};

const textareaStyle = {
  minHeight: "90px",
  padding: "12px",
  borderRadius: "12px",
};

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

const warningBox = {
  padding: "14px",
  borderRadius: "12px",
  background: "#78350f",
  color: "white",
  marginBottom: "20px",
};

const photoMetaBox = {
  display: "grid",
  gap: "6px",
};
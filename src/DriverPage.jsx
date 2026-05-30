import { useEffect, useRef, useState } from "react";
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
import SignaturePad from "./SignaturePad.jsx";
import "./App.css";

const ARRIVAL_DISTANCE_MILES = 0.08;
const PAYMENT_METHODS = ["Cash", "Card", "Invoice", "Account", "Pre-paid"];

function cleanPhone(phone) {
  const cleaned = String(phone || "").replace(/\D/g, "");
  if (!cleaned) return "";
  return cleaned.startsWith("0") ? `44${cleaned.slice(1)}` : cleaned;
}

function mapLink(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function distanceMiles(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (Number(value) * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(Number(lat2) - Number(lat1));
  const dLon = toRad(Number(lon2) - Number(lon1));
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateEta(driverLat, driverLng, customerLat, customerLng) {
  if (!driverLat || !driverLng || !customerLat || !customerLng) {
    return { distance: null, etaMinutes: null, etaText: "Live GPS updating" };
  }

  const distance = distanceMiles(driverLat, driverLng, customerLat, customerLng);
  const averageMph = distance < 1 ? 15 : 28;
  const etaMinutes = Math.max(1, Math.round((distance / averageMph) * 60));

  return {
    distance,
    etaMinutes,
    etaText: `${etaMinutes} min`,
  };
}

export default function DriverPage() {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);
  const [gpsStatus, setGpsStatus] = useState("GPS stopped");
  const [watchId, setWatchId] = useState(null);
  const [uploading, setUploading] = useState("");
  const [arrivalSignature, setArrivalSignature] = useState("");
  const [completionSignature, setCompletionSignature] = useState("");

  const bookingRef = useRef(null);

  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(doc(db, "bookings", id), (snapshot) => {
      if (!snapshot.exists()) return;

      const data = { id: snapshot.id, ...snapshot.data() };
      bookingRef.current = data;
      setBooking(data);
      setArrivalSignature(data.customerArrivalSignature || "");
      setCompletionSignature(data.customerCompletionSignature || "");
    });

    return () => {
      unsubscribe();
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [id, watchId]);

  function getCurrentGps() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("GPS is not supported on this device."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
          });
        },
        reject,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  }

  async function updateBooking(data) {
    await updateDoc(doc(db, "bookings", id), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  function customerTrackingLink() {
    return `${window.location.origin}/tracking/${id}`;
  }

  function driverWhatsAppJobMessage() {
    const job = bookingRef.current || booking || {};

    const customerGps =
      job.customerLat && job.customerLng
        ? mapLink(job.customerLat, job.customerLng)
        : "Customer GPS not shared yet";

    return encodeURIComponent(
      `NEW MCDOWELL JOB\n\nJob ID: ${id}\nCustomer: ${
        job.name || "N/A"
      }\nPhone: ${job.phone || "N/A"}\nAddress: ${
        job.address || "N/A"
      }\nVehicle: ${job.vehicle || "N/A"}\nRegistration: ${
        job.registration || "N/A"
      }\n\nCustomer GPS: ${customerGps}\n\nDriver app: ${
        window.location.origin
      }/driver/${id}\nCustomer tracking: ${customerTrackingLink()}`
    );
  }

  async function acceptJob() {
    await updateBooking({
      status: "Accepted",
      eta: "Driver accepted job",
      acceptedAt: serverTimestamp(),
    });

    if (booking?.driverPhone) {
      window.open(
        `https://wa.me/${cleanPhone(booking.driverPhone)}?text=${driverWhatsAppJobMessage()}`,
        "_blank"
      );
    }
  }

  async function startRoute() {
    if (!navigator.geolocation) {
      alert("GPS is not supported on this device.");
      return;
    }

    await updateBooking({
      status: "On Route",
      eta: "Live GPS updating",
      etaMode: "gps",
      driverTrackingActive: true,
      routeStartedAt: serverTimestamp(),
    });

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }

    const newWatchId = navigator.geolocation.watchPosition(
      async (position) => {
        const liveBooking = bookingRef.current || {};
        const driverLat = position.coords.latitude;
        const driverLng = position.coords.longitude;

        const eta = calculateEta(
          driverLat,
          driverLng,
          liveBooking.customerLat,
          liveBooking.customerLng
        );

        const update = {
          driverLat,
          driverLng,
          driverGpsAccuracy: position.coords.accuracy,
          driverTrackingActive: true,
          eta: eta.etaText,
          etaMinutes: eta.etaMinutes,
          driverDistanceMiles: eta.distance,
          etaMode: "gps",
          lastDriverGpsAt: serverTimestamp(),
        };

        if (
          eta.distance !== null &&
          eta.distance <= ARRIVAL_DISTANCE_MILES &&
          liveBooking.status === "On Route"
        ) {
          update.status = "Arrived";
          update.eta = "Driver arrived";
          update.arrivedAt = serverTimestamp();
          update.arrivedGps = {
            lat: driverLat,
            lng: driverLng,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
            autoDetected: true,
          };
        }

        await updateBooking(update);

        setGpsStatus(
          eta.etaMinutes
            ? `Live GPS running - ETA ${eta.etaMinutes} min`
            : "Live GPS running"
        );
      },
      (error) => {
        setGpsStatus("GPS error");
        alert(error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 15000,
      }
    );

    setWatchId(newWatchId);
  }

  async function markArrived() {
    try {
      const gps = await getCurrentGps();

      await updateBooking({
        status: "Arrived",
        eta: "Driver arrived",
        arrivedAt: serverTimestamp(),
        arrivedGps: gps,
        driverLat: gps.lat,
        driverLng: gps.lng,
      });

      alert("Arrival saved. Complete vehicle condition, before photo and customer arrival signature.");
    } catch (error) {
      alert("Could not capture arrival GPS: " + error.message);
    }
  }

  async function stopGps() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }

    await updateBooking({
      driverTrackingActive: false,
      etaMode: "manual",
    });

    setGpsStatus("GPS stopped");
  }

  async function acceptVehicleCondition() {
    await updateBooking({
      driverDamageAcceptedBeforeWork: true,
      driverDamageAcceptedBeforeWorkAt: serverTimestamp(),
    });
  }

  async function uploadStampedFile(file, fieldName) {
    if (!file) return;

    let gps = null;

    try {
      gps = await getCurrentGps();
    } catch {
      gps = {
        lat: null,
        lng: null,
        accuracy: null,
        timestamp: new Date().toISOString(),
        warning: "GPS unavailable during upload",
      };
    }

    try {
      setUploading(fieldName);

      const safeName = file.name.replace(/\s+/g, "-");
      const storageRef = ref(
        storage,
        `job-proof/${id}/${fieldName}-${Date.now()}-${safeName}`
      );

      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      await updateBooking({
        [fieldName]: url,
        [`${fieldName}Meta`]: {
          uploadedAt: new Date().toISOString(),
          uploadedBy: "driver",
          fileName: file.name,
          fileType: file.type,
          gps,
        },
      });

      alert("Photo uploaded with GPS and time stamp.");
    } catch (error) {
      alert("Upload failed: " + error.message);
    } finally {
      setUploading("");
    }
  }

  async function saveArrivalSignature(signature) {
    setArrivalSignature(signature);

    await updateBooking({
      customerArrivalSignature: signature,
      customerArrivalSignatureAt: signature ? serverTimestamp() : null,
    });
  }

  async function proceedToFitting() {
    if (!booking?.driverDamageAcceptedBeforeWork) {
      alert("Driver must accept vehicle condition first.");
      return;
    }

    if (!booking?.beforePhotoUrl) {
      alert("Before / arrival photo is required.");
      return;
    }

    if (!arrivalSignature && !booking?.customerArrivalSignature) {
      alert("Customer arrival signature is required.");
      return;
    }

    await updateBooking({
      status: "In Progress",
      eta: "Work in progress",
      fittingStartedAt: serverTimestamp(),
    });
  }

  async function saveCompletionSignature(signature) {
    setCompletionSignature(signature);

    await updateBooking({
      customerCompletionSignature: signature,
      customerCompletionSignatureAt: signature ? serverTimestamp() : null,
    });
  }

  async function togglePaymentMethod(method) {
    const current = booking?.paymentMethods || [];
    const next = current.includes(method)
      ? current.filter((item) => item !== method)
      : [...current, method];

    await updateBooking({
      paymentMethods: next,
      paymentConfirmedByDriver: next.length > 0,
      paymentConfirmedByDriverAt: next.length > 0 ? serverTimestamp() : null,
      paymentStatus:
        next.includes("Invoice") || next.includes("Account")
          ? "Invoice/Account"
          : next.length > 0
          ? "Paid"
          : "Unpaid",
    });
  }

  async function completeJob() {
    if (!booking?.afterPhotoUrl) {
      alert("Completion photo is required.");
      return;
    }

    if (!booking?.worksheetCompleted) {
      alert("Worksheet must be completed.");
      return;
    }

    if (!booking?.customerNoDamageWaiverAccepted) {
      alert("Customer no-damage waiver must be accepted.");
      return;
    }

    if (!completionSignature && !booking?.customerCompletionSignature) {
      alert("Customer completion signature is required.");
      return;
    }

    if (!booking?.paymentConfirmedByDriver && !booking?.paymentConfirmedByAdmin) {
      alert("Payment method must be confirmed by driver or admin.");
      return;
    }

    await stopGps();

    await updateBooking({
      status: "Completed",
      eta: "Completed",
      driverTrackingActive: false,
      completedAt: serverTimestamp(),
    });

    alert("Job completed.");
  }

  function worksheetText() {
    const w = booking?.worksheet || {};

    return encodeURIComponent(
      `McDowell Auto Services Job Sheet\n\nJob ID: ${id}\nCustomer: ${
        booking?.name || "N/A"
      }\nPhone: ${booking?.phone || "N/A"}\nRegistration: ${
        booking?.registration || "N/A"
      }\nVehicle: ${booking?.vehicle || "N/A"}\nStatus: ${
        booking?.status || "N/A"
      }\n\nWorksheet:\nTyre Size: ${w.tyreSize || "N/A"}\nTyre Brand: ${
        w.tyreBrand || "N/A"
      }\nTyre Position: ${w.tyrePosition || "N/A"}\nTorque: ${
        w.wheelTorqueNm || "N/A"
      } Nm\nTPMS: ${w.tpmsChecked || "N/A"}\nPressure: ${
        w.tyrePressureSet || "N/A"
      }\nWork: ${(w.workCarriedOut || []).join(", ") || "N/A"}\nNotes: ${
        w.notes || "N/A"
      }`
    );
  }

  if (!booking) {
    return (
      <main className="driverPage">
        <section className="driverCard">Loading job...</section>
      </main>
    );
  }

  const showArrivalWorkflow =
    booking.status === "Arrived" ||
    booking.status === "In Progress" ||
    booking.status === "Awaiting Customer Sign-Off";

  const showCompletionPhotos =
    booking.status === "In Progress" ||
    booking.status === "Awaiting Customer Sign-Off";

  const showWorksheet = !!booking.afterPhotoUrl;
  const showFinalSignOff = !!booking.worksheetCompleted;

  return (
    <main className="driverPage">
      <section className="driverCard">
        <h1>McDowell Driver Job</h1>

        <p className="highlight">Job ID: {id}</p>
        <p>Status: <strong>{booking.status || "New booking"}</strong></p>
        <p>ETA: <strong>{booking.eta || "Awaiting ETA"}</strong></p>
        <p>GPS: <strong>{gpsStatus}</strong></p>

        <div className="jobGrid">
          <div><small>Customer</small><strong>{booking.name || "N/A"}</strong></div>
          <div><small>Phone</small><strong>{booking.phone || "N/A"}</strong></div>
          <div><small>Registration</small><strong>{booking.registration || "N/A"}</strong></div>
          <div><small>Vehicle</small><strong>{booking.vehicle || "N/A"}</strong></div>
          <div><small>Address</small><strong>{booking.address || "N/A"}</strong></div>
          <div><small>Payment</small><strong>{booking.paymentStatus || "Unpaid"}</strong></div>
        </div>

        {booking.customerLat && booking.customerLng && (
          <div className="gpsBox">
            <strong>Customer GPS</strong>
            <span>{booking.customerLat}, {booking.customerLng}</span>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${booking.customerLat},${booking.customerLng}`}
              target="_blank"
              rel="noreferrer"
            >
              Navigate To Customer
            </a>
          </div>
        )}

        <div className="buttonGrid">
          <button type="button" onClick={acceptJob}>Accept Job</button>
          <button type="button" onClick={startRoute}>Start Route + Auto ETA</button>
          <button type="button" onClick={markArrived}>Arrived</button>
          <button type="button" className="dangerBtn" onClick={stopGps}>Stop GPS</button>
        </div>
      </section>

      {showArrivalWorkflow && (
        <section className="workflowPanel">
          <h2>Arrival Condition & Before Photos</h2>

          <button type="button" onClick={acceptVehicleCondition}>
            Accept / Record Vehicle Condition
          </button>

          {booking.driverDamageAcceptedBeforeWork && (
            <p className="successText">Vehicle condition accepted by driver.</p>
          )}

          <label>
            Take Before / Arrival Photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => uploadStampedFile(event.target.files[0], "beforePhotoUrl")}
            />
          </label>

          {uploading === "beforePhotoUrl" && <p>Uploading before photo...</p>}

          {booking.beforePhotoUrl && (
            <a href={booking.beforePhotoUrl} target="_blank" rel="noreferrer">
              View Before Photo
            </a>
          )}

          <SignaturePad
            title="Customer Arrival Signature"
            value={arrivalSignature}
            onSave={saveArrivalSignature}
          />

          <button type="button" className="successBtn" onClick={proceedToFitting}>
            Proceed To Fitting / In Progress
          </button>
        </section>
      )}

      {showCompletionPhotos && (
        <section className="workflowPanel">
          <h2>Completion Photos</h2>

          <label>
            Take Completion / After Photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => uploadStampedFile(event.target.files[0], "afterPhotoUrl")}
            />
          </label>

          {uploading === "afterPhotoUrl" && <p>Uploading completion photo...</p>}

          {booking.afterPhotoUrl && (
            <a href={booking.afterPhotoUrl} target="_blank" rel="noreferrer">
              View Completion Photo
            </a>
          )}
        </section>
      )}

      {showWorksheet && <DriversWorksheet booking={booking} jobId={id} />}

      {showFinalSignOff && (
        <section className="workflowPanel">
          <h2>Customer Final Sign-Off</h2>

          <button
            type="button"
            onClick={() =>
              alert(
                "Disclaimer: The customer confirms the work has been completed to their satisfaction. The customer confirms no new damage has been caused during the work. Wheel nuts have been torqued by the technician, however it remains the customer's responsibility to check wheel nut torque in accordance with manufacturer guidance after driving. McDowell Auto Services is not responsible for pre-existing damage, corrosion, seized parts, defective wheel fixings, TPMS faults, or previously damaged wheels."
              )
            }
          >
            View Disclaimer
          </button>

          <label className="checkRow">
            <input
              type="checkbox"
              checked={!!booking.customerNoDamageWaiverAccepted}
              onChange={(event) =>
                updateBooking({
                  customerNoDamageWaiverAccepted: event.target.checked,
                  customerNoDamageWaiverAcceptedAt: event.target.checked ? serverTimestamp() : null,
                })
              }
            />
            Customer accepts no new damage waiver and wheel nut torque responsibility.
          </label>

          <SignaturePad
            title="Customer Completion Signature"
            value={completionSignature}
            onSave={saveCompletionSignature}
          />

          <h3>Payment Confirmation</h3>

          <div className="checkGrid">
            {PAYMENT_METHODS.map((method) => (
              <label key={method} className="checkRow">
                <input
                  type="checkbox"
                  checked={(booking.paymentMethods || []).includes(method)}
                  onChange={() => togglePaymentMethod(method)}
                />
                {method}
              </label>
            ))}
          </div>

          <button type="button" className="successBtn" onClick={completeJob}>
            Complete Job
          </button>

          <div className="sendSheetBox">
            <h3>Send Job Sheet</h3>

            <input
              placeholder="Customer email or phone"
              defaultValue={booking.sheetSendTo || booking.phone || ""}
              onBlur={(event) => updateBooking({ sheetSendTo: event.target.value })}
            />

            <a
              className="linkButton"
              href={`https://wa.me/${cleanPhone(booking.sheetSendTo || booking.phone)}?text=${worksheetText()}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp Job Sheet
            </a>

            <button
              type="button"
              onClick={() =>
                alert("Email job sheet needs EmailJS or Firebase Functions later. WhatsApp job sheet is ready now.")
              }
            >
              Email Job Sheet
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

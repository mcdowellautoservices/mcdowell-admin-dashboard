import { useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseconfig.js";

const emptyWorksheet = {
  jobNumber: "",
  date: "",
  time: "",
  location: "",
  vehicleRegistration: "",
  vehicleMake: "",
  vehicleModel: "",
  tyreSize: "",
  tyreBrand: "",
  tyrePosition: "",
  wheelTorqueNm: "",
  tpmsChecked: "",
  tyrePressureSet: "",
  workCarriedOut: [],
  notes: "",
  technicianName: "",
};

const workOptions = [
  "Tyre Repair",
  "Tyre Replacement",
  "Spare Tyre Fitted",
  "Wheel Balance",
  "Air Pressure Check",
  "Locking Wheel Nut Removal",
  "Puncture Sealant Used",
  "Valve Replacement",
  "TPMS Checked",
  "Recovery",
  "Other",
];

export default function DriversWorksheet({ booking, jobId }) {
  const [worksheet, setWorksheet] = useState({
    ...emptyWorksheet,
    ...(booking?.worksheet || {}),
    jobNumber: booking?.worksheet?.jobNumber || jobId || "",
    vehicleRegistration:
      booking?.worksheet?.vehicleRegistration ||
      booking?.registration ||
      booking?.reg ||
      "",
    vehicleModel: booking?.worksheet?.vehicleModel || booking?.vehicle || "",
    location: booking?.worksheet?.location || booking?.address || "",
  });

  function setField(field, value) {
    setWorksheet((current) => ({ ...current, [field]: value }));
  }

  function toggleWork(option) {
    const current = worksheet.workCarriedOut || [];

    setWorksheet({
      ...worksheet,
      workCarriedOut: current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option],
    });
  }

  async function saveWorksheet() {
    if (!worksheet.technicianName.trim()) {
      alert("Technician name is required.");
      return;
    }

    if (!worksheet.tyrePosition.trim()) {
      alert("Tyre position is required.");
      return;
    }

    if (!worksheet.wheelTorqueNm.trim()) {
      alert("Wheel torque value is required.");
      return;
    }

    if (!worksheet.workCarriedOut.length) {
      alert("Please select at least one work carried out option.");
      return;
    }

    await updateDoc(doc(db, "bookings", jobId), {
      worksheet,
      worksheetCompleted: true,
      worksheetCompletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    alert("Worksheet saved.");
  }

  return (
    <section className="workflowPanel">
      <h2>Roadside Worksheet</h2>
      <p className="mutedText">
        Complete this after completion photos. It is required before customer sign-off.
      </p>

      <div className="formGrid">
        <input placeholder="Job Number" value={worksheet.jobNumber} onChange={(e) => setField("jobNumber", e.target.value)} />
        <input type="date" value={worksheet.date} onChange={(e) => setField("date", e.target.value)} />
        <input type="time" value={worksheet.time} onChange={(e) => setField("time", e.target.value)} />
        <input placeholder="Location" value={worksheet.location} onChange={(e) => setField("location", e.target.value)} />
        <input placeholder="Vehicle Registration" value={worksheet.vehicleRegistration} onChange={(e) => setField("vehicleRegistration", e.target.value)} />
        <input placeholder="Vehicle Make" value={worksheet.vehicleMake} onChange={(e) => setField("vehicleMake", e.target.value)} />
        <input placeholder="Vehicle Model" value={worksheet.vehicleModel} onChange={(e) => setField("vehicleModel", e.target.value)} />
        <input placeholder="Tyre Size" value={worksheet.tyreSize} onChange={(e) => setField("tyreSize", e.target.value)} />
        <input placeholder="Tyre Brand" value={worksheet.tyreBrand} onChange={(e) => setField("tyreBrand", e.target.value)} />

        <select value={worksheet.tyrePosition} onChange={(e) => setField("tyrePosition", e.target.value)}>
          <option value="">Tyre Position *</option>
          <option>Front Left</option>
          <option>Front Right</option>
          <option>Rear Left</option>
          <option>Rear Right</option>
          <option>Spare</option>
          <option>Multiple</option>
        </select>

        <input placeholder="Wheel Torque Applied (Nm) *" value={worksheet.wheelTorqueNm} onChange={(e) => setField("wheelTorqueNm", e.target.value)} />

        <select value={worksheet.tpmsChecked} onChange={(e) => setField("tpmsChecked", e.target.value)}>
          <option value="">TPMS Checked?</option>
          <option>Yes</option>
          <option>No</option>
          <option>Not fitted</option>
        </select>

        <input placeholder="Tyre Pressure Set" value={worksheet.tyrePressureSet} onChange={(e) => setField("tyrePressureSet", e.target.value)} />
        <input placeholder="Technician Name *" value={worksheet.technicianName} onChange={(e) => setField("technicianName", e.target.value)} />
      </div>

      <h3>Work Carried Out *</h3>

      <div className="checkGrid">
        {workOptions.map((option) => (
          <label key={option} className="checkRow">
            <input
              type="checkbox"
              checked={(worksheet.workCarriedOut || []).includes(option)}
              onChange={() => toggleWork(option)}
            />
            {option}
          </label>
        ))}
      </div>

      <textarea
        placeholder="Additional notes / damage / parts used / customer comments"
        value={worksheet.notes}
        onChange={(e) => setField("notes", e.target.value)}
      />

      <button type="button" className="successBtn" onClick={saveWorksheet}>
        Save Worksheet
      </button>
    </section>
  );
}

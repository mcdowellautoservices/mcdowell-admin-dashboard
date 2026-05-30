import { useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebaseconfig.js";

const emptyWorksheet = {
  make: "",
  model: "",
  colour: "",
  mileage: "",
  fuelType: "",
  tyrePosition: "",
  tyreSize: "",
  tyreBrand: "",
  tyreCondition: "",
  damageType: "",
  punctureCause: "",
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
  "Puncture Sealant",
  "Mobile Assistance",
  "Recovery",
  "Other",
];

export default function DriversWorksheet({ booking, jobId }) {
  const [worksheet, setWorksheet] = useState({
    ...emptyWorksheet,
    ...(booking?.worksheet || {}),
  });

  function updateField(field, value) {
    setWorksheet({
      ...worksheet,
      [field]: value,
    });
  }

  function toggleWork(option) {
    const current = worksheet.workCarriedOut || [];

    setWorksheet({
      ...worksheet,
      workCarriedOut: current.includes(option)
        ? current.filter((x) => x !== option)
        : [...current, option],
    });
  }

  async function saveWorksheet() {
    if (!worksheet.technicianName.trim()) {
      alert("Technician name is required.");
      return;
    }

    if (!worksheet.tyrePosition) {
      alert("Tyre position is required.");
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
    <div style={worksheetBox}>
      <h3 style={titleStyle}>Roadside Tyre Breakdown Worksheet</h3>

      <p style={helpStyle}>
        Complete this after arrival photos have been taken.
      </p>

      <div style={worksheetGrid}>
        <input
          style={inputStyle}
          placeholder="Make"
          value={worksheet.make}
          onChange={(e) => updateField("make", e.target.value)}
        />

        <input
          style={inputStyle}
          placeholder="Model"
          value={worksheet.model}
          onChange={(e) => updateField("model", e.target.value)}
        />

        <input
          style={inputStyle}
          placeholder="Colour"
          value={worksheet.colour}
          onChange={(e) => updateField("colour", e.target.value)}
        />

        <input
          style={inputStyle}
          placeholder="Mileage"
          value={worksheet.mileage}
          onChange={(e) => updateField("mileage", e.target.value)}
        />

        <input
          style={inputStyle}
          placeholder="Fuel Type"
          value={worksheet.fuelType}
          onChange={(e) => updateField("fuelType", e.target.value)}
        />

        <select
          style={inputStyle}
          value={worksheet.tyrePosition}
          onChange={(e) => updateField("tyrePosition", e.target.value)}
        >
          <option value="">Tyre Position *</option>
          <option>Front Left</option>
          <option>Front Right</option>
          <option>Rear Left</option>
          <option>Rear Right</option>
          <option>Spare Tyre</option>
        </select>

        <input
          style={inputStyle}
          placeholder="Tyre Size"
          value={worksheet.tyreSize}
          onChange={(e) => updateField("tyreSize", e.target.value)}
        />

        <input
          style={inputStyle}
          placeholder="Tyre Brand"
          value={worksheet.tyreBrand}
          onChange={(e) => updateField("tyreBrand", e.target.value)}
        />

        <select
          style={inputStyle}
          value={worksheet.tyreCondition}
          onChange={(e) => updateField("tyreCondition", e.target.value)}
        >
          <option value="">Tyre Condition</option>
          <option>New</option>
          <option>Good</option>
          <option>Worn</option>
          <option>Damaged</option>
        </select>

        <select
          style={inputStyle}
          value={worksheet.damageType}
          onChange={(e) => updateField("damageType", e.target.value)}
        >
          <option value="">Type of Damage</option>
          <option>Puncture</option>
          <option>Sidewall</option>
          <option>Blow Out</option>
          <option>Other</option>
        </select>

        <input
          style={inputStyle}
          placeholder="Puncture Cause"
          value={worksheet.punctureCause}
          onChange={(e) => updateField("punctureCause", e.target.value)}
        />
      </div>

      <h4>Work Carried Out *</h4>

      <div style={checksGrid}>
        {workOptions.map((option) => (
          <label key={option} style={checkLabel}>
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
        style={textareaStyle}
        placeholder="Notes / additional information"
        value={worksheet.notes}
        onChange={(e) => updateField("notes", e.target.value)}
      />

      <input
        style={inputStyle}
        placeholder="Technician Name *"
        value={worksheet.technicianName}
        onChange={(e) => updateField("technicianName", e.target.value)}
      />

      <button type="button" onClick={saveWorksheet} style={saveButton}>
        Save Worksheet
      </button>

      {booking?.worksheetCompleted && (
        <p style={savedStyle}>Worksheet already saved for this job.</p>
      )}
    </div>
  );
}

const worksheetBox = {
  display: "grid",
  gap: "12px",
  margin: "20px 0",
  padding: "15px",
  borderRadius: "14px",
  background: "rgba(15, 23, 42, 0.95)",
  border: "1px solid rgba(250, 204, 21, 0.45)",
};

const titleStyle = {
  color: "#facc15",
  margin: 0,
};

const helpStyle = {
  color: "#cbd5e1",
  marginTop: 0,
};

const worksheetGrid = {
  display: "grid",
  gap: "10px",
};

const inputStyle = {
  padding: "12px",
  borderRadius: "12px",
  border: "1px solid #334155",
  background: "#020617",
  color: "white",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: "90px",
};

const checksGrid = {
  display: "grid",
  gap: "8px",
};

const checkLabel = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
};

const saveButton = {
  padding: "14px",
  borderRadius: "12px",
  border: "none",
  background: "#16a34a",
  color: "white",
  fontWeight: "bold",
};

const savedStyle = {
  color: "#22c55e",
  fontWeight: "bold",
};
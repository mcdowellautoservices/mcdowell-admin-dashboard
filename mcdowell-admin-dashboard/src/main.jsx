import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedAdmin from "./ProtectedAdmin.jsx";
import CustomerTracking from "./CustomerTracking.jsx";
import DriverPage from "./DriverPage.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProtectedAdmin />} />
        <Route path="/tracking/:id" element={<CustomerTracking />} />
        <Route path="/driver/:id" element={<DriverPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

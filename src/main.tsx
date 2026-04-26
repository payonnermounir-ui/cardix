import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Set initial direction based on stored language preference
const storedLang = localStorage.getItem("i18nextLng");
if (storedLang === "ar") {
  document.documentElement.dir = "rtl";
} else {
  document.documentElement.dir = "ltr";
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

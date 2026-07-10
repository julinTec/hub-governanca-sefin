import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary.tsx";

// Global handlers: keep AbortError / network noise from crashing the app silently.
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const msg = (reason instanceof Error ? reason.message : String(reason || "")).toLowerCase();
  if (msg.includes("abort") || msg.includes("signal is aborted")) {
    // AbortError is expected when components unmount mid-request — swallow quietly.
    event.preventDefault();
    return;
  }
  console.error("[unhandledrejection]", reason);
});

window.addEventListener("error", (event) => {
  console.error("[window.error]", event.error || event.message);
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

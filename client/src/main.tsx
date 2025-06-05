import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add global error handlers for unhandled rejections
window.addEventListener('unhandledrejection', (event) => {
  // Check if this is an AbortError or similar signal-related error
  if (event.reason && event.reason.name === 'AbortError') {
    // Silently prevent AbortError from appearing in console
    event.preventDefault();
    return;
  }
  
  // Check if this is an empty object (common with signal aborts)
  if (event.reason && typeof event.reason === 'object' && Object.keys(event.reason).length === 0) {
    event.preventDefault();
    return;
  }
  
  // Log other types of unhandled rejections
  console.warn('Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

// Add global error handler for errors
window.addEventListener('error', (event) => {
  console.warn('Global error:', event.error);
});

createRoot(document.getElementById("root")!).render(<App />);

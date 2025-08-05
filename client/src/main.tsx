import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Global handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Check if this is an AbortError from React Query navigation cancellation
  if (event.reason?.name === 'AbortError' || 
      (event.reason?.message && event.reason.message.includes('signal is aborted'))) {
    // Prevent the error from being logged to console
    event.preventDefault();
    return;
  }
  
  // For other errors, let them be handled normally
  console.error('Unhandled promise rejection:', event.reason);
});

// Global handler for uncaught errors
window.addEventListener('error', (event) => {
  // Check if this is an AbortError from React Query
  if (event.error?.name === 'AbortError' || 
      (event.error?.message && event.error.message.includes('signal is aborted'))) {
    // Prevent the error from being logged to console
    event.preventDefault();
    return;
  }
});

createRoot(document.getElementById("root")!).render(<App />);

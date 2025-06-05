import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add global error handlers for unhandled rejections
window.addEventListener('unhandledrejection', (event) => {
  console.warn('Unhandled promise rejection:', event.reason);
  // Prevent the default behavior (logging to console)
  event.preventDefault();
});

// Add global error handler for errors
window.addEventListener('error', (event) => {
  console.warn('Global error:', event.error);
});

createRoot(document.getElementById("root")!).render(<App />);

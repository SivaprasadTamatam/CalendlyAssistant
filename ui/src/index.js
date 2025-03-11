import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/App.css";

// Get the root element
const rootElement = document.getElementById("root");

// Check if the root element exists and render the app
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Root element not found! Please ensure there is an element with id 'root' in the HTML.");
}

import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css"; // Import styles

const DateSelector = () => {
  const [selectedDate, setSelectedDate] = useState(null); // Track selected date
  const [message, setMessage] = useState(""); // Store response message
  const [loading, setLoading] = useState(false); // Track loading state

  const handleDateChange = (date) => {
    setSelectedDate(date);
    sendDateToBackend(date);
  };

  const sendDateToBackend = async (date) => {
    if (!date) return;

    const formattedDate = date.toISOString().split("T")[0]; // Convert to YYYY-MM-DD

    setLoading(true); // Set loading state to true

    try {
      const response = await fetch("http://localhost:8080/api/select-date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: formattedDate }),
      });

      setLoading(false); // Set loading state to false once response is received

      if (!response.ok) throw new Error("Failed to send date");

      const result = await response.json();
      setMessage(result.message || "Date saved successfully!");
    } catch (error) {
      setLoading(false); // Set loading state to false if an error occurs
      console.error("Error sending date:", error);
      setMessage("Failed to save date.");
    }
  };

  return (
    <div style={{ margin: "20px" }}>
      <h3>Select a Date:</h3>
      <DatePicker
        selected={selectedDate}
        onChange={handleDateChange}
        minDate={new Date()} // Disable past dates
        dateFormat="yyyy-MM-dd" // Standard format
        placeholderText="Pick a future date"
      />
      {selectedDate && (
        <p style={{ marginTop: "10px" }}>
          Selected Date: {selectedDate.toLocaleDateString("en-CA")}
        </p>
      )}
      {loading && <p style={{ color: "blue", marginTop: "10px" }}>Saving date...</p>}
      {message && (
        <p
          style={{
            color: message.includes("Failed") ? "red" : "green",
            marginTop: "10px",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
};

export default DateSelector;

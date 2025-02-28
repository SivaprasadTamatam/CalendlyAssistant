import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const SlotBookingModal = ({ selectedSlot, onClose, onConfirm }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!name.trim() || !email.trim()) {
      setMessage("Please enter both name and email.");
      return;
    }

    if (!selectedSlot) {
      setMessage("Please select a slot before booking.");
      return;
    }

    if (!selectedDate) {
      setMessage("Please select a date before booking.");
      return;
    }

    if (!window.confirm(`Confirm booking for ${selectedSlot} on ${selectedDate.toDateString()}?`)) {
      return;
    }

    const bookingData = {
      name: name.trim(),
      email: email.trim(),
      date: selectedDate.toISOString().split("T")[0],
      slot: selectedSlot,  // Make sure selectedSlot is properly passed or handled
    };

    setLoading(true);
    try {
      const response = await fetch("http://localhost:8080/api/book-slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage("Slot booked successfully.");
        onConfirm(name);
        setTimeout(() => {
          setMessage("");
          onClose();
        }, 2000);
      } else {
        setMessage(result.message || "Failed to book slot.");
      }
    } catch (error) {
      setMessage("Error booking slot.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h3>Booking Slot: {selectedSlot || "No slot selected"}</h3>

        <label>
          Select Date:
          <DatePicker
            selected={selectedDate}
            onChange={(date) => setSelectedDate(date)}
            placeholderText="Choose a date"
            dateFormat="yyyy-MM-dd"
          />
        </label>

        <label>
          Enter Your Name:
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Name"
          />
        </label>

        <label>
          Enter Your Email:
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your Email"
          />
        </label>

        <label>
          Select Slot:
          <input
            type="text"
            value={selectedSlot || ""}
            readOnly
            placeholder="Slot"
          />
        </label>

        <div className="modal-actions">
          <button onClick={handleConfirm} disabled={loading}>
            {loading ? "Booking..." : "Book Slot"}
          </button>
          <button onClick={onClose}>Cancel</button>
        </div>

        {message && <p className="message">{message}</p>}
      </div>
    </div>
  );
};

export default SlotBookingModal;

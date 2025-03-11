import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const SlotBookingModal = ({ selectedSlot, onClose, onConfirm }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPop, setShowPop] = useState(false);

  // Validate hh:mm AM/PM format
  const isValid12HourFormat = (slot) => {
    const regex = /^(0[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;
    return regex.test(slot.trim());
  };

  // Convert 24-hour time to hh:mm AM/PM format
  const formatTimeSlot = (slot) => {
    if (!slot) return { error: "Invalid time format. Use hh:mm AM/PM." };

    if (isValid12HourFormat(slot)) {
      return slot.trim().toUpperCase();
    }

    const [hourStr, minuteStr] = slot.split(":");
    if (!hourStr || !minuteStr) {
      return { error: "Invalid time format. Use hh:mm AM/PM." };
    }

    let hour = parseInt(hourStr, 10);
    let minute = parseInt(minuteStr, 10);

    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return { error: "Invalid time format. Use hh:mm AM/PM." };
    }

    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    const formatted = `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")} ${ampm}`;

    return formatted;
  };

  const handleConfirm = async () => {
    setMessage("");

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

    const formattedSlot = formatTimeSlot(selectedSlot);

    if (formattedSlot.error) {
      setMessage(formattedSlot.error);
      return;
    }

    const bookingData = {
      name: name.trim(),
      email: email.trim(),
      time_slot: formattedSlot,
      slot_date: selectedDate.toISOString().split("T")[0],
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
        setShowPop(true);
        setMessage("");
        onConfirm(name);

        // Close pop after 2 seconds
        setTimeout(() => {
          setShowPop(false);
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
    <>
      <div style={modalStyle}>
        <div style={modalContentStyle}>
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
            Selected Slot (hh:mm AM/PM):
            <input type="text" value={selectedSlot || ""} readOnly placeholder="Slot" />
          </label>

          <div style={modalActionsStyle}>
            <button onClick={handleConfirm} disabled={loading}>
              {loading ? "Booking..." : "Book Slot"}
            </button>
            <button onClick={onClose}>Cancel</button>
          </div>

          {message && <p style={errorStyle}>{message}</p>}
        </div>
      </div>

      {showPop && (
        <div style={popupStyle}>
          <div style={popupContentStyle}>
            <h3>Booking Confirmed!</h3>
            <p>
              Hi <strong>{name}</strong>, your slot <strong>{selectedSlot}</strong> on{" "}
              <strong>{selectedDate?.toISOString().split("T")[0]}</strong> is booked.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

// Inline styles (since CSS file caused issues)
const modalStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundColor: "rgba(0, 0, 0, 0.4)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const modalContentStyle = {
  background: "#fff",
  padding: "20px",
  width: "400px",
  borderRadius: "10px",
  textAlign: "left",
};

const modalActionsStyle = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: "20px",
};

const errorStyle = {
  marginTop: "10px",
  color: "red",
};

const popupStyle = {
  position: "fixed",
  top: "30%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  backgroundColor: "#00cc66",
  color: "white",
  padding: "30px",
  borderRadius: "10px",
  zIndex: 999,
  textAlign: "center",
};

const popupContentStyle = {
  textAlign: "center",
};

export default SlotBookingModal;

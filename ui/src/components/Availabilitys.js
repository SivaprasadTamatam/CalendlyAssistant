import React, { useState, useEffect } from "react";
import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

const Availability = ({ interviewerId, candidateId }) => {
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("");

  // Format time to a readable format (e.g., 10:00 AM)
  const formatTime = (timeStr) => {
    const date = new Date(`1970-01-01T${timeStr}Z`);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  useEffect(() => {
    if (date && interviewerId) fetchAvailableSlots();
  }, [date, interviewerId]);

  const fetchAvailableSlots = async () => {
    if (!date) {
      setMessage("Please select a valid date.");
      setMessageType("error");
      return;
    }

    try {
      const response = await axios.get(`${BASE_URL}/api/availability/${interviewerId}/${date}`);
      const { available_slots } = response.data || {};

      if (available_slots?.length) {
        setSlots(available_slots);
        setMessage(null);
      } else {
        setSlots([]);
        setMessage("No available slots for the selected date.");
        setMessageType("error");
      }
    } catch (err) {
      console.error("Error fetching slots:", err);
      setMessage("Error fetching slots. Please try again.");
      setMessageType("error");
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setSlots([]);
    setDate("");
  };

  const bookSlot = async (slot) => {
    if (!name.trim() || !email.trim()) {
      setMessage("Please provide both name and email.");
      setMessageType("error");
      return;
    }

    const payload = {
      name,
      email,
      user_id: candidateId,
      interviewer_id: interviewerId,
      time_slot: `${slot.start_time} - ${slot.end_time}`,
      slot_date: date,
    };

    try {
      const response = await axios.post(`${BASE_URL}/api/book-slot`, payload);
      if (response.status === 200) {
        setMessage("Slot booked successfully!");
        setMessageType("success");
        resetForm();
      } else {
        setMessage("Failed to book slot. Please try again.");
        setMessageType("error");
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "Booking failed. Try again.");
      setMessageType("error");
    }
  };

  return (
    <div style={{ maxWidth: "500px", margin: "auto", padding: "20px" }}>
      <h2>Check Interviewer Availability</h2>

      <label>
        Select Date:
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ width: "100%", padding: "8px", margin: "10px 0" }}
        />
      </label>

      <label>
        Name:
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
          style={{ width: "100%", padding: "8px", margin: "10px 0" }}
        />
      </label>

      <label>
        Email:
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          style={{ width: "100%", padding: "8px", margin: "10px 0" }}
        />
      </label>

      {message && (
        <p style={{ color: messageType === "success" ? "green" : "red", fontWeight: "bold" }}>
          {message}
        </p>
      )}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {slots.length ? (
          slots.map((slot) => (
            <li
              key={slot.slot_id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "10px",
              }}
            >
              <span>
                {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
              </span>
              <button
                onClick={() => bookSlot(slot)}
                style={{
                  padding: "5px 10px",
                  backgroundColor: "#2196F3",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Book Slot
              </button>
            </li>
          ))
        ) : (
          <p>No available slots</p>
        )}
      </ul>
    </div>
  );
};

export default Availability;

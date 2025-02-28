import React, { useState, useEffect } from "react";
import axios from "axios";

const loggedInUserId = 1; // Example user ID (replace dynamically)
const interviewerId = 1;  // Example interviewer ID (replace dynamically)

const BookingForm = () => {
  const [slot, setSlot] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [bookingStatus, setBookingStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [nameError, setNameError] = useState("");
  const [slotError, setSlotError] = useState("");

  const formatDate = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const fetchAvailableSlots = async (date) => {
    if (!date) return;
    setLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:8080/api/availability/${interviewerId}/${formatDate(date)}`
      );
      setSlots(response.data.available_slots || []);
      setBookingStatus(response.data.available_slots?.length ? "" : "No slots available.");
    } catch (error) {
      console.error("Error fetching slots:", error);
      setBookingStatus("Error fetching available slots.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) fetchAvailableSlots(selectedDate);
  }, [selectedDate]);

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const handleBooking = async () => {
    const bookingData = {
      user_id: loggedInUserId,
      interviewer_id: interviewerId,
      name,
      email,
      date: formatDate(selectedDate),
      time_slot: slot,
    };

    try {
      const response = await axios.post('http://localhost:8080/api/book-slot', bookingData);
      setBookingStatus(response.data.message || "Slot booked successfully!");
      resetForm();
      fetchAvailableSlots(selectedDate);
    } catch (error) {
      console.error("Booking failed:", error);
      setBookingStatus(`Error: ${error.response?.data?.message || "Booking failed."}`);
    }
  };

  const resetForm = () => {
    setSlot("");
    setName("");
    setEmail("");
    setEmailError("");
    setNameError("");
    setSlotError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let valid = true;

    if (!name.trim()) {
      setNameError("Please enter your name.");
      valid = false;
    } else {
      setNameError("");
    }

    if (!email.trim()) {
      setEmailError("Please enter your email.");
      valid = false;
    } else if (!validateEmail(email)) {
      setEmailError("Please enter a valid email.");
      valid = false;
    } else {
      setEmailError("");
    }

    if (!slot) {
      setSlotError("Please select a time slot.");
      valid = false;
    } else {
      setSlotError("");
    }

    if (!loggedInUserId) {
      setBookingStatus("User ID is missing. Please log in.");
      return;
    }

    if (valid) handleBooking();
  };

  return (
    <div className="booking-container" style={{ padding: "20px" }}>
      <form
        className="booking-form"
        style={{ maxWidth: "400px", margin: "auto" }}
        onSubmit={handleSubmit}
      >
        <label>Select Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          required
          style={{ width: "100%", padding: "10px", margin: "10px 0" }}
        />

        <label>Choose a Slot:</label>
        <select
          value={slot}
          onChange={(e) => setSlot(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "10px",
            margin: "10px 0",
            border: slotError ? "2px solid red" : "1px solid #ccc",
          }}
        >
          <option value="">Select a time slot</option>
          {loading ? (
            <option>Loading slots...</option>
          ) : (
            slots.map((s) => (
              <option key={s.id} value={s.start_time}>
                {new Date(s.start_time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </option>
            ))
          )}
        </select>
        {slotError && <p style={{ color: "red" }}>{slotError}</p>}

        <label>Your Name:</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Enter your name"
          style={{
            width: "100%",
            padding: "10px",
            margin: "10px 0",
            border: nameError ? "2px solid red" : "1px solid #ccc",
          }}
        />
        {nameError && <p style={{ color: "red" }}>{nameError}</p>}

        <label>Your Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Enter your email"
          style={{
            width: "100%",
            padding: "10px",
            margin: "10px 0",
            border: emailError ? "2px solid red" : "1px solid #ccc",
          }}
        />
        {emailError && <p style={{ color: "red" }}>{emailError}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px",
            background: "#2196F3",
            color: "#fff",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Booking..." : "Book Slot"}
        </button>

        {bookingStatus && (
          <p
            style={{
              color: bookingStatus.includes("successfully") ? "green" : "red",
              marginTop: "10px",
            }}
          >
            {bookingStatus}
          </p>
        )}
      </form>
    </div>
  );
};

export default BookingForm;
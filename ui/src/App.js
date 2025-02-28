import React, { useState, useEffect, useCallback, useMemo } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import moment from "moment-timezone";
import axios from "axios";
import SlotBookingModal from "./components/SlotBookingModal";
import DateSelector from "./components/DateSelector";
import "./styles/App.css";

const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [bookedSlot, setBookedSlot] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [message, setMessage] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const fixedTimeSlots = useMemo(() => ["9:00 AM", "11:00 AM", "2:00 PM", "4:00 PM"], []);

  const fetchTimeSlots = useCallback(async (date) => {
    if (!date) return;
    try {
      const formattedDate = moment(date).format("YYYY-MM-DD");
      const response = await axios.get(`http://localhost:8080/api/availability?date=${formattedDate}`);
      setTimeSlots(response.data?.slots?.length > 0 ? response.data.slots : []);
    } catch (error) {
      console.error("Error fetching time slots:", error);
      setTimeSlots([]);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) fetchTimeSlots(selectedDate);
  }, [selectedDate, fetchTimeSlots]);

  const filterTimeSlots = useCallback(
    (slots) => {
      if (!selectedDate) return [];
      const currentTimeInMinutes = new Date().getHours() * 60 + new Date().getMinutes();
      return slots.filter((slot) => {
        const [hour, minute, period] = slot.match(/\d+|AM|PM/g);
        const slotTimeInMinutes = (parseInt(hour) % 12) * 60 + parseInt(minute) + (period === "PM" ? 720 : 0);
        return moment(selectedDate).isAfter(moment(), "day") || slotTimeInMinutes > currentTimeInMinutes;
      });
    },
    [selectedDate]
  );

  useEffect(() => {
    const remainingSlots = filterTimeSlots(timeSlots.length > 0 ? timeSlots : fixedTimeSlots).length;
    const messages = {
      3: "Only 3 slots available today. Book now!",
      2: "Hurry! Only 2 slots left!",
      1: "Last slot remaining! Book ASAP!",
      0: "No slots available or already booked.",
    };
    setMessage(messages[remainingSlots] || "");
  }, [filterTimeSlots, timeSlots, fixedTimeSlots]);

  const handleSlotClick = (slot) => {
    setSelectedSlot(slot);
    setShowModal(true);
  };

  const handleConfirmBooking = async (name, email) => {
    if (!selectedDate || !selectedSlot || !name || !email) {
      alert("⚠️ Please fill all details (Name, Email, Slot, Date).");
      return;
    }

    try {
      const response = await axios.post("http://localhost:8080/api/book-slot", {
        slot_date: moment(selectedDate).format("YYYY-MM-DD"),
        slot_time: selectedSlot,
        email,
        name,
        booked_by: name,
        booking_date: moment().format("YYYY-MM-DD"),
        booked_at: moment().toISOString(),
        status: "booked",
        time_slot: selectedSlot,
      });

      if (response.status === 200) {
        setBookedSlot(selectedSlot);
        setConfirmationMessage(`✅ Slot "${selectedSlot}" successfully booked for ${name}!`);
        setShowModal(false);
        setShowSuccessPopup(true);
        fetchTimeSlots(selectedDate);

        setTimeout(() => setShowSuccessPopup(false), 3000); // Hide success popup after 3 seconds
      } else {
        alert("❌ Booking failed. Please try again.");
      }
    } catch (error) {
      console.error("Booking error:", error);
      alert("❌ Booking failed. Please check your details.");
    }
  };

  const tileDisabled = ({ date, view }) => {
    return view === "month" && (date.getDay() === 0 || date.getDay() === 6 || moment(date).isBefore(moment(), "day"));
  };

  const renderTimeSlots = () => {
    const filteredSlots = filterTimeSlots(timeSlots.length > 0 ? timeSlots : fixedTimeSlots);
    return filteredSlots.length > 0 ? (
      <div>
        <h2>Available Time Slots</h2>
        {filteredSlots.map((slot, index) => (
          <button
            key={index}
            onClick={() => handleSlotClick(slot)}
            disabled={bookedSlot === slot}
            style={{ backgroundColor: bookedSlot === slot ? "gray" : "green", color: "white", margin: "5px" }}
          >
            {bookedSlot === slot ? "Booked" : slot}
          </button>
        ))}
      </div>
    ) : (
      <h3>No slots available for the selected date.</h3>
    );
  };

  return (
    <div>
      <h1>📅 Slot Scheduler</h1>
      <Calendar onChange={setSelectedDate} value={selectedDate} tileDisabled={tileDisabled} />
      <h2>{selectedDate ? `Available Slots for ${selectedDate.toDateString()}` : "Select a date to view slots"}</h2>
      {renderTimeSlots()}
      {message && <div className="message" style={{ color: "red", marginTop: "10px" }}><h3>{message}</h3></div>}
      {confirmationMessage && (
        <div style={{ color: "blue", marginTop: "10px" }}>
          <h3>{confirmationMessage}</h3>
        </div>
      )}
      {showSuccessPopup && (
        <div className="success-popup" style={{ backgroundColor: "#4CAF50", color: "white", padding: "10px", borderRadius: "8px", marginTop: "10px" }}>
          🎉 Successfully booked!
        </div>
      )}
      {showModal && (
        <SlotBookingModal
          selectedSlot={selectedSlot}
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirmBooking}
        />
      )}
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/date-selector" element={<DateSelector />} />
      </Routes>
    </Router>
  );
};

export default App;

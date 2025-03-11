import React, { useEffect, useState } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import Modal from "react-modal";
import "../styles/CalendarComponent.css";

const localizer = momentLocalizer(moment);
Modal.setAppElement("#root");

const CalendarComponent = () => {
  const [timeSlots, setTimeSlots] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState(moment().format("YYYY-MM-DD"));
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [bookingName, setBookingName] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingStatus, setBookingStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // Added loading state

  useEffect(() => {
    fetchSlots(selectedDate);
  }, [selectedDate]);

  const fetchSlots = async (date) => {
    setLoading(true); // Start loading
    try {
      const response = await fetch(`http://localhost:8080/api/timeslots?date=${date}`);
      if (!response.ok) throw new Error("No time slots available");

      const data = await response.json();
      setTimeSlots(data || []);
      setError("");
    } catch (err) {
      setError(err.message);
      setTimeSlots([]);
    } finally {
      setLoading(false); // Stop loading
    }
  };

  const handleSelectSlot = async (slotInfo) => {
    const date = moment(slotInfo.start).format("YYYY-MM-DD");
    setSelectedDate(date); // Keep the selected date
    setModalIsOpen(true);
    setBookingStatus("Loading available slots...");

    try {
      const response = await fetch(`http://localhost:8080/api/availability/1/${date}`);
      if (!response.ok) throw new Error("Failed to fetch slots");

      const data = await response.json();
      setSlots(data.slots || []);
      setBookingStatus(data.slots.length > 0 ? "" : "No available slots for this date");
    } catch (error) {
      setBookingStatus("Error loading slots");
    }
  };

  const handleBooking = async () => {
    if (!selectedSlot || !bookingName.trim()) {
      setBookingStatus("Please select a slot and enter your name");
      return;
    }

    setBookingStatus("Booking...");

    try {
      const response = await fetch("http://localhost:8080/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot_id: selectedSlot, booker_name: bookingName }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Booking failed");

      setBookingStatus("Booking successful!");
      setTimeout(() => {
        setModalIsOpen(false);
        setBookingStatus("");
        setSelectedSlot(null);
        setBookingName("");
      }, 2000);
    } catch (error) {
      setBookingStatus(error.message);
    }
  };

  return (
    <div style={{ height: 700, padding: 20 }}>
      <h3>Available Time Slots for {selectedDate}</h3>
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
      />
      {error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : (
        <>
          {loading ? (
            <p>Loading time slots...</p>
          ) : (
            <ul>
              {timeSlots.map((slot, index) => (
                <li key={index}>{slot.time}</li>
              ))}
            </ul>
          )}
        </>
      )}

      <Calendar
        localizer={localizer}
        events={[]}
        selectable
        onSelectSlot={handleSelectSlot}
        defaultView="week"
        views={["week", "day"]}
        style={{ margin: 20 }}
      />

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={() => setModalIsOpen(false)}
        style={{
          content: {
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
          },
        }}
      >
        <h2>Available Slots - {selectedDate}</h2>

        <div style={{ margin: "10px 0" }}>
          {slots.length > 0 ? (
            slots.map((slot) => (
              <div
                key={slot.id}
                style={{
                  padding: 10,
                  margin: 5,
                  border: "1px solid #ddd",
                  backgroundColor: selectedSlot === slot.id ? "#e3f2fd" : "white",
                  cursor: "pointer",
                }}
                onClick={() => setSelectedSlot(slot.id)}
              >
                {moment(slot.start_time).format("HH:mm")} - {moment(slot.end_time).format("HH:mm")}
              </div>
            ))
          ) : (
            <div>{bookingStatus || "No available slots for this date"}</div>
          )}
        </div>

        <input
          type="text"
          placeholder="Your Name"
          value={bookingName}
          onChange={(e) => setBookingName(e.target.value)}
          style={{ width: "100%", padding: 8, margin: "10px 0" }}
        />

        {bookingStatus && (
          <div
            style={{ color: bookingStatus.includes("success") ? "green" : "red", margin: "10px 0" }}
          >
            {bookingStatus}
          </div>
        )}

        <button
          onClick={handleBooking}
          style={{
            padding: "10px 20px",
            background: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Book Slot
        </button>
      </Modal>
    </div>
  );
};

export default CalendarComponent;

import React, { useState, useEffect } from "react";
import axios from "../services/api"; // Adjust path to your axios instance
import { Calendar as BigCalendar, momentLocalizer } from "react-big-calendar";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import moment from "moment";
import { format } from "date-fns";
import "react-big-calendar/lib/css/react-big-calendar.css";
import Modal from "react-modal";

Modal.setAppElement("#root");

const localizer = momentLocalizer(moment);

const CalendarView = () => {
  const [slots, setSlots] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState("2025-02-22");
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [error, setError] = useState("");
  const interviewerId = 1; // Change this to dynamic ID if needed

  useEffect(() => {
    axios
      .get("/api/events")
      .then((response) => {
        setEvents(
          response.data.map((event) => ({
            title: event.title,
            start: new Date(event.startTime),
            end: new Date(event.endTime),
          }))
        );
      })
      .catch((err) => console.error("Error fetching events: ", err));
  }, []);

  const fetchAvailableSlots = async (date) => {
    try {
      const formattedDate = format(new Date(date), "yyyy-MM-dd");
      const response = await axios.get(`/api/availability/${interviewerId}/${formattedDate}`);

      if (response.data?.slots?.length) {
        const formattedSlots = response.data.slots.map((slot) => ({
          id: slot.ID,
          time: moment(slot.start_time).format("hh:mm A") + " - " + moment(slot.end_time).format("hh:mm A"),
        }));
        setAvailableSlots(formattedSlots);
      } else {
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error("Error fetching available slots", error);
      setAvailableSlots([]);
    }
  };

  const fetchSlots = async (date) => {
    try {
      const formattedDate = format(new Date(date), "yyyy-MM-dd");
      const response = await fetch(`http://localhost:8080/api/timeslots?date=${formattedDate}`);

      if (!response.ok) {
        throw new Error("No time slots available");
      }
      const data = await response.json();
      setSlots(data);
      setError("");
    } catch (err) {
      setError(err.message);
      setSlots([]);
    }
  };

  useEffect(() => {
    fetchSlots(selectedDate);
  }, [selectedDate]);

  const handleSelectSlot = async (slotInfo) => {
    const formattedDate = format(slotInfo.start, "yyyy-MM-dd");

    try {
      const response = await axios.get(`/api/availability/${interviewerId}/${formattedDate}`);

      if (response.data?.slots?.length) {
        const events = response.data.slots.map((slot) => ({
          title: "Available",
          start: new Date(slot.start_time),
          end: new Date(slot.end_time),
          allDay: false,
          resource: slot.ID,
        }));
        setSlots(events);
      } else {
        setSlots([]);
        alert("No available slots for the selected date.");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      alert("Error loading time slots");
    }
  };

  const handleDateClick = (info) => {
    const formattedDate = format(new Date(info.dateStr), "yyyy-MM-dd");
    fetchAvailableSlots(formattedDate);
    setSelectedDate(formattedDate);
    setShowModal(true);
  };

  return (
    <div className="calendar">
      {events.length === 0 ? (
        <p>No events available</p>
      ) : (
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          events={events}
          eventColor="navy"
          eventTextColor="white"
          dateClick={handleDateClick}
        />
      )}

      <h2>Available Time Slots for {selectedDate}</h2>
      {error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : availableSlots.length > 0 ? (
        <div>
          {availableSlots.map((slot) => (
            <div key={slot.id}>{slot.time}</div>
          ))}
        </div>
      ) : (
        <p>No slots available.</p>
      )}

      <div style={{ height: 700, margin: "20px" }}>
        <BigCalendar
          localizer={localizer}
          events={slots}
          selectable
          onSelectSlot={handleSelectSlot}
          defaultView="week"
          views={["week", "day"]}
          step={30}
          timeslots={2}
          min={new Date(0, 0, 0, 9, 0, 0)}
          max={new Date(0, 0, 0, 18, 0, 0)}
        />
      </div>

      {showModal && (
        <CalendarModal
          date={selectedDate}
          interviewerId={interviewerId}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

const CalendarModal = ({ date, interviewerId, onClose }) => {
  const [slots, setSlots] = useState([]);
  const [name, setName] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingStatus, setBookingStatus] = useState("");

  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const formattedDate = format(new Date(date), "yyyy-MM-dd");
        const response = await axios.get(`/api/availability/${interviewerId}/${formattedDate}`);

        if (response.data?.slots) {
          setSlots(response.data.slots);
        } else {
          setSlots([]);
        }
      } catch (error) {
        console.error("Error:", error);
        setBookingStatus("Error loading slots");
      }
    };

    if (date) fetchSlots();
  }, [date, interviewerId]);

  const handleBooking = async () => {
    if (!selectedSlot || !name.trim()) {
      setBookingStatus("Please select a slot and enter your name");
      return;
    }

    try {
      const response = await axios.post("/api/bookings", {
        slot_id: selectedSlot,
        booker_name: name,
      });

      if (response.status === 200) {
        setBookingStatus("Booking successful!");
        setTimeout(onClose, 2000);
      } else {
        setBookingStatus("Booking failed. Please try again.");
      }
    } catch (error) {
      console.error("Booking error:", error);
      setBookingStatus("Booking failed");
    }
  };

  return (
    <Modal isOpen={!!date} onRequestClose={onClose}>
      <h2>Available Slots for {moment(date).format("MMMM Do YYYY")}</h2>

      <div className="slot-list">
        {slots.map((slot) => (
          <div
            key={slot.ID}
            className={`slot ${selectedSlot === slot.ID ? "selected" : ""}`}
            onClick={() => setSelectedSlot(slot.ID)}
          >
            {moment(slot.start_time).format("HH:mm")} - {moment(slot.end_time).format("HH:mm")}
          </div>
        ))}
      </div>

      <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />

      {bookingStatus && <div className="status">{bookingStatus}</div>}

      <div className="modal-buttons">
        <button onClick={handleBooking}>Book Slot</button>
        <button onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
};

export default CalendarView;

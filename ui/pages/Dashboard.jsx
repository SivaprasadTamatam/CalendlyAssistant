import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import axios from "axios";
import moment from "moment-timezone";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "@fullcalendar/core/main.css";
import "@fullcalendar/daygrid/main.css";
import { format } from "date-fns";
import BookingForm from "../components/BookingForm";

const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState([]);
  const [timeZone, setTimeZone] = useState("");
  const [bookedSlot, setBookedSlot] = useState(null);
  const [events, setEvents] = useState([]);
  const currentDate = new Date();

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    fetchTimeSlots(selectedDate);
    fetchEvents();
  }, [selectedDate]);

  const fetchTimeSlots = async (date) => {
    try {
      const formattedDate = moment(date).format("YYYY-MM-DD");
      // Update the API endpoint to match the backend route
      const response = await axios.get(
        `http://localhost:8080/api/availability?date=${formattedDate}`
      );
      setTimeSlots(response.data?.timeSlots || []); // Ensure this matches the backend response structure
    } catch (error) {
      console.error("Error fetching time slots:", error);
      setTimeSlots([]);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await axios.get("/api/getEvents");
      if (response.data) {
        setEvents(response.data);
      }
    } catch (error) {
      toast.error("Error fetching events");
    }
  };

  const getLocalTime = (slot) => moment(slot).tz(timeZone).format("h:mm A");

  const renderTimeSlots = () => {
    if (timeSlots.length === 0) {
      return <p>No available time slots.</p>;
    }
    return (
      <table>
        <thead>
          <tr>
            <th>Time Slot</th>
            <th>Book</th>
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((slot, index) => {
            const localTime = getLocalTime(slot);
            const isPastTime =
              selectedDate.toDateString() === currentDate.toDateString() &&
              new Date(slot) < currentDate;

            return (
              <tr key={index}>
                <td>{localTime}</td>
                <td>
                  <button
                    onClick={() => !isPastTime && setBookedSlot(slot)}
                    disabled={isPastTime || bookedSlot === slot}
                  >
                    {bookedSlot === slot ? "Booked" : "Book"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  const tileClassName = ({ date, view }) => {
    if (view === "month") {
      if (date < currentDate) {
        return "past-day";
      } else if (date.toDateString() === selectedDate.toDateString()) {
        return "selected-day";
      } else {
        return "available-day";
      }
    }
    return null;
  };

  const handleEventClick = (info) => {
    const { title, start, end } = info.event;
    if (title && start && end) {
      console.log("Slot clicked:", title);
    } else {
      toast.error("Invalid slot details.");
    }
  };

  const handleDateSelect = (info) => {
    const selectedDateStr = info.dateStr;
    setSelectedDate(selectedDateStr);
    fetchTimeSlots(selectedDateStr);
  };

  return (
    <div>
      <h1>Scheduling Dashboard</h1>
      <Calendar onChange={handleDateClick} value={selectedDate} tileClassName={tileClassName} />
      
      <div>
        <h2>Available Time Slots for {selectedDate.toDateString()}</h2>
        {renderTimeSlots()}
      </div>
      <div>
        <h3>Your Time Zone: {timeZone}</h3>
      </div>

      <h1>Interviewer Availability Calendar</h1>
      <FullCalendar
        plugins={[dayGridPlugin]}
        events={events}
        eventClick={handleEventClick}
        initialView="dayGridMonth"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,dayGridWeek,dayGridDay",
        }}
        dateClick={handleDateSelect}
      />

      <h2>Time Slot Booking</h2>
      <BookingForm />

      <ToastContainer />
    </div>
  );
};

export default Dashboard;

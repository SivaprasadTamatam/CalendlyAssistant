import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./CalendarStyles.css"; // Custom CSS for styling

const CustomCalendar = () => {
  const [availability, setAvailability] = useState({});

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const response = await fetch("http://localhost:8080/api/calendar/availability"); // Corrected to 8080
        if (!response.ok) throw new Error("Failed to fetch availability data");

        const data = await response.json();
        // Check if data is an object and contains availability info
        setAvailability(data && typeof data === "object" ? data : {});
      } catch (err) {
        console.error("Error fetching calendar data:", err);
      }
    };

    fetchAvailability();
  }, []);

  // Function to assign the correct class to each tile based on availability data
  const tileClassName = ({ date, view }) => {
    if (view === "month") {
      const dateString = date.toLocaleDateString("en-CA"); // YYYY-MM-DD format

      // Assigning class names based on availability data
      switch (availability[dateString]) {
        case "available":
          return "green-day";
        case "partial":
          return "orange-day";
        case "full":
          return "red-day";
        default:
          return ""; // No class if no availability info
      }
    }
    return "";
  };

  return (
    <div className="calendar-container">
      <h2>Availability Calendar</h2>
      <Calendar tileClassName={tileClassName} />
    </div>
  );
};

export default CustomCalendar;

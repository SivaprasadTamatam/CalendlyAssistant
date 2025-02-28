import React, { useState, useEffect } from 'react';
import moment from 'moment-timezone';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './TimeSlotDisplay.css';

const TimeSlotDisplay = ({ interviewerId }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [slots, setSlots] = useState([]);
  const [bookedDays, setBookedDays] = useState({});
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [userName, setUserName] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchBookedDays();
  }, [interviewerId]);

  useEffect(() => {
    fetchSlots();
  }, [selectedDate]);

  const fetchBookedDays = async () => {
    try {
      const response = await axios.get(`http://localhost:8080/api/booked-days/${interviewerId}`);
      setBookedDays(response.data || {});
    } catch (error) {
      console.error('Error fetching booked days:', error);
      setMessage('Failed to load booked days.');
    }
  };

  const fetchSlots = async () => {
    try {
      const dateStr = moment(selectedDate).format('YYYY-MM-DD');
      const response = await axios.get(`http://localhost:8080/api/availability/${interviewerId}/${dateStr}`);
      
      const rawSlots = response.data?.slots || [];
      const convertedSlots = rawSlots.map((slot) => ({
        id: slot.ID,
        cst: moment(slot.start_time).tz('America/Chicago'),
        local: moment(slot.start_time).tz(userTimezone),
        ist: moment(slot.start_time).tz('Asia/Kolkata'),
        booked: slot.booked,
      }));

      setSlots(convertedSlots);
    } catch (error) {
      console.error('Error fetching slots:', error);
      setSlots([]);
      setMessage('Failed to load slots.');
    }
  };

  const handleSlotClick = (slot) => {
    setSelectedSlot(slot);
    setMessage('');
  };

  const handleBookSlot = async () => {
    if (!userName.trim()) {
      setMessage('Please enter your name.');
      return;
    }

    try {
      const bookingData = {
        name: userName,
        date: moment(selectedDate).format('YYYY-MM-DD'),
        slot: selectedSlot.id,
      };

      const response = await axios.post('http://localhost:8080/api/book-slot', bookingData);

      if (response.status === 200) {
        setMessage(`Slot booked successfully for ${userName}!`);
        setUserName('');
        fetchSlots();
        fetchBookedDays();
      } else {
        setMessage(response.data.message || 'Booking failed.');
      }
    } catch (error) {
      console.error('Error booking slot:', error);
      setMessage('Error booking slot.');
    }
  };

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = moment(date).format('YYYY-MM-DD');
      if (bookedDays[dateStr] === 'full') return 'fully-booked';
      if (bookedDays[dateStr] === 'partial') return 'partially-booked';
      if (bookedDays[dateStr] === 'available') return 'available-day';
    }
    return '';
  };

  return (
    <div className="time-slots">
      <Calendar onChange={setSelectedDate} value={selectedDate} tileClassName={tileClassName} />

      {message && <p className="message">{message}</p>}

      {slots.length > 0 ? (
        slots.map((slot) => (
          <div key={slot.id} className={`time-slot-card ${slot.booked ? 'disabled-slot' : ''}`}>
            <div>Your Local Time: {slot.local.format('h:mm A z')}</div>
            <div>CST: {slot.cst.format('h:mm A z')}</div>
            <div>IST: {slot.ist.format('h:mm A z')}</div>
            <button onClick={() => handleSlotClick(slot)} disabled={slot.booked}>
              {slot.booked ? 'Slot Booked' : 'Select Slot'}
            </button>
          </div>
        ))
      ) : (
        <div className="no-slots">No available slots for the selected date</div>
      )}

      {selectedSlot && (
        <div className="slot-input-form">
          <input
            type="text"
            placeholder="Enter your name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <button onClick={handleBookSlot}>Book Slot</button>
        </div>
      )}
    </div>
  );
};

export default TimeSlotDisplay;

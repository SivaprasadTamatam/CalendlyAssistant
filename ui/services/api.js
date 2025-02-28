import axios from 'axios';

// Use environment variables for the base URL (or fallback to localhost for development)
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';

// Create an Axios instance with default configuration
const api = axios.create({
  baseURL: BASE_URL, // Use the dynamic base URL
  headers: { 'Content-Type': 'application/json' },
});

// Function to get available slots for a specific date
export const getAvailableSlots = async (interviewerId, date) => {
  try {
    // Ensure date is formatted correctly (you may need to adjust depending on your backend)
    const formattedDate = new Date(date).toISOString().split('T')[0]; // Format to YYYY-MM-DD

    const response = await api.get(`/api/availability/${interviewerId}/${formattedDate}`);

    if (response.data && response.data.slots) {
      return response.data.slots; // Return available slots if available
    } else {
      console.warn('No slots returned from API');
      return [];
    }
  } catch (error) {
    console.error('Error fetching slots:', error);
    return []; // Return an empty array if there's an error fetching the slots
  }
};

// Function to book a selected slot
export const bookSlot = async (slotId, userName, userEmail, selectedDate) => {
  try {
    const bookingData = {
      slot_id: slotId,
      user_name: userName,
      user_email: userEmail,
      date: selectedDate,
    };

    const response = await api.post('/api/book-slot', bookingData);

    if (response.data && response.data.success) {
      return response.data; // Return success response
    } else {
      console.error('Booking failed:', response.data.message || 'Unknown error');
      return { success: false, message: response.data.message || 'Booking failed' };
    }
  } catch (error) {
    console.error('Error booking slot:', error);
    return { success: false, message: 'Error booking slot. Please try again later.' };
  }
};

// Export the Axios instance for use elsewhere in the app
export default api;
